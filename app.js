// STORAGE KEYS
const STORAGE_KEY = 'miraConti_transactions_v2';
const DEPOSITS_KEY = 'miraConti_deposits_v2';

// DATA
let transactions = [];
let deposits = [];
let currentFilter = 'all';
let editingId = null;

// ELEMENTS
const fab = document.getElementById('fab');
const quickMenu = document.getElementById('quick-menu');
const modalTransaction = document.getElementById('modal-transaction');
const modalDeposit = document.getElementById('modal-deposit');
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

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
  // FAB - Long press per quick menu
  let pressTimer;
  
  fab.addEventListener('mousedown', () => {
    pressTimer = setTimeout(() => {
      quickMenu.classList.toggle('show');
    }, 300);
  });
  
  fab.addEventListener('mouseup', () => {
    clearTimeout(pressTimer);
  });
  
  fab.addEventListener('click', (e) => {
    if (!quickMenu.classList.contains('show')) {
      openTransactionModal('expense');
    }
  });
  
  // Touch events per mobile
  fab.addEventListener('touchstart', (e) => {
    pressTimer = setTimeout(() => {
      quickMenu.classList.toggle('show');
    }, 300);
  });
  
  fab.addEventListener('touchend', () => {
    clearTimeout(pressTimer);
  });
  
  // Quick menu items
  document.querySelectorAll('.quick-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      quickMenu.classList.remove('show');
      openTransactionModal(action);
    });
  });
  
  // Close quick menu on outside click
  document.addEventListener('click', (e) => {
    if (!fab.contains(e.target) && !quickMenu.contains(e.target)) {
      quickMenu.classList.remove('show');
    }
  });
  
  // Modal transaction
  document.getElementById('btn-cancel').addEventListener('click', closeTransactionModal);
  formTransaction.addEventListener('submit', handleTransactionSubmit);
  document.getElementById('btn-delete').addEventListener('click', handleDelete);
  
  // Type change
  document.getElementById('input-type').addEventListener('change', handleTypeChange);
  
  // Category change (per birre)
  document.getElementById('input-category').addEventListener('change', (e) => {
    const beerGroup = document.getElementById('group-beer');
    beerGroup.style.display = e.target.value === 'Birra' ? 'block' : 'none';
  });
  
  // Filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderTransactions();
    });
  });
  
  // New deposit
  document.getElementById('btn-new-deposit').addEventListener('click', () => {
    modalDeposit.classList.add('show');
  });
  
  document.getElementById('btn-cancel-deposit').addEventListener('click', () => {
    modalDeposit.classList.remove('show');
  });
  
  formDeposit.addEventListener('submit', handleDepositSubmit);
  
  // Export/Import
  document.getElementById('btn-export').addEventListener('click', exportData);
  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('file-import').click();
  });
  document.getElementById('file-import').addEventListener('change', importData);
  
  // Close modal on backdrop click
  modalTransaction.addEventListener('click', (e) => {
    if (e.target === modalTransaction) closeTransactionModal();
  });
  modalDeposit.addEventListener('click', (e) => {
    if (e.target === modalDeposit) modalDeposit.classList.remove('show');
  });
}

// ============================================
// MODAL MANAGEMENT
// ============================================
function openTransactionModal(type = 'expense', transaction = null) {
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
    title.textContent = type === 'expense' ? 'Nuova spesa' : 
                       type === 'income' ? 'Nuova entrata' : 'Nuovo deposito';
    deleteBtn.style.display = 'none';
    formTransaction.reset();
    document.getElementById('input-type').value = type;
    document.getElementById('input-date').valueAsDate = new Date();
  }
  
  handleTypeChange();
  modalTransaction.classList.add('show');
}

function closeTransactionModal() {
  modalTransaction.classList.remove('show');
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
    if (document.getElementById('input-category').value === 'Birra') {
      beerGroup.style.display = 'block';
    }
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
    category: ['expense', 'income'].includes(type) ? category : null,
    method: ['expense', 'income', 'deposit', 'withdrawal'].includes(type) ? method : null,
    note,
    tags,
    depositId: ['deposit', 'withdrawal'].includes(type) ? document.getElementById('input-deposit').value : null,
    beerCount: (type === 'expense' && category === 'Birra') ? parseInt(document.getElementById('input-beer-count').value) : 0
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
  modalDeposit.classList.remove('show');
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
      balances[t.method] -= t.amount;
      depositBalances[t.depositId] += t.amount;
    } else if (t.type === 'withdrawal') {
      balances[t.method] += t.amount;
      depositBalances[t.depositId] -= t.amount;
    }
  });
  
  const totalBalance = balances.contanti + balances.satispay + balances.hype;
  
  return { balances, depositBalances, totalBalance };
}

function calculateBeerStats() {
  const now = new Date();
  const thisMonth = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && 
           d.getFullYear() === now.getFullYear() &&
           t.type === 'expense' &&
           t.category === 'Birra';
  });
  
  const count = thisMonth.reduce((sum, t) => sum + (t.beerCount || 0), 0);
  const totalSpent = thisMonth.reduce((sum, t) => sum + t.amount, 0);
  const avgPrice = count > 0 ? totalSpent / count : 0;
  
  return { count, totalSpent, avgPrice };
}

function calculateStats() {
  const now = new Date();
  const thisMonth = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && 
           d.getFullYear() === now.getFullYear();
  });
  
  // Top category
  const categoryCount = {};
  thisMonth.filter(t => t.type === 'expense' && t.category).forEach(t => {
    categoryCount[t.category] = (categoryCount[t.category] || 0) + 1;
  });
  const topCategory = Object.keys(categoryCount).length > 0 
    ? Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0][0]
    : '-';
  
  // Top method
  const methodCount = {};
  thisMonth.filter(t => t.method).forEach(t => {
    methodCount[t.method] = (methodCount[t.method] || 0) + 1;
  });
  const topMethod = Object.keys(methodCount).length > 0
    ? Object.entries(methodCount).sort((a, b) => b[1] - a[1])[0][0]
    : '-';
  
  // Average expense
  const expenses = thisMonth.filter(t => t.type === 'expense');
  const avgExpense = expenses.length > 0
    ? expenses.reduce((sum, t) => sum + t.amount, 0) / expenses.length
    : 0;
  
  return { topCategory, topMethod, avgExpense };
}

// ============================================
// RENDER
// ============================================
function render() {
  renderBeerCounter();
  renderBalances();
  renderDeposits();
  renderStats();
  renderTransactions();
}

function renderBeerCounter() {
  const { count, totalSpent, avgPrice } = calculateBeerStats();
  
  const countEl = document.getElementById('beer-count');
  const spentEl = document.getElementById('beer-total-spent');
  const avgEl = document.getElementById('beer-avg-price');
  
  // Animate count change
  const oldCount = parseInt(countEl.textContent) || 0;
  if (oldCount !== count) {
    countEl.style.animation = 'none';
    setTimeout(() => {
      countEl.style.animation = 'popIn 0.5s cubic-bezier(.68,-0.55,.265,1.55)';
    }, 10);
  }
  
  countEl.textContent = count;
  spentEl.textContent = fmt.format(totalSpent);
  avgEl.textContent = fmt.format(avgPrice);
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
    <div class="deposit-item" style="border-color: ${d.color}">
      <span class="deposit-name">${d.name}</span>
      <span class="deposit-amount">${fmt.format(depositBalances[d.id] || 0)}</span>
    </div>
  `).join('');
  
  // Add click handlers
  container.querySelectorAll('.deposit-item').forEach((el, i) => {
    el.addEventListener('click', () => {
      openTransactionModal('deposit');
      document.getElementById('input-deposit').value = deposits[i].id;
    });
  });
}

function renderStats() {
  const { topCategory, topMethod, avgExpense } = calculateStats();
  
  document.getElementById('stat-top-category').textContent = topCategory;
  document.getElementById('stat-top-method').textContent = topMethod;
  document.getElementById('stat-avg-expense').textContent = fmt.format(avgExpense);
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
    const icon = t.type === 'expense' ? '💸' : 
                 t.type === 'income' ? '💰' :
                 t.type === 'deposit' ? '🏦' : '🏧';
    
    const amountClass = isPositive ? 'positive' : 'negative';
    const amountSign = isPositive ? '+' : '-';
    
    return `
      <div class="transaction-item ${t.type}" data-id="${t.id}">
        <div class="transaction-info">
          <div class="transaction-title">
            ${icon} ${t.category || (t.type === 'deposit' ? 'Deposito' : 'Prelievo')}
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
  
  // Add click handlers
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