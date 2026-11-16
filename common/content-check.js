/**
 * 内容安全前置检测（前端镜像）—— 安全合规批次
 * 与后端 server/app/utils/danger_sentiment.py / content_security.py 同源。
 * 用途：聊天发送、动态发布、世界创建、扭蛋剧本提交前的本地拦截，
 *      拦不下的时候后端还有同一道闸门兜底。
 */

// 高危信号词（自伤/自杀意图）
const DANGER_KEYWORDS = [
  '不想活', '想死', '自杀', '结束生命', '活不下去', '了结自己', '跳楼',
  '割腕', '吞安眠药', '安眠药', '想消失', '世界没有我更好', '没有我会更好',
  '撑不下去', '想解脱', '告别了', '最后一句话',
  'kill myself', 'suicide', 'end my life',
]

// 自残相关（次级）
const SELF_HARM_KEYWORDS = ['划自己', '伤害自己', '掐自己', '打自己', 'self-harm']

// 违规词分类（涉政/色情/暴恐违禁/赌博诈骗）
const BANNED_RULES = [
  {
    category: 'political',
    message: '内容包含涉政敏感信息，请修改后再发布',
    words: ['习近平', '毛泽东', '周恩来', '邓小平', '李克强', '李强', '胡锦涛', '温家宝',
      '江泽民', '党和政府', '共产党', '国民党', '法轮功', '六四', '天安门事件',
      '政变', '推翻政府', '颠覆国家', '台独', '港独', '藏独', '疆独'],
  },
  {
    category: 'porn',
    message: '内容包含低俗色情信息，请修改后再发布',
    words: ['约炮', '援交', '一夜情', '嫖娼', '卖淫', '裸聊', '福利姬',
      '强奸', '轮奸', '猥亵', '做爱', '打炮', '内射'],
  },
  {
    category: 'violence',
    message: '内容包含暴力违禁信息，请修改后再发布',
    words: ['制炸弹', '做炸弹', '制毒', '冰毒', '海洛因', '大麻', '买枪', '卖枪',
      '杀人偿命', '去杀死', '砍死他', '炸掉学校'],
  },
  {
    category: 'fraud',
    message: '内容包含赌博诈骗相关信息，请修改后再发布',
    words: ['博彩', '赌球', '六合彩', '网赌', '洗钱', '刷单兼职', '代开发票',
      '办假证', '套现', '博一下就翻本'],
  },
]

// 广告引流
const AD_PATTERNS = [
  /1[3-9]\d{9}/,
  /(加|薇信|威信|微信)\s*[:：]?\s*[a-zA-Z0-9_\-]{5,}/,
  /(https?:\/\/|www\.)\S+/,
]

const HOTLINES = [
  { name: '全国心理援助热线', phone: '400-161-9995', hours: '24小时' },
  { name: '北京心理危机研究与干预中心', phone: '010-82951332', hours: '24小时' },
  { name: '希望24热线', phone: '400-161-9995', hours: '24小时' },
]

/**
 * 高危情绪检测
 * @returns {{isDanger: boolean, level: string, keywords: string[], message: string, resources: Array}}
 */
export function checkDanger(text) {
  const t = (text || '').trim()
  const low = t.toLowerCase()
  if (!t) return { isDanger: false, level: 'none', keywords: [], message: '', resources: [] }

  const hit = (words) => words.filter(w =>
    /[a-zA-Z]/.test(w)
      ? new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(low)
      : t.includes(w)
  )

  const high = hit(DANGER_KEYWORDS)
  if (high.length) {
    return {
      isDanger: true, level: 'high', keywords: high,
      message: '我听到了你话里很沉重的信号。你此刻的感受很重要，但它不适合只由 AI 来承接。'
        + '下面这些 24 小时在线的专业热线，会有真人认真听你说话。',
      resources: HOTLINES,
    }
  }
  const harm = hit(SELF_HARM_KEYWORDS)
  if (harm.length) {
    return {
      isDanger: true, level: 'medium', keywords: harm,
      message: '你提到想伤害自己，我有点担心。不管发生了什么，先答应我对自己温柔一点。',
      resources: HOTLINES,
    }
  }
  return { isDanger: false, level: 'none', keywords: [], message: '', resources: [] }
}

/**
 * 违规内容检测（动态/世界/剧本/评论等提交前）
 * @returns {{ok: boolean, reason: string, category: string}}
 */
export function checkContent(text, maxLength = 2000) {
  const t = (text || '').trim()
  if (t.length > maxLength) {
    return { ok: false, reason: `内容过长（最多${maxLength}字）`, category: 'spam' }
  }
  for (const rule of BANNED_RULES) {
    if (rule.words.some(w => t.includes(w))) {
      return { ok: false, reason: rule.message, category: rule.category }
    }
  }
  if (AD_PATTERNS.some(re => re.test(t))) {
    return { ok: false, reason: '内容疑似广告引流信息，请修改后再发布', category: 'spam' }
  }
  return { ok: true, reason: '', category: '' }
}

export default { checkDanger, checkContent }
