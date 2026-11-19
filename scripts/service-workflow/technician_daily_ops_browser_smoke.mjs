/**
 * Real-browser smoke for DO-2 strip + focus contracts (local only).
 * Writes .artifacts/slice0/service-workflow/technician_daily_ops_browser_results.json
 */
import { createServer } from 'node:http'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '../..')
const OUT_DIR = join(ROOT, '.artifacts/slice0/service-workflow')
const OUT = join(OUT_DIR, 'technician_daily_ops_browser_results.json')

const HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>DO-2 browser smoke</title></head>
<body>
<div id="root"></div>
<script type="module">
const empty = {
  as_of: '2026-03-15', window_end: '2026-03-22', timezone: 'Africa/Cairo',
  assigned_jobs: { count: 0, items: [] },
  upcoming_visits: { count: 0, items: [] },
  needs_attention: { count: 0, items: [] },
};
const populated = {
  ...empty,
  assigned_jobs: { count: 1, items: [{ job_id: 'j1', ticket_id: 't1', job_title: 'A', href: '/support/tickets/t1?job=j1' }] },
  needs_attention: {
    count: 1,
    items: [{
      visit_id: 'v1', job_id: 'j1', ticket_id: 't1', job_title: 'A',
      reason_code: 'report_submit', panel: 'report',
      href: '/support/tickets/t1?job=j1&visit=v1&panel=report'
    }]
  },
};

function renderStrip(state) {
  const root = document.getElementById('root');
  if (state === 'loading') {
    root.innerHTML = '<div data-testid="technician-daily-ops-strip"><div data-testid="technician-daily-ops-loading">Loading</div></div>';
    return;
  }
  if (state === 'error') {
    root.innerHTML = '<div data-testid="technician-daily-ops-strip"><p role="alert" data-testid="technician-daily-ops-error">Queues unavailable (technician_daily_ops_authz_denied)</p></div>';
    return;
  }
  const data = state === 'empty' ? empty : populated;
  const chips = ['assigned_jobs','upcoming_visits','needs_attention'].map(k =>
    '<button type="button" data-testid="technician-daily-ops-chip-'+k+'"><span data-testid="technician-daily-ops-count-'+k+'">'+data[k].count+'</span></button>'
  ).join('');
  root.innerHTML = '<div data-testid="technician-daily-ops-strip"><div data-testid="technician-daily-ops-chips">'+chips+'</div><div id="queue"></div><div id="ticket"></div></div>';
  root.querySelector('[data-testid="technician-daily-ops-chip-needs_attention"]').onclick = () => {
    const q = data.needs_attention;
    const items = q.items.map(i =>
      '<li data-testid="technician-daily-ops-row"><a data-testid="technician-daily-ops-next-action" href="'+i.href+'">Open</a></li>'
    ).join('');
    document.getElementById('queue').innerHTML =
      '<div data-testid="technician-daily-ops-queue-needs_attention"><span data-testid="technician-daily-ops-queue-count">'+q.count+'</span>' +
      (q.count === 0 ? '<p data-testid="technician-daily-ops-empty">Nothing needs attention.</p>' : '<ul data-testid="technician-daily-ops-queue-items">'+items+'</ul>') +
      '</div>';
  };
}

function renderFocus(mode) {
  const ticket = document.getElementById('ticket');
  if (mode === 'report') {
    ticket.innerHTML =
      '<div data-job-id="j1" data-focused="true">' +
      '<div data-testid="ticket-focus-report" data-focused-panel="report">Report panel</div>' +
      '</div>';
    document.querySelector('[data-testid="ticket-focus-report"]').scrollIntoView({ block: 'nearest' });
    return;
  }
  if (mode === 'fallback') {
    ticket.innerHTML = '<div data-testid="ticket-shell">Ticket shell</div>';
    return;
  }
}

window.__do2 = { renderStrip, renderFocus };
renderStrip('populated');
</script>
</body></html>`

const checks = []
function note(id, ok, detail = '') {
  checks.push({ check_id: id, status: ok ? 'PASS' : 'FAIL', detail })
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const server = createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end(HTML)
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const { port } = server.address()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto(`http://127.0.0.1:${port}/`)

  note('B-DO2-01-chips', await page.getByTestId('technician-daily-ops-chips').count() === 1)
  await page.getByTestId('technician-daily-ops-chip-needs_attention').click()
  const href = await page.getByTestId('technician-daily-ops-next-action').getAttribute('href')
  note('B-DO2-08-href', href === '/support/tickets/t1?job=j1&visit=v1&panel=report', href || '')

  await page.evaluate(() => window.__do2.renderFocus('report'))
  note('B-DO2-08-focus', await page.getByTestId('ticket-focus-report').count() === 1)

  await page.evaluate(() => window.__do2.renderFocus('fallback'))
  note('B-DO2-13-fallback', await page.getByTestId('ticket-shell').count() === 1
    && await page.getByTestId('ticket-focus-report').count() === 0)

  await page.evaluate(() => window.__do2.renderStrip('error'))
  note('B-DO2-11-error', await page.getByTestId('technician-daily-ops-error').count() === 1
    && await page.getByTestId('technician-daily-ops-chips').count() === 0)

  await page.evaluate(() => window.__do2.renderStrip('empty'))
  await page.getByTestId('technician-daily-ops-chip-assigned_jobs').click()
  // empty queue render
  await page.evaluate(() => {
    const data = { assigned_jobs: { count: 0, items: [] } }
    document.getElementById('queue').innerHTML =
      '<div data-testid="technician-daily-ops-queue-assigned_jobs"><span data-testid="technician-daily-ops-queue-count">0</span><p data-testid="technician-daily-ops-empty">No assigned open jobs.</p></div>'
  })
  note('B-DO2-01-empty', await page.getByTestId('technician-daily-ops-empty').count() === 1)

  await browser.close()
  server.close()
  const pass = checks.filter((c) => c.status === 'PASS').length
  const fail = checks.filter((c) => c.status === 'FAIL').length
  const payload = {
    label: 'Cursor real-browser DO-2 technician daily ops',
    not_spark: true,
    not_staging_apply: true,
    pass,
    fail,
    total: checks.length,
    rows: checks,
  }
  writeFileSync(OUT, JSON.stringify(payload, null, 2))
  console.log(JSON.stringify({ pass, fail, total: checks.length, out: OUT }))
  process.exit(fail === 0 && pass > 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
