import json
import os
import subprocess
import time

with open('/tmp/photo-audit/bars.json', 'r') as f:
    data = json.load(f)

samples = data[:15]
os.makedirs('/tmp/pa-bars/', exist_ok=True)

for item in samples:
    item_id = item['id']
    for i, img_url in enumerate(item['allImages']):
        ext = img_url.split('.')[-1]
        filename = f"{item_id}_{i}.{ext}"
        target = f"/tmp/pa-bars/{filename}"
        
        success = False
        for attempt in range(3):
            print(f"Downloading {img_url} to {target} (Attempt {attempt+1})")
            res = subprocess.run(['curl', '-s', '-L', img_url, '-o', target])
            
            # Check if it's the 107 byte error
            if os.path.exists(target) and os.path.getsize(target) > 200:
                success = True
                break
            else:
                print(f"Failed or small file for {img_url}. Retrying in 2s...")
                time.sleep(2)
        
        if not success:
            print(f"Giving up on {img_url}")

