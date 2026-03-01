/**
 * 应用主模块 - 初始化、事件绑定、流程编排
 */

document.addEventListener('DOMContentLoaded', () => {
  // 初始化一行银行方案
  addBankRow();

  // 绑定买家资料变更事件
  document.querySelectorAll('input[name="buyerType"]').forEach(el => {
    el.addEventListener('change', updateInfoBadges);
  });
  document.querySelectorAll('input[name="propNum"]').forEach(el => {
    el.addEventListener('change', updateInfoBadges);
  });
  document.getElementById('buyer-age').addEventListener('input', updateInfoBadges);

  // 绑定房价变更事件
  document.getElementById('property-price').addEventListener('input', updateDerivedInfo);

  // 添加银行按钮
  document.getElementById('btn-add-bank').addEventListener('click', addBankRow);

  // 计算按钮
  document.getElementById('btn-calculate').addEventListener('click', handleCalculate);

  // 重置按钮
  document.getElementById('btn-reset').addEventListener('click', handleReset);

  // 初始化提示信息
  updateInfoBadges();
});

function handleCalculate() {
  clearErrors();

  // 收集输入
  const buyerType = document.querySelector('input[name="buyerType"]:checked').value;
  const propNum = parseInt(document.querySelector('input[name="propNum"]:checked').value);
  const price = parseFloat(document.getElementById('property-price').value);
  const age = parseInt(document.getElementById('buyer-age').value);
  const bankPackages = getBankPackages();

  // 验证
  if (!price || price <= 0) {
    showFieldError(document.getElementById('property-price'), '请输入有效的房产价格');
    return;
  }

  if (!age || age < 21 || age > 99) {
    showFieldError(document.getElementById('buyer-age'), '年龄需在21-99之间');
    return;
  }

  const maxLoan = calculateMaxLoan(price, propNum);
  const maxTenure = calculateMaxTenure(age);

  // 验证每个银行方案
  let hasError = false;
  bankPackages.forEach((pkg, i) => {
    const row = document.querySelectorAll('.bank-row')[i];
    if (!row) return;

    if (!pkg.rate || pkg.rate <= 0 || pkg.rate > 20) {
      showFieldError(row.querySelector('.bank-rate'), '利率需在0.01-20%之间');
      hasError = true;
    }

    if (!pkg.loanAmount || pkg.loanAmount <= 0) {
      showFieldError(row.querySelector('.bank-loan'), '请输入有效的贷款金额');
      hasError = true;
    } else if (pkg.loanAmount > maxLoan.maxLoan) {
      showFieldError(row.querySelector('.bank-loan'),
        `超出LTV限制，最高 ${formatCurrency(maxLoan.maxLoan)}`);
      hasError = true;
    }

    if (!pkg.tenure || pkg.tenure < 1) {
      showFieldError(row.querySelector('.bank-tenure'), '请输入有效的贷款年限');
      hasError = true;
    } else if (pkg.tenure > maxTenure) {
      showFieldError(row.querySelector('.bank-tenure'),
        `年龄+年限不能超过65，最长 ${maxTenure}年`);
      hasError = true;
    }
  });

  if (hasError) return;

  // 计算 - 前期费用使用第一个银行方案的贷款额
  const upfront = calculateUpfrontCosts(price, buyerType, propNum, bankPackages[0].loanAmount);
  const comparison = compareBankPackages(bankPackages);

  // 渲染结果
  renderUpfrontCosts(upfront);
  renderLoanComparison(comparison);
  renderTDSRInfo(comparison);
  renderAmortizationSchedule(comparison);
  showResults();

  // 滚动到结果
  setTimeout(() => {
    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
  }, 100);
}

function handleReset() {
  // 重置买家资料
  document.querySelector('input[name="buyerType"][value="PR"]').checked = true;
  document.querySelector('input[name="propNum"][value="1"]').checked = true;
  document.getElementById('buyer-age').value = 35;
  document.getElementById('property-price').value = 6000000;

  // 重置银行行
  resetBankRows();

  // 清除错误和结果
  clearErrors();
  hideResults();

  // 更新提示
  updateInfoBadges();
}
