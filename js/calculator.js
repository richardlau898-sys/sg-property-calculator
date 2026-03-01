/**
 * 核心计算引擎 - 纯函数，无DOM依赖
 */

/** 计算 BSD 印花税（累进税率） */
function calculateBSD(price) {
  let total = 0;
  let previousLimit = 0;
  const breakdown = [];

  for (const tier of SG_PROPERTY.BSD_TIERS) {
    if (price <= previousLimit) break;

    const taxableInTier = Math.min(price, tier.upTo) - previousLimit;
    const duty = taxableInTier * tier.rate;

    breakdown.push({
      from: previousLimit,
      to: Math.min(price, tier.upTo),
      amount: taxableInTier,
      rate: tier.rate,
      duty: duty,
    });

    total += duty;
    previousLimit = tier.upTo;
  }

  return { total, breakdown };
}

/** 计算 ABSD 额外印花税 */
function calculateABSD(price, buyerType, propertyNumber) {
  const propNum = Math.min(propertyNumber, 3);
  const rate = SG_PROPERTY.ABSD_RATES[buyerType][propNum];
  return { rate, amount: price * rate };
}

/** 计算 LTV 限制和最高贷款额 */
function calculateMaxLoan(price, propertyNumber) {
  const propNum = Math.min(propertyNumber, 3);
  const ltvRatio = SG_PROPERTY.LTV_LIMITS[propNum];
  return {
    ltvRatio,
    maxLoan: price * ltvRatio,
    minDownPayment: price * (1 - ltvRatio),
  };
}

/** 计算最长贷款年限 */
function calculateMaxTenure(age) {
  const byAge = SG_PROPERTY.MAX_AGE_PLUS_TENURE - age;
  return Math.max(0, Math.min(byAge, SG_PROPERTY.MAX_TENURE_YEARS));
}

/** 计算月供（等额本息） */
function calculateMonthlyPayment(principal, annualRate, tenureYears) {
  const r = annualRate / 100 / 12;
  const n = tenureYears * 12;

  if (r === 0) return principal / n;

  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/** 生成逐年摊还计划 */
function generateAmortizationSchedule(principal, annualRate, tenureYears) {
  const r = annualRate / 100 / 12;
  const n = tenureYears * 12;
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, tenureYears);

  let balance = principal;
  const yearly = [];
  let totalInterest = 0;

  for (let year = 1; year <= tenureYears; year++) {
    let yearInterest = 0;
    let yearPrincipal = 0;
    const openingBalance = balance;

    for (let month = 1; month <= 12; month++) {
      const monthIndex = (year - 1) * 12 + month;
      if (monthIndex > n) break;

      const interestPortion = balance * r;
      const principalPortion = monthlyPayment - interestPortion;

      yearInterest += interestPortion;
      yearPrincipal += principalPortion;
      balance -= principalPortion;
    }

    if (year === tenureYears) balance = 0;

    totalInterest += yearInterest;

    yearly.push({
      year,
      openingBalance,
      interestPaid: yearInterest,
      principalPaid: yearPrincipal,
      closingBalance: Math.max(0, balance),
    });
  }

  return {
    monthlyPayment,
    totalInterest,
    totalRepayment: principal + totalInterest,
    yearlySchedule: yearly,
  };
}

/** 计算前期费用汇总 */
function calculateUpfrontCosts(price, buyerType, propertyNumber, loanAmount) {
  const bsd = calculateBSD(price);
  const absd = calculateABSD(price, buyerType, propertyNumber);
  const downPayment = price - loanAmount;

  const totalMin = bsd.total + absd.amount + downPayment
    + SG_PROPERTY.LEGAL_FEES.min + SG_PROPERTY.VALUATION_FEE.min;
  const totalMax = bsd.total + absd.amount + downPayment
    + SG_PROPERTY.LEGAL_FEES.max + SG_PROPERTY.VALUATION_FEE.max;

  return {
    bsd,
    absd,
    downPayment,
    legalFees: SG_PROPERTY.LEGAL_FEES,
    valuationFee: SG_PROPERTY.VALUATION_FEE,
    stampDutyTotal: bsd.total + absd.amount,
    totalCashNeeded: { min: totalMin, max: totalMax },
  };
}

/** 多银行方案对比 */
function compareBankPackages(packages) {
  const results = packages.map(pkg => {
    const amort = generateAmortizationSchedule(pkg.loanAmount, pkg.rate, pkg.tenure);
    return {
      bankName: pkg.bankName,
      rate: pkg.rate,
      loanAmount: pkg.loanAmount,
      tenure: pkg.tenure,
      monthlyPayment: amort.monthlyPayment,
      yearlyPayment: amort.monthlyPayment * 12,
      totalInterest: amort.totalInterest,
      totalRepayment: amort.totalRepayment,
      yearlySchedule: amort.yearlySchedule,
    };
  });

  if (results.length > 1) {
    const bestMonthly = Math.min(...results.map(r => r.monthlyPayment));
    const bestInterest = Math.min(...results.map(r => r.totalInterest));
    const bestTotal = Math.min(...results.map(r => r.totalRepayment));

    results.forEach(r => {
      r.isBestMonthly = Math.abs(r.monthlyPayment - bestMonthly) < 0.01;
      r.isBestInterest = Math.abs(r.totalInterest - bestInterest) < 0.01;
      r.isBestTotal = Math.abs(r.totalRepayment - bestTotal) < 0.01;
    });
  }

  return results;
}

/** 计算TDSR所需最低月收入 */
function calculateMinIncome(monthlyPayment) {
  return monthlyPayment / SG_PROPERTY.TDSR_CAP;
}
