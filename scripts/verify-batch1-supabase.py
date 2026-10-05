"""Check the deployed RPC using public app credentials; never create test leads."""
import json
import re
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

env = {}
for line in Path('.env').read_text(encoding='utf-8-sig').splitlines():
    match = re.match(r'^\s*(VITE_SUPABASE_\w+)\s*=\s*(.*?)\s*$', line)
    if match:
        env[match[1]] = match[2].strip('"\'')
url = env['VITE_SUPABASE_URL'].rstrip('/')
key = env.get('VITE_SUPABASE_ANON_KEY') or env['VITE_SUPABASE_PUBLISHABLE_KEY']
headers = {'apikey': key, 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'}

def request(path, payload=None):
    body = None if payload is None else json.dumps(payload).encode()
    try:
        with urlopen(Request(url + path, data=body, headers=headers), timeout=30) as response:
            return response.status, json.load(response)
    except HTTPError as error:
        return error.code, json.loads(error.read())

status, result = request('/rest/v1/rpc/submit_fabrication_consultation', {
    'p_name': 'x', 'p_phone': 'invalid', 'p_project_type': 'invalid',
    'p_system': 'invalid', 'p_message': ''})
assert status == 400 and result.get('code') == '22023', (status, result.get('code'))
print('PASS: public PostgREST RPC visible; invalid request rejected (400/22023)')
status, result = request('/rest/v1/fabrication_consultation_requests?select=id&limit=1')
assert status in (401, 403) and result.get('code') == '42501', (status, result.get('code'))
print('PASS: public table read denied (42501); no live leads created')
