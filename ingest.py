"""
Al-Kafi Intelligence Engine - Data Ingestion Pipeline
Description: Scrapes Thaqalayn.net, applies Kunya filters, generates semantic embeddings,
and stores the results in SQLite. Designed specifically for low RAM (8GB) environments.
"""

import sqlite3
import gc
import time
import requests
from bs4 import BeautifulSoup
from sentence_transformers import SentenceTransformer

# ==========================================
# 1. MODULAR CONFIGURATION VARIABLES
# ==========================================
# Change these variables to ingest other books later.
BASE_URL = "https://thaqalayn.net"
BOOK_ID = "alkafi"  # E.g., Vol 1-8 of Al-Kafi
BATCH_SIZE = 50     # Strict batch size for RAM protection
DB_NAME = "alkafi.db"
# Wait time between requests to avoid overloading the server
DELAY_BETWEEN_REQUESTS = 1.0 

# Load the SentenceTransformer model
# Apple Silicon M2 will be supported natively by PyTorch
print("Loading Embedding Model...")
model = SentenceTransformer('all-MiniLM-L6-v2')

# ==========================================
# 2. DATABASE INITIALIZATION & RESUMABILITY
# ==========================================
def init_db():
    """Initializes the SQLite database with necessary tables."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Table to store the Hadiths and their embeddings
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS hadiths (
            id INTEGER PRIMARY KEY,
            book_id TEXT,
            arabic_text TEXT,
            english_text TEXT,
            gradings TEXT,
            metadata_tag TEXT,
            embedding BLOB
        )
    ''')
    
    # Table to track progress for resumability
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS progress_tracking (
            book_id TEXT PRIMARY KEY,
            last_processed_id INTEGER
        )
    ''')
    conn.commit()
    return conn

def get_last_processed_id(conn):
    """Fetches the last successfully processed Hadith ID from the tracker."""
    cursor = conn.cursor()
    cursor.execute("SELECT last_processed_id FROM progress_tracking WHERE book_id = ?", (BOOK_ID,))
    result = cursor.fetchone()
    return result[0] if result else 0

def update_progress(conn, last_id):
    """Updates the progress tracker after a successful batch insertion."""
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO progress_tracking (book_id, last_processed_id) 
        VALUES (?, ?)
    ''', (BOOK_ID, last_id))
    conn.commit()


# ==========================================
# 3. KUNYA LOGIC FILTER
# ==========================================
def apply_kunya_filter(hadith_data):
    """
    EDUCATIONAL COMMENT (Kunya Logic):
    This function analyzes the English text of the Hadith before saving it.
    If 'Abu Abdillah' is mentioned, we look closer. 'Abu Abdillah' is a common Kunya 
    (teknonym), often referring to Imam Sadiq (as). If specific companion names 
    like Zurarah, Abu Basir, or Hisham are also in the text, we confidently tag 
    the metadata as 'Imam Sadiq (as)'.
    """
    english_text = hadith_data.get('english_text', '')
    
    # Check for variations of 'Abu Abdillah'
    if 'Abu Abdillah' in english_text or 'Abu ‘Abdillah' in english_text:
        narrator_names = ['Zurarah', 'Abu Basir', 'Hisham']
        # If any of the narrators are in the text, tag it.
        for name in narrator_names:
            if name in english_text:
                hadith_data['metadata_tag'] = 'Imam Sadiq (as)'
                break
                
    return hadith_data


# ==========================================
# 4. SCRAPING AND EXTRACTION
# ==========================================
def fetch_hadith(hadith_id):
    """
    Fetches Hadith data from the website given an ID.
    Note: Thaqalayn.net structure might require adjusting these BeautifulSoup selectors 
    if their HTML classes change. We are using standard assumptions here.
    """
    url = f"{BASE_URL}/hadith/{BOOK_ID}/{hadith_id}"
    try:
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            return None # Hadith likely doesn't exist or page format is different
            
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # NOTE: You will need to inspect Thaqalayn.net and match these classes exactly!
        # These are educated guesses for typical Islamic text sites.
        arabic_div = soup.find('div', class_='arabic')
        english_div = soup.find('div', class_='english')
        grading_div = soup.find('div', class_='grading')
        
        arabic_text = arabic_div.text.strip() if arabic_div else ""
        english_text = english_div.text.strip() if english_div else ""
        gradings = grading_div.text.strip() if grading_div else ""
        
        # Avoid saving completely empty entries
        if not arabic_text and not english_text:
            return None
            
        data = {
            'id': hadith_id,
            'book_id': BOOK_ID,
            'arabic_text': arabic_text,
            'english_text': english_text,
            'gradings': gradings,
            'metadata_tag': '' # Will be updated by Kunya filter
        }
        
        return apply_kunya_filter(data)
        
    except requests.exceptions.RequestException as e:
        print(f"Error fetching Hadith {hadith_id}: {e}")
        return None


# ==========================================
# 5. BATCH PROCESSING & RAM MANAGEMENT
# ==========================================
def process_batch(conn, batch_data):
    """
    EDUCATIONAL COMMENT (Vector Batching & RAM Protection):
    To keep RAM usage well below the 8GB limit on the M2 Mac, we gather a small list
    of Hadiths (e.g., 50). We pass the bulk list of English texts into the 
    SentenceTransformer model to generate embeddings at once, which is much faster 
    than doing it one-by-one.
    
    After saving to the SQLite DB, we explicitly force Python's garbage collector 
    `gc.collect()` to release the memory immediately, preventing memory leaks.
    """
    if not batch_data:
        return
        
    # Extract only the necessary text for the embeddings
    texts_to_embed = [item['english_text'] for item in batch_data]
    
    # Generate vectors (embeddings) for the whole batch
    print(f"Generating embeddings for batch of {len(batch_data)} hadiths...")
    embeddings = model.encode(texts_to_embed)
    
    # Prepare rows for SQLite insertion
    rows = []
    for data, emb in zip(batch_data, embeddings):
        # We serialize the numpy array embedding into bytes for storage
        embedding_bytes = emb.tobytes()
        rows.append((
            data['id'],
            data['book_id'],
            data['arabic_text'],
            data['english_text'],
            data['gradings'],
            data['metadata_tag'],
            embedding_bytes
        ))
        
    # Standard SQLite parameterized insert
    cursor = conn.cursor()
    cursor.executemany('''
        INSERT OR REPLACE INTO hadiths 
        (id, book_id, arabic_text, english_text, gradings, metadata_tag, embedding)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', rows)
    
    # Identify the highest ID in this batch to update our tracker
    highest_id = max(item['id'] for item in batch_data)
    update_progress(conn, highest_id)
    
    print(f"Successfully processed and saved batch up to Hadith ID: {highest_id}")
    
    # ==========================
    # EXTREME RAM PROTECTION
    # ==========================
    # Explicitly clear variables holding large lists or arrays
    del texts_to_embed
    del embeddings
    del rows
    
    # Force Python to deep-clean memory allocations immediately
    gc.collect()


# ==========================================
# 6. MAIN PIPELINE LOOP
# ==========================================
def main():
    conn = init_db()
    start_id = get_last_processed_id(conn) + 1
    
    print(f"Starting ingestion for {BOOK_ID} from ID {start_id}...")
    
    batch = []
    current_id = start_id
    
    # Set max_id to a reasonable upper limit. Can also loop indefinitely and rely on 
    # consecutive failures to detect the end of the book.
    max_id = 20000 
    
    try:
        while current_id <= max_id:
            hadith = fetch_hadith(current_id)
            
            if hadith:
                batch.append(hadith)
                
            # If our batch size is reached, process it!
            if len(batch) >= BATCH_SIZE:
                process_batch(conn, batch)
                # clear the batch to free up memory
                batch.clear()
                
            current_id += 1
            
            # Politeness delay
            time.sleep(DELAY_BETWEEN_REQUESTS)
            
    except KeyboardInterrupt:
        print("\nPipeline interrupted by User! Saving current progress and exiting gracefully.")
        # If there are leftovers in the batch, process them before fully shutting down
        if len(batch) > 0:
            print("Processing final partial batch...")
            process_batch(conn, batch)
            
    finally:
        conn.close()
        print("Database connection closed. Exiting.")

if __name__ == "__main__":
    # Ensure memory is clean before starting
    gc.collect()
    main()
