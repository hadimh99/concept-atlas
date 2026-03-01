import requests
import json
import time

print("=========================================================")
print("Initiating Direct Link to the Live Thaqalayn API...")
print("=========================================================")

kafi_library = []

# Al-Kafi has 8 volumes. We pull them sequentially from the live API.
for vol in range(1, 9):
    url = f"https://www.thaqalayn-api.net/api/v2/Al-Kafi-Volume-{vol}-Kulayni"
    print(f"[*] Downloading Volume {vol} from API...")
    
    try:
        response = requests.get(url, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            hadiths_list = []
            
            # The API might wrap the hadiths in a dictionary, so we safely extract them
            if isinstance(data, list):
                hadiths_list = data
            elif isinstance(data, dict):
                for key, value in data.items():
                    if isinstance(value, list):
                        hadiths_list = value
                        break
                        
            # Metadata Normalizer: We force the labels to match your embedder perfectly
            for h in hadiths_list:
                if 'ar' not in h: h['ar'] = h.get('arabic', h.get('arabicText', ''))
                if 'en' not in h: h['en'] = h.get('english', h.get('englishText', ''))
                
                h['volume_number'] = h.get('volume', h.get('volumeId', str(vol)))
                h['book_number'] = h.get('book', h.get('bookId', 'unknown'))
                h['chapter_number'] = h.get('chapter', h.get('chapterId', 'unknown'))
                h['hadith_number'] = h.get('hadithNumber', h.get('num', 'unknown'))
                
            kafi_library.extend(hadiths_list)
            print(f"    -> Success: Volume {vol} secured.")
        else:
            print(f"    -> [Error] API returned {response.status_code} for Volume {vol}.")
            
    except Exception as e:
        print(f"    -> [Error] Connection failed for Volume {vol}: {e}")
        
    # Wait 2 seconds between volumes so we don't accidentally DDoS the API
    time.sleep(2)

print("\n[*] Saving complete library with Metadata to 'thaqalayn_complete.json'...")
with open("thaqalayn_complete.json", "w", encoding="utf-8") as f:
    json.dump(kafi_library, f, ensure_ascii=False, indent=2)

print(f"[!] Success! Total structured narrations saved: {len(kafi_library)}")