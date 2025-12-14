const STORAGE_KEY = 'miraContiExpenses_v2';

const listEl = document.getElementById('expenses-list');
const filterMethod = document.getElementById('filter-method');
const filterCategory = document.getElementById('filter-category');
const clearFiltersBtn = document.getElementById('clear-filters');

const totalMonthEl = document.getElementById('total-month');
const totalContantiEl = document.getElementById('total-contanti');
const totalSatispayEl = document.getElementById('total-satispay');
const totalHypeEl = document.getElementById('total-hype');
const currentMonthEl = document.getElementById('current-month');

const modal = document.getElementById('modal');
const modalForm = document.getElementById('modal-form');
const fab = document.getElementById('fab-add');

const mAmount = document.getElementById('m-amount');
const mDate = document.getElementById('m-date');
const mCategory = document.getElementById('m-category');
const mMethod = document.getElementById('m-method');
const mNote = document.getElementById('m-note');

let expenses = [];
let editId = null;
let currentMonth = new Date();

const fmt = new Intl.NumberFormat('it-IT', { style:'currency', currency:'EUR' });

function load() {
  expenses = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function openModal(expense = null) {
  modal.classList.remove('hidden');
  if (expense) {
    editId = expense.id;
    mAmount.value = expense.amount;
    mDate.value = expense.date.slice(0,10);
    mCategory.value = expense.category;
    mMethod.value = expense.method;
    mNote.value = expense.note || '';
  } else {
    editId = null;
    modalForm.reset();
    mDate.valueAsDate = new Date();
  }
}

function closeModal() {
  modal.classList.add('hidden');
}

function getFiltered() {
  return expenses.filter(e => {
    if (filterMethod.value && e.method !== filterMethod.value) return false;
    if (filterCategory.value && e.category !== filterCategory.value) return false;
    return true;
  });
}

function render() {
  listEl.innerHTML = '';
  let totals = { contanti:0, satispay:0, hype:0 };
  let totalMonth = 0;

  const grouped = {};
  for (const e of getFiltered()) {
    const day = new Date(e.date).toLocaleDateString();
    grouped[day] ??= [];
    grouped[day].push(e);
  }

  Object.keys(grouped).forEach(day => {
    const header = document.createElement('div');
    header.className = 'day-separator';
    header.textContent = day;
    listEl.appendChild(header);

    grouped[day].forEach(e => {
      totalMonth += e.amount;
      totals[e.method] += e.amount;

      const row = document.createElement('div');
      row.className = 'expense-item';
      row.innerHTML = `
        <div>
          <strong>${e.category}</strong><br>
          <small>${e.method}</small>
        </div>
        <div>${fmt.format(e.amount)}</div>
      `;
      row.onclick = () => openModal(e);
      listEl.appendChild(row);
    });
  });

  totalMonthEl.textContent = fmt.format(totalMonth);
  totalContantiEl.textContent = fmt.format(totals.contanti);
  totalSatispayEl.textContent = fmt.format(totals.satispay);
  totalHypeEl.textContent = fmt.format(totals.hype);
  drawChart();
}

// GRAFICO
const canvas = document.getElementById('chart');
const ctx = canvas.getContext('2d');

function drawChart() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const data = { contanti:0, satispay:0, hype:0 };
  getFiltered().forEach(e => data[e.method] += e.amount);

  const values = Object.values(data);
  const max = Math.max(...values, 1);
  const barWidth = 50;
  const gap = 40;
  const base = canvas.height - 20;

  Object.keys(data).forEach((key, i) => {
    const h = (data[key] / max) * 120;
    ctx.fillStyle = '#2d8f6f';
    ctx.fillRect(40 + i*(barWidth+gap), base - h, barWidth, h);
    ctx.fillText(key, 40 + i*(barWidth+gap), base + 12);
  });
}


/* EVENTI */
fab.onclick = () => openModal();
document.getElementById('modal-cancel').onclick = closeModal;

modalForm.onsubmit = e => {
  e.preventDefault();
  const data = {
    id: editId || Date.now().toString(),
    amount: Number(mAmount.value),
    date: mDate.value,
    category: mCategory.value,
    method: mMethod.value,
    note: mNote.value
  };
  if (editId) {
    expenses = expenses.map(e => e.id === editId ? data : e);
  } else {
    expenses.push(data);
  }
  save();
  closeModal();
  render();
};

filterMethod.onchange = render;
filterCategory.onchange = render;
clearFiltersBtn.onclick = () => {
  filterMethod.value = '';
  filterCategory.value = '';
  render();
};

load();
render();
const themeToggle = document.getElementById('theme-toggle');
const THEME_KEY = 'miraContiTheme';

function applyTheme(theme) {
  document.body.classList.toggle('dark', theme === 'dark');
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme) {
  applyTheme(savedTheme);
} else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  applyTheme('dark');
}

themeToggle.onclick = () => {
  const isDark = document.body.classList.contains('dark');
  const next = isDark ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
};
