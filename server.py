"""
Concept Atlas - Phase 1: Search & Clustering API
Lightweight FastAPI backend to expose vector search and dynamic K-Means clustering.
"""

import sqlite3
import gc
import numpy as np
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import KMeans

# ==========================================
# CONFIGURATION
# ==========================================
DB_NAME = "concept_atlas.db"
MODEL_NAME = "all-MiniLM-L6-v2"
MAX_RESULTS = 60
N_CLUSTERS = 4

# Initialize global model
print(f"Loading embedding model: {MODEL_NAME}...")
model = SentenceTransformer(MODEL_NAME)
print("Model loaded successfully.")

# Setup FastAPI App
app = FastAPI(title="Concept Atlas API", version="1.0.0")

# Enable CORS for the future Web UI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# MODELS
# ==========================================
class ExploreRequest(BaseModel):
    query: str

class ExplorationResult(BaseModel):
    clusters: list
    total_results: int

# ==========================================
# LOGIC
# ==========================================
def fetch_all_embeddings(db_name: str):
    """
    Fetches all embeddings and text data from the SQLite database.
    Returns: IDs, Arabic Text, English Text, and a NumPy Matrix of Embeddings.
    """
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()
    cursor.execute("SELECT hadith_id, arabic_text, english_text, embedding FROM hadiths")
    rows = cursor.fetchall()
    conn.close()
    
    ids = []
    arabic_texts = []
    english_texts = []
    embeddings_list = []
    
    for row in rows:
        ids.append(row[0])
        arabic_texts.append(row[1])
        english_texts.append(row[2])
        # Reconstruct NumPy vector from raw bytes
        emb_array = np.frombuffer(row[3], dtype=np.float32)
        embeddings_list.append(emb_array)
        
    embedding_matrix = np.vstack(embeddings_list) if embeddings_list else np.empty((0,0))
    return ids, arabic_texts, english_texts, embedding_matrix

def mock_llm_labeler(cluster_id: int):
    """
    Simulated LLM call to label a cluster grouping for V1 Testing.
    Returns a neutral 3-6 word theme description based on ID.
    """
    labels = {
        0: "Ethical Conduct and Personal Character",
        1: "Theological Beliefs and Oneness",
        2: "Societal Interactions and Family Life",
        3: "Ritual Practices and Devotion"
    }
    return labels.get(cluster_id, f"Theme Cluster {chr(65 + cluster_id)}")


@app.post("/api/explore", response_model=ExplorationResult)
def explore_concept(request: ExploreRequest):
    """
    1. Embed query
    2. Cosine similarity against entire DB
    3. Retrieve top 60
    4. K-Means (n=4) cluster those 60
    5. Mock LLM themes
    6. Return nested JSON
    7. Memory clear!
    """
    target_query = request.query.strip()
    if not target_query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
        
    try:
        # 1. Embed user query
        query_embedding = model.encode([target_query]) # Returns (1, 384)
        
        # 2. Extract Data Matrix
        ids, arabic_texts, english_texts, matrix = fetch_all_embeddings(DB_NAME)
        
        if matrix.size == 0:
            raise HTTPException(status_code=404, detail="Database contains no embeddings.")
            
        # 3. Calculate Cosine Similarity across the whole corpus
        similarities = cosine_similarity(query_embedding, matrix)[0]
        
        # Get indices of the top N most similar
        top_indices = np.argsort(similarities)[::-1][:MAX_RESULTS]
        
        # 4. Filter down to the Top 60
        top_vectors = matrix[top_indices]
        top_ids = [ids[i] for i in top_indices]
        top_arabic = [arabic_texts[i] for i in top_indices]
        top_english = [english_texts[i] for i in top_indices]
        top_scores = [float(similarities[i]) for i in top_indices]
        
        # 5. K-Means Clustering on the Top 60
        # If the db has less than N_CLUSTERS, reduce the requested n_clusters
        current_k = min(N_CLUSTERS, len(top_vectors))
        kmeans = KMeans(n_clusters=current_k, random_state=42, n_init="auto")
        labels = kmeans.fit_predict(top_vectors)
        
        # 6. Format Output deeply structured by cluster
        # Create an empty dictionary structured by cluster ID
        cluster_groups = {i: [] for i in range(current_k)}
        
        for idx in range(len(top_vectors)):
            cluster_id = int(labels[idx])
            cluster_groups[cluster_id].append({
                "hadith_id": top_ids[idx],
                "arabic_text": top_arabic[idx],
                "english_text": top_english[idx],
                "similarity_score": top_scores[idx]
            })
            
        # Apply Mock LLM labels
        final_clusters = []
        for cluster_id, items in cluster_groups.items():
            final_clusters.append({
                "cluster_index": cluster_id,
                "theme_label": mock_llm_labeler(cluster_id),
                "items": items
            })

            
        response_data = ExplorationResult(
            clusters=final_clusters,
            total_results=len(top_indices)
        )
        
        return response_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        # ==========================
        # EXTREME RAM PROTECTION
        # ==========================
        # Explicitly delete massive localized structures
        # The 'matrix' can be >100MB depending on DB size
        if 'matrix' in locals():
            del matrix
        if 'ids' in locals():
            del ids 
        if 'arabic_texts' in locals():
            del arabic_texts 
        if 'english_texts' in locals():
            del english_texts
        if 'similarities' in locals():
            del similarities
        if 'top_vectors' in locals():
            del top_vectors
            
        # Force Python's memory sweeping heavily requested by the M2 8GB OS
        gc.collect()

if __name__ == "__main__":
    import uvicorn
    # Make sure memory is swept clean before spinning up server
    gc.collect()
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
