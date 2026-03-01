const fs = require('fs');
const path = require('path');

async function buildOntology() {
    console.log("Loading AI Model (this might take a few seconds)...");
    const { pipeline } = await import('@xenova/transformers');
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: false });

    console.log("Loading Hadith Database...");
    // Make sure this path points to your JSON file correctly!
    const rawData = fs.readFileSync('../thaqalayn_complete.json', 'utf8');
    const hadiths = JSON.parse(rawData);

    // Our 5 Prototype Concepts
    const coreConcepts = {
        "Aql (Intellect)": "intellect",
        "Wilayah (Divine Authority)": "wilayah",
        "Tawhid (Oneness of God)": "oneness",
        "Ilm (Knowledge)": "knowledge",
        "Sabr (Patience)": "patience"
    };

    const ontology = {};

    for (const [conceptName, keyword] of Object.entries(coreConcepts)) {
        console.log(`\nProcessing Concept: ${conceptName}...`);

        // Grab the first 15 Hadiths that contain this core concept
        const matches = hadiths.filter(h => h.en && h.en.toLowerCase().includes(keyword)).slice(0, 15);

        if (matches.length === 0) {
            console.log(`No matches found for ${keyword}. Skipping.`);
            continue;
        }

        console.log(`Found ${matches.length} foundational hadiths. Calculating centroid...`);
        let centroid = new Array(384).fill(0);

        // Embed each hadith and add its vectors together
        for (const match of matches) {
            const output = await extractor(match.en, { pooling: 'mean', normalize: true });
            const vector = Array.from(output.data);
            for (let i = 0; i < 384; i++) {
                centroid[i] += vector[i];
            }
        }

        // Divide by total to get the mathematical average (the Centroid)
        for (let i = 0; i < 384; i++) {
            centroid[i] /= matches.length;
        }

        // Normalize the final Centroid vector
        let magnitude = Math.sqrt(centroid.reduce((sum, val) => sum + val * val, 0));
        centroid = centroid.map(val => val / magnitude);

        ontology[conceptName] = centroid;
        console.log(`✅ Centroid for ${conceptName} saved.`);
    }

    fs.writeFileSync('./ontology_centroids.json', JSON.stringify(ontology, null, 2));
    console.log("\n🎉 Ontology Engine built successfully! Saved to ontology_centroids.json");
}

buildOntology().catch(console.error);