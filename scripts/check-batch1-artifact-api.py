from pathlib import Path
import re
from urllib.parse import urlparse

text = ' '.join(file.read_text(encoding='utf8') for file in Path('dist/assets').glob('*.js'))
urls = re.findall(r'''VITE_API_URL["']?\s*:\s*["']([^"']+)''', text)
print('Embedded API targets:', [(urlparse(url).hostname, urlparse(url).path) for url in set(urls)])
print('Saved Railway host references:', text.count('almona-portfolio-forge-production.up.railway.app'))
