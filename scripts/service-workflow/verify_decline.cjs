/**
 * Spark B2 decline state verifier (sanitized).
 * Env: SLICE0_HANDOFF_DIR, SLICE0_SUPABASE_URL, SLICE0_JOB_ID, SLICE0_TICKET_ID
 */
'use strict';
const fs = require('fs');
const path = require('path');
const handoff = process.env.SLICE0_HANDOFF_DIR;
const SUPA = process.env.SLICE0_SUPABASE_URL;
const JID = process.env.SLICE0_JOB_ID;
const TID = process.env.SLICE0_TICKET_ID;
if (!handoff || !SUPA || !JID || !TID) {
  console.error('Missing SLICE0_HANDOFF_DIR / SLICE0_SUPABASE_URL / SLICE0_JOB_ID / SLICE0_TICKET_ID');
  process.exit(2);
}
const ANON = fs.readFileSync(path.join(handoff, 'anon_key.txt'), 'utf8').trim();
const live = path.join(handoff, 'admin.live.json');
const A = JSON.parse(fs.readFileSync(fs.existsSync(live) ? live : path.join(handoff, 'admin.json'), 'utf8'));
const H = { apikey: ANON, Authorization: `Bearer ${A.access_token}` };
(async () => {
  const g = async (t, q) => (await (await fetch(`${SUPA}/rest/v1/${t}?${q}`, { headers: H })).json());
  console.log('JOB=' + JSON.stringify(await g('service_jobs', `id=eq.${JID}&select=id,job_sequence,title,state,assigned_technician_id`)));
  console.log(
    'HIST=' +
      JSON.stringify(
        await g('service_job_assignment_history', `job_id=eq.${JID}&select=action,actor_role,reason&order=created_at`),
      ),
  );
  console.log('TKT=' + JSON.stringify(await g('service_tickets', `id=eq.${TID}&select=ticket_number,assigned_to`)));
  console.log(
    'JRN-JOBS=' +
      JSON.stringify(
        await g('service_jobs', `ticket_id=eq.${TID}&select=job_sequence,state,assigned_technician_id&order=job_sequence`),
      ),
  );
})();
