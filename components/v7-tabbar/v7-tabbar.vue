<template>
  <view class="v7-dock">
    <view class="v7-dock-tab" :class="{ on: active === 'home' }" @click="go('/pages/index/index')">
      <xt-icon name="i-home" :size="18" />
      <text class="v7-dock-tx">陪伴</text>
    </view>
    <view class="v7-dock-tab" :class="{ on: active === 'discover' }" @click="go('/pages/discover/discover')">
      <xt-icon name="i-compass" :size="18" />
      <text class="v7-dock-tx">发现</text>
    </view>
    <!-- 中间留空，凸起 FAB 绝对定位在正中 -->
    <view class="v7-dock-gap"></view>
    <view class="v7-dock-tab" :class="{ on: active === 'chat' }" @click="go('/pages/chat/chat')">
      <xt-icon name="i-chat" :size="18" />
      <text class="v7-dock-tx">消息</text>
    </view>
    <view class="v7-dock-tab" :class="{ on: active === 'profile' }" @click="go('/pages/profile/profile')">
      <xt-icon name="i-user" :size="18" />
      <text class="v7-dock-tx">我的</text>
    </view>

    <!-- 中间凸起圆形 FAB -->
    <view class="v7-dock-fab" @click="go('/pages/create/create')">
      <xt-icon name="i-plus" :size="22" />
    </view>
  </view>
</template>

<script>
import XtIcon from '@/components/xt-icon/xt-icon.vue'

export default {
  name: 'V7Tabbar',
  components: { XtIcon },
  props: {
    active: { type: String, default: 'home' }
  },
  methods: {
    go(url) {
      uni.switchTab({ url })
    }
  }
}
</script>

<style lang="scss" scoped>
/* ===== V7 纸感手帐 · 悬浮 dock ===== */
.v7-dock {
  position: fixed;
  left: 14px;
  right: 14px;
  bottom: calc(8px + env(safe-area-inset-bottom));
  /* 宽屏下仍与 392px 内容列对齐，避免 dock 拉满整个窗口 */
  max-width: 364px;
  margin: 0 auto;
  height: 58px;
  display: flex;
  align-items: stretch;
  border-radius: 22px;
  background: rgba(255, 253, 250, 0.97);
  border: 1px solid rgba(30, 42, 36, 0.1);
  box-shadow: 0 14px 30px -18px rgba(24, 35, 29, 0.28), 0 2px 6px rgba(24, 35, 29, 0.04);
  z-index: 99;
}

/* 普通 tab：图标 + 文字 */
.v7-dock-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: #a2aaa3;
  transition: color 0.18s ease;
}
.v7-dock-tx {
  font-size: 9px;
  line-height: 1;
  letter-spacing: 0.2px;
}
.v7-dock-tab.on {
  color: #24493a;
}
.v7-dock-tab.on .v7-dock-tx {
  font-weight: 800;
}

/* 中间占位，与两侧 tab 等宽，让 FAB 正好落在正中 */
.v7-dock-gap {
  flex: 1;
}

/* 中间凸起 FAB */
.v7-dock-fab {
  position: absolute;
  left: 50%;
  top: -18px;
  width: 50px;
  height: 50px;
  margin-left: -25px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #24493a;
  color: #fffdfa;
  box-shadow: 0 14px 26px -14px rgba(36, 73, 58, 0.75), 0 2px 6px rgba(24, 35, 29, 0.12);
  transition: transform 0.16s cubic-bezier(0.22, 0.68, 0.32, 1);
}
.v7-dock-fab:active {
  transform: scale(0.94);
}
</style>
