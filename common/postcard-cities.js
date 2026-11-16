/**
 * 明信片风景素材表（static/images/postcard/）
 * 图集页与记录页共用，避免城市/图片映射在多处各写一份。
 */
export const POSTCARD_CITIES = [
  { city: '京都', en: 'KYOTO', img: '/static/images/postcard/kyoto.webp' },
  { city: '上海', en: 'SHANGHAI', img: '/static/images/postcard/shanghai.webp' },
  { city: '大理', en: 'DALI', img: '/static/images/postcard/dali.webp' },
  { city: '杭州', en: 'HANGZHOU', img: '/static/images/postcard/hangzhou.webp' },
  { city: '重庆', en: 'CHONGQING', img: '/static/images/postcard/chongqing.webp' },
  { city: '成都', en: 'CHENGDU', img: '/static/images/postcard/chengdu.webp' },
  { city: '西安', en: "XI'AN", img: '/static/images/postcard/xian.webp' },
  { city: '苏州', en: 'SUZHOU', img: '/static/images/postcard/suzhou.webp' },
  { city: '青岛', en: 'QINGDAO', img: '/static/images/postcard/qingdao.webp' },
  { city: '厦门', en: 'XIAMEN', img: '/static/images/postcard/xiamen.webp' },
  { city: '哈尔滨', en: 'HARBIN', img: '/static/images/postcard/harbin.webp' },
  { city: '长沙', en: 'CHANGSHA', img: '/static/images/postcard/changsha.webp' },
  { city: '泉州', en: 'QUANZHOU', img: '/static/images/postcard/quanzhou.webp' },
  { city: '洛阳', en: 'LUOYANG', img: '/static/images/postcard/luoyang.webp' },
  { city: '景德镇', en: 'JINGDEZHEN', img: '/static/images/postcard/jingdezhen.webp' },
  { city: '阿勒泰', en: 'ALTAY', img: '/static/images/postcard/altay.webp' },
  { city: '敦煌', en: 'DUNHUANG', img: '/static/images/postcard/dunhuang.webp' },
  { city: '桂林', en: 'GUILIN', img: '/static/images/postcard/guilin.webp' },
  { city: '南京', en: 'NANJING', img: '/static/images/postcard/nanjing.webp' },
  { city: '汕头', en: 'SHANTOU', img: '/static/images/postcard/shantou.webp' },
  { city: '拉萨', en: 'LHASA', img: '/static/images/postcard/lhasa.webp' },
  { city: '喀什', en: 'KASHGAR', img: '/static/images/postcard/kashi.webp' },
  { city: '张家界', en: 'ZHANGJIAJIE', img: '/static/images/postcard/zhangjiajie.webp' },
  { city: '伊犁', en: 'ILI', img: '/static/images/postcard/yili.webp' },
  { city: '婺源', en: 'WUYUAN', img: '/static/images/postcard/wuyuan.webp' },
  { city: '平遥', en: 'PINGYAO', img: '/static/images/postcard/pingyao.webp' },
  { city: '霞浦', en: 'XIAPU', img: '/static/images/postcard/xiapu.webp' },
  { city: '扬州', en: 'YANGZHOU', img: '/static/images/postcard/yangzhou.webp' }
]

/** 按城市名找风景图（记录里只存了城市名） */
export function findCity(name) {
  if (!name) return null
  return POSTCARD_CITIES.find(c => c.city === name) || null
}

export default POSTCARD_CITIES
