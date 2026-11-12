/**
 * Spark B2 journey helper (sanitized): UI decline on existing JRN-DECLINE-ME row.
 * Env: SLICE0_HANDOFF_DIR, SLICE0_SUPABASE_URL, SLICE0_TICKET_ID, SLICE0_SHOT_DIR,
 *      SLICE0_PREVIEW_URL, PLAYWRIGHT_MODULE (optional)
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
  console.error('Missing required SLICE0_* env');
  process.exit(2);
}
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const ANON = fs.readFileSync(path.join(handoff, 'anon_key.txt'), 'utf8').trim();
const S = {};
for (const r of ['tech', 'admin']) {
  const live = path.join(handoff, `${r}.live.json`);
  const base = path.join(handoff, `${r}.json`);
  S[r] = JSON.parse(fs.readFileSync(fs.existsSync(live) ? live : base, 'utf8'));
}
const H = (tok) => ({ apikey: ANON, Authorization: `Bearer ${tok}` });
const hostKey = `sb-${new globalThis.URL(SUPA).hostname.split('.')[0]}-auth-token`;
const sess = JSON.stringify({
  access_token: S.tech.access_token,
  refresh_token: S.tech.refresh_token,
  expires_at: Math.floor(Date.now() / 1000) + 3000,
  token_type: 'bearer',
  user: { id: S.tech.user_id, email: S.tech.email },
});
console.log('utc=' + new Date().toISOString());
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript({ content: `localStorage.setItem(${JSON.stringify(hostKey)}, ${JSON.stringify(sess)});` });
  const p = await ctx.newPage();
  await p.goto(`${PREVIEW}/technician`, { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(4000);
  const title = p.getByText('JRN-DECLINE-ME').first();
  const card = title.locator('xpath=./ancestor::div[.//button[contains(., "Decline job")]][1]');
  const dec = card.getByRole('button', { name: /decline job/i });
  let clicked = false;
  if ((await dec.count()) > 0) {
    await dec.first().click();
    await p.waitForTimeout(1500);
    const ta = p.locator('textarea').last();
    if ((await ta.count()) > 0) await ta.fill('overloaded - spark final');
    await p.screenshot({ path: path.join(SHOT, 'j15_decline_dialog.png') });
    const go = p.getByRole('button', { name: /confirm|submit/i });
    if ((await go.count()) > 0) await go.first().click();
    else await p.getByRole('button', { name: /decline/i }).last().click();
    await p.waitForTimeout(4000);
    clicked = true;
  } else console.log('DECLINE-NOT-FOUND');
  await p.screenshot({ path: path.join(SHOT, 'j15_after.png') });
  await browser.close();
  const j = (
    await (
      await fetch(
        `${SUPA}/rest/v1/service_jobs?ticket_id=eq.${TID}&job_sequence=eq.2&select=id,state,assigned_technician_id`,
        { headers: H(S.admin.access_token) },
      )
    ).json()
  )[0];
  const h = await (
    await fetch(
      `${SUPA}/rest/v1/service_job_assignment_history?job_id=eq.${j.id}&select=action,actor_role&order=created_at`,
      { headers: H(S.admin.access_token) },
    )
  ).json();
  const t = (
    await (
      await fetch(`${SUPA}/rest/v1/service_tickets?id=eq.${TID}&select=assigned_to`, {
        headers: H(S.admin.access_token),
      })
    ).json()
  )[0];
  const ok =
    clicked &&
    j.state === 'unassigned' &&
    j.assigned_technician_id === null &&
    h[h.length - 1].action === 'decline' &&
    t.assigned_to === null;
  console.log(
    `${ok ? 'PASS' : 'FAIL'} J-5d :: clicked=${clicked} st=${j.state} tech_null=${j.assigned_technician_id === null} hist=${JSON.stringify(h.map((x) => x.action))} contact=${t.assigned_to}`,
  );
})();
