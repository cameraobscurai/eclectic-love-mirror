import json
import os
import requests

with open('/tmp/photo-audit/storage.json', 'r') as f:
    products = json.load(f)

os.makedirs('/tmp/pa-storage/', exist_ok=True)

for p in products:
    p_id = p['id']
    for i, url in enumerate(p['allImages']):
        ext = url.split('.')[-1]
        filename = f"{p_id}_{i}.{ext}"
        filepath = os.path.join('/tmp/pa-storage/', filename)
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                with open(filepath, 'wb') as img_file:
                    img_file.write(response.content)
                print(f"Downloaded {filename}")
            else:
                print(f"Failed to download {url}: {response.status_code}")
        except Exception as e:
            print(f"Error downloading {url}: {e}")
