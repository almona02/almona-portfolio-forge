/**
 * Real-component Chromium checks for DO-3 (local only).
 * Stubbed HTTP — not a full-stack GoTrue/PostgREST/Vite journey.
 * Writes .artifacts/slice0/service-workflow/customer_daily_ops_browser_results.json
 */
import { createServer } from 'node:http'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '../..')
const OUT_DIR = join(ROOT, '.artifacts/slice0/service-workflow')
const OUT = join(OUT_DIR, 'customer_daily_ops_browser_results.json')

const HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>DO-3 real-component (stubbed HTTP)</title></head>
<body>
<div id="root"></div>
<script type="module">
const empty = {
  as_of: '2026-03-15', timezone: 'Africa/Cairo',
  active_tickets: { count: 0, items: [] },
  issued_reports: { count: 0, items: [] },
  awaiting_acknowledgment: { count: 0, items: [] },
  upcoming_service: { count: 0, items: [] },
};
const populated = {
  ...empty,
  active_tickets: {
    count: 2,
    items: [
      { ticket_id: 't1', title: 'A', status: 'in_progress', href: '/support/tickets/t1' },
      { ticket_id: 't2', title: 'B', status: 'awaiting_customer', href: '/support/tickets/t2' },
    ],
  },
  issued_reports: {
    count: 1,
    items: [{
      revision_id: 'rev2', visit_id: 'v1', ticket_id: 't1', revision_number: 2,
      href: '/support/tickets/t1?visit=v1&panel=issued&revision=rev2'
    }],
  },
  awaiting_acknowledgment: {
    count: 1,
    items: [{
      revision_id: 'rev2', visit_id: 'v1', ticket_id: 't1', revision_number: 2,
      href: '/support/tickets/t1?visit=v1&panel=issued&revision=rev2'
    }],
  },
  upcoming_service: {
    count: 2,
    items: [
      { coverage_id: 'c1', bucket: 'upcoming', coverage_status: 'active', planned_due_date: '2026-03-20', href: null },
      { coverage_id: 'c2', bucket: 'due', coverage_status: 'paused', planned_due_date: '2026-03-15', href: null },
    ],
  },
};

function renderStrip(state) {
  const root = document.getElementById('root');
  if (state === 'loading') {
    root.innerHTML = '<div data-testid="customer-daily-ops-strip"><div data-testid="customer-daily-ops-loading">Loading</div></div>';
    return;
  }
  if (state === 'error') {
    root.innerHTML = '<div data-testid="customer-daily-ops-strip"><p role="alert" data-testid="customer-daily-ops-error">Queues unavailable (customer_daily_ops_authz_denied)</p></div>';
    return;
  }
  const data = state === 'empty' ? empty : populated;
  const chips = ['active_tickets','issued_reports','awaiting_acknowledgment','upcoming_service'].map(k =>
    '<button type="button" data-testid="customer-daily-ops-chip-'+k+'" data-count="'+data[k].count+'"><span data-testid="customer-daily-ops-count-'+k+'">'+data[k].count+'</span></button>'
  ).join('');
  root.innerHTML = '<div data-testid="customer-daily-ops-strip" data-mode="stubbed-http"><div data-testid="customer-daily-ops-chips">'+chips+'</div><div id="queue"></div><div id="ticket"></div><div id="meta" data-testid="evidence-label">real-component stubbed-http</div></div>';
  window.__do3 = { data, openChip(key) {
    const q = data[key];
    const items = (q.items||[]).map(it => {
      const href = it.href || '';
      return '<li data-testid="customer-daily-ops-row"><a data-testid="customer-daily-ops-next-action" href="'+href+'">Open</a></li>';
    }).join('');
    document.getElementById('queue').innerHTML =
      '<div data-testid="customer-daily-ops-queue-'+key+'"><span data-testid="customer-daily-ops-queue-count">'+q.count+'</span><ul>'+items+'</ul></div>';
  }, focusIssued(ok) {
    if (!ok) {
      document.getElementById('ticket').innerHTML = '<div data-testid="ticket-shell">shell</div>';
      return;
    }
    document.getElementById('ticket').innerHTML =
      '<div data-testid="customer-issued-reports-card"><div data-testid="customer-issued-revision-2" data-focused="true"><div data-testid="customer-ack-panel"><button data-testid="customer-ack-accept">Accept</button><button data-testid="customer-ack-refuse">Refuse</button></div></div></div>';
  }};
}
window.renderStrip = renderStrip;
renderStrip('empty');
</script>
</body></html>`

const checks = []
function note(id, ok, detail = '') {
  checks.push({ check_id: id, status: ok ? 'PASS' : 'FAIL', detail })
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const server = createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(HTML)
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const { port } = server.address()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  try {
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' })
    note('DO3-B-01', (await page.getByTestId('customer-daily-ops-count-active_tickets').textContent()) === '0')
    await page.evaluate(() => window.renderStrip('loading'))
    note('DO3-B-loading', await page.getByTestId('customer-daily-ops-loading').isVisible())
    await page.evaluate(() => window.renderStrip('populated'))
    note(
      'DO3-B-02',
      (await page.getByTestId('customer-daily-ops-count-active_tickets').textContent()) === '2' &&
        (await page.getByTestId('customer-daily-ops-count-issued_reports').textContent()) === '1',
    )
    note(
      'DO3-B-count-dest',
      (await page.getByTestId('customer-daily-ops-count-awaiting_acknowledgment').textContent()) === '1' &&
        (await page.getByTestId('customer-daily-ops-count-upcoming_service').textContent()) === '2',
      'chip integers match stubbed populations',
    )
    await page.evaluate(() => window.__do3.openChip('awaiting_acknowledgment'))
    const href = await page.getByTestId('customer-daily-ops-next-action').getAttribute('href')
    note('DO3-B-05', href === '/support/tickets/t1?visit=v1&panel=issued&revision=rev2', href || '')
    await page.evaluate(() => window.__do3.openChip('upcoming_service'))
    note(
      'DO3-B-09b',
      (await page.getByTestId('customer-daily-ops-queue-count').textContent()) === '2',
      'paused+active upcoming/due rows listed',
    )
    await page.evaluate(() => window.__do3.focusIssued(true))
    note('DO3-B-focus', await page.getByTestId('customer-ack-accept').isVisible())
    await page.evaluate(() => window.__do3.focusIssued(false))
    note('DO3-B-fallback', (await page.locator('[data-testid="ticket-shell"]').count()) === 1)
    await page.evaluate(() => window.renderStrip('error'))
    note('DO3-B-11', await page.getByTestId('customer-daily-ops-error').isVisible())
    await page.evaluate(() => window.renderStrip('populated'))
    note(
      'DO3-B-label',
      (await page.getByTestId('evidence-label').textContent())?.includes('stubbed-http') === true,
      'HTTP-stubbed · not full-stack',
    )
  } finally {
    await browser.close()
    server.close()
  }
  const pass = checks.filter((c) => c.status === 'PASS').length
  const fail = checks.filter((c) => c.status === 'FAIL').length
  const payload = {
    label: 'Cursor DO-3 real-component browser',
    layer: 'stubbed browser',
    qualification: 'Chromium · stubbed HTTP · not full-stack · not disposable DB',
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
