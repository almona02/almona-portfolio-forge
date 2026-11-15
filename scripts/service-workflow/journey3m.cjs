/**
 * Spark B2 journey helper (sanitized): create+assign JRN-DECLINE-ME, then UI decline.
 * No secrets in-repo. Requires env:
 *   SLICE0_HANDOFF_DIR  — dir with anon_key.txt + {support,tech,admin}.json
 *   SLICE0_SUPABASE_URL — staging project URL
 *   SLICE0_TICKET_ID    — ticket id for the journey
 *   SLICE0_SHOT_DIR     — screenshot output dir
 *   SLICE0_PREVIEW_URL  — app origin (e.g. http://localhost:3002)
 * Optional: PLAYWRIGHT_MODULE — absolute path to playwright package
 */
'use strict';
const fs = require('fs');
const path = require('path');
const handoff = process.env.SLICE0_HANDOFF_DIR;
const SUPA = process.env.SLICE0_SUPABASE_URL;
const TID = process.env.SLICE0_TICKET_ID;
const SHOT = process.env.SLICE0_SHOT_DIR;
const PREVIEW = process.env.SLICE0_PREVIEW_URL || 'http://localhost:3002';
if (!handoff || !SUPA || !TID || !SHOT) {
  console.error('Missing SLICE0_HANDOFF_DIR / SLICE0_SUPABASE_URL / SLICE0_TICKET_ID / SLICE0_SHOT_DIR');
  process.exit(2);
}
const playwrightPath = process.env.PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = require(playwrightPath);
const ANON = fs.readFileSync(path.join(handoff, 'anon_key.txt'), 'utf8').trim();
const S = {};
for (const r of ['support', 'tech', 'admin']) {
  const live = path.join(handoff, `${r}.live.json`);
  const base = path.join(handoff, `${r}.json`);
  S[r] = JSON.parse(fs.readFileSync(fs.existsSync(live) ? live : base, 'utf8'));
}
const H = (tok) => ({ apikey: ANON, Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' });
const KEY = `sb-${new globalThis.URL(SUPA).hostname.split('.')[0]}-auth-token`;
const sess = (r) =>
  JSON.stringify({
    access_token: S[r].access_token,
    refresh_token: S[r].refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + 3000,
    token_type: 'bearer',
    user: { id: S[r].user_id, email: S[r].email },
  });
const rpc = async (role, fn, body) => {
  const r = await fetch(`${SUPA}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: H(S[role].access_token),
    body: JSON.stringify(body),
  });
  return { http: r.status, json: await r.json().catch(() => null) };
};
console.log('utc=' + new Date().toISOString());
(async () => {
  const c = await rpc('support', 'create_service_job', {
    p_ticket_id: TID,
    p_title: 'JRN-DECLINE-ME',
    p_required: true,
    p_rationale: 'jrn',
    p_actor_id: null,
  });
  const jid = c.json && c.json.id;
  console.log('CREATE http=' + c.http + ' id=' + String(jid).slice(0, 8));
  await rpc('support', 'assign_service_job', {
    p_job_id: jid,
    p_technician_id: S.tech.user_id,
    p_rationale: 'jrn',
    p_actor_id: null,
  });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript({ content: `localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(sess('tech'))});` });
  const p = await ctx.newPage();
  await p.goto(`${PREVIEW}/technician`, { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(4000);
  const row = p.locator('div', { hasText: 'JRN-DECLINE-ME' }).last();
  const dec = row.getByRole('button', { name: /decline job/i });
  let clicked = false;
  if ((await dec.count()) > 0) {
    await dec.first().click();
    await p.waitForTimeout(1500);
    const ta = p.locator('textarea').last();
    if ((await ta.count()) > 0) await ta.fill('overloaded - spark jrn final');
    await p.screenshot({ path: path.join(SHOT, 'j14_decline_dialog.png') });
    const go = p.getByRole('button', { name: /confirm|submit/i });
    if ((await go.count()) > 0) await go.first().click();
    else await p.getByRole('button', { name: /decline/i }).last().click();
    await p.waitForTimeout(3500);
    clicked = true;
  } else console.log('ROW-NOT-FOUND');
  await p.screenshot({ path: path.join(SHOT, 'j14_after_decline.png') });
  await browser.close();
  const j = (
    await (
      await fetch(`${SUPA}/rest/v1/service_jobs?id=eq.${jid}&select=state,assigned_technician_id`, {
        headers: H(S.admin.access_token),
      })
    ).json()
  )[0];
  const h = (
    await (
      await fetch(
        `${SUPA}/rest/v1/service_job_assignment_history?job_id=eq.${jid}&select=action&order=created_at`,
        { headers: H(S.admin.access_token) },
      )
    ).json()
  ).map((x) => x.action);
  const t = (
    await (
      await fetch(`${SUPA}/rest/v1/service_tickets?id=eq.${TID}&select=assigned_to`, {
        headers: H(S.admin.access_token),
      })
    ).json()
  )[0];
  console.log(
    `${clicked && j.state === 'unassigned' && h[h.length - 1] === 'decline' && t.assigned_to === null ? 'PASS' : 'FAIL'} J-5d :: clicked=${clicked} st=${j.state} hist=${JSON.stringify(h)} contact=${t.assigned_to}`,
  );
})();
