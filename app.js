// STORAGE KEYS
const STORAGE_KEY = 'miraConti_transactions_v2';
const DEPOSITS_KEY = 'miraConti_deposits_v2';

// DATA
let transactions = [];
let deposits = [];
let currentFilter = 'all';
let editingId = null;

// CHARTS
let beerChart = null;
let categoryChart = null;
let incomeExpenseChart = null;

// ELEMENTS
const fab = document.getElementById('fab');
const quickMenu = document.getElementById('quick-menu');
const modalTransaction = document.getElementById('modal-transaction');
const modalDeposit = document.getElementById('modal-deposit');
const modalDepositManage = document.getElementById('modal-deposit-manage');
const formTransaction = document.getElementById('form-transaction');
const formDeposit = document.getElementById('form-deposit');

// FORMATTER
const fmt = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

// ============================================
// INIT
// ============================================
function init() {
  loadData();
  setupEventListeners();
  render();
  registerServiceWorker();
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
      .then(() => console.log('✅ Service Worker registrato'))
      .catch(err => console.log('❌ Service Worker fallito:', err));
  }
}

function loadData() {
  transactions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  deposits = JSON.parse(localStorage.getItem(DEPOSITS_KEY) || '[]');
  
  // Depositi di default
  if (deposits.length === 0) {
    deposits = [
      { id: 'risparmi', name: 'Risparmi', color: '#10b981' },
      { id: 'vacanze', name: 'Vacanze', color: '#f59e0b' },
      { id: 'emergenze', name: 'Emergenze', color: '#ef4444' }
    ];
    saveDeposits();
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function saveDeposits() {
  localStorage.setItem(DEPOSITS_KEY, JSON.stringify(deposits));
}

function toggleModal(modal, show = true) {
  if (show) {
    modal.classList.add('show');
  } else {
    modal.classList.remove('show');
  }
}

function addEventToElements(selector, event, handler) {
  document.querySelectorAll(selector).forEach(el => el.addEventListener(event, handler));
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
  // FAB - Long press per quick menu
  let pressTimer;
  const toggleQuickMenu = () => quickMenu.classList.toggle('show');

  fab.addEventListener('mousedown', () => {
    pressTimer = setTimeout(toggleQuickMenu, 300);
  });
  fab.addEventListener('mouseup', () => clearTimeout(pressTimer));
  
  fab.addEventListener('click', (e) => {
    if (!quickMenu.classList.contains('show')) {
      openTransactionModal('expense');
    }
  });
  
  // Touch events per mobile
  fab.addEventListener('touchstart', (e) => {
    e.preventDefault();
    pressTimer = setTimeout(toggleQuickMenu, 300);
  });
  
  fab.addEventListener('touchend', () => clearTimeout(pressTimer));
  
  // Quick menu items
  addEventToElements('.quick-item', 'click', (e) => {
    const action = e.currentTarget.dataset.action;
    quickMenu.classList.remove('show');
    openTransactionModal(action);
  });
  
  // Close quick menu on outside click
  document.addEventListener('click', (e) => {
    if (!fab.contains(e.target) && !quickMenu.contains(e.target)) {
      quickMenu.classList.remove('show');
    }
  });
  
  // Wallet card buttons
  addEventToElements('.card-btn', 'click', (e) => {
    e.stopPropagation();
    openTransactionModal(e.target.dataset.action, null, e.target.dataset.method);
  });
  
  // Modali transazione
  document.getElementById('btn-cancel').addEventListener('click', () => closeTransactionModal());
  formTransaction.addEventListener('submit', handleTransactionSubmit);
  document.getElementById('btn-delete').addEventListener('click', handleDelete);
  
  // Event listener per cambio tipo e categoria
  document.getElementById('input-type').addEventListener('change', handleTypeChange);
  document.getElementById('input-category').addEventListener('change', handleCategoryChange);
  
  // Modali deposito creazione
  document.getElementById('btn-new-deposit').addEventListener('click', () => toggleModal(modalDeposit, true));
  document.getElementById('btn-cancel-deposit').addEventListener('click', () => toggleModal(modalDeposit, false));
  formDeposit.addEventListener('submit', handleDepositSubmit);
  
  // Modal gestione deposito
  document.getElementById('btn-close-deposit-manage').addEventListener('click', () => toggleModal(modalDepositManage, false));
  document.getElementById('btn-deposit-add').addEventListener('click', () => openDepositTransaction('add'));
  document.getElementById('btn-deposit-remove').addEventListener('click', () => openDepositTransaction('remove'));
  document.getElementById('btn-deposit-pay').addEventListener('click', () => openDepositTransaction('pay'));
  
  // Export/Import
  document.getElementById('btn-export').addEventListener('click', exportData);
  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('file-import').click();
  });
  document.getElementById('file-import').addEventListener('change', importData);
  
  // Close modal on backdrop click
  [modalTransaction, modalDeposit, modalDepositManage].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        toggleModal(modal, false);
        if (modal === modalTransaction) {
          closeTransactionModal();
        }
      }
    });
  });
  
  // Filtro
  addEventToElements('.filter-btn', 'click', (e) => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentFilter = e.target.dataset.filter;
    renderTransactions();
  });
}

// ============================================
// DEPOSIT MANAGEMENT (NUOVO!)
// ============================================
let currentDepositId = null;

function openDepositManage(depositId) {
  currentDepositId = depositId;
  const deposit = deposits.find(d => d.id === depositId);
  if (!deposit) return;
  
  const { depositBalances } = calculateBalances();
  const balance = depositBalances[depositId] || 0;
  
  document.getElementById('deposit-manage-name').textContent = deposit.name;
  document.getElementById('deposit-manage-balance').textContent = fmt.format(balance);
  
  toggleModal(modalDepositManage, true);
}

function openDepositTransaction(action) {
  toggleModal(modalDepositManage, false);
  
  if (action === 'add') {
    // Aggiungi soldi al deposito (da portafoglio a deposito)
    openTransactionModal('deposit', null, null);
    setTimeout(() => {
      document.getElementById('input-deposit').value = currentDepositId;
    }, 100);
  } else if (action === 'remove') {
    // Preleva soldi dal deposito (da deposito a portafoglio)
    openTransactionModal('withdrawal', null, null);
    setTimeout(() => {
      document.getElementById('input-deposit').value = currentDepositId;
    }, 100);
  } else if (action === 'pay') {
    // Paga direttamente con il deposito (spesa dal deposito)
    openTransactionModal('expense-from-deposit', null, null);
    setTimeout(() => {
      document.getElementById('input-deposit').value = currentDepositId;
    }, 100);
  }
}

// ============================================
// MODAL MANAGEMENT
// ============================================
function openTransactionModal(type = 'expense', transaction = null, presetMethod = null) {
  editingId = transaction?.id || null;
  
  const title = document.getElementById('modal-title');
  const deleteBtn = document.getElementById('btn-delete');
  
  if (transaction) {
    title.textContent = 'Modifica transazione';
    deleteBtn.style.display = 'block';
    
    document.getElementById('input-type').value = transaction.type;
    document.getElementById('input-amount').value = transaction.amount;
    document.getElementById('input-date').value = transaction.date;
    document.getElementById('input-category').value = transaction.category || 'Altro';
    document.getElementById('input-method').value = transaction.method || 'contanti';
    document.getElementById('input-note').value = transaction.note || '';
    document.getElementById('input-tags').value = transaction.tags?.join(', ') || '';
    document.getElementById('input-beer-count').value = transaction.beerCount || 1;
    document.getElementById('input-deposit').value = transaction.depositId || '';
  } else {
    const titles = {
      'expense': 'Nuova spesa',
      'income': 'Nuova entrata',
      'deposit': 'Aggiungi al deposito',
      'withdrawal': 'Preleva dal deposito',
      'expense-from-deposit': 'Paga con deposito'
    };
    title.textContent = titles[type] || 'Nuova transazione';
    deleteBtn.style.display = 'none';
    formTransaction.reset();
    document.getElementById('input-type').value = type;
    document.getElementById('input-date').valueAsDate = new Date();
    if (presetMethod) {
      document.getElementById('input-method').value = presetMethod;
    }
  }
  
  handleTypeChange();
  toggleModal(modalTransaction, true);
}

function closeTransactionModal() {
  toggleModal(modalTransaction, false);
  editingId = null;
}

function handleTypeChange() {
  const type = document.getElementById('input-type').value;
  const categoryGroup = document.getElementById('group-category');
  const methodGroup = document.getElementById('group-method');
  const depositGroup = document.getElementById('group-deposit');
  const beerGroup = document.getElementById('group-beer');
  
  // Reset visibility
  categoryGroup.style.display = 'none';
  methodGroup.style.display = 'none';
  depositGroup.style.display = 'none';
  beerGroup.style.display = 'none';
  
  if (type === 'expense') {
    categoryGroup.style.display = 'block';
    methodGroup.style.display = 'block';
    handleCategoryChange();
  } else if (type === 'income') {
    categoryGroup.style.display = 'block';
    methodGroup.style.display = 'block';
  } else if (type === 'deposit') {
    methodGroup.style.display = 'block';
    depositGroup.style.display = 'block';
    updateDepositSelect();
  } else if (type === 'withdrawal') {
    methodGroup.style.display = 'block';
    depositGroup.style.display = 'block';
    updateDepositSelect();
  } else if (type === 'expense-from-deposit') {
    categoryGroup.style.display = 'block';
    depositGroup.style.display = 'block';
    updateDepositSelect();
    handleCategoryChange();
  }
}

function handleCategoryChange() {
  const category = document.getElementById('input-category').value;
  const beerGroup = document.getElementById('group-beer');
  
  if (category === 'Birra') {
    beerGroup.style.display = 'block';
  } else {
    beerGroup.style.display = 'none';
  }
}

function updateDepositSelect() {
  const select = document.getElementById('input-deposit');
  select.innerHTML = deposits.map(d => 
    `<option value="${d.id}">${d.name}</option>`
  ).join('');
}

function handleTransactionSubmit(e) {
  e.preventDefault();
  
  const type = document.getElementById('input-type').value;
  const amount = parseFloat(document.getElementById('input-amount').value);
  const date = document.getElementById('input-date').value;
  const category = document.getElementById('input-category').value;
  const method = document.getElementById('input-method').value;
  const note = document.getElementById('input-note').value.trim();
  const tagsInput = document.getElementById('input-tags').value.trim();
  const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : [];
  
  const transaction = {
    id: editingId || Date.now(),
    type,
    amount,
    date,
    category: ['expense', 'income', 'expense-from-deposit'].includes(type) ? category : null,
    method: ['expense', 'income', 'deposit', 'withdrawal'].includes(type) ? method : null,
    note,
    tags,
    depositId: ['deposit', 'withdrawal', 'expense-from-deposit'].includes(type) ? document.getElementById('input-deposit').value : null,
    beerCount: ((type === 'expense' || type === 'expense-from-deposit') && category === 'Birra') ? parseInt(document.getElementById('input-beer-count').value) : 0
  };
  
  if (editingId) {
    transactions = transactions.map(t => t.id === editingId ? transaction : t);
  } else {
    transactions.push(transaction);
  }
  
  saveTransactions();
  closeTransactionModal();
  render();
}

function handleDelete() {
  if (!editingId) return;
  if (!confirm('Eliminare questa transazione?')) return;
  
  transactions = transactions.filter(t => t.id !== editingId);
  saveTransactions();
  closeTransactionModal();
  render();
}

function handleDepositSubmit(e) {
  e.preventDefault();
  
  const name = document.getElementById('deposit-name').value.trim();
  const color = document.getElementById('deposit-color').value;
  
  deposits.push({
    id: Date.now().toString(),
    name,
    color
  });
  
  saveDeposits();
  toggleModal(modalDeposit, false);
  formDeposit.reset();
  render();
}

// ============================================
// CALCULATIONS
// ============================================
function calculateBalances() {
  const balances = { contanti: 0, satispay: 0, hype: 0 };
  const depositBalances = {};
  
  // Initialize deposit balances
  deposits.forEach(d => {
    depositBalances[d.id] = 0;
  });
  
  // Calculate
  transactions.forEach(t => {
    if (t.type === 'income') {
      balances[t.method] += t.amount;
    } else if (t.type === 'expense') {
      balances[t.method] -= t.amount;
    } else if (t.type === 'deposit') {
      // Sposta soldi da portafoglio a deposito
      balances[t.method] -= t.amount;
      depositBalances[t.depositId] += t.amount;
    } else if (t.type === 'withdrawal') {
      // Sposta soldi da deposito a portafoglio
      balances[t.method] += t.amount;
      depositBalances[t.depositId] -= t.amount;
    } else if (t.type === 'expense-from-deposit') {
      // Paga direttamente dal deposito
      depositBalances[t.depositId] -= t.amount;
    }
  });
  
  const totalBalance = balances.contanti + balances.satispay + balances.hype;
  
  return { balances, depositBalances, totalBalance };
}

function calculateBeerStats() {
  const now = new Date();
  
  // This month
  const thisMonth = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && 
           d.getFullYear() === now.getFullYear() &&
           (t.type === 'expense' || t.type === 'expense-from-deposit') &&
           t.category === 'Birra';
  });
  
  // Last month
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === lastMonthDate.getMonth() && 
           d.getFullYear() === lastMonthDate.getFullYear() &&
           (t.type === 'expense' || t.type === 'expense-from-deposit') &&
           t.category === 'Birra';
  });
  
  const count = thisMonth.reduce((sum, t) => sum + (t.beerCount || 0), 0);
  const lastMonthCount = lastMonth.reduce((sum, t) => sum + (t.beerCount || 0), 0);
  const totalSpent = thisMonth.reduce((sum, t) => sum + t.amount, 0);
  
  return { count, lastMonthCount, totalSpent };
}

function calculateBeerChartData() {
  const now = new Date();
  const data = [];
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthBeers = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === date.getMonth() && 
             d.getFullYear() === date.getFullYear() &&
             (t.type === 'expense' || t.type === 'expense-from-deposit') &&
             t.category === 'Birra';
    });
    
    const count = monthBeers.reduce((sum, t) => sum + (t.beerCount || 0), 0);
    data.push({
      month: date.toLocaleDateString('it-IT', { month: 'short' }),
      count
    });
  }
  
  return data;
}

function calculateCategoryData() {
  const now = new Date();
  const thisMonth = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && 
           d.getFullYear() === now.getFullYear() &&
           (t.type === 'expense' || t.type === 'expense-from-deposit') &&
           t.category;
  });
  
  const categoryTotals = {};
  thisMonth.forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });
  
  return Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
}

function calculateIncomeExpenseData() {
  const now = new Date();
  const data = [];
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthTrans = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === date.getMonth() && 
             d.getFullYear() === date.getFullYear();
    });
    
    const income = monthTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = monthTrans.filter(t => t.type === 'expense' || t.type === 'expense-from-deposit').reduce((sum, t) => sum + t.amount, 0);
    
    data.push({
      month: date.toLocaleDateString('it-IT', { month: 'short' }),
      income,
      expense
    });
  }
  
  return data;
}

function calculateStats() {
  const now = new Date();
  const thisMonth = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && 
           d.getFullYear() === now.getFullYear();
  });
  
  const totalExpenses = thisMonth.filter(t => t.type === 'expense' || t.type === 'expense-from-deposit').reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = thisMonth.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  
  const categoryCount = {};
  thisMonth.filter(t => (t.type === 'expense' || t.type === 'expense-from-deposit') && t.category).forEach(t => {
    categoryCount[t.category] = (categoryCount[t.category] || 0) + 1;
  });
  const topCategory = Object.keys(categoryCount).length > 0 
    ? Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0][0]
    : '-';
  
  const beerSpent = thisMonth.filter(t => (t.type === 'expense' || t.type === 'expense-from-deposit') && t.category === 'Birra')
    .reduce((sum, t) => sum + t.amount, 0);
  
  return { totalExpenses, totalIncome, topCategory, beerSpent };
}

// ============================================
// RENDER
// ============================================
function render() {
  renderBeerCounter();
  renderBeerChart();
  renderCategoryChart();
  renderIncomeExpenseChart();
  renderBalances();
  renderDeposits();
  renderStats();
  renderTransactions();
}

function renderBeerCounter() {
  const { count, lastMonthCount, totalSpent } = calculateBeerStats();
  
  const countEl = document.getElementById('beer-count');
  const lastMonthEl = document.getElementById('beer-last-month');
  const diffEl = document.getElementById('beer-diff');
  
  const oldCount = parseInt(countEl.textContent) || 0;
  if (oldCount !== count) {
    countEl.style.animation = 'none';
    setTimeout(() => {
      countEl.style.animation = 'popIn 0.5s cubic-bezier(.68,-0.55,.265,1.55)';
    }, 10);
  }
  
  countEl.textContent = count;
  lastMonthEl.textContent = lastMonthCount;
  
  const diff = count - lastMonthCount;
  if (diff > 0) {
    diffEl.textContent = `+${diff} 📈`;
    diffEl.className = 'comparison-diff up';
  } else if (diff < 0) {
    diffEl.textContent = `${diff} 📉`;
    diffEl.className = 'comparison-diff down';
  } else {
    diffEl.textContent = '=';
    diffEl.className = 'comparison-diff same';
  }
}

function renderBeerChart() {
  const data = calculateBeerChartData();
  const ctx = document.getElementById('beer-chart').getContext('2d');
  
  if (beerChart) {
    beerChart.destroy();
  }
  
  beerChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.month),
      datasets: [{
        label: 'Birre',
        data: data.map(d => d.count),
        backgroundColor: '#facc15',
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#e5e7eb',
          bodyColor: '#e5e7eb',
          padding: 12,
          borderColor: '#1e293b',
          borderWidth: 1,
          displayColors: false,
          callbacks: {
            label: (context) => `${context.parsed.y} birre`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { 
            color: '#94a3b8',
            stepSize: 1
          },
          grid: { color: '#1e293b' }
        },
        x: {
          ticks: { color: '#94a3b8' },
          grid: { display: false }
        }
      }
    }
  });
}

function renderCategoryChart() {
  const data = calculateCategoryData();
  const ctx = document.getElementById('category-chart').getContext('2d');
  
  if (categoryChart) {
    categoryChart.destroy();
  }
  
  if (data.length === 0) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Nessuna spesa questo mese', ctx.canvas.width / 2, ctx.canvas.height / 2);
    return;
  }
  
  const colors = ['#ef4444', '#f59e0b', '#facc15', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
  
  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.name),
      datasets: [{
        data: data.map(d => d.value),
        backgroundColor: colors.slice(0, data.length),
        borderColor: '#0f172a',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#e5e7eb',
            padding: 12,
            font: { size: 12 }
          }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#e5e7eb',
          bodyColor: '#e5e7eb',
          padding: 12,
          borderColor: '#1e293b',
          borderWidth: 1,
          callbacks: {
            label: (context) => `${context.label}: ${fmt.format(context.parsed)}`
          }
        }
      }
    }
  });
}

function renderIncomeExpenseChart() {
  const data = calculateIncomeExpenseData();
  const ctx = document.getElementById('income-expense-chart').getContext('2d');
  
  if (incomeExpenseChart) {
    incomeExpenseChart.destroy();
  }
  
  incomeExpenseChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.month),
      datasets: [
        {
          label: 'Entrate',
          data: data.map(d => d.income),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true
        },
        {
          label: 'Uscite',
          data: data.map(d => d.expense),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#e5e7eb',
            padding: 12,
            font: { size: 12 }
          }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#e5e7eb',
          bodyColor: '#e5e7eb',
          padding: 12,
          borderColor: '#1e293b',
          borderWidth: 1,
          callbacks: {
            label: (context) => `${context.dataset.label}: ${fmt.format(context.parsed.y)}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { 
            color: '#94a3b8',
            callback: (value) => fmt.format(value)
          },
          grid: { color: '#1e293b' }
        },
        x: {
          ticks: { color: '#94a3b8' },
          grid: { display: false }
        }
      }
    }
  });
}

function renderBalances() {
  const { balances, totalBalance } = calculateBalances();
  
  document.getElementById('total-balance').textContent = fmt.format(totalBalance);
  document.getElementById('balance-contanti').textContent = fmt.format(balances.contanti);
  document.getElementById('balance-satispay').textContent = fmt.format(balances.satispay);
  document.getElementById('balance-hype').textContent = fmt.format(balances.hype);
}

function renderDeposits() {
  const { depositBalances } = calculateBalances();
  const container = document.getElementById('deposits-list');
  
  if (deposits.length === 0) {
    container.innerHTML = '<p style="color: var(--muted); font-size: 0.9rem;">Nessun deposito</p>';
    return;
  }
  
  container.innerHTML = deposits.map(d => `
    <div class="deposit-item" style="border-color: ${d.color}" data-deposit-id="${d.id}">
      <span class="deposit-name">${d.name}</span>
      <span class="deposit-amount">${fmt.format(depositBalances[d.id] || 0)}</span>
    </div>
  `).join('');
  
  container.querySelectorAll('.deposit-item').forEach(el => {
    el.addEventListener('click', () => {
      const depositId = el.dataset.depositId;
      openDepositManage(depositId);
    });
  });
}

function renderStats() {
  const { totalExpenses, totalIncome, topCategory, beerSpent } = calculateStats();
  
  document.getElementById('stat-total-expenses').textContent = fmt.format(totalExpenses);
  document.getElementById('stat-total-income').textContent = fmt.format(totalIncome);
  document.getElementById('stat-top-category').textContent = topCategory;
  document.getElementById('stat-beer-spent').textContent = fmt.format(beerSpent);
}

function renderTransactions() {
  const container = document.getElementById('transactions-list');
  
  let filtered = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  if (currentFilter !== 'all') {
    filtered = filtered.filter(t => t.type === currentFilter);
  }
  
  if (filtered.length === 0) {
    container.innerHTML = '<p style="color: var(--muted); text-align: center; padding: 40px 0;">Nessuna transazione</p>';
    return;
  }
  
  container.innerHTML = filtered.map(t => {
    const isPositive = t.type === 'income' || t.type === 'withdrawal';
    let icon = '💸';
    let typeLabel = '';
    
    if (t.type === 'expense') {
      icon = '💸';
      typeLabel = t.category;
    } else if (t.type === 'income') {
      icon = '💰';
      typeLabel = t.category || 'Entrata';
    } else if (t.type === 'deposit') {
      icon = '🏦';
      const deposit = deposits.find(d => d.id === t.depositId);
      typeLabel = `➡️ ${deposit?.name || 'Deposito'}`;
    } else if (t.type === 'withdrawal') {
      icon = '🏧';
      const deposit = deposits.find(d => d.id === t.depositId);
      typeLabel = `⬅️ ${deposit?.name || 'Deposito'}`;
    } else if (t.type === 'expense-from-deposit') {
      icon = '🏦💸';
      const deposit = deposits.find(d => d.id === t.depositId);
      typeLabel = `${t.category} (da ${deposit?.name})`;
    }
    
    const amountClass = isPositive ? 'positive' : 'negative';
    const amountSign = isPositive ? '+' : '-';
    
    return `
      <div class="transaction-item ${t.type}" data-id="${t.id}">
        <div class="transaction-info">
          <div class="transaction-title">
            ${icon} ${typeLabel}
            ${t.beerCount > 0 ? `🍺 x${t.beerCount}` : ''}
          </div>
          <div class="transaction-meta">
            ${new Date(t.date).toLocaleDateString('it-IT')}
            ${t.method ? ` · ${t.method}` : ''}
            ${t.note ? ` · ${t.note}` : ''}
          </div>
          ${t.tags?.length > 0 ? `
            <div style="margin-top: 4px;">
              ${t.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
            </div>
          ` : ''}
        </div>
        <div class="transaction-amount ${amountClass}">
          ${amountSign}${fmt.format(t.amount)}
        </div>
      </div>
    `;
  }).join('');
  
  container.querySelectorAll('.transaction-item').forEach(el => {
    const id = parseInt(el.dataset.id);
    const transaction = transactions.find(t => t.id === id);
    
    el.addEventListener('click', () => {
      openTransactionModal(transaction.type, transaction);
    });
  });
}

// ============================================
// BACKUP/RESTORE
// ============================================
function exportData() {
  const data = {
    transactions,
    deposits,
    exportDate: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `miraconti-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      
      if (confirm('Importare i dati? Questo sovrascriverà i dati attuali.')) {
        transactions = data.transactions || [];
        deposits = data.deposits || [];
        saveTransactions();
        saveDeposits();
        render();
        alert('Dati importati con successo!');
      }
    } catch (err) {
      alert('Errore durante l\'importazione: file non valido');
    }
  };
  reader.readAsText(file);
}

// ============================================
// START
// ============================================
init();