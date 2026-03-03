const fs = require('fs');
const path = require('path');

async function buildQuran() {
    try {
        console.log("Fetching Arabic Uthmani text from Cloud API...");
        const arRes = await fetch("https://api.alquran.cloud/v1/quran/quran-uthmani");
        const arData = await arRes.json();

        console.log("Fetching English translation (Ali Quli Qarai)...");
        const enRes = await fetch("https://api.alquran.cloud/v1/quran/en.qarai");
        const enData = await enRes.json();

        console.log("Compiling cross-reference database...");
        const quranDB = {};

        arData.data.surahs.forEach((surah, sIdx) => {
            const enSurah = enData.data.surahs[sIdx];
            surah.ayahs.forEach((ayah, aIdx) => {
                const enAyah = enSurah.ayahs[aIdx];
                const key = `${surah.number}:${ayah.numberInSurah}`;
                quranDB[key] = {
                    ar: ayah.text,
                    en: enAyah.text,
                    surahName: surah.englishName,
                    surahArName: surah.name
                };
            });
        });

        // This ensures it saves securely right next to this script
        const savePath = path.join(__dirname, 'quran.json');
        fs.writeFileSync(savePath, JSON.stringify(quranDB));
        console.log("✅ SUCCESS! quran.json has been securely generated at:", savePath);
    } catch (err) {
        console.error("Error building Quran DB:", err);
    }
}

buildQuran();