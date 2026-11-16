<template>
  <!-- 设计稿线性图标：内部 path 来自 home-redesign-all-pages.html 的 sprite -->
  <view class="ic" :style="sizeStyle" v-html="svg"></view>
</template>

<script>
const PATHS = {
  'i-home': '<path d="M3.5 10.5 12 3.5l8.5 7v9.5a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z"/>',
  'i-compass': '<circle cx="12" cy="12" r="8.6"/><path d="M15.4 8.6l-2 5.3-5.3 2 2-5.3z"/>',
  'i-plus': '<path d="M12 5v14M5 12h14"/>',
  'i-chat': '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.9 9.9 0 0 1-4-.9L3 21l1.9-4.6A8.4 8.4 0 1 1 21 11.5z"/>',
  'i-user': '<circle cx="12" cy="8.2" r="3.6"/><path d="M4.8 20a7.2 7.2 0 0 1 14.4 0"/>',
  'i-search': '<circle cx="10.8" cy="10.8" r="6.8"/><path d="M16 16l4.5 4.5"/>',
  'i-bell': '<path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6"/><path d="M10 19a2.2 2.2 0 0 0 4 0"/>',
  'i-moon': '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  'i-book': '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20"/>',
  'i-water': '<path d="M12 3s6 6.2 6 10.2a6 6 0 0 1-12 0C6 9.2 12 3 12 3z"/>',
  'i-check': '<path d="M4 12.5l5 5L20 6.5"/>',
  'i-arrow': '<path d="M5 12h14M13 6l6 6-6 6"/>',
  'i-right': '<path d="M9 5l7 7-7 7"/>',
  'i-left': '<path d="M15 5l-7 7 7 7"/>',
  'i-world': '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.3 3.6 8.5S14.4 18.1 12 20.5c-2.4-2.4-3.6-5.3-3.6-8.5S9.6 5.9 12 3.5z"/>',
  'i-gacha': '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M4 12h16M12 8V4M9 4h6"/><circle cx="12" cy="16" r="2"/>',
  'i-calendar': '<rect x="3.5" y="5" width="17" height="16" rx="3"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
  'i-moments': '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.3 3.6 8.5S14.4 18.1 12 20.5c-2.4-2.4-3.6-5.3-3.6-8.5S9.6 5.9 12 3.5z"/>',
  'i-spark': '<path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z"/>',
  'i-focus': '<circle cx="12" cy="13" r="8"/><path d="M9 2h6M12 5v2M12 13l3-2"/>',
  'i-tool': '<path d="M14.5 6.5a4 4 0 0 0 5 5L11 20a2.8 2.8 0 0 1-4-4z"/><path d="M13 8l3 3"/>',
  'i-heart': '<path d="M12 20.5S4.5 15.8 3 11.6A5 5 0 0 1 12 7a5 5 0 0 1 9 4.6c-1.5 4.2-9 8.9-9 8.9z"/>',
  'i-clock': '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.5V12l3 2"/>',
  'i-settings': '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.3 2.6a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L5 10.9a7 7 0 0 0 0 2.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 2.6h5l.3-2.6a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6a7 7 0 0 0 .1-1z"/>',
  'i-edit': '<path d="M4 20h4l10-10-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  'i-brain': '<path d="M9.5 3.5A3.5 3.5 0 0 0 6 7v.6A3 3 0 0 0 5 13v4a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-4a3 3 0 0 0-1-2.4V7a3.5 3.5 0 0 0-3.5-3.5z"/><path d="M12 3.5v16"/>',
  'i-archive': '<rect x="3.5" y="5" width="17" height="4" rx="1.5"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/>',
  'i-call': '<path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A17 17 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/>',
  'i-send': '<path d="M4 12l16-8-6 16-2.5-6.5z"/>',
  'i-share': '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>'
}

export default {
  name: 'XtIcon',
  props: {
    name: { type: String, default: 'i-spark' },
    // 传入后覆盖默认 18px，可传数字(px)或带单位字符串
    size: { type: [Number, String], default: 0 }
  },
  computed: {
    sizeStyle() {
      if (!this.size) return ''
      const v = typeof this.size === 'number' ? this.size + 'px' : this.size
      return `width:${v};height:${v};`
    },
    svg() {
      const p = PATHS[this.name] || ''
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:block;width:100%;height:100%">${p}</svg>`
    }
  }
}
</script>
