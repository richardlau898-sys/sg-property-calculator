/**
 * 新加坡房产政策数据 (2025-2026)
 * 数据来源: IRAS, MAS
 * 更新税率时只需修改此文件
 */

const SG_PROPERTY = Object.freeze({
  // BSD 印花税累进税率 (2023年2月15日起)
  // upTo 为累计上限
  BSD_TIERS: Object.freeze([
    { upTo: 180000,   rate: 0.01 },  // 首 $180,000: 1%
    { upTo: 360000,   rate: 0.02 },  // 接下来 $180,000: 2%
    { upTo: 1000000,  rate: 0.03 },  // 接下来 $640,000: 3%
    { upTo: 1500000,  rate: 0.04 },  // 接下来 $500,000: 4%
    { upTo: 3000000,  rate: 0.05 },  // 接下来 $1,500,000: 5%
    { upTo: Infinity, rate: 0.06 },  // 超出部分: 6%
  ]),

  // ABSD 额外印花税 (2023年4月27日起)
  // key: 买家身份, value: { 第几套: 税率 }
  ABSD_RATES: Object.freeze({
    SC:        Object.freeze({ 1: 0.00, 2: 0.20, 3: 0.30 }),
    PR:        Object.freeze({ 1: 0.05, 2: 0.30, 3: 0.35 }),
    FOREIGNER: Object.freeze({ 1: 0.60, 2: 0.60, 3: 0.60 }),
  }),

  // LTV 贷款价值比上限
  LTV_LIMITS: Object.freeze({
    1: 0.75,  // 第一套: 75%
    2: 0.45,  // 第二套: 45%
    3: 0.35,  // 第三套及以上: 35%
  }),

  MAX_TENURE_YEARS: 30,
  MAX_AGE_PLUS_TENURE: 65,
  TDSR_CAP: 0.55,

  LEGAL_FEES: Object.freeze({ min: 2500, max: 3500 }),
  VALUATION_FEE: Object.freeze({ min: 300, max: 500 }),

  // 中文标签
  LABELS: Object.freeze({
    SC: '新加坡公民',
    PR: '永久居民 (PR)',
    FOREIGNER: '外国人',
  }),
});
