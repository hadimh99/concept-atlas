import json
import unicodedata
from pinecone import Pinecone

print("==================================================")
print("     AURORA CONCEPT ATLAS: CLOUD UPLINK           ")
print("==================================================")

# 1. Connect to your Pinecone Vault
pc = Pinecone(api_key="pcsk_6CnSeo_7A3zEXULBq4kmY4tBp2sFogncBV8Rj1kvf9UQfcdYgDW26F3arbNz8ULrbEEHfG")
index = pc.Index(host="concept-atlas-5izh3xk.svc.aped-4627-b74a.pinecone.io")

# 2. Load the exported data
print("[*] Loading 14,000+ Twelver narrations from local JSON...")
with open("concept_atlas_export.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# 3. Upload in safe batches of 100
batch_size = 100
total = len(data)
print(f"[*] Beginning secure upload to the cloud in batches of {batch_size}...")

for i in range(0, total, batch_size):
    batch = data[i:i + batch_size]
    vectors = []
    
    for item in batch:
        # 1. ID ASCII Translator
        raw_id = str(item["id"])
        safe_id = unicodedata.normalize('NFKD', raw_id).encode('ascii', 'ignore').decode('ascii')
        
        # 2. The Lean Brain (Strip out all heavy text)
        safe_metadata = {}
        for key, val in item.get("metadata", {}).items():
            if isinstance(val, str):
                # Only keep short tags (like Volume, Chapter). Ignore massive text blocks.
                safe_metadata[key] = val[:200]
            else:
                safe_metadata[key] = val
                
        vectors.append((
            safe_id,
            item["embedding"],
            safe_metadata # Notice the heavy document text is completely gone!
        ))
    
    index.upsert(vectors=vectors, namespace="Twelver_Ahadith")
    print(f"[+] Successfully beamed {min(i + batch_size, total)} / {total} to orbit...")

print("==================================================")
print("  [SUCCESS] AL-KAFI IS NOW LIVE IN THE CLOUD!     ")
print("==================================================")
