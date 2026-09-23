"""Package a built Vite app into an offline, self-contained review HTML.
Usage: python3 scripts/make-preview.py /absolute/path/review.html
"""
from pathlib import Path
import re,base64,sys
root=Path(__file__).resolve().parents[1]
p=root/'dist'
s=(p/'index.html').read_text()
js=next((p/'assets').glob('*.js')).read_text()
css=next((p/'assets').glob('*.css')).read_text()
font=base64.b64encode((root/'public/fonts/Jua-Regular.ttf').read_bytes()).decode()
css=css.replace('/fonts/Jua-Regular.ttf','data:font/ttf;base64,'+font)
s=re.sub(r'<script type="module"[^>]*src="[^"]+"[^>]*></script>','',s)
s=re.sub(r'<link rel="stylesheet"[^>]*>',lambda m:'<style>'+css+'</style>',s)
s=re.sub(r'<link rel="(?:icon|manifest)"[^>]*>','',s)
s=s.replace('</body>','<script>'+js.replace('</script','<\\/script')+'</script></body>')
assert s.index('<div id="root"></div>')<s.index('<script>')
assert not re.search(r'<(?:script|link)[^>]+(?:src|href)="/',s)
target=Path(sys.argv[1]);target.write_text(s)
print(target)
