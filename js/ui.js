/**
 * UI 渲染模块 - DOM操作和结果展示
 */

/** 格式化为SGD金额 */
function formatCurrency(amount) {
  return 'SGD ' + Math.round(amount).toLocaleString('en-SG');
}

/** 格式化百分比 */
function formatPercent(rate) {
  return (rate * 100).toFixed(1) + '%';
}

/** 格式化利率百分比（输入已经是百分比数值） */
function formatRate(rate) {
  return rate.toFixed(2) + '%';
}

// ========== 银行行管理 ==========

let bankRowCount = 0;

function createBankRowHTML(index) {
  return `
    <div class="bank-row" data-bank-index="${index}">
      <div class="form-group">
        <label>银行名称</label>
        <input type="text" class="input-field bank-name" placeholder="如: DBS, OCBC..." value="方案 ${index + 1}">
      </div>
      <div class="form-group">
        <label>年利率 (%)</label>
        <input type="number" class="input-field bank-rate" value="3.50" min="0.01" max="20" step="0.01">
      </div>
      <div class="form-group">
        <label>贷款金额 (SGD)</label>
        <input type="number" class="input-field bank-loan" value="4500000" min="1" step="10000">
      </div>
      <div class="form-group">
        <label>年限</label>
        <input type="number" class="input-field bank-tenure" value="30" min="1" max="30">
      </div>
      <button type="button" class="btn-remove" onclick="removeBankRow(${index})" title="删除">&times;</button>
    </div>
  `;
}

function addBankRow() {
  const container = document.getElementById('bank-rows');
  if (bankRowCount >= 5) return;

  const div = document.createElement('div');
  div.innerHTML = createBankRowHTML(bankRowCount);
  container.appendChild(div.firstElementChild);
  bankRowCount++;

  updateBankRowButtons();
  if (typeof saveToStorage === 'function') saveToStorage();
}

function removeBankRow(index) {
  const row = document.querySelector(`.bank-row[data-bank-index="${index}"]`);
  if (row) row.remove();
  bankRowCount--;
  updateBankRowButtons();
  if (typeof saveToStorage === 'function') saveToStorage();
}

function updateBankRowButtons() {
  const addBtn = document.getElementById('btn-add-bank');
  if (addBtn) {
    addBtn.style.display = bankRowCount >= 5 ? 'none' : '';
  }

  // 只有1行时隐藏删除按钮
  const removeButtons = document.querySelectorAll('.btn-remove');
  removeButtons.forEach(btn => {
    btn.style.visibility = bankRowCount <= 1 ? 'hidden' : 'visible';
  });
}

function getBankPackages() {
  const rows = document.querySelectorAll('.bank-row');
  const packages = [];

  rows.forEach(row => {
    packages.push({
      bankName: row.querySelector('.bank-name').value || '未命名',
      rate: parseFloat(row.querySelector('.bank-rate').value) || 0,
      loanAmount: parseFloat(row.querySelector('.bank-loan').value) || 0,
      tenure: parseInt(row.querySelector('.bank-tenure').value) || 0,
    });
  });

  return packages;
}

function resetBankRows() {
  document.getElementById('bank-rows').innerHTML = '';
  bankRowCount = 0;
  addBankRow();
}

// ========== 实时提示更新 ==========

function updateInfoBadges() {
  const buyerType = document.querySelector('input[name="buyerType"]:checked').value;
  const propNum = parseInt(document.querySelector('input[name="propNum"]:checked').value);
  const propNumKey = Math.min(propNum, 3);

  const absdRate = SG_PROPERTY.ABSD_RATES[buyerType][propNumKey];
  const ltvRatio = SG_PROPERTY.LTV_LIMITS[propNumKey];

  document.getElementById('absd-badge').textContent = `ABSD: ${formatPercent(absdRate)}`;
  document.getElementById('ltv-badge').textContent = `LTV上限: ${formatPercent(ltvRatio)}`;

  updateDerivedInfo();
  updateMaxTenureHint();
}

function updateDerivedInfo() {
  const price = parseFloat(document.getElementById('property-price').value) || 0;
  const propNum = parseInt(document.querySelector('input[name="propNum"]:checked').value);
  const loanInfo = calculateMaxLoan(price, propNum);

  document.getElementById('max-loan-display').textContent = formatCurrency(loanInfo.maxLoan);
  document.getElementById('min-down-display').textContent = formatCurrency(loanInfo.minDownPayment);
}

function updateMaxTenureHint() {
  const age = parseInt(document.getElementById('buyer-age').value) || 35;
  const maxTenure = calculateMaxTenure(age);
  document.getElementById('max-tenure-hint').textContent = `最长贷款年限: ${maxTenure}年`;
}

// ========== 结果渲染 ==========

function renderUpfrontCosts(costs) {
  const container = document.getElementById('upfront-costs');

  // BSD明细表
  let bsdRows = costs.bsd.breakdown.map(tier =>
    `<tr>
      <td>${formatCurrency(tier.from)} ~ ${tier.to === Infinity ? '以上' : formatCurrency(tier.to)}</td>
      <td>${(tier.rate * 100).toFixed(0)}%</td>
      <td>${formatCurrency(tier.amount)}</td>
      <td class="highlight">${formatCurrency(tier.duty)}</td>
    </tr>`
  ).join('');

  // 费用汇总条形图数据
  const barItems = [
    { label: 'BSD 印花税', value: costs.bsd.total, color: '#e67e22' },
    { label: 'ABSD 额外印花税', value: costs.absd.amount, color: '#c0392b' },
    { label: '首付款', value: costs.downPayment, color: '#2980b9' },
    { label: '律师费 (估)', value: (costs.legalFees.min + costs.legalFees.max) / 2, color: '#95a5a6' },
    { label: '估值费 (估)', value: (costs.valuationFee.min + costs.valuationFee.max) / 2, color: '#bdc3c7' },
  ];

  const maxVal = Math.max(...barItems.map(i => i.value));
  const barsHTML = barItems.map(item => `
    <div class="cost-bar-row">
      <span class="cost-bar-label">${item.label}</span>
      <div class="cost-bar-track">
        <div class="cost-bar-fill" style="width:${(item.value / maxVal * 100).toFixed(1)}%;background:${item.color}"></div>
      </div>
      <span class="cost-bar-value">${formatCurrency(item.value)}</span>
    </div>
  `).join('');

  container.innerHTML = `
    <h3 style="font-size:0.95rem;margin-bottom:12px;color:var(--text)">BSD 印花税分档明细</h3>
    <table class="result-table">
      <thead>
        <tr><th>房价区间</th><th>税率</th><th>应税金额</th><th>税额</th></tr>
      </thead>
      <tbody>
        ${bsdRows}
        <tr class="total-row">
          <td colspan="3">BSD 合计</td>
          <td>${formatCurrency(costs.bsd.total)}</td>
        </tr>
      </tbody>
    </table>

    <h3 style="font-size:0.95rem;margin:24px 0 12px;color:var(--text)">前期费用构成</h3>
    <div class="cost-bar-group">${barsHTML}</div>

    <div class="summary-box">
      <div class="summary-item">
        <div class="label">印花税合计 (BSD + ABSD)</div>
        <div class="amount">${formatCurrency(costs.stampDutyTotal)}</div>
      </div>
      <div class="summary-item">
        <div class="label">首付款</div>
        <div class="amount">${formatCurrency(costs.downPayment)}</div>
      </div>
      <div class="summary-item warning">
        <div class="label">总需准备现金</div>
        <div class="amount">${formatCurrency(costs.totalCashNeeded.min)} ~ ${formatCurrency(costs.totalCashNeeded.max)}</div>
      </div>
    </div>
  `;
}

function renderLoanComparison(results) {
  const container = document.getElementById('loan-comparison');

  if (results.length === 0) {
    container.innerHTML = '<p>无贷款方案</p>';
    return;
  }

  const headerCells = results.map(r => `<th>${r.bankName}</th>`).join('');

  function row(label, getter, isCurrency = true) {
    const cells = results.map(r => {
      const val = getter(r);
      const formatted = isCurrency ? formatCurrency(val) : val;
      let cls = '';
      if (results.length > 1) {
        if (getter === getMonthly && r.isBestMonthly) cls = 'best';
        if (getter === getInterest && r.isBestInterest) cls = 'best';
        if (getter === getTotal && r.isBestTotal) cls = 'best';
      }
      return `<td class="${cls}">${formatted}</td>`;
    }).join('');
    return `<tr><td><strong>${label}</strong></td>${cells}</tr>`;
  }

  const getMonthly = r => r.monthlyPayment;
  const getInterest = r => r.totalInterest;
  const getTotal = r => r.totalRepayment;

  container.innerHTML = `
    <table class="result-table">
      <thead>
        <tr><th>指标</th>${headerCells}</tr>
      </thead>
      <tbody>
        ${row('年利率', r => formatRate(r.rate), false)}
        ${row('贷款金额', r => r.loanAmount)}
        ${row('贷款年限', r => r.tenure + '年', false)}
        ${row('月供', getMonthly)}
        ${row('年供', r => r.yearlyPayment)}
        ${row('总利息', getInterest)}
        ${row('总还款额', getTotal)}
      </tbody>
    </table>
  `;
}

function renderTDSRInfo(results) {
  const container = document.getElementById('tdsr-info');

  const items = results.map(r => {
    const minIncome = calculateMinIncome(r.monthlyPayment);
    return `
      <div class="tdsr-card" style="margin-bottom:10px">
        <span class="icon">&#128200;</span>
        <div class="tdsr-text">
          <strong>${r.bankName}</strong>: 月供 ${formatCurrency(r.monthlyPayment)}，
          根据TDSR 55%上限，月收入需至少 <strong>${formatCurrency(minIncome)}</strong>
          （年收入约 ${formatCurrency(minIncome * 12)}）
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = items;
}

function renderAmortizationSchedule(results) {
  const container = document.getElementById('amortization-schedule');

  const accordions = results.map((r, idx) => {
    const rows = r.yearlySchedule.map(y => `
      <tr>
        <td>${y.year}</td>
        <td>${formatCurrency(y.openingBalance)}</td>
        <td>${formatCurrency(y.interestPaid)}</td>
        <td>${formatCurrency(y.principalPaid)}</td>
        <td>${formatCurrency(y.closingBalance)}</td>
      </tr>
    `).join('');

    return `
      <div class="accordion" id="accordion-${idx}">
        <div class="accordion-header" onclick="toggleAccordion(${idx})">
          <span>${r.bankName} - ${formatRate(r.rate)} / ${r.tenure}年</span>
          <span class="arrow">&#9660;</span>
        </div>
        <div class="accordion-body">
          <div class="table-scroll">
            <table class="result-table">
              <thead>
                <tr><th>年份</th><th>期初余额</th><th>年利息</th><th>年本金</th><th>期末余额</th></tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = accordions;
}

function toggleAccordion(index) {
  const el = document.getElementById(`accordion-${index}`);
  el.classList.toggle('open');
}

// ========== 显示/隐藏结果 ==========

function showResults() {
  document.getElementById('results').classList.remove('hidden');
}

function hideResults() {
  document.getElementById('results').classList.add('hidden');
}

// ========== 验证 ==========

function clearErrors() {
  document.querySelectorAll('.input-field.error').forEach(el => el.classList.remove('error'));
  document.querySelectorAll('.error-msg').forEach(el => el.remove());
}

function showFieldError(inputEl, message) {
  inputEl.classList.add('error');
  const msg = document.createElement('div');
  msg.className = 'error-msg';
  msg.textContent = message;
  inputEl.parentNode.appendChild(msg);
}
