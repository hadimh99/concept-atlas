import json
import os
import sys
import time

try:
    import chromadb
    from sentence_transformers import SentenceTransformer
except ImportError:
    print("Error: Missing required libraries.")
    sys.exit(1)

def build_vector_database():
    dataset_path = 'thaqalayn_complete.json'
    batch_size = 100
    
    print("=" * 70)
    print("Concept Atlas: Vector Database Embedder (Sub-Book Edition)")
    print("=" * 70)

    if not os.path.exists(dataset_path):
        print(f"[Error] Dataset not found at {dataset_path}")
        sys.exit(1)
        
    print(f"[*] Loading dataset from {dataset_path}...")
    with open(dataset_path, 'r', encoding='utf-8') as f:
        hadiths = json.load(f)
        
    total_hadiths = len(hadiths)
    print(f"[+] Loaded {total_hadiths} Hadiths successfully.\n")

    print("[*] Initializing local ChromaDB instance...")
    persist_directory = os.path.join(os.getcwd(), 'chroma_db')
    chroma_client = chromadb.PersistentClient(path=persist_directory)
    collection = chroma_client.get_or_create_collection(
        name="concept_atlas",
        metadata={"hnsw:space": "cosine"}
    )
    print(f"[+] Connected to ChromaDB collection: 'concept_atlas'\n")

    model_name = 'all-MiniLM-L6-v2'
    print(f"[*] Loading SentenceTransformer model: {model_name}...\n")
    model = SentenceTransformer(model_name)

    print("-" * 70)
    print(f"Starting Embedding Process (Batch Size: {batch_size})")
    print("-" * 70)
    
    start_time = time.time()
    failed_counts = 0
    processed_counts = 0
    
    for i in range(0, total_hadiths, batch_size):
        batch_end = min(i + batch_size, total_hadiths)
        batch = hadiths[i:batch_end]
        
        ids, documents, metadatas = [], [], []
        
        for idx, hadith in enumerate(batch):
            arabic_text = hadith.get('ar', '')
            english_text = hadith.get('en', '')
            
            vol = hadith.get('volume_number', 'unknown')
            bk = hadith.get('book_number', 'unknown')
            sub_book = hadith.get('category', 'unknown') # <-- CAPTURING THE SUB-BOOK
            ch = hadith.get('chapter_number', 'unknown')
            hn = hadith.get('hadith_number', 'unknown')
            
            unique_id = f"vol{vol}_bk{bk}_ch{ch}_h{hn}_idx{i+idx}"
            
            if english_text and len(english_text.strip()) > 5:
                ids.append(unique_id)
                documents.append(english_text)
                
                # Saving the sub_book permanently into the AI's memory payload
                metadatas.append({
                    "arabic_text": arabic_text,
                    "english_text": english_text,
                    "volume": str(vol),
                    "book": str(bk),
                    "sub_book": str(sub_book), 
                    "chapter": str(ch),
                    "hadith_number": str(hn)
                })
            else:
                failed_counts += 1

        if not documents:
            continue
            
        try:
            embeddings = model.encode(documents, show_progress_bar=False).tolist()
            collection.upsert(ids=ids, documents=documents, embeddings=embeddings, metadatas=metadatas)
            processed_counts += len(documents)
        except Exception as e:
            continue

        progress_percentage = (batch_end / total_hadiths) * 100
        sys.stdout.write(f"\rProgress: [{batch_end}/{total_hadiths}] - {progress_percentage:.2f}% | Embedded: {processed_counts}")
        sys.stdout.flush()

    print(f"\n\n[SUCCESS] Vector Database completely built!")

if __name__ == "__main__":
    build_vector_database()