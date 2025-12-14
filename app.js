// MiraConti - simple expense tracker (LocalStorage + PWA)
// Key in LocalStorage
const STORAGE_KEY = 'miraContiExpenses_v1'

// Elements
const amountEl = document.getElementById('amount')
const dateEl = document.getElementById('date')
const categoryEl = document.getElementById('category')
const methodEl = document.getElementById('method')
const noteEl = document.getElementById('note')
const form = document.getElementById('expense-form')
const listEl = document.getElementById('expenses-list')
const filterCategory = document.getElementById('filter-category')
const filterMethod = document.getElementById('filter-method')
const prevMonthBtn = document.getElementById('prev-month')
const nextMonthBtn = document.getElementById('next-month')
const currentMonthEl = document.getElementById('current-month')
let currentMonth = new Date()
const totalMonthEl = document.getElementById('total-month')
const totalContantiEl = document.getElementById('total-contanti')
const totalSatispayEl = document.getElementById('total-satispay')
const totalHypeEl = document.getElementById('total-hype')
const exportBtn = document.getElementById('export-btn')
const importFile = document.getElementById('import-file')
const clearFiltersBtn = document.getElementById('clear-filters')

// In-memory data
let expenses = []

// Init default date to today (if inline form exists)
if(dateEl) dateEl.valueAsDate = new Date()

// Format currency
const fmt = new Intl.NumberFormat('it-IT', {style:'currency',currency:'EUR'})

// Function to load expenses from LocalStorage
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    expenses = raw ? JSON.parse(raw) : [];
  } catch (e) {
    expenses = [];
  }
}

// Function to save expenses to LocalStorage
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

// Function to add a new expense
function addExpense({ amount, date, category, method, note }) {
  const expense = {
    id: Date.now().toString(),
    amount: Number(amount),
    date: new Date(date).toISOString(),
    category,
    method,
    note,
  };
  expenses.push(expense);
  save();
  render();
}

// Delete expense (undo via toast)
function deleteExpense(id){
  const idx = expenses.findIndex(e => e.id === id)
  if(idx === -1) return
  const [removed] = expenses.splice(idx,1)
  save(); render()
  lastDeleted = {item: removed, index: idx}
  showToast('Spesa eliminata', {actionText:'Annulla', action:()=>{
    expenses.splice(lastDeleted.index,0,lastDeleted.item)
    save(); render(); showToast('Eliminazione annullata')
    lastDeleted = null
  }})
  setTimeout(()=>{ if(lastDeleted && lastDeleted.item.id === removed.id){ lastDeleted = null } },6000)
}

// Apply filters and return filtered/ sorted list
function getFiltered(){
  const y = currentMonth.getFullYear()
  const m = currentMonth.getMonth()
  return expenses.filter(e => {
    const d = new Date(e.date)
    if(!(d.getFullYear() === y && d.getMonth() === m)) return false
    if(filterCategory.value && e.category !== filterCategory.value) return false
    if(filterMethod.value && e.method !== filterMethod.value) return false
    return true
  }).sort((a,b)=> new Date(b.date) - new Date(a.date))
}

// Render list and totals
function render(){
  listEl.innerHTML = ''
  const items = getFiltered()
  for(const e of items){
    // row container will be created below
    const left = document.createElement('div'); left.className='expense-left'
    const d = new Date(e.date)

    const cat = document.createElement('div'); cat.className='badge'; cat.textContent = `${categoryEmoji(e.category)} ${e.category}`
    left.appendChild(cat)

    const amt = document.createElement('div'); amt.className='expense-amount'; amt.textContent = fmt.format(e.amount)
    const meta = document.createElement('div'); meta.className='expense-meta';
    const methodSpan = document.createElement('span'); methodSpan.className='method-chip'; methodSpan.textContent = e.method
    meta.textContent = d.toLocaleDateString()
    meta.appendChild(methodSpan)

    left.appendChild(amt); left.appendChild(meta)
    if(e.note){
      const note = document.createElement('div'); note.className='expense-note'; note.textContent = e.note; note.style.fontSize='.85rem'; note.style.color='var(--muted)'; left.appendChild(note)
    }
    const del = document.createElement('button'); del.className='del-btn'; del.setAttribute('aria-label','Elimina'); del.innerHTML='🗑️'; del.addEventListener('click',(ev)=>{ ev.stopPropagation(); deleteExpense(e.id) })
    // tap on left opens edit modal
    left.addEventListener('click', ()=> openModal('edit', e))
    const row = document.createElement('div'); row.className='expense-item'
    row.appendChild(left); row.appendChild(del)
    listEl.appendChild(row)
  }

  // totals (per selected filter set)
  const totals = { Contanti:0, Satispay:0, Hype:0 }
  let totalMonth = 0
  for(const e of items){
    totalMonth += e.amount
    if(totals[e.method] !== undefined) totals[e.method] += e.amount
  }
  totalMonthEl.textContent = fmt.format(totalMonth)
  const countEl = document.getElementById('count-month')
  if(countEl) countEl.textContent = items.length
  totalContantiEl.textContent = fmt.format(totals.Contanti)
  totalSatispayEl.textContent = fmt.format(totals.Satispay)
  totalHypeEl.textContent = fmt.format(totals.Hype)
}

// Export JSON
function exportJSON(){
  const data = JSON.stringify(expenses, null, 2)
  const blob = new Blob([data], {type:'application/json'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const date = new Date().toISOString().slice(0,10)
  a.href = url; a.download = `miraConti-expenses-${date}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
}

// Import JSON (replace after confirmation)
function importJSONFile(file){
  const reader = new FileReader()
  reader.onload = () => {
    try{
      const parsed = JSON.parse(reader.result)
      if(!Array.isArray(parsed)) throw new Error('Formato non valido')
      showConfirm('Sostituire tutte le spese esistenti con quanto contenuto nel file importato?').then(ok=>{
        if(!ok) return
        expenses = parsed.map(p=>({
          id: p.id || Date.now().toString()+Math.random(),
          amount: Number(p.amount)||0,
          date: new Date(p.date).toISOString(),
          category: p.category||'Altro',
          method: p.method||'Contanti',
          note: p.note||''
        }))
        save(); render(); showToast('Dati importati')
      })
    }catch(e){
      showToast('Import fallito: file non valido', {duration:4000})
    }
  }
  reader.readAsText(file)
}

// Navigation logic
const pages = {
  addExpense: document.getElementById('page-add-expense'),
  filterCash: document.getElementById('page-filter-cash'),
  filterSatispay: document.getElementById('page-filter-satispay'),
  filterHype: document.getElementById('page-filter-hype')
};

const navButtons = {
  addExpense: document.getElementById('nav-add-expense'),
  filterCash: document.getElementById('nav-filter-cash'),
  filterSatispay: document.getElementById('nav-filter-satispay'),
  filterHype: document.getElementById('nav-filter-hype')
};

function showPage(pageKey) {
  Object.values(pages).forEach(page => page.classList.add('hidden'));
  pages[pageKey].classList.remove('hidden');
}

navButtons.addExpense.addEventListener('click', () => showPage('addExpense'));
navButtons.filterCash.addEventListener('click', () => showPage('filterCash'));
navButtons.filterSatispay.addEventListener('click', () => showPage('filterSatispay'));
navButtons.filterHype.addEventListener('click', () => showPage('filterHype'));

// Render filtered expenses
function renderFilteredExpenses(method, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  const filtered = expenses.filter(e => e.method === method);
  filtered.forEach(expense => {
    const item = document.createElement('div');
    item.className = 'expense-item';
    item.innerHTML = `
      <div class="expense-left">
        <div>${expense.category || 'N/A'}</div>
        <div class="expense-meta">${new Date(expense.date).toLocaleDateString()}</div>
      </div>
      <div class="expense-amount">${fmt.format(expense.amount)}</div>
    `;
    container.appendChild(item);
  });
}

// Update filtered pages on load
renderFilteredExpenses('contanti', 'expenses-cash-list');
renderFilteredExpenses('satispay', 'expenses-satispay-list');
renderFilteredExpenses('hype', 'expenses-hype-list');

// Events
if(form){
  form.addEventListener('submit',e=>{
    e.preventDefault()
    addExpense({amount: amountEl.value, date: dateEl.value, category: categoryEl.value, method: methodEl.value, note: noteEl.value})
    form.reset(); dateEl.valueAsDate = new Date();
  })
}

filterMonth.addEventListener('input', render)
filterCategory.addEventListener('change', render)
filterMethod.addEventListener('change', render)
clearFiltersBtn.addEventListener('click', ()=>{ filterMonth.value=''; filterCategory.value=''; filterMethod.value=''; render() })
exportBtn.addEventListener('click', exportJSON)
importFile.addEventListener('change', (e)=>{ if(e.target.files.length) importJSONFile(e.target.files[0]); e.target.value=''; })

// Register service worker for PWA/offline
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('service-worker.js').catch(()=>console.log('SW registration failed'))
  })
}

// Month helpers
function updateMonthDisplay(){
  const months = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
  if(currentMonthEl) currentMonthEl.textContent = `${months[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`
  render()
}
function changeMonth(delta){ currentMonth.setMonth(currentMonth.getMonth()+delta); updateMonthDisplay() }
if(prevMonthBtn) prevMonthBtn.addEventListener('click', ()=>changeMonth(-1))
if(nextMonthBtn) nextMonthBtn.addEventListener('click', ()=>changeMonth(1))

// Initial load
load(); updateMonthDisplay(); render()

/* Notes on structure:
 - expenses: array of {id, amount, date(ISO), category, method, note}
 - stored under localStorage key miraContiExpenses_v1
*/
