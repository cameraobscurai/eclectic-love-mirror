import json
import os
import requests
import time

with open('/tmp/photo-audit/storage.json', 'r') as f:
    products = json.load(f)

os.makedirs('/tmp/pa-storage/', exist_ok=True)

for p in products:
    p_id = p['id']
    for i, url in enumerate(p['allImages']):
        ext = url.split('.')[-1]
        filename = f"{p_id}_{i}.{ext}"
        filepath = os.path.join('/tmp/pa-storage/', filename)
        if os.path.exists(filepath):
            continue
            
        success = False
        retries = 3
        while not success and retries > 0:
            try:
                response = requests.get(url, timeout=10)
                if response.status_code == 200:
                    with open(filepath, 'wb') as img_file:
                        img_file.write(response.content)
                    print(f"Downloaded {filename}")
                    success = True
                elif response.status_code == 429:
                    print(f"Rate limited for {url}, waiting...")
                    time.sleep(2)
                    retries -= 1
                else:
                    print(f"Failed to download {url}: {response.status_code}")
                    break
            except Exception as e:
                print(f"Error downloading {url}: {e}")
                retries -= 1
                time.sleep(1)
