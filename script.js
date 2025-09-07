import { supabase, fetchData } from './supabase.js'
const content = document.getElementById('content')
document.getElementById('tab-stock').onclick = loadStock
document.getElementById('tab-operations').onclick = loadOperations
document.getElementById('tab-temporale').onclick = loadTemporal
loadStock()

async function loadStock() {
  content.innerHTML = '<h2>Stock sul bancone</h2>'
  const rows = await fetchData('prodotti', { location: 'bancone' })
  const summary = rows.reduce((acc, p) => {
    acc[p.tipo] = (acc[p.tipo] || 0) + p.quantità
    return acc
  }, {})
  const container = document.createElement('div')
  Object.entries(summary).forEach(([tipo, qty]) => {
    const card = document.createElement('div')
    card.className = 'card'
    card.innerHTML = `<strong>${tipo}</strong>: ${qty}`
    container.appendChild(card)
  })
  content.appendChild(container)
}

async function loadOperations() {
  content.innerHTML = '<h2>Operazioni di oggi</h2>'
  const now = new Date()
  const start = new Date(now.setHours(0,0,0,0)).toISOString()
  const end = new Date(now.setHours(23,59,59,999)).toISOString()
  const { data: ops } = await supabase.from('operazioni')
    .select('*')
    .gte('timestamp', start)
    .lte('timestamp', end)

  const table = document.createElement('table')
  table.innerHTML = `
    <tr><th>Operatore</th><th>Prodotto</th><th>Qtà</th><th>Pagamento</th><th>Prezzo</th><th>Ora</th></tr>
  `
  ops.forEach(o => {
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td>${o.operatore}</td>
      <td>${o.prodotto}</td>
      <td>${o.quantità}</td>
      <td>${o.pagamento}</td>
      <td>${o.prezzo_unitario ? (o.prezzo_unitario * o.quantità).toFixed(2) : '-'}</td>
      <td>${new Date(o.timestamp).toLocaleTimeString()}</td>
    `
    table.appendChild(tr)
  })
  content.appendChild(table)
}

function loadTemporal() {
  content.innerHTML = `
    <h2>Scheda Temporale</h2>
    <label>Da: <input type="datetime-local" id="from"></label>
    <label>A: <input type="datetime-local" id="to"></label>
    <button id="btn-filter">Filtra</button>
    <select id="operator-select"><option value="">Tutti operatori</option></select>
    <label>Pagamento:
      <select id="payment-select">
        <option value="">Tutti</option>
        <option value="contanti">Contanti</option>
        <option value="bancomat">Bancomat</option>
      </select>
    </label>
    <div class="chart-container"><canvas id="chart-sales"></canvas></div>
    <div id="ops-list"></div>
  `
  const isoNow = new Date().toISOString().slice(0,16)
  document.getElementById('from').value = isoNow
  document.getElementById('to').value = isoNow
  document.getElementById('btn-filter').onclick = filterTemporal
  populateOperators()
  initSalesChart()
}

async function populateOperators() {
  const ops = await fetchData('operazioni')
  const uniq = [...new Set(ops.map(o => o.operatore))]
  const sel = document.getElementById('operator-select')
  uniq.forEach(op => sel.append(new Option(op, op)))
}

let salesChart
function initSalesChart() {
  const ctx = document.getElementById('chart-sales').getContext('2d')
  salesChart = new Chart(ctx, {
    type: 'bar',
    data: { labels: [], datasets: [{ label: 'Qtà venduta', data: [], backgroundColor: 'rgba(75,192,192,0.6)' }]},
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  })
}

async function filterTemporal() {
  const from = new Date(document.getElementById('from').value).toISOString()
  const to   = new Date(document.getElementById('to').value).toISOString()
  const op   = document.getElementById('operator-select').value
  const pay  = document.getElementById('payment-select').value

  let q = supabase.from('operazioni').select('*').gte('timestamp', from).lte('timestamp', to)
  if (op) q = q.eq('operatore', op)
  if (pay) q = q.eq('pagamento', pay)
  const { data } = await q

  document.getElementById('ops-list').innerHTML = `
    <h3>Operazioni</h3>
    <ul>
      ${data.map(o =>
        `<li>${new Date(o.timestamp).toLocaleString()} – <strong>${o.operatore}</strong> – ${o.prodotto} ×${o.quantità} – <em>${o.pagamento}</em> – ${o.prezzo_unitario ? (o.prezzo_unitario * o.quantità).toFixed(2) + '€' : ''}</li>`
      ).join('')}
    </ul>`

  const byProd = {}
  data.forEach(o => byProd[o.prodotto] = (byProd[o.prodotto] || 0) + o.quantità)
  salesChart.data.labels = Object.keys(byProd)
  salesChart.data.datasets[0].data = Object.values(byProd)
  salesChart.update()
}
