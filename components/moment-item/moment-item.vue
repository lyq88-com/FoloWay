<template>
  <view class="moment-card">
    <!-- 头部: 头像+昵称+时间+位置 -->
    <view class="card-header">
      <view class="author-avatar" :style="{ background: avatarGradient }">
        <!-- ↓↓↓ 新增 ↓↓↓ 后端已返回 author.avatar，有则显示图片，没有回退到首字母 -->
        <image v-if="authorAvatar" :src="authorAvatar" class="author-avatar-img" mode="aspectFill" />
        <text v-else class="author-avatar-text">{{ authorInitial }}</text>
      </view>
      <view class="author-info">
        <view class="name-row">
          <text class="author-name">{{ moment.author.nickname || '匿名用户' }}</text>
          <text v-if="moment.isAI" class="author-badge">AI 伙伴</text>
        </view>
        <view class="meta-line">
          <text class="meta-time">{{ formatTime(moment.created_at) }}</text>
          <text class="meta-loc" v-if="moment.location"> · 📍 {{ moment.location }}</text>
        </view>
      </view>
      <view class="more-btn" v-if="isOwner" @click.stop="$emit('delete', moment)">
        <text class="more-icon">⋯</text>
      </view>
    </view>

    <!-- 文字内容 -->
    <view class="card-content" v-if="moment.content">
      <text class="content-text">{{ moment.content }}</text>
    </view>

    <!-- 图片九宫格 -->
    <view class="card-images" v-if="moment.images && moment.images.length > 0">
      <view
        v-for="(img, idx) in moment.images"
        :key="idx"
        class="image-cell"
        :class="gridClass"
        @click="previewImage(idx)"
      >
        <image class="moment-image" :src="img" mode="aspectFill" lazy-load />
      </view>
    </view>

    <!-- 底部: 点赞 / 评论 -->
    <view class="card-footer">
      <view class="action-btn" @click.stop="onLike">
        <text class="action-icon">{{ moment.liked ? '❤️' : '🤍' }}</text>
        <text class="action-text">{{ moment.like_count > 0 ? moment.like_count : '赞' }}</text>
      </view>
      <view class="action-btn" @click.stop="onComment">
        <text class="action-icon">💬</text>
        <text class="action-text">{{ moment.comment_count > 0 ? moment.comment_count : '评论' }}</text>
      </view>
    </view>

    <!-- 评论区(展开式) -->
    <view class="comment-section" v-if="comments.length > 0 || commentExpanded">
      <view class="comment-list" v-if="comments.length > 0">
        <view class="comment-item" v-for="c in comments" :key="c.id">
          <text class="comment-user">{{ c.user.nickname }}</text>
          <text class="comment-text">: {{ c.content }}</text>
        </view>
      </view>
      <view class="comment-input-row" v-if="commentExpanded">
        <input
          v-model="commentText"
          class="comment-input"
          placeholder="说点什么..."
          confirm-type="send"
          @confirm="submitComment"
        />
        <view class="comment-send-btn" @click="submitComment">
          <text>发送</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import momentApi from '@/api/moment'
import aiSocial from '@/common/ai-social'
// ↓↓↓ 新增 ↓↓↓ 统一拼头像地址（后端返回的 author.avatar 是相对路径）
import { toAvatarUrl } from '@/common/request'

export default {
  props: {
    moment: {
      type: Object,
      required: true
    },
    currentUserId: {
      type: Number,
      default: 0
    }
  },
  data() {
    return {
      comments: [],
      commentExpanded: false,
      commentText: ''
    }
  },
  computed: {
    isOwner() {
      return this.moment.user_id === this.currentUserId
    },
    authorInitial() {
      const n = this.moment.author && this.moment.author.nickname
      return n ? n.charAt(0).toUpperCase() : 'U'
    },
    // ↓↓↓ 新增 ↓↓↓ 动态作者头像
    authorAvatar() {
      return toAvatarUrl(this.moment.author && this.moment.author.avatar)
    },
    avatarGradient() {
      // 简单根据ID生成不同色调
      const id = this.moment.user_id || 0
      const palette = [
        ['#6B8E7B', '#A8C9B8'],
        ['#7B8E6B', '#C9B8A8'],
        ['#8E7B6B', '#B8C9A8'],
        ['#6B7B8E', '#A8B8C9'],
        ['#8E6B7B', '#C9A8B8']
      ]
      const p = palette[id % palette.length]
      return `linear-gradient(135deg, ${p[0]}, ${p[1]})`
    },
    gridClass() {
      const n = this.moment.images.length
      if (n === 1) return 'grid-one'
      if (n === 2 || n === 4) return 'grid-two'
      return 'grid-three'
    }
  },
  methods: {
    formatTime(t) {
      if (!t) return ''
      // 简化: 直接显示 YYYY-MM-DD HH:MM
      return t.replace(/-/g, '/').substring(5, 16)
    },
    previewImage(idx) {
      uni.previewImage({
        urls: this.moment.images,
        current: this.moment.images[idx]
      })
    },
    onLike() {
      this.$emit('like', this.moment)
    },
    async onComment() {
      this.commentExpanded = !this.commentExpanded
      if (this.commentExpanded && this.comments.length === 0) {
        await this.loadComments()
      }
    },
    async loadComments() {
      // AI伙伴动态：评论存本地，AI可能回复
      if (this.moment.isAI) {
        this.comments = aiSocial.getAIComments(this.moment.id)
        return
      }
      try {
        const res = await momentApi.getComments(this.moment.id)
        this.comments = (res.data) || []
      } catch (e) {
        // 静默
      }
    },
    async submitComment() {
      const text = this.commentText.trim()
      if (!text) {
        uni.showToast({ title: '请输入评论', icon: 'none' })
        return
      }
      // AI伙伴动态：本地评论 + AI概率回复
      if (this.moment.isAI) {
        let nickname = '我'
        try {
          nickname = this.$store.state.userInfo.nickname || '我'
        } catch (e) { /* 静默 */ }
        this.comments = aiSocial.commentAIMoment(this.moment.id, text, nickname)
        this.commentText = ''
        this.$emit('comment', this.moment)
        uni.showToast({ title: '评论成功', icon: 'success' })
        // AI回复到达后刷新
        uni.$off('ai-moment-updated', this._onAIComment)
        this._onAIComment = () => { this.comments = aiSocial.getAIComments(this.moment.id) }
        uni.$on('ai-moment-updated', this._onAIComment)
        return
      }
      try {
        const res = await momentApi.comment(this.moment.id, text)
        this.comments.push(res.data)
        this.commentText = ''
        // 更新父组件的评论数
        this.$emit('comment', this.moment)
        uni.showToast({ title: '评论成功', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e.message || '评论失败', icon: 'none' })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.moment-card {
  background: #FFFFFF;
  padding: 24rpx;
  margin-bottom: 18rpx;
  border-radius: 32rpx;
  box-shadow: 0 12rpx 28rpx -24rpx rgba(34, 48, 42, 0.6), inset 0 0 0 1rpx rgba(140, 174, 154, 0.13);
}

/* === 头部 === */
.card-header {
  display: flex;
  align-items: center;
}
.author-avatar {
  width: 66rpx;
  height: 66rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  box-shadow: inset 0 0 0 1rpx rgba(255, 255, 255, 0.5);
}
.author-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: block;
}
.author-avatar-text {
  color: #FFFFFF;
  font-size: 26rpx;
  font-weight: 700;
}
.author-info {
  flex: 1;
  min-width: 0;
  margin-left: 18rpx;
  display: flex;
  flex-direction: column;
}
.name-row {
  display: flex;
  align-items: center;
}
.author-name {
  font-size: 28rpx;
  font-weight: 700;
  color: #22302A;
  letter-spacing: 0.2rpx;
}
.author-badge {
  margin-left: 12rpx;
  padding: 3rpx 12rpx;
  border-radius: 999rpx;
  background: #F6F1E7;
  color: #2E5643;
  font-size: 18rpx;
  font-weight: 700;
}
.meta-line {
  margin-top: 6rpx;
  display: flex;
  align-items: center;
}
.meta-time, .meta-loc {
  font-size: 20rpx;
  color: #BFC7BF;
}
.more-btn {
  padding: 8rpx 14rpx;
}
.more-icon {
  font-size: 32rpx;
  color: #C2CBC4;
  line-height: 1;
}

/* === 内容 === */
.card-content {
  margin-top: 16rpx;
}
.content-text {
  font-size: 28rpx;
  line-height: 1.7;
  color: #333E37;
  word-break: break-word;
}

/* === 图片九宫格 === */
.card-images {
  margin-top: 16rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}
.image-cell {
  overflow: hidden;
  border-radius: 20rpx;
}
.image-cell.grid-one {
  width: 100%;
}
.image-cell.grid-one .moment-image {
  width: 100%;
  height: 320rpx;
}
.image-cell.grid-two {
  width: calc(50% - 4rpx);
}
.image-cell.grid-two .moment-image {
  width: 100%;
  height: 220rpx;
}
.image-cell.grid-three {
  width: calc(33.33% - 6rpx);
}
.image-cell.grid-three .moment-image {
  width: 100%;
  height: 200rpx;
}
.moment-image {
  display: block;
}

/* === 底部按钮 === */
.card-footer {
  margin-top: 18rpx;
  display: flex;
  align-items: center;
  gap: 40rpx;
}
.action-btn {
  display: flex;
  align-items: center;
}
.action-btn:active { opacity: 0.6; }
.action-icon {
  font-size: 26rpx;
}
.action-text {
  margin-left: 8rpx;
  font-size: 22rpx;
  color: #A2AAA3;
}

/* === 评论区 === */
.comment-section {
  margin-top: 16rpx;
  padding: 16rpx 20rpx;
  background: #FFFCF6;
  border-radius: 20rpx;
  box-shadow: inset 0 0 0 1rpx rgba(140, 174, 154, 0.12);
}
.comment-list {
  display: flex;
  flex-direction: column;
}
.comment-item {
  padding: 8rpx 0;
  font-size: 24rpx;
  line-height: 1.6;
}
.comment-user {
  color: #2E5643;
  font-weight: 700;
  margin-right: 8rpx;
}
.comment-text {
  color: #333E37;
}
.comment-input-row {
  display: flex;
  align-items: center;
  margin-top: 12rpx;
}
.comment-input {
  flex: 1;
  height: 64rpx;
  padding: 0 22rpx;
  background: #FFFFFF;
  border-radius: 999rpx;
  font-size: 24rpx;
  box-shadow: inset 0 0 0 1rpx rgba(140, 174, 154, 0.16);
}
.comment-send-btn {
  margin-left: 14rpx;
  padding: 14rpx 28rpx;
  background: linear-gradient(140deg, #44705A, #2E5643);
  border-radius: 999rpx;
}
.comment-send-btn text {
  color: #FFFFFF;
  font-size: 22rpx;
  font-weight: 700;
}
</style>
