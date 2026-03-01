import os
import sys

os.environ["TOKENIZERS_PARALLELISM"] = "false"

try:
    import chromadb
    from sentence_transformers import SentenceTransformer
except ImportError:
    print("Error: Missing libraries.")
    sys.exit(1)

print("==========================================================")
print("             AURORA CONCEPT ATLAS: ONLINE                 ")
print("==========================================================")
print("[*] Waking up the AI Matrix...")

model = SentenceTransformer('all-MiniLM-L6-v2')
persist_directory = os.path.join(os.getcwd(), 'chroma_db')
chroma_client = chromadb.PersistentClient(path=persist_directory)
collection = chroma_client.get_collection(name="concept_atlas")

print(f"[+] Connected! Total narrations in memory: {collection.count()}")
print("==========================================================")

def search_hadith(query, top_k=3):
    query_vector = model.encode([query]).tolist()
    results = collection.query(query_embeddings=query_vector, n_results=top_k)
    
    print(f"\n\n>>> SEARCH RESULTS FOR: '{query}'")
    print("=" * 60)
    
    if not results['documents'][0]:
        print("No matches found.")
        return

    for idx in range(len(results['documents'][0])):
        metadata = results['metadatas'][0][idx]
        arabic = metadata.get('arabic_text', 'No Arabic available')
        english = metadata.get('english_text', 'No English available')
        vol = metadata.get('volume', '?')
        bk = metadata.get('book', '?')
        sub_book = metadata.get('sub_book', '?') # Pulling the new sub-book data!
        ch = metadata.get('chapter', '?')
        
        hn = metadata.get('hadith_number', 'unknown')
        if hn == 'unknown':
            potential_num = english.split('.')[0].strip()
            if potential_num.isdigit():
                hn = potential_num
        
        print(f"\n[ RESULT {idx + 1} ] --------------------------------------")
        # EXACT FORMAT REQUESTED:
        print(f"Location: Book {bk}, Volume {vol} - {sub_book}, Chapter {ch}, Hadith {hn}")
        print("-" * 60)
        print(f"ARABIC:\n{arabic}\n")
        print(f"ENGLISH:\n{english}")
        print("-" * 60)

while True:
    user_query = input("\n[?] Enter a concept to search (e.g., 'Aql', 'Taqiyyah'): ")
    if user_query.lower() in ['exit', 'quit']:
        break
    if not user_query.strip():
        continue
    search_hadith(user_query)