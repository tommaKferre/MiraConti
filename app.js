const STORAGE_KEY = 'miraConti_v6';
const listEl = document.getElementById('expenses-list');
const filterCategory = document.getElementById('filter-category');
const filterMonth = document.getElementById('filter-month');
const clearBtn = document.getElementById('clear-filters');
const filterBtns = document.querySelectorAll('.filter-btn');

const totalMonthEl = document.getElementById('total-month');
const totalContantiEl = document.getElementById('total-contanti');
const totalSatispayEl = document.getElementById('total-satispay');
const totalHypeEl = document.getElementById('total-hype');
const beerCounterEl = document.getElementById('beer-month');

const modal = document.getElementById('modal');
const modalForm = document.getElementById('modal-form');
const fab = document.getElementById('fab-add');

const mAmount = document.getElementById('m-amount');
const mDate = document.getElementById('m-date');
const mCategory = document.getElementById('m-category');
const mMethod = document.getElementById('m-method');
const mNote = document.getElementById('m-note');
const mBeerCount = document.getElementById('m-beer-count');

const canvas = document.getElementById('chart');
const ctx = canvas.getContext('2d');

let expenses = [];
let editId = null;
let activeMethod = '';

const fmt = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

// FILTRO METODO
filterBtns.forEach(btn => {
  btn.onclick = () => {
    activeMethod = btn.dataset.method;
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  };
});

// STORAGE
function load() { expenses = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses)); }

// MODAL
fab.onclick = () => openModal();
document.getElementById('modal-cancel').onclick = () => modal.classList.add('hidden');

mCategory.onchange = () => {
  mBeerCount.style.display = (mCategory.value === 'Birra') ? 'block' : 'none';
};

function openModal(expense = null) {
  modal.classList.remove('hidden');
  if (expense) {
    editId = expense.id;
    mAmount.value = expense.amount;
    mDate.value = expense.date;
    mCategory.value = expense.category;
    mMethod.value = expense.method;
    mNote.value = expense.note || '';
    mBeerCount.value = expense.beerCount || 1;
    mBeerCount.style.display = (expense.category === 'Birra') ? 'block' : 'none';
  } else {
    editId = null;
    modalForm.reset();
    mDate.valueAsDate = new Date();
    mBeerCount.style.display = 'none';
  }
}

modalForm.onsubmit = e => {
  e.preventDefault();
  const data = {
    id: editId || Date.now(),
    amount: +mAmount.value,
    date: mDate.value,
    category: mCategory.value,
    method: mMethod.value,
    note: mNote.value,
    beerCount: mCategory.value === 'Birra' ? +mBeerCount.value : 0
  };
  if (editId) expenses = expenses.map(e => e.id === editId ? data : e);
  else expenses.push(data);
  save();
  modal.classList.add('hidden');
  render();
};

// FILTRO LISTA + MESE
function populateMonthFilter() {
  const months = [...new Set(expenses.map(e => {
    const d = new Date(e.date);
    return `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}`;
  }))].sort().reverse();

  filterMonth.innerHTML = '<option value="">Questo mese</option><option value="all">Tutte le spese</option>';
  months.forEach(m => {
    const [y, mo] = m.split('-');
    const opt = document.createElement('option');
    opt.value = m;
    opt.text = `${mo}/${y}`;
    filterMonth.appendChild(opt);
  });
}

function getFiltered() {
  let list = expenses.filter(e => {
    if (activeMethod && e.method !== activeMethod) return false;
    if (filterCategory.value && e.category !== filterCategory.value) return false;

    const d = new Date(e.date);
    const now = new Date();

    if (filterMonth.value === 'all') return true;
    if (!filterMonth.value) {
      if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
    } else {
      const [y, mo] = filterMonth.value.split('-');
      if (d.getFullYear() != y || (d.getMonth() + 1) != mo) return false;
    }
    return true;
  });
  return list;
}

// LISTA
function renderList() {
  listEl.innerHTML = '';
  getFiltered().forEach(e => {
    const row = document.createElement('div');
    row.className = 'expense-item';
    row.innerHTML = `
      <div>
        <strong>${e.category}</strong>
        <span class="badge ${e.method}">${e.method}</span>
        ${e.note ? `<div class="note">${e.note}</div>` : ''}
        ${e.category === 'Birra' ? `<div class="note">🍺 x${e.beerCount}</div>` : ''}
      </div>
      <div class="amount">${fmt.format(e.amount)}</div>
    `;
    row.onclick = () => openModal(e);
    let timer;
    row.onmousedown = () => { timer = setTimeout(() => { if (confirm('Eliminare la spesa?')) { expenses = expenses.filter(x => x.id !== e.id); save(); render(); } }, 600) };
    row.onmouseup = () => clearTimeout(timer);
    listEl.appendChild(row);
  });
}

// TOTALI + BEER COUNTER + GRAFICO
function renderTotalsAndChart() {
  let totals = { contanti: 0, satispay: 0, hype: 0 };
  let total = 0;
  let beerTotal = 0;
  getFiltered().forEach(e => {
    total += e.amount;
    totals[e.method] += e.amount;
    if (e.category === 'Birra') beerTotal += e.beerCount;
  });

  totalMonthEl.textContent = fmt.format(total);
  totalContantiEl.textContent = fmt.format(totals.contanti);
  totalSatispayEl.textContent = fmt.format(totals.satispay);
  totalHypeEl.textContent = fmt.format(totals.hype);

  beerCounterEl.textContent = beerTotal;
  beerCounterEl.style.transform = 'scale(1.3)';
  setTimeout(() => beerCounterEl.style.transform = 'scale(1)', 300);

  drawChart(totals);
}

// GRAFICO
function drawChart(data) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const colors = { contanti: '#2dd4bf', satispay: '#f87171', hype: '#60a5fa' };
  const keys = Object.keys(data);
  const max = Math.max(...Object.values(data), 1);

  keys.forEach((key, i) => {
    const barHeight = (data[key] / max) * 120;
    const x = 40 + i * 90;
    const base = canvas.height - 30;

    ctx.fillStyle = colors[key];
    ctx.fillRect(x, base - barHeight, 50, barHeight);

    ctx.fillStyle = '#e5e7eb';
    ctx.font = '12px system-ui';
    ctx.fillText(fmt.format(data[key]), x, base - barHeight - 6);
    ctx.fillText(key, x, base + 14);
  });
}

// RESET
clearBtn.onclick = () => {
  activeMethod = '';
  filterCategory.value = '';
  filterMonth.value = '';
  filterBtns.forEach(b => b.classList.remove('active'));
  filterBtns[0].classList.add('active');
  render();
}

// RENDER COMPLETO
function render() { populateMonthFilter(); renderList(); renderTotalsAndChart(); }

// INIT
load(); render();
