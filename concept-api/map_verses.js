const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'thaqalayn.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

const verseCounts = {};

console.log("Scanning 85MB database for Quranic references...");

db.each("SELECT raw_data FROM hadiths", [], (err, row) => {
    if (err) return;
    try {
        const hData = JSON.parse(row.raw_data);
        const engText = hData.en || "";
        const regex = /\((\d+):(\d+)\)/g;
        let match;
        const seenInThisHadith = new Set();
        
        while ((match = regex.exec(engText)) !== null) {
            const key = `${match[1]}:${match[2]}`;
            if (!seenInThisHadith.has(key)) {
                verseCounts[key] = (verseCounts[key] || 0) + 1;
                seenInThisHadith.add(key);
            }
        }
    } catch (e) {}
}, (err, count) => {
    const outputPath = path.join(__dirname, 'verse_map.json');
    fs.writeFileSync(outputPath, JSON.stringify(verseCounts, null, 2));
    console.log(`✅ Success! Found hadith references for ${Object.keys(verseCounts).length} unique verses.`);
    db.close();
});
