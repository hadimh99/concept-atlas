import chromadb
import json
import os

print("==================================================")
print("     AURORA CONCEPT ATLAS: DATABASE EXPORTER      ")
print("==================================================")
print("[*] Connecting to local AI memory...")

persist_directory = os.path.join(os.getcwd(), 'chroma_db')
client = chromadb.PersistentClient(path=persist_directory)
collection = client.get_collection(name="concept_atlas")

print("[*] Extracting 14,000+ vectors and metadata tags...")
data = collection.get(include=["documents", "metadatas", "embeddings"])

export_data = []
for i in range(len(data['ids'])):
    # Convert numpy array to standard Python list so JSON can read it
    raw_embedding = data['embeddings'][i]
    if hasattr(raw_embedding, 'tolist'):
        safe_embedding = raw_embedding.tolist()
    else:
        safe_embedding = raw_embedding

    export_data.append({
        "id": data['ids'][i],
        "document": data['documents'][i],
        "metadata": data['metadatas'][i],
        "embedding": safe_embedding
    })

export_filename = "concept_atlas_export.json"
print("[*] Compressing and writing to JSON...")
with open(export_filename, "w", encoding="utf-8") as f:
    json.dump(export_data, f, ensure_ascii=False)

print(f"\n[SUCCESS] Exported {len(export_data)} narrations perfectly!")
print(f"[+] File saved locally as: {export_filename}")
print("==================================================")
