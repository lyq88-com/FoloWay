/**
 * 设计稿角色照片（home-assets 已落到 static/images/home）
 * 首页 hero、头像行、全局 AI 悬浮球、角色选择、群聊头像共用
 * 全部 20 位伙伴立绘，统一命名为 {id}.jpg
 */
export const ROLE_PHOTOS = {
  linxi: '/static/images/home/linxi.jpg',
  mianmian: '/static/images/home/mianmian.jpg',
  yuki: '/static/images/home/yuki.jpg',
  kira: '/static/images/home/kira.jpg',
  yueqing: '/static/images/home/yueqing.jpg',
  fengye: '/static/images/home/fengye.jpg',
  nova: '/static/images/home/nova.jpg',
  zero: '/static/images/home/zero.jpg',
  xingchen: '/static/images/home/xingchen.jpg',
  muhan: '/static/images/home/muhan.jpg',
  qinghe: '/static/images/home/qinghe.jpg',
  chenfeng: '/static/images/home/chenfeng.jpg',
  sunny: '/static/images/home/sunny.jpg',
  lele: '/static/images/home/lele.jpg',
  linglong: '/static/images/home/linglong.jpg',
  baihu: '/static/images/home/baihu.jpg',
  qinglan: '/static/images/home/qinglan.jpg',
  xuanwu: '/static/images/home/xuanwu.jpg',
  huoyun: '/static/images/home/huoyun.jpg',
  linling: '/static/images/home/linling.jpg'
}

/**
 * 头部特写头像（480x480，脸部居中），用于所有小尺寸圆形头像，
 * 避免把整张立绘塞进小圆里导致的「模糊、像贴图」问题
 */
export const ROLE_AVATARS = {
  linxi: '/static/images/avatar/linxi.jpg',
  mianmian: '/static/images/avatar/mianmian.jpg',
  yuki: '/static/images/avatar/yuki.jpg',
  kira: '/static/images/avatar/kira.jpg',
  yueqing: '/static/images/avatar/yueqing.jpg',
  fengye: '/static/images/avatar/fengye.jpg',
  nova: '/static/images/avatar/nova.jpg',
  zero: '/static/images/avatar/zero.jpg',
  xingchen: '/static/images/avatar/xingchen.jpg',
  muhan: '/static/images/avatar/muhan.jpg',
  qinghe: '/static/images/avatar/qinghe.jpg',
  chenfeng: '/static/images/avatar/chenfeng.jpg',
  sunny: '/static/images/avatar/sunny.jpg',
  lele: '/static/images/avatar/lele.jpg',
  linglong: '/static/images/avatar/linglong.jpg',
  baihu: '/static/images/avatar/baihu.jpg',
  qinglan: '/static/images/avatar/qinglan.jpg',
  xuanwu: '/static/images/avatar/xuanwu.jpg',
  huoyun: '/static/images/avatar/huoyun.jpg',
  linling: '/static/images/avatar/linling.jpg'
}

/**
 * 首页主视觉专用的上半身立绘（824x960），构图比整张立绘更近，
 * 放到 206x240 的卡片里人物更大更清晰
 */
export const ROLE_HEROES = {
  linxi: '/static/images/hero/linxi.jpg',
  mianmian: '/static/images/hero/mianmian.jpg',
  yuki: '/static/images/hero/yuki.jpg',
  kira: '/static/images/hero/kira.jpg',
  yueqing: '/static/images/hero/yueqing.jpg',
  fengye: '/static/images/hero/fengye.jpg',
  nova: '/static/images/hero/nova.jpg',
  zero: '/static/images/hero/zero.jpg',
  xingchen: '/static/images/hero/xingchen.jpg',
  muhan: '/static/images/hero/muhan.jpg',
  qinghe: '/static/images/hero/qinghe.jpg',
  chenfeng: '/static/images/hero/chenfeng.jpg',
  sunny: '/static/images/hero/sunny.jpg',
  lele: '/static/images/hero/lele.jpg',
  linglong: '/static/images/hero/linglong.jpg',
  baihu: '/static/images/hero/baihu.jpg',
  qinglan: '/static/images/hero/qinglan.jpg',
  xuanwu: '/static/images/hero/xuanwu.jpg',
  huoyun: '/static/images/hero/huoyun.jpg',
  linling: '/static/images/hero/linling.jpg'
}

export function getRolePhoto(id) {
  return ROLE_PHOTOS[id] || ''
}

export function getRoleAvatar(id) {
  return ROLE_AVATARS[id] || ''
}

export function getRoleHero(id) {
  return ROLE_HEROES[id] || ''
}
