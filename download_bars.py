import json
import os
import subprocess

with open('/tmp/photo-audit/bars.json', 'r') as f:
    data = json.load(f)

samples = data[:15]
os.makedirs('/tmp/pa-bars/', exist_ok=True)

for item in samples:
    item_id = item['id']
    title = item['title'].replace('/', '-').replace(' ', '_')
    for i, img_url in enumerate(item['allImages']):
        ext = img_url.split('.')[-1]
        filename = f"{item_id}_{i}.{ext}"
        target = f"/tmp/pa-bars/{filename}"
        print(f"Downloading {img_url} to {target}")
        subprocess.run(['curl', '-s', '-L', img_url, '-o', target])

