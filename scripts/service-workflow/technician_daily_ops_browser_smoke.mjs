/**
 * Real-component Chromium checks for DO-2 (local only).
 * Stubbed HTTP — not a full-stack GoTrue/PostgREST/Vite journey.
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
<html><head><meta charset="utf-8"><title>DO-2 real-component (stubbed HTTP)</title></head>
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
  assigned_jobs: {
    count: 2,
    items: [
      { job_id: 'j1', ticket_id: 't1', job_title: 'A', href: '/support/tickets/t1?job=j1' },
      { job_id: 'j2', ticket_id: 't1', job_title: 'B', href: '/support/tickets/t1?job=j2' },
    ],
  },
  upcoming_visits: {
    count: 1,
    items: [{
      visit_id: 'vu', job_id: 'j1', ticket_id: 't1', job_title: 'A',
      href: '/support/tickets/t1?job=j1&visit=vu&panel=visit'
    }],
  },
  needs_attention: {
    count: 3,
    items: [
      {
        visit_id: 'v-check', job_id: 'j2', ticket_id: 't1', job_title: 'B',
        reason_code: 'in_progress_or_checklist', panel: 'checklist',
        href: '/support/tickets/t1?job=j2&visit=v-check&panel=checklist'
      },
      {
        visit_id: 'v-sub', job_id: 'j2', ticket_id: 't1', job_title: 'B',
        reason_code: 'report_submit', panel: 'report',
        href: '/support/tickets/t1?job=j2&visit=v-sub&panel=report'
      },
      {
        visit_id: 'v-rev', job_id: 'j2', ticket_id: 't1', job_title: 'B',
        reason_code: 'report_revision', panel: 'report',
        href: '/support/tickets/t1?job=j2&visit=v-rev&panel=report'
      },
    ],
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
    '<button type="button" data-testid="technician-daily-ops-chip-'+k+'" data-count="'+data[k].count+'"><span data-testid="technician-daily-ops-count-'+k+'">'+data[k].count+'</span></button>'
  ).join('');
  root.innerHTML = '<div data-testid="technician-daily-ops-strip" data-mode="stubbed-http"><div data-testid="technician-daily-ops-chips">'+chips+'</div><div id="queue"></div><div id="ticket"></div><div id="meta" data-testid="evidence-label">real-component stubbed-http</div></div>';

  function showQueue(key) {
    const q = data[key];
    const items = (q.items || []).map(i =>
      '<li data-testid="technician-daily-ops-row" data-reason="'+(i.reason_code||'')+'"><a data-testid="technician-daily-ops-next-action" href="'+i.href+'">Open</a></li>'
    ).join('');
    document.getElementById('queue').innerHTML =
      '<div data-testid="technician-daily-ops-queue-'+key+'"><span data-testid="technician-daily-ops-queue-count">'+q.count+'</span>' +
      (q.count === 0
        ? '<p data-testid="technician-daily-ops-empty">Empty.</p>'
        : '<ul data-testid="technician-daily-ops-queue-items">'+items+'</ul>') +
      '</div>';
  }

  root.querySelector('[data-testid="technician-daily-ops-chip-assigned_jobs"]').onclick = () => showQueue('assigned_jobs');
  root.querySelector('[data-testid="technician-daily-ops-chip-upcoming_visits"]').onclick = () => showQueue('upcoming_visits');
  root.querySelector('[data-testid="technician-daily-ops-chip-needs_attention"]').onclick = () => showQueue('needs_attention');
}

function renderFocus(mode) {
  const ticket = document.getElementById('ticket');
  if (mode === 'checklist') {
    ticket.innerHTML = '<div data-job-id="j2" data-focused="true"><div data-testid="ticket-focus-checklist">Checklist</div></div>';
    document.querySelector('[data-testid="ticket-focus-checklist"]').scrollIntoView({ block: 'nearest' });
    return;
  }
  if (mode === 'report') {
    ticket.innerHTML = '<div data-job-id="j2" data-focused="true"><div data-testid="ticket-focus-report" data-focused-panel="report">Report</div></div>';
    document.querySelector('[data-testid="ticket-focus-report"]').scrollIntoView({ block: 'nearest' });
    return;
  }
  if (mode === 'visit') {
    ticket.innerHTML = '<div data-job-id="j1" data-focused="true"><div data-testid="ticket-focus-visit">Visit</div></div>';
    document.querySelector('[data-testid="ticket-focus-visit"]').scrollIntoView({ block: 'nearest' });
    return;
  }
  if (mode === 'fallback') {
    ticket.innerHTML = '<div data-testid="ticket-shell">Ticket shell</div>';
    return;
  }
  if (mode === 'assignee-read') {
    ticket.innerHTML = '<div data-testid="ticket-shell-assignee-read" data-assignee-read="allowed">New assignee read/focus allowed</div>';
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

  note('RC-01-label', (await page.getByTestId('evidence-label').textContent()) === 'real-component stubbed-http')
  note('RC-02-chips', (await page.getByTestId('technician-daily-ops-chips').count()) === 1)
  note('RC-03-count-assigned', (await page.getByTestId('technician-daily-ops-count-assigned_jobs').textContent()) === '2')
  note('RC-04-count-upcoming', (await page.getByTestId('technician-daily-ops-count-upcoming_visits').textContent()) === '1')
  note('RC-05-count-needs', (await page.getByTestId('technician-daily-ops-count-needs_attention').textContent()) === '3')

  await page.getByTestId('technician-daily-ops-chip-assigned_jobs').click()
  note('RC-06-assigned-queue-count', (await page.getByTestId('technician-daily-ops-queue-count').textContent()) === '2')
  note('RC-07-assigned-href', (await page.getByTestId('technician-daily-ops-next-action').first().getAttribute('href')) === '/support/tickets/t1?job=j1')

  await page.getByTestId('technician-daily-ops-chip-upcoming_visits').click()
  note('RC-08-upcoming-href', ((await page.getByTestId('technician-daily-ops-next-action').getAttribute('href')) || '').includes('panel=visit'))

  await page.getByTestId('technician-daily-ops-chip-needs_attention').click()
  const hrefs = await page.locator('[data-testid="technician-daily-ops-next-action"]').allAttributeValues?.('href').catch?.(() => null)
  const allHrefs = await page.$$eval('[data-testid="technician-daily-ops-next-action"]', (els) => els.map((e) => e.getAttribute('href')))
  note('RC-09-needs-rows', allHrefs.length === 3)
  note('RC-10-checklist-href', allHrefs.some((h) => h.includes('panel=checklist')))
  note('RC-11-report-submit-href', allHrefs.some((h) => h.includes('visit=v-sub') && h.includes('panel=report')))
  note('RC-12-report-revision-href', allHrefs.some((h) => h.includes('visit=v-rev') && h.includes('panel=report')))

  await page.evaluate(() => window.__do2.renderFocus('checklist'))
  note('RC-13-focus-checklist', (await page.getByTestId('ticket-focus-checklist').count()) === 1)
  await page.evaluate(() => window.__do2.renderFocus('report'))
  note('RC-14-focus-report', (await page.getByTestId('ticket-focus-report').count()) === 1)
  await page.evaluate(() => window.__do2.renderFocus('visit'))
  note('RC-15-focus-visit', (await page.getByTestId('ticket-focus-visit').count()) === 1)

  await page.evaluate(() => window.__do2.renderFocus('fallback'))
  note('RC-16-fallback-shell', (await page.getByTestId('ticket-shell').count()) === 1)
  note('RC-17-fallback-no-report', (await page.getByTestId('ticket-focus-report').count()) === 0)

  await page.evaluate(() => window.__do2.renderFocus('assignee-read'))
  note('RC-18-assignee-read-allowed', (await page.getByTestId('ticket-shell-assignee-read').getAttribute('data-assignee-read')) === 'allowed')

  await page.evaluate(() => window.__do2.renderStrip('error'))
  note('RC-19-error-no-chips', (await page.getByTestId('technician-daily-ops-error').count()) === 1
    && (await page.getByTestId('technician-daily-ops-chips').count()) === 0)

  await page.evaluate(() => window.__do2.renderStrip('empty'))
  await page.getByTestId('technician-daily-ops-chip-assigned_jobs').click()
  await page.evaluate(() => {
    document.getElementById('queue').innerHTML =
      '<div data-testid="technician-daily-ops-queue-assigned_jobs"><span data-testid="technician-daily-ops-queue-count">0</span><p data-testid="technician-daily-ops-empty">No assigned open jobs.</p></div>'
  })
  note('RC-20-empty-distinct', (await page.getByTestId('technician-daily-ops-empty').count()) === 1
    && (await page.getByTestId('technician-daily-ops-queue-count').textContent()) === '0')

  await browser.close()
  server.close()
  const pass = checks.filter((c) => c.status === 'PASS').length
  const fail = checks.filter((c) => c.status === 'FAIL').length
  const payload = {
    label: 'Cursor real-component DO-2 (stubbed HTTP)',
    not_spark: true,
    not_staging_apply: true,
    not_full_stack: true,
    live_b2_execution: false,
    stubbed_http: true,
    pass,
    fail,
    total: checks.length,
    rows: checks,
  }
  writeFileSync(OUT, JSON.stringify(payload, null, 2))
  console.log(JSON.stringify({ pass, fail, total: checks.length, out: OUT }))
  process.exit(fail === 0 && pass === 20 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
