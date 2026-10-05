"""Read-only live API/owner isolation audit. Never print credentials or tokens."""
import json
import re
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

config = {}
for filename in ['.env', '.env.local', 'python_backend/.env', '.env.batch0.fixtures']:
    path = Path(filename)
    if path.exists():
        for line in path.read_text(encoding='utf-8-sig').splitlines():
            match = re.match(r'^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$', line)
            if match:
                config[match[1]] = match[2].strip('\"\'')
base = 'https://shfsebdncjnncqqnewfj.supabase.co'
key = config.get('VITE_SUPABASE_ANON_KEY') or config.get('SUPABASE_ANON_KEY')
assert key, 'Public application key unavailable'

def request(path, token=None, payload=None):
    headers = {'apikey': key, 'Authorization': 'Bearer ' + (token or key)}
    if payload is not None:
        headers['Content-Type'] = 'application/json'
    try:
        with urlopen(Request(base + path, headers=headers,
                             data=json.dumps(payload).encode() if payload is not None else None), timeout=30) as response:
            return response.status, json.load(response)
    except HTTPError as error:
        data = json.load(error)
        return error.code, {'code': data.get('code') or data.get('error_code'),
                            'message': data.get('message') or data.get('msg')}

report = {'purpose': 'Read-only disposable fixture and owner isolation audit', 'owners': {}}
test_sessions = {}
fixture_positions = {}
tables = [('fabricator_projects_v2', 'owner_user_id'),
          ('fabricator_positions_v2', 'owner_user_id'),
          ('fabricator_profiles', 'user_id')]
for owner, other in [('A', 'B'), ('B', 'A')]:
    status, session = request('/auth/v1/token?grant_type=password', payload={
        'email': config[f'BATCH0_OWNER_{owner}_EMAIL'],
        'password': config[f'BATCH0_OWNER_{owner}_PASSWORD']})
    entry = {'login_status': status}
    report['owners'][owner] = entry
    if status != 200:
        entry['login_error'] = session
        continue
    token = session['access_token']
    test_sessions[owner] = token
    assert session['user']['id'] == config[f'BATCH0_OWNER_{owner}_ID']
    entry['queries'] = {}
    own_id = config[f'BATCH0_OWNER_{owner}_ID']
    status, own_profile = request(f'/rest/v1/profiles?select=id,role&id=eq.{own_id}', token)
    entry['authenticated_profile'] = {'status': status, 'rows': own_profile}
    status, position_rows = request(f'/rest/v1/fabricator_positions_v2?select=id,qc_revision,overall_width_mm,overall_height_mm,system_pack_id&owner_user_id=eq.{own_id}', token)
    entry['persisted_positions'] = {'status': status, 'rows': position_rows}
    for table, column in tables:
        own_id = config[f'BATCH0_OWNER_{owner}_ID']
        other_id = config[f'BATCH0_OWNER_{other}_ID']
        for scope, user_id in [('own', own_id), ('other', other_id)]:
            status, rows = request(f'/rest/v1/{table}?select=id&{column}=eq.{user_id}', token)
            entry['queries'][f'{table}:{scope}'] = {'status': status, 'count': len(rows)} if isinstance(rows, list) else {'status': status, 'error': rows}
            if scope == 'own' and isinstance(rows, list):
                entry['queries'][f'{table}:{scope}']['fixture_ids'] = [row['id'] for row in rows]
            if table == 'fabricator_positions_v2' and scope == 'own' and isinstance(rows, list):
                fixture_positions[owner] = [row['id'] for row in rows]
    for table in ['fabricator_pose_quotes', 'fabricator_position_releases', 'fabricator_delivery_acknowledgements']:
        status, rows = request(f'/rest/v1/{table}?select=id&owner_user_id=eq.{own_id}&limit=1', token)
        entry['queries'][table] = {'status': status, 'sample_count': len(rows)} if isinstance(rows, list) else {'status': status, 'error': rows}
    status, rows = request(f'/rest/v1/stock_movements?select=id,idempotency_key&user_id=eq.{own_id}&limit=1', token)
    entry['queries']['stock_idempotency_column'] = {'status': status} if isinstance(rows, list) else {'status': status, 'error': rows}
    status, rows = request(f'/rest/v1/orders?select=id,fabricator_pose_quote_id&user_id=eq.{own_id}&limit=1', token)
    entry['queries']['order_pose_quote_column'] = {'status': status} if isinstance(rows, list) else {'status': status, 'error': rows}
    del session, token
for owner, other in [('A', 'B'), ('B', 'A')]:
    if owner not in test_sessions:
        continue
    results = report['owners'][owner]['qc_context_checks'] = []
    for scope, positions in [('own', fixture_positions.get(owner, [])), ('other', fixture_positions.get(other, []))]:
        for position_id in positions:
            status, data = request('/rest/v1/rpc/get_fabricator_qc_context', test_sessions[owner], {'p_position_id': position_id})
            results.append({'scope': scope, 'position_id': position_id, 'status': status, 'result': data})
    status, data = request('/rest/v1/rpc/acknowledge_fabricator_delivery', test_sessions[owner], {
        'p_position_id': fixture_positions[owner][0], 'p_expected_revision': 1,
        'p_release_id': '00000000-0000-0000-0000-000000000000',
        'p_quality_approval_id': '00000000-0000-0000-0000-000000000000',
        'p_gps_latitude': None, 'p_gps_longitude': None, 'p_gps_accuracy_m': None,
        'p_photo_hash': '', 'p_product_qr': '', 'p_signature_hash': '',
        'p_delivery_notes': 'Negative fixture audit; must reject', 'p_customer_feedback': '',
        'p_idempotency_key': '00000000-0000-0000-0000-000000000001'})
    report['owners'][owner]['delivery_without_evidence'] = {'status': status, 'result': data}
test_sessions.clear()
print(json.dumps(report, indent=2))
