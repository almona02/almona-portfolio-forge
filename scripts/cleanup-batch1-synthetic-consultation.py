"""Remove only the exact synthetic receipt created by this browser acceptance."""
import json
import re
from pathlib import Path
from urllib.request import Request, urlopen

configuration = {}
for line in Path('python_backend/.env').read_text(encoding='utf-8-sig').splitlines():
    match = re.match(r'^\s*(SUPABASE_URL|SUPABASE_SERVICE_KEY)\s*=\s*(.*?)\s*$', line)
    if match:
        configuration[match[1]] = match[2].strip('"\'')
base = configuration['SUPABASE_URL'].rstrip('/')
assert base == 'https://shfsebdncjnncqqnewfj.supabase.co'
secret = configuration['SUPABASE_SERVICE_KEY']
headers = {'apikey': secret, 'Authorization': 'Bearer ' + secret}
receipt = '3ae014d4-016e-4634-8f55-96610352d0e2'
name = 'Batch 1 Acceptance Test 20261005'
query = '/rest/v1/fabrication_consultation_requests?id=eq.' + receipt
with urlopen(Request(base + query + '&select=id,name,message', headers=headers), timeout=25) as response:
    records = json.load(response)
assert len(records) == 1 and records[0]['name'] == name
assert records[0]['message'] == 'Synthetic deployment acceptance test. No callback requested. This record will be removed after receipt verification.'
with urlopen(Request(base + query, headers=headers, method='DELETE'), timeout=25) as response:
    assert response.status == 204
with urlopen(Request(base + query + '&select=id', headers=headers), timeout=25) as response:
    assert json.load(response) == []
print('PASS: browser receipt persisted with exact synthetic fields; that receipt was removed; zero matching rows remain.')
