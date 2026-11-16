<template>
  <!-- 安全合规批次：新手引导（首次进入聊天时展示一次） -->
  <view v-if="visible" class="go-mask">
    <view class="go-card">
      <view class="go-steps">
        <view
          v-for="(dot, i) in steps"
          :key="i"
          class="go-dot"
          :class="{ active: i === step }"
        ></view>
      </view>
      <view class="go-icon">{{ steps[step].icon }}</view>
      <text class="go-title">{{ steps[step].title }}</text>
      <text class="go-desc">{{ steps[step].desc }}</text>
      <view class="go-btn" @click="next">
        <text>{{ step === steps.length - 1 ? '开始聊聊' : '下一步' }}</text>
      </view>
      <text class="go-skip" @click="finish">跳过引导</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'GuideOnboarding',
  props: {
    visible: { type: Boolean, default: false },
    // 账号标识，用于按账号隔离引导状态（与 quiz_completed_<username> 保持一致）
    account: { type: String, default: '' }
  },
  emits: ['finish'],
  data() {
    return {
      step: 0,
      steps: [
        {
          icon: '🌱',
          title: '这里是可以放心说话的地方',
          desc: '开心、难过、烦躁、没有原因的低落——都可以说。TA 会认真听。'
        },
        {
          icon: '💛',
          title: '如果某天你说了很重的话',
          desc: '我们会先提醒你：有 24 小时在线的专业热线可以随时拨打，你不用一个人扛。'
        },
        {
          icon: '🔒',
          title: '你的数据由你做主',
          desc: '设置里可以关闭 AI 主动消息、开启青少年模式，也可以随时导出你的全部数据。'
        }
      ]
    }
  },
  methods: {
    next() {
      if (this.step < this.steps.length - 1) {
        this.step++
      } else {
        this.finish()
      }
    },
    finish() {
      try {
        const key = this.account ? ('guide_onboarding_done_' + this.account) : 'guide_onboarding_done'
        uni.setStorageSync(key, 'true')
      } catch (e) { /* 静默 */ }
      this.$emit('finish')
    }
  }
}
</script>

<style lang="scss" scoped>
.go-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}
.go-card {
  width: 100%;
  max-width: 620rpx;
  background: #fff;
  border-radius: 36rpx;
  padding: 44rpx 40rpx 36rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.go-steps {
  display: flex;
  gap: 12rpx;
  margin-bottom: 28rpx;
}
.go-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #E5E7EB;
  transition: all 0.25s;
}
.go-dot.active {
  background: #6B8E7B;
  width: 36rpx;
  border-radius: 8rpx;
}
.go-icon {
  font-size: 88rpx;
  margin-bottom: 20rpx;
}
.go-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #333;
  text-align: center;
  margin-bottom: 16rpx;
}
.go-desc {
  font-size: 28rpx;
  color: #666;
  line-height: 1.7;
  text-align: center;
  margin-bottom: 40rpx;
}
.go-btn {
  width: 100%;
  height: 88rpx;
  border-radius: 44rpx;
  background: #6B8E7B;
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
}
.go-skip {
  font-size: 26rpx;
  color: #bbb;
  padding: 8rpx 20rpx;
}
</style>
