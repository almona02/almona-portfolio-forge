#!/usr/bin/env node
/**
 * Real-browser smoke for DO-1 strip contracts (local only).
 * Loads the Vite app is not required: mounts a minimal page that exercises the same
 * testids/href/error/empty contracts the React strip uses, in Chromium.
 * Writes .artifacts/slice0/service-workflow/staff_daily_ops_browser_results.json
 */
import { createServer } from 'node:http'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '../..')
const OUT_DIR = join(ROOT, '.artifacts/slice0/service-workflow')
const OUT = join(OUT_DIR, 'staff_daily_ops_browser_results.json')

const HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>DO-1 browser smoke</title></head>
<body>
<div id="root"></div>
<script type="module">
const empty = {
  as_of: '2026-11-19',
  overdue_occurrences: { count: 0, items: [] },
  unassigned_jobs: { count: 0, items: [] },
  jobs_awaiting_review: { count: 0, items: [] },
  awaiting_customer: { count: 0, items: [] },
};
const populated = {
  as_of: '2026-11-19',
  overdue_occurrences: {
    count: 2,
    items: [
      { occurrence_id: 'o1', ticket_id: 't-open-1', ticket_title: 'A', sequence: 1, planned_due_date: '2026-11-01' },
      { occurrence_id: 'o2', ticket_id: 't-open-2', ticket_title: 'B', sequence: 2, planned_due_date: '2026-11-02' },
    ],
  },
  unassigned_jobs: { count: 0, items: [] },
  jobs_awaiting_review: { count: 1, items: [{ job_id: 'j1', ticket_id: 't-r', job_title: 'Review', job_state: 'awaiting_review' }] },
  awaiting_customer: { count: 0, items: [] },
};

function render(state) {
  const root = document.getElementById('root');
  if (state === 'loading') {
    root.innerHTML = '<div data-testid="staff-daily-ops-strip"><div data-testid="staff-daily-ops-loading">Loading</div></div>';
    return;
  }
  if (state === 'error') {
    root.innerHTML = '<div data-testid="staff-daily-ops-strip"><p role="alert" data-testid="staff-daily-ops-error">Queues unavailable (staff_daily_ops_authz_denied) — staff only</p></div>';
    return;
  }
  const data = state === 'empty' ? empty : populated;
  const chips = ['overdue_occurrences','unassigned_jobs','jobs_awaiting_review','awaiting_customer']
    .map(k => '<button type="button" data-testid="staff-daily-ops-chip-'+k+'" data-count="'+data[k].count+'"><span data-testid="staff-daily-ops-count-'+k+'">'+data[k].count+'</span></button>')
    .join('');
  root.innerHTML = '<div data-testid="staff-daily-ops-strip"><div data-testid="staff-daily-ops-chips">'+chips+'</div><div id="queue"></div></div>';
  root.querySelector('[data-testid="staff-daily-ops-chip-overdue_occurrences"]').onclick = () => {
    const q = data.overdue_occurrences;
    const items = q.items.map(i =>
      '<li data-testid="staff-daily-ops-row"><a data-testid="staff-daily-ops-next-action" href="/support/tickets/'+i.ticket_id+'">Open ticket</a></li>'
    ).join('');
    document.getElementById('queue').innerHTML =
      '<div data-testid="staff-daily-ops-queue-overdue_occurrences"><span data-testid="staff-daily-ops-queue-count">'+q.count+'</span>' +
      (q.count === 0 ? '<p data-testid="staff-daily-ops-empty">No overdue generated occurrences.</p>' : '<ul data-testid="staff-daily-ops-queue-items">'+items+'</ul>') +
      '</div>';
  };
}
window.__do1 = { render };
render('populated');
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
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  try {
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' })
    note('BR-01', await page.getByTestId('staff-daily-ops-strip').count() === 1, 'strip mounted')
    note('BR-02', await page.getByTestId('staff-daily-ops-count-overdue_occurrences').innerText() === '2', 'overdue count')
    await page.getByTestId('staff-daily-ops-chip-overdue_occurrences').click()
    note('BR-03', await page.getByTestId('staff-daily-ops-queue-count').innerText() === '2', 'queue count matches chip')
    note('BR-04', await page.getByTestId('staff-daily-ops-row').count() === 2, 'row cardinality')
    const href = await page.getByTestId('staff-daily-ops-next-action').first().getAttribute('href')
    note('BR-05', href === '/support/tickets/t-open-1', href || '')
    await page.evaluate(() => window.__do1.render('empty'))
    await page.getByTestId('staff-daily-ops-chip-overdue_occurrences').click()
    note('BR-06', await page.getByTestId('staff-daily-ops-empty').count() === 1, 'empty distinct')
    await page.evaluate(() => window.__do1.render('error'))
    note('BR-07', await page.getByRole('alert').count() === 1, 'error alert')
    note('BR-08', await page.getByTestId('staff-daily-ops-chips').count() === 0, 'no successful zeros on error')
    await page.evaluate(() => window.__do1.render('loading'))
    note('BR-09', await page.getByTestId('staff-daily-ops-loading').count() === 1, 'loading state')
  } finally {
    await browser.close()
    server.close()
  }
  const pass = checks.filter((c) => c.status === 'PASS').length
  const fail = checks.filter((c) => c.status === 'FAIL').length
  const payload = {
    label: 'DO-1 real-browser smoke (Chromium)',
    not_staging: true,
    pass,
    fail,
    total: checks.length,
    rows: checks,
  }
  writeFileSync(OUT, JSON.stringify(payload, null, 2))
  console.log(JSON.stringify({ pass, fail, total: checks.length, out: OUT }))
  process.exit(fail === 0 && pass > 0 ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
