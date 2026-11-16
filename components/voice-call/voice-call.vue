<template>
  <view class="call-overlay" v-if="visible">
    <view class="call-bg"></view>
    <!-- 波纹动画 -->
    <view class="ripple-wrap">
      <view class="ripple r1"></view>
      <view class="ripple r2"></view>
      <view class="ripple r3"></view>
      <view class="call-avatar" :style="{ background: avatarBg }">
        <text class="call-avatar-emoji">{{ avatarEmoji }}</text>
      </view>
    </view>
    <text class="call-name">{{ name }}</text>
    <text class="call-status">{{ statusText }}</text>
    <text class="call-duration">{{ durationText }}</text>
    <!-- RTC 状态：未配置/无 SDK 时如实标注演示模式，不假装实时通话 -->
    <text class="call-mode" v-if="rtcHint">{{ rtcHint }}</text>
    <!-- 字幕 -->
    <view class="call-subtitle" v-if="subtitle">
      <text>{{ subtitle }}</text>
    </view>

    <!-- 控制按钮 -->
    <view class="call-controls">
      <view class="ctl-btn" :class="{ off: muted, listening: listening }" @click="toggleMute">
        <text class="ctl-icon">{{ muted ? '🔇' : '🎙️' }}</text>
        <text class="ctl-label">{{ muted ? '已静音' : '麦克风' }}</text>
      </view>
      <view class="ctl-btn hangup" @click="hangup">
        <text class="ctl-icon">📞</text>
        <text class="ctl-label">挂断</text>
      </view>
      <view class="ctl-btn" :class="{ off: !speaker }" @click="toggleSpeaker">
        <text class="ctl-icon">{{ speaker ? '🔊' : '🔈' }}</text>
        <text class="ctl-label">扬声器</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getVoiceLang, getCallLines, getAsrLang } from '@/common/voice-lang'
import aiSpeak from '@/common/ai-speak'
import chatApi from '@/api/chat'
import rtcService from '@/common/rtc-service'

/**
 * 实时语音通话：
 * - 全屏通话界面 + 波纹动画
 * - P1：接入麦克风收音（H5 Web Speech API），用户说话 → AI 回复 → TTS 播报，形成真实轮流对话
 * - 浏览器不支持识别时退回原来的台词轮播，保证功能不消失
 * 多语言：台词、发音、识别语种都跟随「聊天设置 → 语音多语言」
 */
export default {
  props: {
    visible: { type: Boolean, default: false },
    name: { type: String, default: 'AI伙伴' },
    avatarEmoji: { type: String, default: '🌿' },
    avatarBg: { type: String, default: 'linear-gradient(135deg, #7BA08B, #A5D6A7)' },
    // ↓↓↓ 陪伴感增强 v3：角色音色 soft/bright/warm/cool/husky（不传就 warm） ↓↓↓
    tone: { type: String, default: 'warm' }
  },
  data() {
    return {
      seconds: 0,
      timer: null,
      muted: false,
      speaker: true,
      statusText: '通话中',
      subtitle: '',
      rtcHint: '',            // RTC 通道状态提示（未配置时显示演示模式）
      lineTimer: null,
      // ↓↓↓ P1 通话收音 ↓↓↓
      recognition: null,      // 语音识别实例（仅 H5 有）
      listening: false,       // 当前是否正在收音
      wantListening: false,   // 是否希望持续收音（用于 onend 自动重启）
      aiSpeaking: false,      // AI 正在说话，期间必须关麦，避免把自己的声音识别成用户
      pendingReply: false,    // 正在等 AI 回复
      lastHeard: '',          // 最近一次识别到的用户原话
      callSessionId: 0        // 本次通话的会话 id：带上后 AI 才记得通话里前面聊过什么
    }
  },
  computed: {
    durationText() {
      const m = Math.floor(this.seconds / 60)
      const s = this.seconds % 60
      const pad = n => String(n).padStart(2, '0')
      return `${pad(m)}:${pad(s)}`
    }
  },
  watch: {
    visible(v) {
      if (v) {
        this.start()
      } else {
        this.stop()
      }
    }
  },
  beforeUnmount() {
    this.stop()
  },
  methods: {
    start() {
      aiSpeak.stop()   // 进入通话前先掐掉聊天页可能还在播的语音，避免两路声音打架
      this.seconds = 0
      this.subtitle = ''
      this.statusText = '已接通'
      this.listening = false
      this.wantListening = false
      this.aiSpeaking = false
      this.pendingReply = false
      this.lastHeard = ''
      this.callSessionId = 0
      this.timer = setInterval(() => { this.seconds++ }, 1000)
      // 检查实时通道是否真的可用：不可用就如实标注演示模式
      this.refreshRtcHint()
      // 先建立语音识别；不具备条件的浏览器会得到 recognition = null，自动走台词轮播
      this.initRecognition()
      // 开场白：AI 先开口，说完立刻进入收音状态
      this.speakTurn(this.pickLine(), true)
    },
    stop() {
      aiSpeak.stop()
      // 停收音 + 释放识别实例，避免挂断后麦克风还在工作
      this.wantListening = false
      this.stopListening()
      if (this.recognition) {
        try {
          this.recognition.onresult = null
          this.recognition.onerror = null
          this.recognition.onend = null
          this.recognition.abort()
        } catch (e) { /* 静默 */ }
        this.recognition = null
      }
      if (this.timer) clearInterval(this.timer)
      if (this.lineTimer) { clearTimeout(this.lineTimer); clearInterval(this.lineTimer) }
      this.timer = null
      this.lineTimer = null
      this.aiSpeaking = false
      this.pendingReply = false
      this.listening = false
      // 停止TTS
      // #ifdef H5
      try {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel()
        }
      } catch (e) { /* 静默 */ }
      // #endif
    },
    /** 查询 RTC 通道：只有「后端已配置 + 已引入声网 SDK」才算实时就绪 */
    async refreshRtcHint() {
      try {
        const status = await rtcService.getRtcStatus()
        const ready = !!(status && status.configured && rtcService.getAgoraSdk())
        this.rtcHint = ready ? '实时通道已就绪 · AI 语音对话' : '演示模式 · 未接入实时通话'
      } catch (e) {
        this.rtcHint = '演示模式 · 未接入实时通话'
      }
    },
    /** 当前语种（读聊天设置，读不到就中文） */
    currentLangCode() {
      try {
        const saved = uni.getStorageSync('chat_settings')
        return (saved && saved.voiceLang) || 'zh-CN'
      } catch (e) {
        return 'zh-CN'
      }
    },
    /** 当前语速/音调（同样读聊天设置） */
    currentVoiceParams() {
      try {
        const saved = uni.getStorageSync('chat_settings') || {}
        return {
          rate: typeof saved.rate === 'number' ? saved.rate : 1.0,
          pitch: typeof saved.pitch === 'number' ? saved.pitch : 1.1
        }
      } catch (e) {
        return { rate: 1.0, pitch: 1.1 }
      }
    },
    // ============ P1 收音 ============
    /** 建立语音识别（仅 H5）：不支持的浏览器返回 null，通话自动退回台词轮播 */
    initRecognition() {
      // #ifdef H5
      try {
        if (typeof window === 'undefined') return
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SpeechRecognition) {
          this.recognition = null
          return
        }
        const rec = new SpeechRecognition()
        // 识别语种跟随「语音多语言」，和 AI 台词语种保持一致
        rec.lang = getAsrLang(this.currentLangCode())
        rec.continuous = false       // 浏览器单轮识别，说完自动结束，由 onend 负责续开
        rec.interimResults = true    // 边说边显示字幕，像真人通话
        rec.maxAlternatives = 1

        rec.onstart = () => {
          this.listening = true
          if (!this.aiSpeaking) this.statusText = '我在听…'
        }
        rec.onresult = (event) => {
          let interim = ''
          let finalText = ''
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const r = event.results[i]
            if (!r || !r[0]) continue
            if (r.isFinal) finalText += r[0].transcript
            else interim += r[0].transcript
          }
          if (interim) {
            this.statusText = '我在听…'
            this.subtitle = `我：${interim}`
          }
          const text = finalText.trim()
          if (text) {
            this.lastHeard = text
            this.handleUserSpeech(text)
          }
        }
        rec.onerror = (event) => {
          this.listening = false
          const err = event && event.error
          if (err === 'not-allowed' || err === 'service-not-allowed' || err === 'audio-capture') {
            // 麦克风拿不到（未授权 / 非 localhost 的 http 页面）：降级成原来的单向通话
            this.recognition = null
            this.wantListening = false
            this.statusText = '通话中'
            uni.showToast({ title: '麦克风不可用，暂时只能听我说', icon: 'none', duration: 2200 })
            this.scheduleNextLine(0)
          } else if (err === 'network') {
            // 识别服务连不上（部分网络环境下 Chrome 的语音服务不可达）：直接降级，避免反复重试
            this.recognition = null
            this.wantListening = false
            this.statusText = '通话中'
            uni.showToast({ title: '语音识别不可用，建议用 Edge 浏览器', icon: 'none', duration: 2400 })
            this.scheduleNextLine(0)
          }
          // no-speech / aborted：忽略，由 onend 决定是否重新收音
        }
        rec.onend = () => {
          this.listening = false
          if (!this.visible || !this.wantListening || this.muted || this.aiSpeaking || this.pendingReply) return
          // 浏览器静音后会自动结束识别，稍等再开，形成连续收音
          setTimeout(() => {
            if (this.visible && this.wantListening && !this.aiSpeaking && !this.pendingReply) {
              this.startListening()
            }
          }, 400)
        }
        this.recognition = rec
      } catch (e) {
        this.recognition = null
      }
      // #endif
    },
    /** 打开麦克风收音 */
    startListening() {
      if (!this.visible || this.muted || this.aiSpeaking || this.pendingReply) return
      this.wantListening = true
      if (!this.recognition) return
      try {
        this.recognition.start()
        this.listening = true
        this.statusText = '我在听…'
      } catch (e) {
        // 已在识别中会抛 InvalidStateError，忽略即可
      }
    },
    /** 关闭麦克风收音 */
    stopListening() {
      this.wantListening = false
      if (!this.recognition) return
      try { this.recognition.abort() } catch (e) { /* 静默 */ }
      this.listening = false
    },
    /** 用户说完一句：交给 AI 生成回复，再播报 */
    async handleUserSpeech(text) {
      if (this.pendingReply || !this.visible) return
      this.pendingReply = true
      this.stopListening()
      this.subtitle = `我：${text}`
      this.statusText = '正在想…'
      const langCfg = getVoiceLang(this.currentLangCode())
      let reply = ''
      try {
        const aiConfig = (this.$store && this.$store.state && this.$store.state.aiConfig) || {}
        // 复用聊天页同一条 SSE 接口：人设、记忆、语种都沿用，不新增后端
        reply = await chatApi.streamSend(text, () => {}, {
          role_type: aiConfig.avatarType || 'companion',
          role_key: aiConfig.roleKey || '',
          dialogue_style: 'gentle',
          scene_type: 'companion',
          scene_name: '语音通话',
          language: langCfg.code,
          session_id: this.callSessionId,
          onSessionId: (id) => { this.callSessionId = id || this.callSessionId }
        })
      } catch (e) {
        console.error('通话 AI 回复失败', e)
      }
      this.pendingReply = false
      if (!this.visible) return
      const clean = (reply || '').trim()
      this.speakTurn(clean || this.pickOffline(langCfg), true)
    },
    /** 离线兜底台词（按语种） */
    pickOffline(langCfg) {
      const pool = (langCfg && langCfg.offlineReplies) || []
      return pool.length ? pool[Math.floor(Math.random() * pool.length)] : '嗯嗯，我在听呢。'
    },
    /** AI 说一句；listenAfter=true 表示说完继续收音 */
    speakTurn(text, listenAfter = false) {
      if (!this.visible || !text) return
      this.stopListening()
      this.aiSpeaking = true
      this.subtitle = `${this.name}：${text}`
      this.statusText = '对方讲话中…'
      const langCfg = getVoiceLang(this.currentLangCode())
      const p = this.currentVoiceParams()
      // 优先走后端 TTS（语音包音色）；失败时 ai-speak 自动回退浏览器语音
      aiSpeak.speak(text, {
        lang: langCfg.code,
        rate: p.rate,
        pitch: p.pitch
      }).then(() => {
        this.aiSpeaking = false
        if (!this.visible) return
        this.statusText = '通话中'
        if (listenAfter && this.recognition) {
          this.startListening()
        } else {
          this.scheduleNextLine(0)
        }
      })
    },
    /** 排下一句话：仅在浏览器不支持收音时使用 */
    scheduleNextLine(depth = 0) {
      if (this.recognition) return   // 能收音就不再自说自话，等用户开口
      if (this.lineTimer) { clearTimeout(this.lineTimer); this.lineTimer = null }
      // 连续接话最多 2 轮，避免变成单口相声
      const followUp = depth < 2 && Math.random() < 0.45
      const delay = followUp ? 1200 + Math.random() * 1300 : 5000 + Math.random() * 4000
      this.lineTimer = setTimeout(() => {
        this.speakNext(depth + 1)
      }, delay)
    },
    /** 接话用的短句：更像"嗯、然后呢、你说"这种自然插话 */
    interjection() {
      const pool = ['嗯。', '然后呢？', '我在听。', '真的假的？', '哈哈，然后呢。', '嗯嗯，你说。', '就这样？']
      return pool[Math.floor(Math.random() * pool.length)]
    },
    /** 取一句台词（只有中文才混入语气词，避免多语种混杂） */
    pickLine(depth = 0) {
      const pool = getCallLines(this.currentLangCode())
      const base = pool[Math.floor(Math.random() * pool.length)]
      const canInterject = depth > 0 && this.currentLangCode() === 'zh-CN' && Math.random() < 0.5
      return canInterject ? this.interjection() + base : base
    },
    speakNext(depth = 0) {
      this.speakTurn(this.pickLine(depth), false)
    },
    toggleMute() {
      this.muted = !this.muted
      if (this.muted) {
        // 静音 = 真的关麦，避免浏览器仍在收音
        this.stopListening()
        uni.showToast({ title: '已静音', icon: 'none' })
      } else {
        uni.showToast({ title: '麦克风已开启', icon: 'none' })
        if (!this.aiSpeaking) this.startListening()
      }
    },
    toggleSpeaker() {
      this.speaker = !this.speaker
      uni.showToast({ title: this.speaker ? '扬声器已开启' : '已切换听筒', icon: 'none' })
    },
    hangup() {
      // 先关麦再抛事件，父组件收起悬浮层时不会有残留录音
      this.stopListening()
      aiSpeak.stop()
      this.$emit('end', { seconds: this.seconds, durationText: this.durationText })
    }
  }
}
</script>

<style lang="scss" scoped>
.call-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 1200;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.call-bg {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(180deg, #1A2340 0%, #0D0D0F 100%);
}
.ripple-wrap {
  position: relative;
  width: 300rpx;
  height: 300rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ripple {
  position: absolute;
  border-radius: 50%;
  border: 2rpx solid rgba(123, 160, 139, 0.4);
  animation: rippleOut 2.4s ease-out infinite;
}
.r1 { width: 220rpx; height: 220rpx; }
.r2 { width: 260rpx; height: 260rpx; animation-delay: 0.5s; }
.r3 { width: 300rpx; height: 300rpx; animation-delay: 1s; }
@keyframes rippleOut {
  0% { transform: scale(0.85); opacity: 0.8; }
  100% { transform: scale(1.25); opacity: 0; }
}
.call-avatar {
  width: 180rpx;
  height: 180rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 60rpx rgba(123, 160, 139, 0.5);
}
.call-avatar-emoji {
  font-size: 84rpx;
}
.call-name {
  position: relative;
  margin-top: 48rpx;
  font-size: 40rpx;
  font-weight: 600;
  color: #F5F5F7;
}
.call-status {
  position: relative;
  margin-top: 14rpx;
  font-size: 24rpx;
  color: #8A9B8E;
}
.call-duration {
  position: relative;
  margin-top: 10rpx;
  font-size: 30rpx;
  color: #C8C8CE;
  font-variant-numeric: tabular-nums;
}
.call-mode {
  position: relative;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #7E8F84;
}
.call-subtitle {
  position: relative;
  margin-top: 48rpx;
  max-width: 80%;
  padding: 20rpx 32rpx;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 20rpx;
}
.call-subtitle text {
  font-size: 26rpx;
  color: #E8E8EC;
  line-height: 1.6;
}
.call-controls {
  position: absolute;
  bottom: 140rpx;
  left: 0; right: 0;
  display: flex;
  justify-content: center;
  gap: 70rpx;
}
.ctl-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx;
}
.ctl-icon {
  width: 110rpx;
  height: 110rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44rpx;
}
.ctl-btn:active .ctl-icon { transform: scale(0.92); }
.ctl-btn.off .ctl-icon { background: rgba(255, 255, 255, 0.35); }
/* P1：正在收音时麦克风图标泛绿并轻微呼吸，用户能看出"它在听" */
.ctl-btn.listening .ctl-icon {
  background: rgba(76, 175, 80, 0.42);
  box-shadow: 0 0 0 8rpx rgba(76, 175, 80, 0.16);
}
.ctl-btn.hangup .ctl-icon {
  background: #E53935;
  transform: rotate(135deg);
}
.ctl-btn.hangup .ctl-icon text { transform: none; }
.ctl-label {
  margin-top: 14rpx;
  font-size: 22rpx;
  color: #B8B8BE;
}
</style>
