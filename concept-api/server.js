const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pinecone } = require('@pinecone-database/pinecone');
const fs = require('fs');
const path = require('path');
const { kmeans } = require('ml-kmeans');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const sqlite3 = require('sqlite3').verbose();

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

const searchCache = new Map();
const CACHE_LIMIT = 200;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const dbPath = path.join(__dirname, '..', 'thaqalayn.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) console.error("Database connection error:", err.message, "at path:", dbPath);
    else console.log("Connected securely to the Twelver SQLite database at:", dbPath);
});

function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

let ontology = {};
try {
    ontology = JSON.parse(fs.readFileSync(path.join(__dirname, 'ontology_centroids.json'), 'utf8'));
    console.log(`[ONTOLOGY] Loaded ${Object.keys(ontology).length} Theological Centroids.`);
} catch (e) {
    console.log("[ONTOLOGY] No centroids found. Standard vector search active.");
}

const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
    host: process.env.PINECONE_HOST
});

const fallbackLabeler = (items, query, usedLabels) => {
    return "Keywords: " + query.split(' ').slice(0, 3).join(', ');
};

const generateAllClusterLabelsAI = async (clusters, query) => {
    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        let prompt = `You are an expert analyzing Twelver Shia narrations. 
        I am providing ${clusters.length} distinct groups of narrations.
        Generate a unique, concise label (3 to 6 words) for EACH group summarizing its core shared theological or ethical theme.
        
        RULES:
        1. EVERY label MUST begin exactly with "Relating to ".
        2. EVERY label MUST be completely unique. Do not repeat concepts or use synonyms for the same concept.
        3. Do NOT output markdown. Output ONLY a valid JSON array of strings, with exactly ${clusters.length} items. 
        
        GROUPS:\n`;

        clusters.forEach((cluster, index) => {
            const texts = cluster.items.map(i => i.english_text).join(" | ").substring(0, 3000);
            prompt += `\n--- Group ${index} ---\n${texts}\n`;
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const labelsArray = JSON.parse(responseText);

        if (Array.isArray(labelsArray) && labelsArray.length === clusters.length) {
            return labelsArray.map(label => {
                let clean = label.replace(/["'\.]/g, "").trim();
                if (!clean.toLowerCase().startsWith("relating to")) {
                    clean = "Relating to " + clean;
                }
                return clean;
            });
        } else {
            throw new Error("AI returned invalid JSON array length.");
        }

    } catch (error) {
        console.log("AI Batch Labeling encountered an issue. Deploying Bulletproof Fallback...", error.message);
        const usedLabels = new Set();
        return clusters.map(cluster => fallbackLabeler(cluster.items, query, usedLabels));
    }
};

app.post('/api/explore', async (req, res) => {
    try {
        const { query, source, searchMode } = req.body;
        if (!query) {
            return res.status(400).json({ error: "Query is required." });
        }

        const activeSource = source || "All Twelver Sources";
        const activeSearchMode = searchMode || "concept";
        const cacheKey = `${query.toLowerCase().trim()}_${activeSource}_${activeSearchMode}`;

        if (searchCache.has(cacheKey)) {
            console.log(`[⚡ CACHE HIT] Serving instant ${activeSearchMode} results for: "${query}"`);
            return res.json(searchCache.get(cacheKey));
        }

        console.log(`[🔍 CACHE MISS] Processing new ${activeSearchMode} query: "${query}" (Source: ${activeSource})`);

        // =========================================================================
        // OPTIMIZED SQLITE KEYWORD SEARCH (Streaming / No RAM Crashes / Blazing Fast)
        // =========================================================================
        if (activeSearchMode === 'keyword') {
            console.log("Executing high-speed streaming keyword search...");

            const lowerQuery = query.toLowerCase().trim();
            const queryWords = lowerQuery.replace(/[^\w\s]/gi, '').split(/\s+/).filter(w => w.length > 3);

            let exactMatches = [];
            let fuzzyMatches = [];
            let seenIds = new Set();
            let totalFound = 0;

            // Stream rows one by one. This keeps RAM essentially at zero, 
            // but uses Node.js's blazing fast V8 engine to do the text matching.
            await new Promise((resolve, reject) => {
                db.each("SELECT raw_data FROM hadiths", [], (err, row) => {
                    if (err) return;

                    try {
                        const hData = JSON.parse(row.raw_data);
                        const bookName = hData.book || hData.book_number || "al-Kafi";

                        // Filter by source immediately
                        if (activeSource !== "All Twelver Sources" && bookName !== activeSource) return;

                        const eng = (hData.en || "").toLowerCase();
                        const ar = hData.ar || "";

                        // 1. Check Exact Match
                        let isExact = eng.includes(lowerQuery) || ar.includes(query);

                        // 2. Check Fuzzy Match
                        let isFuzzy = false;
                        if (!isExact && queryWords.length > 1) {
                            let matchCount = 0;
                            queryWords.forEach(word => {
                                if (eng.includes(word) || ar.includes(word)) matchCount++;
                            });
                            if (matchCount / queryWords.length >= 0.75) {
                                isFuzzy = true;
                            }
                        }

                        if (isExact || isFuzzy) {
                            const id = hData.id || hData.hadith_number || Math.random().toString();
                            if (seenIds.has(id)) return;
                            seenIds.add(id);

                            let hNum = hData.hadith_number || hData.hadith;
                            if (!hNum || hNum === "unknown" || hNum === "Unknown") {
                                const textMatch = (hData.en || "").match(/^(\d+)\s*\./);
                                hNum = textMatch ? textMatch[1] : "Unknown";
                            }

                            const hadithObj = {
                                id: id,
                                arabic_text: hData.ar || "Arabic text not available",
                                english_text: hData.en || "English translation not available",
                                book: bookName,
                                volume: hData.volume_number || hData.volume || "Unknown",
                                sub_book: hData.category || hData.sub_book || "Unknown",
                                chapter: hData.chapter_number || hData.chapter || "Unknown",
                                hadith_number: hNum,
                                similarity_score: 1.0,
                                vector: []
                            };

                            if (isExact) {
                                if (exactMatches.length < 100) exactMatches.push(hadithObj);
                            } else {
                                if (fuzzyMatches.length < 50) fuzzyMatches.push(hadithObj);
                            }
                            totalFound++;
                        }
                    } catch (e) {
                        // Silently skip malformed rows
                    }
                }, (err, count) => {
                    // This block runs when all rows are finished streaming
                    if (err) reject(err);
                    else resolve();
                });
            });

            const clusters = [];

            if (exactMatches.length > 0) {
                clusters.push({
                    theme_label: `Exact Matches: "${query}"`,
                    items: exactMatches
                });
            }
            if (fuzzyMatches.length > 0 && exactMatches.length < 20) {
                clusters.push({
                    theme_label: `Partial Text Matches (Translation Variations)`,
                    items: fuzzyMatches
                });
            }

            const resultPayload = {
                total_results: totalFound,
                clusters: clusters
            };

            if (searchCache.size >= CACHE_LIMIT) {
                const firstKey = searchCache.keys().next().value;
                searchCache.delete(firstKey);
            }
            searchCache.set(cacheKey, resultPayload);
            return res.json(resultPayload);
        }

        // =========================================================================
        // CONCEPT MODE (No changes below)
        // =========================================================================
        console.log("Embedding query via Hugging Face Cloud API...");
        const hfToken = process.env.HF_TOKEN;
        if (!hfToken) {
            return res.status(500).json({ error: "Server missing HF_TOKEN environment variable." });
        }

        let finalQueryVector = null;
        let retries = 3;

        while (retries > 0) {
            const hfResponse = await fetch("https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction", {
                headers: {
                    "Authorization": `Bearer ${hfToken}`,
                    "Content-Type": "application/json"
                },
                method: "POST",
                body: JSON.stringify({ inputs: [query] })
            });

            const result = await hfResponse.json();

            if (hfResponse.ok) {
                finalQueryVector = Array.isArray(result[0]) ? result[0] : result;
                break;
            } else if (result.error && result.error.includes("loading")) {
                console.log(`Cloud AI is waking up. Waiting ${result.estimated_time || 10} seconds...`);
                await new Promise(resolve => setTimeout(resolve, (result.estimated_time || 10) * 1000));
                retries--;
            } else {
                console.error("Hugging Face API Error:", result);
                return res.status(500).json({ error: "Failed to communicate with Cloud AI." });
            }
        }

        if (!finalQueryVector) {
            return res.status(500).json({ error: "Cloud AI timed out while waking up. Try again." });
        }

        if (Object.keys(ontology).length > 0 && activeSearchMode === 'concept') {
            let bestConcept = null;
            let highestSim = -1;

            for (const [conceptName, conceptVector] of Object.entries(ontology)) {
                const sim = cosineSimilarity(finalQueryVector, conceptVector);
                if (sim > highestSim) {
                    highestSim = sim;
                    bestConcept = { name: conceptName, vector: conceptVector };
                }
            }

            if (bestConcept && highestSim > 0.45) {
                const blendWeight = 0.25;
                const queryWeight = 0.75;
                let blended = finalQueryVector.map((val, i) => (val * queryWeight) + (bestConcept.vector[i] * blendWeight));
                let mag = Math.sqrt(blended.reduce((sum, val) => sum + val * val, 0));
                finalQueryVector = blended.map(val => val / mag);
            }
        }

        console.log("Querying Pinecone index...");
        const index = pc.index(process.env.PINECONE_INDEX_NAME).namespace('Twelver_Ahadith');

        let pineconeFilter = undefined;
        if (activeSource !== "All Twelver Sources") {
            pineconeFilter = { book: { $eq: activeSource } };
        }

        const queryResponse = await index.query({
            vector: finalQueryVector,
            topK: 150,
            includeMetadata: false,
            includeValues: true,
            filter: pineconeFilter
        });

        const mapIndices = [];
        const matchMap = new Map();

        for (const match of queryResponse.matches) {
            const parts = match.id.split("_idx");
            if (parts.length > 1) {
                const mapIdx = parseInt(parts[1], 10);
                if (!isNaN(mapIdx)) {
                    mapIndices.push(mapIdx);
                    matchMap.set(mapIdx, match);
                }
            }
        }

        const fetchedHadiths = [];

        for (let i = 0; i < mapIndices.length; i++) {
            const mapIdx = mapIndices[i];
            try {
                const dbRow = await new Promise((resolve, reject) => {
                    db.get(`SELECT raw_data FROM hadiths WHERE id = ${mapIdx}`, [], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });

                if (dbRow && dbRow.raw_data) {
                    const hData = JSON.parse(dbRow.raw_data);
                    const match = matchMap.get(mapIdx);

                    if (match && match.values && match.values.length > 0) {
                        const foundEnglish = hData.en || "English translation not available";
                        const foundArabic = hData.ar || "Arabic text not available";

                        let hNum = hData.hadith_number || hData.hadith;
                        if (!hNum || hNum === "unknown" || hNum === "Unknown") {
                            const textMatch = foundEnglish.match(/^(\d+)\s*\./);
                            hNum = textMatch ? textMatch[1] : "Unknown";
                        }

                        fetchedHadiths.push({
                            id: match.id,
                            arabic_text: foundArabic,
                            english_text: foundEnglish,
                            book: hData.book || hData.book_number || "al-Kafi",
                            volume: hData.volume_number || hData.volume || "Unknown",
                            sub_book: hData.category || hData.sub_book || "Unknown",
                            chapter: hData.chapter_number || hData.chapter || "Unknown",
                            hadith_number: hNum,
                            similarity_score: match.score,
                            metadata: match.metadata || {},
                            vector: match.values
                        });
                    }
                }
            } catch (err) {
                console.error(`Error fetching ID ${mapIdx}:`, err);
            }
        }

        if (fetchedHadiths.length === 0) {
            return res.json({ total_results: 0, clusters: [] });
        }

        fetchedHadiths.sort((a, b) => b.similarity_score - a.similarity_score);

        let topHitsCluster = null;
        let clusterableHadiths = fetchedHadiths;

        if (fetchedHadiths.length > 10) {
            const topHitsItems = fetchedHadiths.slice(0, 5);
            clusterableHadiths = fetchedHadiths.slice(5);

            topHitsCluster = {
                theme_label: "✨ Top Matches (Most Relevant)",
                items: topHitsItems
            };
        }

        console.log("Running K-Means Semantic Clustering on remaining results...");
        const vectors = clusterableHadiths.map(h => h.vector);
        const numberOfClusters = Math.min(4, clusterableHadiths.length);
        const kmeansResult = kmeans(vectors, numberOfClusters, { initialization: 'kmeans++' });

        const clustersArray = [];
        kmeansResult.clusters.forEach((clusterIndex, dataIndex) => {
            if (!clustersArray[clusterIndex]) {
                clustersArray[clusterIndex] = {
                    theme_label: "",
                    items: []
                };
            }
            const { vector, ...cleanHadith } = clusterableHadiths[dataIndex];
            clustersArray[clusterIndex].items.push(cleanHadith);
        });

        console.log("Generating AI labels for clusters...");
        const generatedLabels = await generateAllClusterLabelsAI(clustersArray, query);

        clustersArray.forEach((cluster, index) => {
            cluster.items.sort((a, b) => b.similarity_score - a.similarity_score);
            cluster.theme_label = generatedLabels[index];
        });

        if (topHitsCluster) {
            clustersArray.unshift(topHitsCluster);
        }

        const resultPayload = {
            total_results: fetchedHadiths.length,
            clusters: clustersArray
        };

        if (searchCache.size >= CACHE_LIMIT) {
            const firstKey = searchCache.keys().next().value;
            searchCache.delete(firstKey);
        }
        searchCache.set(cacheKey, resultPayload);

        res.json(resultPayload);

    } catch (error) {
        console.error("Explore API Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`Concept API Backend running on http://localhost:${PORT}`);
});