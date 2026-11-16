<template>
  <!-- 安全合规批次：高危信号提醒弹窗（danger_warn） -->
  <view v-if="visible" class="dw-mask" @click.stop>
    <view class="dw-card">
      <view class="dw-icon">💛</view>
      <text class="dw-title">我们有点担心你</text>
      <scroll-view scroll-y class="dw-body">
        <text class="dw-message">{{ message }}</text>
        <view v-if="resources.length" class="dw-resources">
          <view
            v-for="(r, i) in resources"
            :key="i"
            class="dw-resource"
            @click="callHotline(r)"
          >
            <view class="dw-resource-info">
              <text class="dw-resource-name">{{ r.name }}</text>
              <text class="dw-resource-hours">{{ r.hours }}</text>
            </view>
            <text class="dw-resource-phone">{{ r.phone }} 📞</text>
          </view>
        </view>
        <text class="dw-tip">你不需要一个人扛着这些。我也会一直在这里陪着你。</text>
      </scroll-view>
      <view class="dw-actions">
        <view class="dw-btn dw-btn-ghost" @click="close">
          <text>我知道了</text>
        </view>
        <view v-if="resources.length" class="dw-btn dw-btn-primary" @click="callHotline(resources[0])">
          <text>拨打热线</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'DangerWarn',
  props: {
    visible: { type: Boolean, default: false },
    message: { type: String, default: '' },
    resources: { type: Array, default: () => [] }
  },
  emits: ['close'],
  methods: {
    close() {
      this.$emit('close')
    },
    callHotline(r) {
      if (!r || !r.phone) return
      // #ifdef H5
      window.location.href = `tel:${r.phone}`
      // #endif
      // #ifndef H5
      uni.makePhoneCall({ phoneNumber: r.phone, fail: () => {} })
      // #endif
    }
  }
}
</script>

<style lang="scss" scoped>
.dw-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}
.dw-card {
  width: 100%;
  max-width: 640rpx;
  max-height: 80vh;
  background: #fff;
  border-radius: 32rpx;
  padding: 40rpx 36rpx 32rpx;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12rpx 48rpx rgba(0, 0, 0, 0.18);
}
.dw-icon {
  font-size: 64rpx;
  text-align: center;
  margin-bottom: 12rpx;
}
.dw-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #333;
  text-align: center;
  margin-bottom: 24rpx;
}
.dw-body {
  max-height: 46vh;
  margin-bottom: 24rpx;
}
.dw-message {
  font-size: 28rpx;
  line-height: 1.7;
  color: #555;
  white-space: pre-wrap;
}
.dw-resources {
  margin-top: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.dw-resource {
  background: #FFF7ED;
  border: 1rpx solid #FED7AA;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.dw-resource-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.dw-resource-name {
  font-size: 26rpx;
  color: #9A3412;
  font-weight: 600;
}
.dw-resource-hours {
  font-size: 22rpx;
  color: #C2410C;
}
.dw-resource-phone {
  font-size: 30rpx;
  color: #EA580C;
  font-weight: 700;
}
.dw-tip {
  display: block;
  margin-top: 20rpx;
  font-size: 24rpx;
  color: #999;
  line-height: 1.6;
}
.dw-actions {
  display: flex;
  gap: 20rpx;
}
.dw-btn {
  flex: 1;
  height: 84rpx;
  border-radius: 42rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
}
.dw-btn-ghost {
  background: #F3F4F6;
  color: #666;
}
.dw-btn-primary {
  background: #F59E0B;
  color: #fff;
  font-weight: 600;
}
</style>
