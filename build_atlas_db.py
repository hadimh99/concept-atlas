"""
Concept Atlas – Al-Kafi Semantic Explorer
Phase Zero: Database and Embeddings Builder

This script extracts text from a local JSON file or scrapes it from Thaqalayn.net,
generates semantic vector embeddings using the lightweight 'all-MiniLM-L6-v2' model,
and saves the data locally in an SQLite database.
"""

import sqlite3
import json
import os
import gc
import time
import requests
from bs4 import BeautifulSoup
from sentence_transformers import SentenceTransformer

# ==========================================
# CONFIGURATION
# ==========================================
DB_NAME = "concept_atlas.db"
MODEL_NAME = "all-MiniLM-L6-v2"
BATCH_SIZE = 50
# Place a JSON file in this directory to load data directly.
# Expected format: [{"hadith_id": "...", "arabic_text": "...", "english_text": "..."}, ...]
LOCAL_SOURCE = "alkafi.json" 

# ==========================================
# 1. DATABASE SETUP
# ==========================================
def init_db():
    print(f"Initializing database: {DB_NAME}")
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    # Create the main table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS hadiths (
            hadith_id TEXT PRIMARY KEY,
            arabic_text TEXT,
            english_text TEXT,
            embedding BLOB
        )
    ''')
    conn.commit()
    return conn

# ==========================================
# 2. DATA SOURCING
# ==========================================
def get_data_generator():
    """
    Yields dictionaries containing hadith details.
    Prefers local JSON file if available (highly recommended for Al-Kafi's 16k+ hadiths).
    Falls back to a scraping placeholder if no local file is found.
    """
    if os.path.exists(LOCAL_SOURCE):
        print(f"Found local data source: {LOCAL_SOURCE}. Loading from JSON...")
        with open(LOCAL_SOURCE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for item in data:
                yield item
    else:
        print(f"Local source '{LOCAL_SOURCE}' not found. Falling back to scraper.")
        print("Note: Scraping 8 volumes comprehensively is complex and time-consuming.")
        print("Below is a sample scraping loop for a small range on Thaqalayn.net.")
        
        # Sample structure: URL path parameters for Book / Volume / Chapter / Hadith
        # This is a sample loop for Vol 1, Book 2, Chapter 1, Hadiths 1-10
        for vol in range(1, 2):
            for book in range(2, 3):
                for chapter in range(1, 2):
                    for h_num in range(1, 11):
                        hadith_id = f"{book}:{chapter}:{h_num}"
                        # Thaqalayn URLs for Al-Kafi follow this structure: /hadith/1/{book}/{chapter}/{hadith_number}
                        url = f"https://thaqalayn.net/hadith/1/{book}/{chapter}/{h_num}"
                        try:
                            response = requests.get(url, timeout=10)
                            if response.status_code == 200:
                                soup = BeautifulSoup(response.content, 'html.parser')
                                
                                # Thaqalayn uses <p class="nassim"> for both, but different additional classes
                                arabic_p = soup.find('p', class_='tracking-arabic')
                                english_p = soup.find('p', class_='leading-normal')
                                
                                arabic_text = arabic_p.text.strip() if arabic_p else ""
                                english_text = english_p.text.strip() if english_p else ""
                                
                                if arabic_text or english_text:
                                    yield {
                                        'hadith_id': hadith_id,
                                        'arabic_text': arabic_text,
                                        'english_text': english_text
                                    }
                            # Be polite to their servers
                            time.sleep(1.0)
                        except Exception as e:
                            print(f"Failed to scrape {url}: {e}")

# ==========================================
# 3. EMBEDDING & BATCH PROCESSING
# ==========================================
def process_batch(batch, model, cursor, conn):
    print(f"Processing batch of {len(batch)} items...")
    
    # Extract exclusively the English text for semantic embedding
    texts_to_embed = [item['english_text'] for item in batch]
    
    # Generate vector embeddings natively via SentenceTransformer
    embeddings = model.encode(texts_to_embed)
    
    # Prepare rows for the database
    rows = []
    for item, emb in zip(batch, embeddings):
        # Convert the NumPy array embedding into binary for SQLite BLOB storage
        embedding_bytes = emb.tobytes()
        rows.append((
            item['hadith_id'], 
            item['arabic_text'], 
            item['english_text'], 
            embedding_bytes
        ))
        
    # Bulk insert
    cursor.executemany('''
        INSERT OR REPLACE INTO hadiths (hadith_id, arabic_text, english_text, embedding)
        VALUES (?, ?, ?, ?)
    ''', rows)
    conn.commit()
    
    # ==========================
    # EXTREME RAM PROTECTION
    # ==========================
    # Delete localized large memory allocations
    del texts_to_embed
    del embeddings
    del rows
    
    # Explicit garbage collection to keep the standard 8GB Mac RAM clean
    gc.collect()

# ==========================================
# MAIN EXECUTION PIPELINE
# ==========================================
def main():
    conn = init_db()
    cursor = conn.cursor()
    
    print(f"Loading Embedding Model: {MODEL_NAME}...")
    model = SentenceTransformer(MODEL_NAME)
    print("Model loaded successfully. Ready to process.")
    
    batch = []
    total_processed = 0
    data_generator = get_data_generator()
    
    try:
        for item in data_generator:
            # We strictly need English text to create a meaningful embedding
            if not item.get('english_text'):
                continue
                
            batch.append(item)
            
            # Flush batch to db when limit is reached
            if len(batch) >= BATCH_SIZE:
                process_batch(batch, model, cursor, conn)
                total_processed += len(batch)
                print(f"Total processed so far: {total_processed}")
                batch.clear()
                
        # Final cleanup batch
        if batch:
            process_batch(batch, model, cursor, conn)
            total_processed += len(batch)
            
        print(f"Pipeline finished! Total records embedded and saved: {total_processed}")
        
    except KeyboardInterrupt:
        print("\nManually interrupted by User! Exiting gracefully...")
        if batch:
            print("Saving partial batch before exit...")
            process_batch(batch, model, cursor, conn)
            
    finally:
        conn.close()
        print("Database connection closed.")

if __name__ == "__main__":
    # Ensure a clean memory slate before we begin
    gc.collect()
    main()
