const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pinecone } = require('@pinecone-database/pinecone');
const fs = require('fs');
const path = require('path');
const { kmeans } = require('ml-kmeans');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const sqlite3 = require('sqlite3').verbose(); // <-- The new database bridge!

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

let pipeline;
(async () => {
    const { pipeline: transformersPipeline } = await import('@xenova/transformers');
    pipeline = transformersPipeline;
})();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- CONNECT TO THE MEMORY-LIGHT DATABASE ---
const db = new sqlite3.Database('thaqalayn.db', sqlite3.OPEN_READONLY, (err) => {
    if (err) console.error("Database connection error:", err.message);
    else console.log("Connected securely to the Twelver SQLite database.");
});

// --- ONTOLOGY ENGINE HELPERS ---
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
// ------------------------------------

const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
    host: process.env.PINECONE_HOST
});

const fallbackLabeler = (items, query, usedLabels) => {
    const chapterCounts = {};
    items.forEach(item => {
        if (item.chapter && item.chapter !== "Unknown") {
            let cName = item.chapter.replace(/^(The\s+)?Chapter\s+(on|about|regarding|of)\s+/i, '').split(',')[0].trim();
            cName = cName.toLowerCase();
            chapterCounts[cName] = (chapterCounts[cName] || 0) + 1;
        }
    });

    const sortedChapters = Object.entries(chapterCounts).sort((a, b) => b[1] - a[1]);
    for (const [cName, count] of sortedChapters) {
        if (count >= 2 && !usedLabels.has(`Relating to ${cName}`) && cName.split(' ').length <= 6) {
            const finalLabel = `Relating to ${cName}`;
            usedLabels.add(finalLabel);
            return finalLabel;
        }
    }

    const stopWords = new Set([
        "the", "and", "to", "of", "a", "in", "that", "is", "for", "it", "with", "as",
        "he", "was", "on", "from", "who", "has", "said", "this", "they", "but", "are",
        "not", "have", "be", "upon", "him", "peace", "narrated", "which", "what", "their",
        "all", "your", "them", "those", "these", "would", "were", "had", "been", "also",
        "some", "we", "you", "by", "or", "if", "when", "an", "at", "about", "then", "there",
        "his", "do", "did", "does", "can", "could", "should", "shall", "will",
        "allah", "messenger", "imam", "imams", "ibn", "abu", "ali", "muhammad", "abdillah", "abdullah",
        "ja'far", "jafar", "hasan", "husayn", "baqir", "sadiq", "rida", "reza", "prophet", "lord", "holy",
        "people", "man", "men", "woman", "women", "asked", "told", "heard", "came", "went",
        "following", "hadith", "chain", "narrators", "narrator", "book", "chapter", "volume", "sub_book",
        "manner", "marfu", "marfu'", "marfu‘", "number", "certain", "person", "persons", "traced", "elevated"
    ]);

    const queryWords = query.toLowerCase().split(/\W+/);
    queryWords.forEach(w => stopWords.add(w));

    const wordCounts = {};
    items.forEach(item => {
        const words = item.english_text.toLowerCase().replace(/[^\w\s-]/g, '').split(/\s+/);
        words.forEach(word => {
            if (word.length > 4 && !stopWords.has(word)) {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
            }
        });
    });

    const sortedWords = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]);

    const formatLabelWord = (word) => {
        let w = word.toLowerCase();
        if (w.startsWith('al') && w.length > 3 && !w.includes('-')) {
            w = 'al-' + w.slice(2);
        }
        return w;
    };

    for (const [word, count] of sortedWords) {
        const formattedWord = formatLabelWord(word);
        const candidate = `Relating to ${formattedWord}`;
        if (!usedLabels.has(candidate)) {
            usedLabels.add(candidate);
            return candidate;
        }
    }

    const fallback = `Relating to an associated theme (${usedLabels.size + 1})`;
    usedLabels.add(fallback);
    return fallback;
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

        if (activeSearchMode === 'keyword') {
            console.log("Fetching data from SQLite for keyword search...");

            // Clean RAM management for Keyword Mode
            const allRows = await new Promise((resolve, reject) => {
                db.all("SELECT raw_data FROM hadiths", (err, rows) => {
                    if (err) reject(err); else resolve(rows);
                });
            });
            const hadithMap = allRows.map(r => JSON.parse(r.raw_data));

            const lowerQuery = query.toLowerCase().trim();
            let exactMatches = [];
            let fuzzyMatches = [];

            let altQuery = lowerQuery;
            const aliasMap = {
                "hussain": "husayn", "husain": "husayn",
                "hassan": "hasan",
                "mohammad": "muhammad", "mohammed": "muhammad",
                "reza": "rida", "ridha": "rida",
                "sadeq": "sadiq", "sadegh": "sadiq",
                "baqer": "baqir",
                "kazim": "kadhim",
                "quran": "qur'an", "koran": "qur'an",
                "shia": "shi'a", "shiite": "shi'a"
            };

            Object.keys(aliasMap).forEach(key => {
                const regex = new RegExp(`\\b${key}\\b`, 'gi');
                altQuery = altQuery.replace(regex, aliasMap[key]);
            });

            for (const hData of hadithMap) {
                const bookName = hData.book || hData.book_number || "al-Kafi";
                if (activeSource !== "All Twelver Sources" && bookName !== activeSource) continue;

                const eng = (hData.en || "").toLowerCase();
                const ar = hData.ar || "";

                let hNum = hData.hadith_number || hData.hadith;
                if (!hNum || hNum === "unknown" || hNum === "Unknown") {
                    const textMatch = (hData.en || "").match(/^(\d+)\s*\./);
                    hNum = textMatch ? textMatch[1] : "Unknown";
                }

                const hadithObj = {
                    id: hData.id || Math.random().toString(),
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

                if (eng.includes(lowerQuery) || ar.includes(query)) {
                    exactMatches.push(hadithObj);
                }
                else if (altQuery !== lowerQuery && (eng.includes(altQuery) || ar.includes(altQuery))) {
                    fuzzyMatches.push(hadithObj);
                }
            }

            const clusters = [];
            let totalFound = 0;

            if (exactMatches.length > 0) {
                clusters.push({
                    theme_label: `Exact Matches: "${query}"`,
                    items: exactMatches
                });
                totalFound += exactMatches.length;
            }
            if (fuzzyMatches.length > 0) {
                clusters.push({
                    theme_label: `Alternative Spellings (e.g. "${altQuery}")`,
                    items: fuzzyMatches
                });
                totalFound += fuzzyMatches.length;
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

        if (!pipeline) {
            const { pipeline: transformersPipeline } = await import('@xenova/transformers');
            pipeline = transformersPipeline;
        }

        console.log("Embedding query...");
        const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
            quantized: false
        });

        const output = await extractor(query, { pooling: 'mean', normalize: true });
        const vector = Array.from(output.data);

        let finalQueryVector = vector;

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
                console.log(`[ONTOLOGY ENGINE] Query aligned with ${bestConcept.name} (Match: ${highestSim.toFixed(2)}). Blending vectors...`);
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
            topK: 500,
            includeMetadata: true,
            includeValues: true,
            filter: pineconeFilter
        });

        console.log("Looking up top IDs directly in SQLite database...");

        const fetchedHadiths = [];
        for (const match of queryResponse.matches) {
            const id = match.id;
            const parts = id.split("_idx");

            if (parts.length > 1) {
                const mapIdx = parseInt(parts[1], 10);

                // --- SURGICAL FIX: Fetch ONLY what we need from SQLite ---
                const dbRow = await new Promise((resolve, reject) => {
                    db.get("SELECT raw_data FROM hadiths WHERE id = ?", [mapIdx], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });

                if (dbRow) {
                    const hData = JSON.parse(dbRow.raw_data);
                    const foundEnglish = hData.en || "English translation not available";
                    const foundArabic = hData.ar || "Arabic text not available";

                    let hNum = hData.hadith_number || hData.hadith;
                    if (!hNum || hNum === "unknown" || hNum === "Unknown") {
                        const textMatch = foundEnglish.match(/^(\d+)\s*\./);
                        hNum = textMatch ? textMatch[1] : "Unknown";
                    }

                    if (match.values && match.values.length > 0) {
                        fetchedHadiths.push({
                            id: id,
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
            }
        }

        if (fetchedHadiths.length === 0) {
            return res.json({ total_results: 0, clusters: [] });
        }

        console.log("Running K-Means Semantic Clustering...");

        const vectors = fetchedHadiths.map(h => h.vector);
        const numberOfClusters = Math.min(5, fetchedHadiths.length);
        const kmeansResult = kmeans(vectors, numberOfClusters, { initialization: 'kmeans++' });

        const clustersArray = [];
        kmeansResult.clusters.forEach((clusterIndex, dataIndex) => {
            if (!clustersArray[clusterIndex]) {
                clustersArray[clusterIndex] = {
                    theme_label: "",
                    items: []
                };
            }
            const { vector, ...cleanHadith } = fetchedHadiths[dataIndex];
            clustersArray[clusterIndex].items.push(cleanHadith);
        });

        console.log("Generating AI labels for clusters in a single batch request...");
        const generatedLabels = await generateAllClusterLabelsAI(clustersArray, query);

        clustersArray.forEach((cluster, index) => {
            cluster.items.sort((a, b) => b.similarity_score - a.similarity_score);
            cluster.theme_label = generatedLabels[index];
        });

        const resultPayload = {
            total_results: fetchedHadiths.length,
            clusters: clustersArray
        };

        if (searchCache.size >= CACHE_LIMIT) {
            const firstKey = searchCache.keys().next().value;
            searchCache.delete(firstKey);
        }
        searchCache.set(cacheKey, resultPayload);

        console.log(`Successfully clustered and labeled ${fetchedHadiths.length} Hadiths.`);
        res.json(resultPayload);

    } catch (error) {
        console.error("Explore API Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`Concept API Backend running on http://localhost:${PORT}`);
    console.log(`Pinecone Index: ${process.env.PINECONE_INDEX_NAME}`);
});