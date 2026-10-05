// Revoke only the automation access created by this acceptance run.
import {spawnSync} from 'node:child_process';
const cli = process.argv[2];
if (!cli) throw new Error('Pass the installed Vercel CLI executable path.');
const project = 'prj_MV11IODTkx2h7nWckMXIvDc7xtrW';
function api(endpoint, method='GET', body) {
  const args = [cli, 'api', endpoint, '--raw', '--scope', 'mohamed-hassans-projects-0ca04921'];
  if (body) args.push('--method',method,'--input','-');
  const response = spawnSync(process.execPath,args,{encoding:'utf8',input:body && JSON.stringify(body)});
  if (response.status !== 0) throw new Error('Vercel verification-access cleanup request failed; credentials suppressed.');
  return JSON.parse(response.stdout);
}
const settings = api(`/v9/projects/${project}`);
const entries = Object.entries(settings.protectionBypass || {}).filter(([,value])=>value.scope==='automation-bypass');
if (entries.length !== 1) throw new Error('Unexpected automation-access count; no access revoked.');
const [secret,metadata] = entries[0];
if (metadata.createdAt < Date.parse('2026-10-05T15:50:00Z')) {
  throw new Error('Access predates this verification; no access revoked.');
}
api(`/v1/projects/${project}/protection-bypass`,'PATCH',{revoke:{secret,regenerate:false}});
const verified = api(`/v9/projects/${project}`);
if (verified.protectionBypass?.[secret]) throw new Error('Verification access remains active.');
console.log('PASS: acceptance-run automation token revoked; other deployment protection settings retained.');
