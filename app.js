// STORAGE KEYS
const STORAGE_KEY = 'miraConti_transactions_v2';
const DEPOSITS_KEY = 'miraConti_deposits_v2';
const FRIENDS_KEY = 'miraConti_friends_v2';

// DATA
let transactions = [];
let deposits = [];
let friends = [];
let currentFilter = 'all';
let editingId = null;

// ELEMENTS
const fab = document.getElementById('fab');
const quickMenu = document.getElementById('quick-menu');
const modalTransaction = document.getElementById('modal-transaction');
const modalDeposit = document.getElementById('modal-deposit');
const modalFriend = document.getElementById('modal-friend');
const formTransaction = document.getElementById('form-transaction');
const formDeposit = document.getElementById('form-deposit');
const formFriend = document.getElementById('form-friend');

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
  friends = JSON.parse(localStorage.getItem(FRIENDS_KEY) || '[]');
  
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

function saveFriends() {
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends));
}

// Utility per aprire e chiudere modali
function toggleModal(modal, show = true) {
  if (show) {
    modal.classList.add('show');
    modal.style.pointerEvents = 'all';
    modal.style.display = 'flex';
  } else {
    modal.classList.remove('show');
    modal.style.pointerEvents = 'none';
    modal.style.display = 'none';
  }
}

// Utility per aggiungere eventi a più elementi
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
  fab.addEventListener('touchstart', () => {
    pressTimer = setTimeout(toggleQuickMenu, 300);
  });
  
  fab.addEventListener('touchend', () => clearTimeout(pressTimer));
  
  // Quick menu items
  addEventToElements('.quick-item', 'click', (e) => {
    quickMenu.classList.remove('show');
    openTransactionModal(e.target.dataset.action);
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
  
  // Modali
  document.getElementById('btn-cancel').addEventListener('click', () => toggleModal(modalTransaction, false));
  formTransaction.addEventListener('submit', handleTransactionSubmit);
  document.getElementById('btn-delete').addEventListener('click', handleDelete);
  
  document.getElementById('btn-new-deposit').addEventListener('click', () => toggleModal(modalDeposit, true));
  document.getElementById('btn-cancel-deposit').addEventListener('click', () => toggleModal(modalDeposit, false));
  formDeposit.addEventListener('submit', handleDepositSubmit);
  
  document.getElementById('btn-add-friend').addEventListener('click', () => toggleModal(modalFriend, true));
  document.getElementById('btn-cancel-friend').addEventListener('click', () => toggleModal(modalFriend, false));
  formFriend.addEventListener('submit', handleFriendSubmit);
  
  // Export/Import
  document.getElementById('btn-export').addEventListener('click', exportData);
  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('file-import').click();
  });
  document.getElementById('file-import').addEventListener('change', importData);
  
  // Close modal on backdrop click
  [modalTransaction, modalDeposit, modalFriend].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) toggleModal(modal, false);
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
    document.getElementById('input-friend').value = transaction.friendId || '';
  } else {
    title.textContent = type === 'expense' ? 'Nuova spesa' : 
                       type === 'income' ? 'Nuova entrata' : 'Nuovo deposito';
    deleteBtn.style.display = 'none';
    formTransaction.reset();
    document.getElementById('input-type').value = type;
    document.getElementById('input-date').valueAsDate = new Date();
    if (presetMethod) {
      document.getElementById('input-method').value = presetMethod;
    }
  }
  
  handleTypeChange();
  modalTransaction.classList.add('show');
}

function ensureModalClosed(modal) {
  modal.classList.remove('show');
  modal.style.display = 'none';
}

function closeTransactionModal() {
  ensureModalClosed(modalTransaction);
  editingId = null;
}

// Ensure modals are hidden on page load
window.addEventListener('load', () => {
  ensureModalClosed(modalTransaction);
  ensureModalClosed(modalDeposit);
  ensureModalClosed(modalFriend);
});

function handleTypeChange() {
  const type = document.getElementById('input-type').value;
  const categoryGroup = document.getElementById('group-category');
  const methodGroup = document.getElementById('group-method');
  const depositGroup = document.getElementById('group-deposit');
  const beerGroup = document.getElementById('group-beer');
  const friendGroup = document.getElementById('group-friend');
  
  // Reset visibility
  categoryGroup.style.display = 'none';
  methodGroup.style.display = 'none';
  depositGroup.style.display = 'none';
  beerGroup.style.display = 'none';
  friendGroup.style.display = 'none';
  
  if (type === 'expense') {
    categoryGroup.style.display = 'block';
    methodGroup.style.display = 'block';
    const isBeer = document.getElementById('input-category').value === 'Birra';
    if (isBeer) {
      beerGroup.style.display = 'block';
      friendGroup.style.display = 'block';
      updateFriendSelect();
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

function updateFriendSelect() {
  const select = document.getElementById('input-friend');
  select.innerHTML = '<option value="">Io</option>' + friends.map(f => 
    `<option value="${f.id}">${f.emoji ? f.emoji + ' ' : ''}${f.name}</option>`
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
    beerCount: (type === 'expense' && category === 'Birra') ? parseInt(document.getElementById('input-beer-count').value) : 0,
    friendId: (type === 'expense' && category === 'Birra') ? document.getElementById('input-friend').value || null : null
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

function handleFriendSubmit(e) {
  e.preventDefault();
  
  const name = document.getElementById('friend-name').value.trim();
  const emoji = document.getElementById('friend-emoji').value.trim();
  
  friends.push({
    id: Date.now().toString(),
    name,
    emoji
  });
  
  saveFriends();
  toggleModal(modalFriend, false);
  formFriend.reset();
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
  
  // This month
  const thisMonth = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && 
           d.getFullYear() === now.getFullYear() &&
           t.type === 'expense' &&
           t.category === 'Birra';
  });
  
  // Last month
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === lastMonthDate.getMonth() && 
           d.getFullYear() === lastMonthDate.getFullYear() &&
           t.type === 'expense' &&
           t.category === 'Birra';
  });
  
  const count = thisMonth.reduce((sum, t) => sum + (t.beerCount || 0), 0);
  const lastMonthCount = lastMonth.reduce((sum, t) => sum + (t.beerCount || 0), 0);
  const totalSpent = thisMonth.reduce((sum, t) => sum + t.amount, 0);
  
  return { count, lastMonthCount, totalSpent };
}

function calculateLeaderboard() {
  const now = new Date();
  const thisMonth = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && 
           d.getFullYear() === now.getFullYear() &&
           t.type === 'expense' &&
           t.category === 'Birra';
  });
  
  const counts = {};
  
  // Mie birre (senza friendId)
  const myBeers = thisMonth.filter(t => !t.friendId).reduce((sum, t) => sum + (t.beerCount || 0), 0);
  if (myBeers > 0) {
    counts['me'] = { name: 'Io', emoji: '👤', count: myBeers };
  }
  
  // Birre degli amici
  thisMonth.forEach(t => {
    if (t.friendId) {
      if (!counts[t.friendId]) {
        const friend = friends.find(f => f.id === t.friendId);
        counts[t.friendId] = { name: friend?.name || 'Sconosciuto', emoji: friend?.emoji || '👤', count: 0 };
      }
      counts[t.friendId].count += t.beerCount || 0;
    }
  });
  
  return Object.entries(counts)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
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
             t.type === 'expense' &&
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

function calculateStats() {
  const now = new Date();
  const thisMonth = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && 
           d.getFullYear() === now.getFullYear();
  });
  
  // Total expenses and income
  const totalExpenses = thisMonth.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = thisMonth.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  
  // Top category
  const categoryCount = {};
  thisMonth.filter(t => t.type === 'expense' && t.category).forEach(t => {
    categoryCount[t.category] = (categoryCount[t.category] || 0) + 1;
  });
  const topCategory = Object.keys(categoryCount).length > 0 
    ? Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0][0]
    : '-';
  
  // Beer spent
  const beerSpent = thisMonth.filter(t => t.type === 'expense' && t.category === 'Birra')
    .reduce((sum, t) => sum + t.amount, 0);
  
  return { totalExpenses, totalIncome, topCategory, beerSpent };
}

// ============================================
// RENDER
// ============================================
function render() {
  renderBeerCounter();
  renderLeaderboard();
  renderBeerChart();
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
  
  // Animate count change
  const oldCount = parseInt(countEl.textContent) || 0;
  if (oldCount !== count) {
    countEl.style.animation = 'none';
    setTimeout(() => {
      countEl.style.animation = 'popIn 0.5s cubic-bezier(.68,-0.55,.265,1.55)';
    }, 10);
  }
  
  countEl.textContent = count;
  lastMonthEl.textContent = lastMonthCount;
  
  // Differenza
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

function renderLeaderboard() {
  const leaderboard = calculateLeaderboard();
  const container = document.getElementById('leaderboard-list');
  
  if (leaderboard.length === 0) {
    container.innerHTML = '<p style="color: var(--muted); font-size: 0.9rem; text-align: center; padding: 20px 0;">Nessuna birra tracciata questo mese</p>';
    return;
  }
  
  container.innerHTML = leaderboard.map((person, i) => {
    const rankClass = i === 0 ? 'first' : i === 1 ? 'second' : i === 2 ? 'third' : '';
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}°`;
    
    return `
      <div class="leaderboard-item">
        <div class="leaderboard-rank ${rankClass}">${medal}</div>
        <div class="leaderboard-info">
          <div class="leaderboard-name">${person.emoji} ${person.name}</div>
        </div>
        <div class="leaderboard-beers">
          🍺 ${person.count}
        </div>
      </div>
    `;
  }).join('');
}

function renderBeerChart() {
  const data = calculateBeerChartData();
  const canvas = document.getElementById('beer-chart');
  const ctx = canvas.getContext('2d');
  
  const width = canvas.width;
  const height = canvas.height;
  
  ctx.clearRect(0, 0, width, height);
  
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const barWidth = (width - 60) / data.length;
  const maxBarHeight = height - 60;
  
  data.forEach((item, i) => {
    const barHeight = (item.count / maxCount) * maxBarHeight;
    const x = 30 + i * barWidth;
    const y = height - 30 - barHeight;
    
    // Bar
    ctx.fillStyle = '#facc15';
    ctx.fillRect(x + 5, y, barWidth - 10, barHeight);
    
    // Count
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(item.count, x + barWidth / 2, y - 5);
    
    // Month
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter';
    ctx.fillText(item.month, x + barWidth / 2, height - 12);
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
    const icon = t.type === 'expense' ? '💸' : 
                 t.type === 'income' ? '💰' :
                 t.type === 'deposit' ? '🏦' : '🏧';
    
    const amountClass = isPositive ? 'positive' : 'negative';
    const amountSign = isPositive ? '+' : '-';
    
    const friendName = t.friendId ? friends.find(f => f.id === t.friendId)?.name || 'Amico' : null;
    
    return `
      <div class="transaction-item ${t.type}" data-id="${t.id}">
        <div class="transaction-info">
          <div class="transaction-title">
            ${icon} ${t.category || (t.type === 'deposit' ? 'Deposito' : 'Prelievo')}
            ${t.beerCount > 0 ? `🍺 x${t.beerCount}` : ''}
            ${friendName ? `(${friendName})` : ''}
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
    friends,
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
        friends = data.friends || [];
        saveTransactions();
        saveDeposits();
        saveFriends();
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