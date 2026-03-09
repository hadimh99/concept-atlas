import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Moon, Sun, Sparkles, X, ChevronRight, ChevronLeft, Home, Copy, ChevronDown, ChevronUp, List, Layout, Info, BookOpen, History, HelpCircle, Database, Filter, Share2, Check, Settings2, Menu, Clock, Trash2, LibraryBig, Youtube, Library as LibraryIcon, ArrowDown } from 'lucide-react';
import quranData from './quran.json';
import verseMap from './verse_map.json';
import transcriptData from './transcripts.json';

const APP_UPDATES = [
  { version: "v4.0.0", date: "March 8, 2026", changes: ["Introduced the Digital Archive (Transcript Library): A premium reading environment for translated scholarly series, starting with 'The File of Fatima'.", "UI Polish: Added custom text parser for bold highlights, unified mobile drawer, and high-performance native scrolling for transcripts."] },
  { version: "v3.5.3", date: "March 5, 2026", changes: ["Documentation: Completely overhauled the 'Help & Guide' section to detail the comprehensive suite of tools now available in Kisa, including Vector Hopping, Dynamic Map Views, and Reverse Quran Tafsir."] },
  { version: "v3.5.2", date: "March 5, 2026", changes: ["Feature Polish: Added a 'Copy Text' button to all 'Anchored Source' views (both List View accordion and Map View modal) allowing you to copy the full reference, Arabic, and translation instantly.", "Map UX Overhaul: Nodes are uniformly sized and mathematically bounded to never overlap the center box or go off-screen."] }
];
const CLUSTER_COLORS = ['#10b981', '#8b5cf6', '#f59e0b', '#f43f5e', '#3b82f6'];
const SOURCES = ["All Twelver Sources", "al-Kafi", "Bihar al-Anwar", "Basa'ir al-Darajat"];

const SURAH_MEANINGS = { 1: "The Opening", 2: "The Cow", 3: "The Family of Imraan", 4: "The Women", 5: "The Table Spread", 6: "The Cattle", 7: "The Heights", 8: "The Spoils of War", 9: "The Repentance", 10: "Jonah", 11: "Hud", 12: "Joseph", 13: "The Thunder", 14: "Abraham", 15: "The Rocky Tract", 16: "The Bee", 17: "The Night Journey", 18: "The Cave", 19: "Mary", 20: "Ta-Ha", 21: "The Prophets", 22: "The Pilgrimage", 23: "The Believers", 24: "The Light", 25: "The Criterion", 26: "The Poets", 27: "The Ant", 28: "The Stories", 29: "The Spider", 30: "The Romans", 31: "Luqman", 32: "The Prostration", 33: "The Combined Forces", 34: "Sheba", 35: "The Originator", 36: "Ya Sin", 37: "Those who set the Ranks", 38: "The Letter \"Saad\"", 39: "The Troops", 40: "The Forgiver", 41: "Explained in Detail", 42: "The Consultation", 43: "The Ornaments of Gold", 44: "The Smoke", 45: "The Crouching", 46: "The Wind-Curved Sandhills", 47: "Muhammad", 48: "The Victory", 49: "The Rooms", 50: "The Letter \"Qaf\"", 51: "The Winnowing Winds", 52: "The Mount", 53: "The Star", 54: "The Moon", 55: "The Beneficent", 56: "The Inevitable", 57: "The Iron", 58: "The Pleading Woman", 59: "The Exile", 60: "She that is to be examined", 61: "The Ranks", 62: "The Congregation", 63: "The Hypocrites", 64: "The Mutual Disillusion", 65: "The Divorce", 66: "The Prohibition", 67: "The Sovereignty", 68: "The Pen", 69: "The Reality", 70: "The Ascending Stairways", 71: "Noah", 72: "The Jinn", 73: "The Enshrouded One", 74: "The Cloaked One", 75: "The Resurrection", 76: "The Man", 77: "The Emissaries", 78: "The Tidings", 79: "Those who drag forth", 80: "He Frowned", 81: "The Overthrowing", 82: "The Cleaving", 83: "The Defrauding", 84: "The Sundering", 85: "The Mansions of the Stars", 86: "The Nightcommer", 87: "The Most High", 88: "The Overwhelming", 89: "The Dawn", 90: "The City", 91: "The Sun", 92: "The Night", 93: "The Morning Hours", 94: "The Relief", 95: "The Fig", 96: "The Clot", 97: "The Power", 98: "The Clear Proof", 99: "The Earthquake", 100: "The Courser", 101: "The Calamity", 102: "The Rivalry in world increase", 103: "The Declining Day", 104: "The Traducer", 105: "The Elephant", 106: "Quraish", 107: "The Small Kindnesses", 108: "The Abundance", 109: "The Disbelievers", 110: "The Divine Support", 111: "The Palm Fiber", 112: "The Sincerity", 113: "The Daybreak", 114: "Mankind" };
const SURAH_ALIASES = { 1: ["fatiha", "fatihah", "hamd"], 9: ["tawbah", "baraah", "bara'ah", "tawba"], 17: ["isra", "bani israel", "bani israeel"], 40: ["ghafir", "mumin", "mu'min"], 41: ["fussilat", "ha mim sajdah"], 47: ["muhammad", "qital"], 76: ["insan", "dahr"], 94: ["sharh", "inshirah"], 111: ["masad", "lahab"] };

const normalizeStr = (str) => {
  if (!str) return '';
  return str.toLowerCase().replace(/^(surah|sura)\s+/i, '').replace(/^al-/i, '').replace(/[^a-z0-9]/g, '').replace(/ee/g, 'i').replace(/oo/g, 'u').replace(/aa/g, 'a').replace(/ah$/g, 'a');
};

const toArabicNum = (n) => {
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return n.toString().split('').map(d => digits[d]).join('');
};

const timeAgo = (ts) => {
  const diff = Math.floor((Date.now() - ts) / 60000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
};

const KisaLogo = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M18 4V18.5C18 19.3284 17.3284 20 16.5 20H6.5C5.67157 20 5 19.3284 5 18.5V14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13.5 8.5L9.5 11L12.5 13.5L8.5 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const HadithCard = ({ item, handleCopyHadith, searchMode, onVerseClick, onFindSimilar }) => {
  const [showArabic, setShowArabic] = useState(false);
  const [showChain, setShowChain] = useState(false);
  const [copied, setCopied] = useState(false);
  const isKeyword = searchMode === 'keyword';

  const getCleanData = () => {
    let displayNum = item.hadith_number;
    let engText = String(item.english_text || "");
    let araText = String(item.arabic_text || "");
    if (displayNum === "Unknown" || !displayNum || displayNum === "") {
      const engMatch = engText.match(/^[\s"'‘“\[\(]*(?:Unknown[\.\s]*)?(\d+)[\.\-:]?\s/i);
      if (engMatch) displayNum = engMatch[1];
    }
    if (displayNum === "Unknown" || !displayNum || displayNum === "") {
      const araMatch = araText.match(/^[\s"'‘“\[\(]*(\d+)[ـ\.\-\s]/);
      if (araMatch) displayNum = araMatch[1];
    }
    engText = engText.replace(/^[\s"'‘“\[\(]*(?:Unknown[\.\s]*)?(?:\d+[\.\-:]?\s*)?/i, "").trim();
    araText = araText.replace(/^[\s"'‘“\[\(]*(?:\d+[ـ\.\-\s]+)?/, "").trim();
    engText = engText.replace(/(who has said the following|said the following|who said|the following is narrated|who has narrated the following|in a marfu['‘] manner the following|in a marfu['‘] manner who has narrated the following)(?!\s*:)/gi, "$1:");
    if (engText.length > 0) engText = engText.charAt(0).toUpperCase() + engText.slice(1);
    return { displayNum, engText, araText };
  };

  const { displayNum, engText, araText } = getCleanData();
  const splitText = (text) => {
    const markers = ["in a marfu‘ manner who has narrated the following:", "in a marfu' manner who has narrated the following:", "in a marfu‘ manner the following:", "in a marfu' manner the following:", "who has narrated the following:", "said the following:", "who said:", "who has said:", "is narrated from", "narrated that:", "following Hadith:", "the following is narrated:", "said:"];
    for (let marker of markers) {
      if (text.includes(marker)) {
        const parts = text.split(marker);
        let rawChain = parts[0] + marker;
        let bodyPart = parts.slice(1).join(marker).trim();
        const segments = rawChain.split(/(\s+(?:from|narrated that|narrated from|who heard|who has said that|who said that|has said that|said that)\s+)/i);
        let chainSegments = [], bodySegments = [], foundNonImam = false;
        const blessingRegex = /\(\s*(as|a\.s\.?|s\.a\.?|sawa|s\.a\.w\.w\.?|r\.a\.?)\s*\)/i;
        for (let i = segments.length - 1; i >= 0; i -= 2) {
          let chunk = segments[i], delimiter = i > 0 ? segments[i - 1] : "", hasBlessing = blessingRegex.test(chunk);
          if (hasBlessing && !foundNonImam) {
            bodySegments.unshift(chunk);
            let prevChunk = i >= 2 ? segments[i - 2] : null;
            if (prevChunk && blessingRegex.test(prevChunk)) { if (delimiter) bodySegments.unshift(delimiter); }
            else { if (delimiter) chainSegments.unshift(delimiter); }
          } else {
            foundNonImam = true;
            chainSegments.unshift(chunk);
            if (delimiter) chainSegments.unshift(delimiter);
          }
        }
        let finalChain = chainSegments.join("").trim().replace(/(?:(?:from|narrated that|narrated from|who heard|who has said that|who said that|has said that|said that)\s*|,\s*)+$/i, "").trim();
        let finalBodyPrefix = bodySegments.join("").trim();
        let finalBody = finalBodyPrefix ? (finalBodyPrefix + " " + bodyPart) : bodyPart;
        finalBody = finalBody.replace(/^[:\s,‘'"]+/, "");
        if (finalBody.length > 0) finalBody = finalBody.charAt(0).toUpperCase() + finalBody.slice(1);
        return { chain: finalChain || null, body: finalBody };
      }
    }
    return { chain: null, body: text };
  };

  const { chain, body } = splitText(engText);
  const formatParagraphs = (text) => {
    if (!text) return [];
    if (text.includes('\n')) return text.split('\n').filter(p => p.trim());
    if (text.length < 500) return [text];
    const rawSegments = text.split(/([.!?]["'”’]*\s*(?:\(\s*\d+\s*:\s*\d+\s*\))?\s+)/);
    const sentences = [];
    for (let i = 0; i < rawSegments.length; i += 2) {
      let sentence = rawSegments[i];
      if (rawSegments[i + 1]) sentence += rawSegments[i + 1];
      if (sentence.trim()) sentences.push(sentence);
    }
    let paragraphs = [], currentPara = "";
    sentences.forEach(sentence => {
      currentPara += sentence;
      const endsWithAcronym = /(a\.s\.\s*|s\.a\.\s*|a\.j\.\s*|r\.a\.\s*|sawa\s*)$/i.test(sentence);
      const insideQuote = ((currentPara.match(/[“‘]/g) || []).length > (currentPara.match(/[”’]/g) || []).length) || ((currentPara.match(/"/g) || []).length % 2 !== 0);
      if (((currentPara.length > 600 && !insideQuote) || currentPara.length > 1200) && !endsWithAcronym) {
        paragraphs.push(currentPara.trim()); currentPara = "";
      }
    });
    if (currentPara.trim()) paragraphs.push(currentPara.trim());
    return paragraphs;
  };
  const paragraphs = formatParagraphs(body);
  const textToCopy = chain ? `${chain}\n\n${paragraphs.join('\n\n')}` : paragraphs.join('\n\n');

  const handleCopyClick = (e) => {
    e.stopPropagation();
    handleCopyHadith({ ...item, hadith_number: displayNum, english_text: textToCopy });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderTextWithQuranLinks = (text) => {
    const regex = /\((\d+):(\d+)\)/g; const parts = []; let lastIndex = 0, match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push(text.substring(lastIndex, match.index));
      const surah = match[1], ayah = match[2], key = `${surah}:${ayah}`;
      if (quranData[key]) {
        parts.push(<button key={`verse-${match.index}`} onClick={(e) => { e.stopPropagation(); if (onVerseClick) onVerseClick(surah, ayah); }} className={`font-semibold cursor-pointer underline decoration-2 underline-offset-4 transition-all ${isKeyword ? 'text-blue-500 hover:text-blue-700 decoration-blue-500/30 hover:decoration-blue-500' : 'text-indigo-500 hover:text-indigo-400 decoration-indigo-500/30 hover:decoration-indigo-500'}`} title="Read Verse">{match[0]}</button>);
      } else parts.push(match[0]);
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) parts.push(text.substring(lastIndex));
    return parts;
  };

  return (
    <div className={`rounded-xl p-5 sm:p-6 relative shadow-sm border ${isKeyword ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
      <div className={`mb-5 border-b pb-3 ${isKeyword ? 'border-slate-200 dark:border-slate-700' : 'border-slate-100 dark:border-slate-700'}`}>
        <span className="text-xs sm:text-sm md:text-base font-medium text-slate-500 dark:text-slate-400 leading-relaxed block">Book: {item.book}, Vol: {item.volume}, {item.sub_book}, Chapter: {item.chapter}{(displayNum && displayNum !== "Unknown") && `, Hadith: ${displayNum}`}</span>
      </div>
      <div className="mb-3">
        <button onClick={(e) => { e.stopPropagation(); setShowArabic(!showArabic); }} className={`flex items-center gap-1 text-sm font-medium transition-colors cursor-pointer ${isKeyword ? 'text-blue-500 hover:text-blue-600 dark:text-blue-400' : 'text-indigo-500 hover:text-indigo-600 dark:text-indigo-400'}`}>
          {showArabic ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />} {showArabic ? "Hide Original Arabic" : "View Original Arabic"}
        </button>
        <AnimatePresence>
          {showArabic && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className={`p-4 sm:p-5 rounded-lg mt-2 mb-4 border ${isKeyword ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800'}`}>
                <p className="font-arabic text-xl md:text-2xl text-right leading-[2.2] text-slate-700 dark:text-slate-300" dir="rtl" lang="ar">
                  {(displayNum && displayNum !== "Unknown") && `${displayNum}. `}{araText}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="mb-4">
        <button onClick={(e) => { e.stopPropagation(); setShowChain(!showChain); }} className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${isKeyword ? 'text-slate-500 hover:text-blue-500 dark:text-blue-400' : 'text-slate-400 hover:text-indigo-500 dark:text-indigo-400'}`}>
          {showChain ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} {showChain ? "Hide Chain of Narrators" : "View Chain of Narrators"}
        </button>
        <AnimatePresence>
          {showChain && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <p className={`mt-2 p-3 rounded-lg text-sm italic font-sans border ${isKeyword ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400' : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400'}`}>{chain ? chain : "Chain information not explicitly found in English text."}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="mb-6">
        {paragraphs.map((para, idx) => (
          <p key={idx} className={`text-base sm:text-lg md:text-xl leading-[1.8] text-slate-900 dark:text-slate-50 ${idx !== paragraphs.length - 1 ? 'mb-5' : ''}`} style={{ fontFamily: "'Times New Roman', Times, serif" }}>
            {(idx === 0 && displayNum && displayNum !== "Unknown") && (<span className={`font-bold mr-2 ${isKeyword ? 'text-blue-600 dark:text-blue-400' : 'text-indigo-600 dark:text-indigo-400'}`}>{displayNum}.</span>)}
            {renderTextWithQuranLinks(para)}
          </p>
        ))}
      </div>
      <div className="mt-2 flex justify-between items-center pt-4 border-t border-slate-50 dark:border-slate-700/50">
        <button onClick={(e) => { e.stopPropagation(); onFindSimilar && onFindSimilar(item); }} className={`flex items-center gap-1.5 text-xs font-mono transition-colors px-3 py-1.5 rounded-md cursor-pointer shadow-sm border ${isKeyword ? 'bg-blue-50/50 border-blue-200 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/40' : 'bg-indigo-50/50 border-indigo-200 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/40'}`}>
          <Sparkles className="w-3.5 h-3.5" /><span>Find Similar</span>
        </button>
        <button onClick={handleCopyClick} className={`flex items-center gap-2 text-xs font-mono transition-colors px-3 py-1.5 rounded-md cursor-pointer ${copied ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : (isKeyword ? 'text-slate-500 hover:text-blue-500 hover:bg-slate-200/50 dark:hover:bg-slate-700/50' : 'text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700/50')}`}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}<span>{copied ? 'Copied!' : 'Copy Text'}</span>
        </button>
      </div>
    </div>
  );
};

const QuranReader = ({ activeFontFamily, fontStyle, setFontStyle, handleSurahSelectHook, externalSurahTarget, onTafsirClick }) => {
  const [selectedSurah, setSelectedSurah] = useState(1);
  const [showTranslation, setShowTranslation] = useState(true);
  const [readingMode, setReadingMode] = useState('verse');
  const [showSurahMenu, setShowSurahMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [quranSearchQuery, setQuranSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [targetVerse, setTargetVerse] = useState(null);
  const quranSearchInputRef = useRef(null);

  useEffect(() => { if (externalSurahTarget) { setSelectedSurah(externalSurahTarget); } }, [externalSurahTarget]);

  const surahs = useMemo(() => {
    const list = [];
    for (let i = 1; i <= 114; i++) {
      const firstAyah = quranData[`${i}:1`];
      if (firstAyah) {
        let aIdx = 1; while (quranData[`${i}:${aIdx}`]) { aIdx++; if (aIdx > 350) break; }
        list.push({ id: i, enName: firstAyah.surahName, arName: firstAyah.surahArName, meaning: SURAH_MEANINGS[i] || "", ayahCount: aIdx - 1 });
      }
    }
    return list;
  }, []);

  const searchableSurahs = useMemo(() => {
    return surahs.map(s => {
      let terms = [normalizeStr(s.enName)];
      if (SURAH_ALIASES[s.id]) terms = [...terms, ...SURAH_ALIASES[s.id].map(normalizeStr)];
      return { ...s, terms };
    });
  }, [surahs]);

  const handleSearchChange = (val) => {
    setQuranSearchQuery(val);
    if (!val.trim()) { setSearchResults([]); return; }
    const query = val.trim();
    const numMatch = query.match(/^(\d+)\s*:\s*(\d+)$/);
    let results = [];
    if (numMatch) {
      const sId = parseInt(numMatch[1]), vId = parseInt(numMatch[2]);
      if (sId >= 1 && sId <= 114) {
        const targetSurah = surahs.find(s => s.id === sId);
        if (targetSurah && vId >= 1 && vId <= targetSurah.ayahCount) results.push({ type: 'verse', surahId: sId, verseId: vId, label: `Surah ${targetSurah.enName}, Verse ${vId}` });
      }
    } else {
      const normQuery = normalizeStr(query);
      searchableSurahs.forEach(s => { if (s.terms.some(t => t.includes(normQuery))) results.push({ type: 'surah', surahId: s.id, label: `${s.id}. Surah ${s.enName}` }); });
    }
    setSearchResults(results.slice(0, 5));
  };

  const executeSurahSelection = (id) => {
    setSelectedSurah(id);
    const s = surahs.find(x => x.id === id);
    if (s && handleSurahSelectHook) handleSurahSelectHook(id, s.enName);
  };

  const handleSelectResult = (res) => {
    setQuranSearchQuery(''); setSearchResults([]); executeSurahSelection(res.surahId);
    if (res.type === 'verse') { setReadingMode('verse'); setTargetVerse(res.verseId); } else { setTargetVerse(1); }
  };

  const handleQuranSearchSubmit = (e) => {
    e.preventDefault();
    if (searchResults.length > 0) handleSelectResult(searchResults[0]);
    if (quranSearchInputRef.current) quranSearchInputRef.current.blur();
  };

  const ayahsRaw = []; let aIdx = 1;
  while (quranData[`${selectedSurah}:${aIdx}`]) { ayahsRaw.push(quranData[`${selectedSurah}:${aIdx}`]); aIdx++; if (aIdx > 350) break; }

  let surahBismillah = null;
  const ayahs = ayahsRaw.map((ayah, idx) => {
    let arText = ayah.ar;
    if (idx === 0 && selectedSurah !== 1 && selectedSurah !== 9) {
      const bismillahEnd = Math.max(arText.indexOf('ٱلرَّحِيمِ'), arText.indexOf('الرَّحِيمِ'), arText.indexOf('الرحيم'));
      if (bismillahEnd !== -1) {
        const splitIndex = arText.indexOf(' ', bismillahEnd);
        if (splitIndex !== -1) { surahBismillah = arText.substring(0, splitIndex).trim(); arText = arText.substring(splitIndex).trim(); }
      }
    }
    return { ...ayah, ar: arText };
  });

  useEffect(() => {
    if (targetVerse && ayahs.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`verse-${selectedSurah}-${targetVerse}`);
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('bg-amber-500/20', 'dark:bg-amber-500/30'); setTimeout(() => el.classList.remove('bg-amber-500/20', 'dark:bg-amber-500/30'), 2000); }
        setTargetVerse(null);
      }, 100);
    }
  }, [selectedSurah, targetVerse, readingMode, ayahs]);

  return (
    <div className="w-full max-w-4xl px-4 sm:px-6 pt-24 sm:pt-28 pb-12 mx-auto min-h-screen flex flex-col items-center pointer-events-auto">
      {(showSurahMenu || showSettingsMenu || searchResults.length > 0) && (<div className="fixed inset-0 z-[60] pointer-events-auto" onClick={() => { setShowSurahMenu(false); setShowSettingsMenu(false); setSearchResults([]); }} />)}
      <div className="w-full relative mb-4 sm:mb-6 z-[70]">
        <form onSubmit={handleQuranSearchSubmit} className="flex items-center bg-white/40 dark:bg-black/30 backdrop-blur-sm border border-slate-300/50 dark:border-slate-800 rounded-2xl px-4 py-3 sm:py-3.5 shadow-sm transition-all focus-within:border-amber-500/50 dark:focus-within:border-amber-500/50 focus-within:bg-white/60 dark:focus-within:bg-black/50">
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 mr-3 shrink-0" />
          <input ref={quranSearchInputRef} type="text" value={quranSearchQuery} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Search Surah (e.g. Baqarah) or Verse (e.g. 2:255)..." className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-500 text-base font-medium" />
          {quranSearchQuery && <button type="button" onClick={() => { setQuranSearchQuery(''); setSearchResults([]); quranSearchInputRef.current?.focus(); }} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"><X className="w-4 h-4 text-slate-400" /></button>}
        </form>
        <AnimatePresence>
          {searchResults.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute left-0 top-full mt-2 w-full bg-[#f4ecd8] dark:bg-[#1a1a1a] border border-slate-300 dark:border-slate-700 rounded-xl shadow-xl z-[75] overflow-hidden smart-scrollbar">
              {searchResults.map((res, i) => (
                <div key={i} onClick={() => handleSelectResult(res)} className="px-4 py-3.5 cursor-pointer border-b last:border-b-0 border-slate-200 dark:border-slate-800 hover:bg-amber-200/40 dark:hover:bg-amber-900/30 transition-colors flex items-center justify-between group">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-900 dark:group-hover:text-amber-500 transition-colors">{res.label}</span>
                  <span className="text-[10px] uppercase tracking-widest text-amber-600 dark:text-amber-500 font-bold opacity-80">{res.type}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full bg-white/40 dark:bg-black/30 backdrop-blur-sm p-4 sm:p-5 rounded-2xl mb-12 border border-slate-300/50 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 relative z-[65]">
        <div className="relative w-full md:w-[280px]">
          <button onClick={() => { setShowSurahMenu(!showSurahMenu); setShowSettingsMenu(false); }} className="w-full bg-white dark:bg-[#1a1a1a] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm rounded-lg px-4 py-2.5 flex justify-between items-center transition-colors font-medium shadow-sm hover:border-amber-500 dark:hover:border-amber-500 cursor-pointer">
            <span className="truncate">{selectedSurah}. Surah {surahs.find(s => s.id === selectedSurah)?.enName}</span>
            {showSurahMenu ? <ChevronUp className="w-4 h-4 opacity-50 shrink-0 ml-2" /> : <ChevronDown className="w-4 h-4 opacity-50 shrink-0 ml-2" />}
          </button>
          <AnimatePresence>
            {showSurahMenu && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full left-0 mt-2 w-full sm:w-[340px] max-h-[400px] overflow-y-auto bg-[#f4ecd8] dark:bg-[#1a1a1a] border border-slate-300 dark:border-slate-700 rounded-xl shadow-xl z-[70] smart-scrollbar">
                {surahs.map(s => (
                  <div key={s.id} onClick={() => { executeSurahSelection(s.id); setShowSurahMenu(false); }} className={`px-4 py-3.5 cursor-pointer transition-colors flex justify-between items-center border-b last:border-b-0 border-slate-300/40 dark:border-slate-700/50 ${selectedSurah === s.id ? 'bg-amber-200/60 dark:bg-amber-900/40' : 'hover:bg-amber-200/50 dark:hover:bg-amber-600/10'}`}>
                    <div className="flex flex-col">
                      <span className={`font-bold text-sm sm:text-base ${selectedSurah === s.id ? 'text-amber-900 dark:text-amber-500' : 'text-slate-800 dark:text-slate-200'}`}>{s.id}. {s.enName}</span>
                      <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.meaning}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`font-arabic text-lg sm:text-xl ${selectedSurah === s.id ? 'text-amber-900 dark:text-amber-500' : 'text-slate-800 dark:text-slate-200'}`} dir="rtl" lang="ar">{s.arName}</span>
                      <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.ayahCount} ayahs</span>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex w-full md:w-auto items-center justify-between md:justify-end gap-3 relative">
          <div className="flex items-center bg-white/60 dark:bg-slate-900/60 p-1 rounded-lg border border-slate-300 dark:border-slate-700 shadow-sm">
            <button onClick={() => setReadingMode('verse')} className={`px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${readingMode === 'verse' ? 'bg-amber-700 dark:bg-amber-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}>Verse</button>
            <button onClick={() => setReadingMode('flow')} className={`px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${readingMode === 'flow' ? 'bg-amber-700 dark:bg-amber-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}>Flow</button>
          </div>
          <div className="relative">
            <button onClick={() => { setShowSettingsMenu(!showSettingsMenu); setShowSurahMenu(false); }} className={`px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border shadow-sm flex items-center gap-2 cursor-pointer ${showSettingsMenu ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 border-transparent' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <Settings2 className="w-4 h-4" /> Customise
            </button>
            <AnimatePresence>
              {showSettingsMenu && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute right-0 top-full mt-2 w-[220px] bg-[#f4ecd8] dark:bg-[#1a1a1a] border border-slate-300 dark:border-slate-700 rounded-xl shadow-xl z-[70] p-4 flex flex-col gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 mb-2">Quranic Font</p>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => { setFontStyle('scheherazade'); setShowSettingsMenu(false); }} className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors cursor-pointer ${fontStyle === 'scheherazade' ? 'bg-amber-200/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-500 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'}`}>Scheherazade</button>
                      <button onClick={() => { setFontStyle('uthmani'); setShowSettingsMenu(false); }} className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors cursor-pointer ${fontStyle === 'uthmani' ? 'bg-amber-200/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-500 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'}`}>Amiri</button>
                      <button onClick={() => { setFontStyle('xbzar'); setShowSettingsMenu(false); }} className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors cursor-pointer ${fontStyle === 'xbzar' ? 'bg-amber-200/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-500 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'}`}>XB Zar</button>
                    </div>
                  </div>
                  <hr className="border-slate-300 dark:border-slate-700" />
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 mb-2">Translation</p>
                    <button onClick={() => setShowTranslation(!showTranslation)} className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors cursor-pointer flex items-center justify-between ${showTranslation ? 'bg-amber-200/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-500 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'}`}>
                      Show English
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${showTranslation ? 'bg-amber-600 dark:bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                        <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${showTranslation ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="text-center mb-10">
        <h1 className="text-4xl sm:text-6xl font-arabic text-slate-900 dark:text-slate-50 pb-2 sm:pb-4 mb-4 sm:mb-5 leading-[1.5] sm:leading-[1.5] drop-shadow-sm" style={{ fontFamily: activeFontFamily }} dir="rtl" lang="ar">{surahs.find(s => s.id === selectedSurah)?.arName}</h1>
        <p className="text-amber-800 dark:text-amber-500 font-mono text-sm tracking-widest uppercase font-semibold">Surah {surahs.find(s => s.id === selectedSurah)?.enName}</p>
      </div>

      {surahBismillah && (
        <div className="text-center mb-12">
          <h2 className="font-arabic text-3xl sm:text-4xl text-slate-800 dark:text-slate-200 pb-2 leading-[1.5]" style={{ fontFamily: activeFontFamily }} dir="rtl" lang="ar">{surahBismillah}</h2>
        </div>
      )}

      {readingMode === 'flow' ? (
        <div className="w-full pb-10 max-w-4xl mx-auto px-2 sm:px-0">
          <div className="font-arabic text-3xl sm:text-4xl lg:text-[42px] text-right leading-[2.4] sm:leading-[2.6] text-slate-900 dark:text-slate-100 mb-12 text-justify" dir="rtl" lang="ar" style={{ fontFamily: activeFontFamily }}>
            {ayahs.map((ayah, idx) => {
              const verseKey = `${selectedSurah}:${idx + 1}`;
              const relatedCount = verseMap[verseKey] || 0;
              return (
                <span id={`verse-${selectedSurah}-${idx + 1}`} key={`ar-${idx}`} className="inline rounded-lg transition-colors duration-1000">
                  {ayah.ar}
                  <span className={`text-amber-700 dark:text-amber-500 opacity-80 text-xl mx-2 font-sans transition-colors ${relatedCount > 0 ? 'cursor-pointer hover:text-amber-900 dark:hover:text-amber-300 drop-shadow-md' : ''}`} title={relatedCount > 0 ? `Read ${relatedCount} Related Hadiths` : ''} onClick={() => relatedCount > 0 && onTafsirClick(selectedSurah, idx + 1)}>
                    ﴾{toArabicNum(idx + 1)}﴿
                    {relatedCount > 0 && <sup className="text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/50 rounded px-1 ml-0.5">{relatedCount}</sup>}
                  </span>
                </span>
              );
            })}
          </div>
          <AnimatePresence>
            {showTranslation && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="border-t-2 border-[#d4c5b0] dark:border-[#2a2a2a] pt-8 mt-8">
                  <div className="text-lg sm:text-xl text-slate-800 dark:text-slate-300 leading-[2] sm:leading-[2.2] font-serif text-justify">
                    {ayahs.map((ayah, idx) => {
                      const verseKey = `${selectedSurah}:${idx + 1}`;
                      const relatedCount = verseMap[verseKey] || 0;
                      return (
                        <span key={`en-${idx}`} className="inline mr-3">
                          <sup className={`text-xs font-bold mr-1 opacity-80 transition-colors ${relatedCount > 0 ? 'text-amber-600 dark:text-amber-400 cursor-pointer hover:underline' : 'text-slate-400'}`} onClick={() => relatedCount > 0 && onTafsirClick(selectedSurah, idx + 1)} title={relatedCount > 0 ? `Read ${relatedCount} Related Hadiths` : ''}>
                            {idx + 1}
                          </sup>
                          {ayah.en}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="w-full flex flex-col pb-10">
          {ayahs.map((ayah, idx) => {
            const verseKey = `${selectedSurah}:${idx + 1}`;
            const relatedCount = verseMap[verseKey] || 0;
            return (
              <div id={`verse-${selectedSurah}-${idx + 1}`} key={idx} className="py-8 sm:py-10 border-b border-[#d4c5b0] dark:border-[#2a2a2a] first:pt-0 relative group flex flex-col sm:block rounded-xl transition-colors duration-1000 px-2 sm:px-4">
                <div className="mb-4 sm:mb-0 sm:absolute sm:top-12 sm:left-4">
                  <span className="text-[10px] sm:text-xs font-mono font-bold text-amber-900 dark:text-amber-500 bg-[#eaddc6] dark:bg-[#1a1a1a] border border-[#d4c5b0] dark:border-[#333] px-2 py-1 rounded shadow-sm inline-block">
                    {selectedSurah}:{idx + 1}
                  </span>
                </div>
                <div className="sm:pl-20">
                  <p className="font-arabic text-3xl sm:text-4xl lg:text-[40px] text-right leading-[2.4] sm:leading-[2.5] text-slate-900 dark:text-slate-100 mb-6" dir="rtl" lang="ar" style={{ fontFamily: activeFontFamily }}>{ayah.ar} <span className="text-amber-700 dark:text-amber-500 opacity-80 ml-2 text-xl font-sans">﴾{toArabicNum(idx + 1)}﴿</span></p>
                  <AnimatePresence>
                    {showTranslation && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="border-t border-[#d4c5b0]/50 dark:border-[#2a2a2a]/50 pt-5 mt-3"><p className="text-lg sm:text-xl text-slate-800 dark:text-slate-300 leading-relaxed font-serif">{ayah.en}</p></div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {relatedCount > 0 && (
                    <div className="mt-4 flex justify-end">
                      <button onClick={() => onTafsirClick(selectedSurah, idx + 1)} className="flex items-center gap-1.5 text-[10px] sm:text-xs uppercase tracking-wider font-bold text-amber-700 hover:text-amber-900 dark:text-amber-500 dark:hover:text-amber-400 transition-colors bg-amber-100/50 dark:bg-amber-900/20 px-3 py-1.5 rounded-md cursor-pointer shadow-sm">
                        <LibraryBig className="w-3.5 h-3.5" /> Related Hadiths <span className="bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 px-1.5 py-0.5 rounded text-[10px] ml-1">{relatedCount}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const TranscriptLibrary = ({ transcripts }) => {
  const [activeDoc, setActiveDoc] = useState(transcripts[0]);
  const [isArchiveOpen, setIsArchiveOpen] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(true);
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState('sans'); // NEW: Font Toggle
  const [isTocOpen, setIsTocOpen] = useState(false);

  // NEW: Reading Progress State & Toast
  const [readingProgress, setReadingProgress] = useState(() => {
    const saved = localStorage.getItem('kisa_progress');
    return saved ? JSON.parse(saved) : {};
  });
  const [resumeToast, setResumeToast] = useState(false);

  const maxScrollYRef = useRef(0);
  const returnDesktopRef = useRef(null);
  const returnMobileRef = useRef(null);
  const isShowingReturnRef = useRef(false);
  const progressBarRef = useRef(null);
  const stickySegmentRef = useRef(null);
  const lastSaveTimeRef = useRef(0);

  // NEW: Zen Mode Refs
  const lastScrollYRef = useRef(0);
  const isZenModeRef = useRef(false);
  const mobileFabRef = useRef(null);
  const desktopFabRef = useRef(null);

  const readingTime = useMemo(() => {
    const textString = activeDoc.content.map(b => b.text).join(' ');
    const wordCount = textString.trim().split(/\s+/).length;
    return Math.ceil(wordCount / 200);
  }, [activeDoc]);

  const groupedTranscripts = useMemo(() => {
    return transcripts.reduce((acc, doc) => {
      const seriesName = doc.series || (doc.title.includes(' - ') ? doc.title.split(' - ')[0] : 'General Transcripts');
      if (!acc[seriesName]) acc[seriesName] = [];
      acc[seriesName].push(doc);
      return acc;
    }, {});
  }, [transcripts]);

  const initialSeries = activeDoc.series || (activeDoc.title.includes(' - ') ? activeDoc.title.split(' - ')[0] : 'General Transcripts');
  const [expandedSeries, setExpandedSeries] = useState({ [initialSeries]: true });

  const toggleSeries = (seriesName) => {
    setExpandedSeries(prev => ({ ...prev, [seriesName]: !prev[seriesName] }));
  };

  // NEW: Smart Resume - Restores scroll position on load/change
  useEffect(() => {
    setIsTocOpen(false);

    const savedData = JSON.parse(localStorage.getItem('kisa_progress') || '{}');
    const docData = savedData[activeDoc.id];

    if (docData && docData.position > 300) {
      // Instant jump to saved position
      setTimeout(() => {
        window.scrollTo({ top: docData.position, behavior: 'auto' });
        setResumeToast(true);
        setTimeout(() => setResumeToast(false), 3000);
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, [activeDoc]);

  let seriesTitle = activeDoc.series;
  let mainTitle = activeDoc.title;
  if (!seriesTitle && activeDoc.title.includes(' - ')) {
    const parts = activeDoc.title.split(' - ');
    seriesTitle = parts[0];
    mainTitle = parts.slice(1).join(' - ');
  } else if (seriesTitle && activeDoc.title.startsWith(seriesTitle + ' - ')) {
    mainTitle = activeDoc.title.replace(seriesTitle + ' - ', '');
  }

  const tocItems = activeDoc.content
    .map((block, index) => ({ ...block, index }))
    .filter(block => block.type === 'h2');

  const scrollToSegment = (idx) => {
    const el = document.getElementById(`segment-${idx}`);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // UPDATED: Scroll Listener with Auto-Save Logic
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY;

          if (y >= maxScrollYRef.current - 50) {
            maxScrollYRef.current = Math.max(y, maxScrollYRef.current);
          }

          const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
          const scrolled = height > 0 ? (y / height) * 100 : 0;

          if (progressBarRef.current) {
            progressBarRef.current.style.width = `${scrolled}%`;
          }

          // NEW: Zen Mode Scroll Direction Logic
          if (y < 100) {
            isZenModeRef.current = false;
          } else if (y > lastScrollYRef.current + 12) {
            isZenModeRef.current = true; // Scrolling Down (Hide UI)
          } else if (y < lastScrollYRef.current - 12) {
            isZenModeRef.current = false; // Scrolling Up (Show UI)
          }
          lastScrollYRef.current = y;

          // Apply Zen Mode Styles to Floating Buttons
          const fabOpacity = isZenModeRef.current ? '0' : '1';
          const fabPointer = isZenModeRef.current ? 'none' : 'auto';

          if (mobileFabRef.current) {
            mobileFabRef.current.style.opacity = fabOpacity;
            mobileFabRef.current.style.pointerEvents = fabPointer;
            mobileFabRef.current.style.transform = isZenModeRef.current ? 'translateY(20px) scale(0.8)' : 'translateY(0) scale(1)';
          }

          if (desktopFabRef.current) {
            desktopFabRef.current.style.opacity = fabOpacity;
            desktopFabRef.current.style.pointerEvents = fabPointer;
            desktopFabRef.current.style.transform = isZenModeRef.current ? 'translateX(-20px)' : 'translateX(0)';
          }

          // Zero-cost Sticky Segment Tracker (with Zen Mode integration)
          const headers = document.querySelectorAll('.segment-header');
          let currentSegment = '';
          for (let i = headers.length - 1; i >= 0; i--) {
            const rect = headers[i].getBoundingClientRect();
            if (rect.top < 150) {
              currentSegment = headers[i].innerText;
              break;
            }
          }
          if (stickySegmentRef.current) {
            if (currentSegment && !isZenModeRef.current) {
              if (stickySegmentRef.current.innerText !== currentSegment) {
                stickySegmentRef.current.innerText = currentSegment;
              }
              stickySegmentRef.current.style.opacity = '1';
              stickySegmentRef.current.style.transform = 'translateY(0)';
            } else {
              stickySegmentRef.current.style.opacity = '0';
              stickySegmentRef.current.style.transform = 'translateY(-10px)';
            }
          }


          // NEW: Save to LocalStorage (throttled to 1 second for performance)
          const now = Date.now();
          if (now - lastSaveTimeRef.current > 1000) {
            const savedData = JSON.parse(localStorage.getItem('kisa_progress') || '{}');
            const currentStatus = savedData[activeDoc.id]?.status;

            // Status logic: Completed if scrolled past 95%
            const newStatus = (scrolled > 95 || currentStatus === 'completed')
              ? 'completed'
              : (scrolled > 2 ? 'in-progress' : 'unread');

            savedData[activeDoc.id] = {
              position: y,
              percentage: scrolled,
              status: newStatus
            };

            localStorage.setItem('kisa_progress', JSON.stringify(savedData));

            // Only update React state if status category changes
            if (currentStatus !== newStatus) {
              setReadingProgress(savedData);
            }

            lastSaveTimeRef.current = now;
          }

          const shouldShow = (maxScrollYRef.current - y > 1500);

          if (shouldShow && !isShowingReturnRef.current) {
            isShowingReturnRef.current = true;
            if (returnDesktopRef.current) {
              returnDesktopRef.current.style.opacity = '1';
              returnDesktopRef.current.style.pointerEvents = 'auto';
              returnDesktopRef.current.style.transform = 'translateY(-50%) translateX(0px)';
            }
            if (returnMobileRef.current) {
              returnMobileRef.current.style.opacity = '1';
              returnMobileRef.current.style.pointerEvents = 'auto';
              returnMobileRef.current.style.transform = 'translateY(0px) scale(1)';
            }
          } else if (!shouldShow && isShowingReturnRef.current) {
            isShowingReturnRef.current = false;
            if (returnDesktopRef.current) {
              returnDesktopRef.current.style.opacity = '0';
              returnDesktopRef.current.style.pointerEvents = 'none';
              returnDesktopRef.current.style.transform = 'translateY(-50%) translateX(20px)';
            }
            if (returnMobileRef.current) {
              returnMobileRef.current.style.opacity = '0';
              returnMobileRef.current.style.pointerEvents = 'none';
              returnMobileRef.current.style.transform = 'translateY(20px) scale(0.8)';
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeDoc]); // Active doc dependency ensures correct ID is saved

  const jumpBack = () => {
    window.scrollTo({ top: maxScrollYRef.current, behavior: 'smooth' });
  };

  const parseFormatting = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-zinc-900 dark:text-white">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // UPDATED: ArchiveList with Status Indicators
  const ArchiveList = () => (
    <div className="flex flex-col gap-2">
      {Object.entries(groupedTranscripts).map(([groupSeriesName, docs]) => (
        <div key={groupSeriesName} className="flex flex-col mb-1">
          <button
            onClick={() => toggleSeries(groupSeriesName)}
            className="flex items-center justify-between py-2 px-3 hover:bg-zinc-100 dark:hover:bg-[#2c2c2e] rounded-lg transition-colors group cursor-pointer"
          >
            <span className="text-base sm:text-lg font-sans font-black uppercase tracking-widest text-[#c6a87c] dark:text-[#d4b78f] group-hover:text-[#b09265] transition-colors text-left flex-1 pr-4 leading-tight">
              {groupSeriesName}
            </span>
            {expandedSeries[groupSeriesName] ? <ChevronUp className="w-4 h-4 text-[#c6a87c] shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />}
          </button>
          <AnimatePresence>
            {expandedSeries[groupSeriesName] && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden flex flex-col gap-1 mt-2 pl-2 border-l-2 border-zinc-200 dark:border-zinc-700/50 ml-3">
                {docs.map(doc => {
                  const displayTitle = doc.title.startsWith(groupSeriesName + ' - ') ? doc.title.replace(groupSeriesName + ' - ', '') : doc.title;
                  const status = readingProgress[doc.id]?.status || 'unread';

                  return (
                    <button
                      key={doc.id}
                      onClick={() => { setActiveDoc(doc); setIsMobileDrawerOpen(false); }}
                      className={`text-left py-2.5 px-3 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${activeDoc.id === doc.id ? 'bg-zinc-50 dark:bg-[#1c1c1e] text-zinc-900 dark:text-white font-bold shadow-sm border border-zinc-200 dark:border-zinc-700' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 border border-transparent hover:bg-zinc-50 dark:hover:bg-[#2c2c2e]'}`}
                    >
                      <span className="text-sm leading-snug block flex-1">{displayTitle}</span>

                      {/* Visual Status Indicator */}
                      {status === 'completed' && <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]" title="Completed" />}
                      {status === 'in-progress' && <div className="w-2 h-2 rounded-full bg-[#c6a87c] shrink-0 shadow-[0_0_8px_rgba(198,168,124,0.6)]" title="In Progress" />}
                      {status === 'unread' && <div className="w-2 h-2 rounded-full border-[1.5px] border-zinc-300 dark:border-zinc-600 shrink-0" title="Unread" />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );

  const LibraryTools = ({ isMobile }) => (
    <div className="flex flex-col h-full">
      <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0 flex justify-between items-center">
        <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2"><LibraryIcon className="w-4 h-4 text-[#c6a87c]" /> Library Tools</h2>
        {isMobile ? (
          <button onClick={() => setIsMobileDrawerOpen(false)} className="p-1"><X className="w-5 h-5 text-zinc-500" /></button>
        ) : (
          <button onClick={() => setIsArchiveOpen(false)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"><X className="w-4 h-4 text-zinc-500" /></button>
        )}
      </div>

      <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block">Font Style</span>
          <div className="flex items-center gap-1 bg-zinc-50 dark:bg-[#252528] rounded-lg p-0.5 border border-zinc-200 dark:border-zinc-700">
            <button onClick={() => setFontFamily('sans')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${fontFamily === 'sans' ? 'bg-white dark:bg-[#1c1c1e] text-[#c6a87c] shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>Sans</button>
            <button onClick={() => setFontFamily('serif')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors font-serif cursor-pointer ${fontFamily === 'serif' ? 'bg-white dark:bg-[#1c1c1e] text-[#c6a87c] shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>Serif</button>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-2">Text Size</span>
        <div className="flex items-center justify-between bg-zinc-50 dark:bg-[#252528] rounded-lg p-1 border border-zinc-200 dark:border-zinc-700 w-full">

          <button onClick={() => setFontSize(Math.max(14, fontSize - 1))} className="w-10 h-6 sm:w-12 sm:h-7 flex items-center justify-center rounded bg-white dark:bg-[#1c1c1e] text-zinc-600 dark:text-zinc-300 font-bold shadow-sm text-sm cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">-</button>
          <span className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 flex-grow text-center">{fontSize}px</span>
          <button onClick={() => setFontSize(Math.min(28, fontSize + 1))} className="w-10 h-6 sm:w-12 sm:h-7 flex items-center justify-center rounded bg-white dark:bg-[#1c1c1e] text-zinc-600 dark:text-zinc-300 font-bold shadow-sm text-sm cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">+</button>
        </div>
      </div>

      <div className="p-3 sm:p-4 overflow-y-auto smart-scrollbar flex-grow flex flex-col gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block ml-1 mb-2">Archive</span>
        <ArchiveList />
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-screen pt-20 sm:pt-32 pb-32 flex justify-center font-sans relative px-0 sm:px-6 lg:px-8">

      {/* FIX: Sticky Progress Bar (Ref-driven) */}
      <div className="fixed top-0 left-0 w-full h-1 z-[300] bg-zinc-200/50 dark:bg-zinc-800/50">
        <div ref={progressBarRef} className="h-full bg-[#c6a87c] will-change-[width]" style={{ width: '0%' }} />
      </div>

      {/* NEW: Sticky Segment Anchor */}
      <div
        ref={stickySegmentRef}
        className="fixed top-1 left-0 w-full z-[250] py-1.5 px-4 text-center text-[10px] sm:text-xs font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-800/50 shadow-sm transition-all duration-300 pointer-events-none will-change-transform"
        style={{ opacity: 0, transform: 'translateY(-10px)' }}
      />

      <AnimatePresence>
        {resumeToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[400] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2.5 rounded-full shadow-2xl text-[10px] sm:text-xs font-bold uppercase tracking-widest flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#c6a87c]" />
            Resumed where you left off
          </motion.div>
        )}
      </AnimatePresence>

      <button
        ref={returnDesktopRef}
        onClick={jumpBack}
        style={{ opacity: 0, pointerEvents: 'none', transform: 'translateY(-50%) translateX(20px)' }}
        className="hidden md:flex fixed top-1/2 right-4 lg:right-6 z-[100] bg-white dark:bg-[#252528] text-[#c6a87c] border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-full shadow-2xl flex-col items-center gap-3 cursor-pointer hover:scale-105 transition-all duration-300"
      >
        <span style={{ writingMode: 'vertical-rl' }} className="text-[10px] font-bold uppercase tracking-widest mb-2 mt-1">Return to Reading</span>
        <ArrowDown className="w-4 h-4 animate-bounce mb-1" />
      </button>

      <button
        ref={returnMobileRef}
        onClick={jumpBack}
        style={{ opacity: 0, pointerEvents: 'none', transform: 'translateY(20px) scale(0.8)' }}
        className="md:hidden fixed bottom-[88px] right-3 z-[100] w-12 h-12 bg-zinc-900 dark:bg-[#e4d3ba] text-[#d4b78f] dark:text-[#5c4a30] border border-zinc-700 dark:border-zinc-300 rounded-full shadow-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300"
      >
        <span className="font-extrabold text-[14px] leading-none mt-1">R</span>
        <ArrowDown className="w-3.5 h-3.5 animate-bounce mt-0.5" />
      </button>

      <div ref={desktopFabRef} className="hidden md:block fixed top-32 left-8 z-50 transition-all duration-300 will-change-transform pointer-events-auto">
        <AnimatePresence>
          {!isArchiveOpen && (
            <motion.button initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onClick={() => setIsArchiveOpen(true)} className="p-3 bg-white dark:bg-[#252528] border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-full text-zinc-500 hover:text-[#c6a87c] transition-colors cursor-pointer group" title="Open Archive">
              <LibraryIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <button
        ref={mobileFabRef}
        onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
        className="md:hidden fixed bottom-6 right-3 z-[210] w-12 h-12 bg-white dark:bg-[#252528] text-[#c6a87c] border border-zinc-200 dark:border-zinc-800 rounded-full shadow-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 will-change-transform"
      >
        <AnimatePresence mode="wait">
          {isMobileDrawerOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-5 h-5 text-zinc-500" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <LibraryIcon className="w-5 h-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {isMobileDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileDrawerOpen(false)}
              className="md:hidden fixed inset-0 bg-black/40 z-[190] cursor-pointer backdrop-blur-sm"
              style={{ touchAction: 'none' }}
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="md:hidden fixed top-0 bottom-0 left-0 w-[85vw] max-w-[340px] bg-white dark:bg-[#1c1c1e] z-[200] shadow-2xl border-r border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden"
            >
              <LibraryTools isMobile={true} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="w-full max-w-[1400px] mx-auto flex items-start gap-0 md:gap-8 lg:gap-12">

        <motion.div
          animate={{ width: isArchiveOpen ? 320 : 0, opacity: isArchiveOpen ? 1 : 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="hidden md:block shrink-0 overflow-hidden sticky top-32 self-start h-[calc(100vh-140px)]"
        >
          <div className="w-[320px] h-full bg-white dark:bg-[#252528] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl flex flex-col shadow-sm">
            <LibraryTools isMobile={false} />
          </div>
        </motion.div>

        <div className="flex-1 min-w-0 w-full flex justify-center transition-all duration-500">
          <div className="w-full max-w-4xl mx-auto bg-white dark:bg-[#252528] sm:border border-zinc-200 dark:border-zinc-800/80 sm:rounded-2xl px-5 py-10 sm:p-12 sm:shadow-sm">

            <header className="mb-8 sm:mb-10">
              {seriesTitle && (
                <span className="block font-mono text-[#c6a87c] dark:text-[#d4b78f] font-bold tracking-widest uppercase text-xs sm:text-sm mb-3">
                  {seriesTitle}
                </span>
              )}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white leading-[1.15] mb-6 tracking-tight">
                {mainTitle}
              </h1>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[10px] sm:text-[11px] lg:text-xs font-bold uppercase tracking-widest pb-6">
                <span className="text-zinc-700 dark:text-zinc-300">{activeDoc.speaker}</span>
                <span className="text-zinc-300 dark:text-zinc-600 hidden sm:inline">|</span>
                <span className="flex items-center gap-1.5 text-zinc-500"><Clock className="w-3.5 h-3.5" /> {readingTime} min read</span>
                {activeDoc.source_link && (
                  <>
                    <span className="text-zinc-300 dark:text-zinc-600 hidden sm:inline">|</span>
                    <a href={activeDoc.source_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-zinc-500 hover:text-red-600 transition-colors group"><Youtube className="w-4 h-4 group-hover:scale-110 transition-transform" /> Watch Original</a>
                  </>
                )}
              </div>
              <hr className="w-full border-t-[2px] border-zinc-200 dark:border-zinc-700" />
            </header>

            {tocItems.length > 0 && (
              <div className="mb-10 sm:mb-12 bg-zinc-50 dark:bg-[#1a1a1c] border border-zinc-200 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setIsTocOpen(!isTocOpen)}
                  className="w-full flex items-center justify-between px-5 sm:px-6 py-4 cursor-pointer hover:bg-zinc-100 dark:hover:bg-[#252528] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <List className="w-5 h-5 text-[#c6a87c]" />
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Table of Contents</span>
                  </div>
                  {isTocOpen ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                </button>
                <AnimatePresence>
                  {isTocOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 sm:px-6 pb-5 pt-2 flex flex-col gap-3 border-t border-zinc-200 dark:border-zinc-800/80 mx-2">
                        {tocItems.map((item) => (
                          <button
                            key={item.index}
                            onClick={() => scrollToSegment(item.index)}
                            className="text-left text-sm sm:text-base font-medium text-zinc-600 dark:text-zinc-400 hover:text-[#c6a87c] dark:hover:text-[#d4b78f] transition-colors flex items-start gap-3 group cursor-pointer"
                          >
                            <span className="text-[#c6a87c] opacity-50 group-hover:opacity-100 mt-1 sm:mt-0.5 text-[10px]">■</span>
                            {item.text}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className={`text-zinc-800 dark:text-zinc-300 antialiased ${fontFamily === 'serif' ? 'font-serif' : 'font-sans'}`} style={{ fontSize: `${fontSize}px`, lineHeight: 1.85 }}>
              {activeDoc.content.map((block, idx) => {
                if (block.type === 'h2') return <h2 id={`segment-${idx}`} key={idx} className="segment-header font-bold text-zinc-900 dark:text-white mt-14 mb-6 tracking-tight scroll-mt-24 font-sans" style={{ fontSize: `${fontSize * 1.3}px`, lineHeight: 1.3 }}>{block.text}</h2>; if (block.type === 'summary') return (
                  <div key={idx} className="bg-zinc-50 dark:bg-[#1c1c1e] border-l-4 border-[#c6a87c] p-6 sm:p-8 my-10 rounded-r-xl shadow-sm">
                    <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#c6a87c] mb-3"><Sparkles className="w-3.5 h-3.5" /> Segment Summary</span>
                    <p className="text-zinc-700 dark:text-zinc-300 font-medium" style={{ fontSize: `${Math.max(15, fontSize - 2)}px`, lineHeight: 1.7 }}>{parseFormatting(block.text)}</p>
                  </div>
                );
                if (block.type === 'quote') return (
                  <blockquote key={idx} className="pl-6 sm:pl-8 py-2 my-10 border-l-[3px] border-[#c6a87c] font-medium text-zinc-900 dark:text-zinc-100 italic font-serif" style={{ fontSize: `${fontSize * 1.15}px`, lineHeight: 1.6 }}>"{parseFormatting(block.text)}"</blockquote>
                );
                if (block.type === 'divider') return <div key={idx} className="flex justify-center py-10"><span className="w-12 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></span></div>;
                return <p key={idx} className="mb-6 text-left">{parseFormatting(block.text)}</p>;
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default function App() {
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState('concept');
  const [sourceFilter, setSourceFilter] = useState(SOURCES[0]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [viewMode, setViewMode] = useState(typeof window !== 'undefined' && window.innerWidth < 800 ? 'list' : 'map');
  const [activeCluster, setActiveCluster] = useState(null);
  const [hoveredCluster, setHoveredCluster] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [lengthFilter, setLengthFilter] = useState('All');
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState('search');
  const [quranPopup, setQuranPopup] = useState(null);

  const [tafsirData, setTafsirData] = useState(null);
  const [tafsirLoading, setTafsirLoading] = useState(false);
  const [tafsirTarget, setTafsirTarget] = useState(null);

  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [appHistory, setAppHistory] = useState([]);
  const [quranTarget, setQuranTarget] = useState(null);

  const [anchorHadith, setAnchorHadith] = useState(null);
  const [showAnchor, setShowAnchor] = useState(false);
  const [showAnchorModal, setShowAnchorModal] = useState(false);
  const [anchorCopied, setAnchorCopied] = useState(false);

  const [fontStyle, setFontStyle] = useState('scheherazade');

  const searchIdRef = useRef(0);

  const activeFontFamily =
    fontStyle === 'scheherazade' ? '"Scheherazade New", "Noto Naskh Arabic", sans-serif' :
      fontStyle === 'uthmani' ? '"Amiri Quran", "Amiri", serif' :
        '"XBZarFont", "Noto Naskh Arabic", sans-serif';

  const containerRef = useRef(null);
  const headerRef = useRef(null);
  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      if (!headerRef.current) return;
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 150) {
        headerRef.current.style.transform = 'translateY(-100%)';
        headerRef.current.style.opacity = '0';
      } else {
        headerRef.current.style.transform = 'translateY(0)';
        headerRef.current.style.opacity = '1';
      }
      lastScrollY = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const modalScrollRef = useRef(null);
  const tafsirScrollRef = useRef(null);
  const searchInputContainerRef = useRef(null);

  const [centerPos, setCenterPos] = useState({ x: 0, y: 0 });
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [loadingMessage, setLoadingMessage] = useState('Deep Search');
  const [showUpdates, setShowUpdates] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const storedHistory = localStorage.getItem('kisa_history');
    if (storedHistory) {
      try { setAppHistory(JSON.parse(storedHistory)); } catch (e) { }
    }
  }, []);

  const saveToHistory = (newItem) => {
    setAppHistory(prev => {
      const filtered = prev.filter(item => {
        if (newItem.type === 'search' && item.type === 'search') return item.query !== newItem.query;
        if (newItem.type === 'quran' && item.type === 'quran') return item.surahId !== newItem.surahId;
        return true;
      });
      const updated = [newItem, ...filtered].slice(0, 30);
      localStorage.setItem('kisa_history', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchInputContainerRef.current && !searchInputContainerRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchInputContainerRef]);

  const handleModalScroll = (e) => {
    const el = e.currentTarget;
    el.style.setProperty('--thumb-bg', theme === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(15, 23, 42, 0.4)');
    setTimeout(() => el.style.setProperty('--thumb-bg', 'transparent'), 800);
  };

  useEffect(() => {
    document.title = "Kisa";
    theme === 'dark' ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    if (!loading) return; let timeouts = [];
    if (searchMode === 'concept') {
      setLoadingMessage('Embedding query...');
      timeouts.push(setTimeout(() => setLoadingMessage('Waking up Cloud AI & Translating (if Arabic)... ⏳'), 3000));
      timeouts.push(setTimeout(() => setLoadingMessage('Retrieving narrations...'), 16000));
      timeouts.push(setTimeout(() => setLoadingMessage('Generating conceptual themes...'), 23000));
      timeouts.push(setTimeout(() => setLoadingMessage('Finalizing UI...'), 29000));
    } else {
      setLoadingMessage('Scanning Records...');
      timeouts.push(setTimeout(() => setLoadingMessage('Retrieving exact matches...'), 2000));
      timeouts.push(setTimeout(() => setLoadingMessage('Formatting results...'), 5000));
    }
    return () => timeouts.forEach(clearTimeout);
  }, [loading, searchMode]);

  useEffect(() => { setCurrentPage(1); setLengthFilter('All'); if (modalScrollRef.current) modalScrollRef.current.scrollTop = 0; }, [activeCluster]);

  useEffect(() => {
    let lastWidth = window.innerWidth;
    const updateDimensions = () => {
      // SCROLL FIX: Only update state if screen WIDTH changes. 
      // Ignores Safari URL bar collapsing to prevent momentum-killing re-renders.
      if (window.innerWidth !== lastWidth) {
        setWindowWidth(window.innerWidth);
        if (window.innerWidth < 800 && viewMode === 'map') setViewMode('list');
        lastWidth = window.innerWidth;
      }
      if (containerRef.current && activeTab === 'search') {
        setCenterPos({ x: containerRef.current.clientWidth / 2, y: containerRef.current.clientHeight / 2 });
      }
    };
    updateDimensions(); window.addEventListener('resize', updateDimensions); return () => window.removeEventListener('resize', updateDimensions);
  }, [data, viewMode, activeTab]);

  const executeSearch = async (searchQuery, currentMode, currentSource, queryVector = null, excludeId = null, apiQuery = null, anchorObj = null) => {
    if (!searchQuery.trim()) return;
    const currentSearchId = ++searchIdRef.current;

    const textToEmbed = apiQuery || searchQuery;

    saveToHistory({
      type: 'search',
      query: searchQuery,
      mode: currentMode,
      source: currentSource,
      timestamp: Date.now(),
      queryVector: queryVector,
      excludeId: excludeId,
      apiQuery: apiQuery,
      anchorHadith: anchorObj
    });

    setShowSearchDropdown(false);
    window.history.replaceState({}, '', window.location.pathname);

    setLoading(true);
    setData(null);
    setActiveCluster(null);

    try {
      const payload = { query: textToEmbed, source: currentSource, searchMode: currentMode };
      if (queryVector && queryVector.length > 0) payload.queryVector = queryVector;
      if (excludeId) payload.excludeId = String(excludeId);

      const response = await fetch('https://concept-atlas-backend.onrender.com/api/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (searchIdRef.current !== currentSearchId) return;

      if (result.clusters && result.clusters.length > 0) {
        setData(result);
        if (currentMode === 'keyword') {
          setViewMode('list');
        } else if (window.innerWidth >= 800) {
          setViewMode('map');
        }
      }
      else setData(null);
    } catch (err) { console.error(err); }
    finally { if (searchIdRef.current === currentSearchId) { setLoading(false); } }
  };

  const handleFindSimilar = (item) => {
    let displayNum = item.hadith_number;
    if (displayNum === "Unknown" || !displayNum || displayNum === "") {
      const engMatch = String(item.english_text || "").match(/^[\s"'‘“\[\(]*(?:Unknown[\.\s]*)?(\d+)[\.\-:]?\s/i);
      if (engMatch) displayNum = engMatch[1];
    }
    if (displayNum === "Unknown" || !displayNum || displayNum === "") {
      const araMatch = String(item.arabic_text || "").match(/^[\s"'‘“\[\(]*(\d+)[ـ\.\-\s]/);
      if (araMatch) displayNum = araMatch[1];
    }

    const safeId = String(item.id || Math.random());
    const finalNum = displayNum && displayNum !== "Unknown" ? displayNum : safeId.substring(0, 6);

    const fullRef = `Book: ${item.book}, Vol: ${item.volume}, ${item.sub_book}, Chapter: ${item.chapter}${finalNum !== safeId.substring(0, 6) ? `, Hadith: ${finalNum}` : ''}`;
    const simQuery = `Similar to: ${fullRef}`;

    const anchorWithRef = { ...item, full_reference: fullRef, hadith_number: finalNum };

    setAnchorHadith(anchorWithRef);
    setShowAnchor(false);
    setShowAnchorModal(false);
    setQuery(simQuery);

    setActiveTab('search');
    setSearchMode('concept');

    if (item.vector && Array.isArray(item.vector) && item.vector.length > 0) {
      executeSearch(simQuery, 'concept', sourceFilter, item.vector, safeId, null, anchorWithRef);
    } else {
      const fallbackText = String(item.english_text || item.arabic_text || "Twelver theology").replace(/\n/g, ' ').substring(0, 300).trim();
      executeSearch(simQuery, 'concept', sourceFilter, null, safeId, fallbackText, anchorWithRef);
    }

    setActiveCluster(null);
    setTafsirData(null);
    setTafsirTarget(null);
  };

  const handleTafsirClick = async (surah, ayah) => {
    setTafsirTarget({ surah, ayah });
    setTafsirLoading(true);
    setTafsirData(null);
    try {
      const queryStr = `(${surah}:${ayah})`;
      const response = await fetch('https://concept-atlas-backend.onrender.com/api/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ query: queryStr, source: "All Twelver Sources", searchMode: "keyword" })
      });
      const result = await response.json();
      if (result.clusters && result.clusters.length > 0) { setTafsirData(result); }
      else { setTafsirData({ empty: true }); }
    } catch (err) { console.error(err); setTafsirData({ empty: true }); }
    finally { setTafsirLoading(false); }
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (document.activeElement instanceof HTMLElement) { document.activeElement.blur(); }
    setAnchorHadith(null);
    setShowAnchorModal(false);
    executeSearch(query, searchMode, sourceFilter, null, null, null, null);
  };

  const handleHomeClick = () => {
    searchIdRef.current++;
    setData(null);
    setQuery('');
    setAnchorHadith(null);
    setShowAnchorModal(false);
    setActiveCluster(null);
    setHoveredCluster(null);
    setActiveTab('search');
    setLoading(false);
    window.history.replaceState({}, '', window.location.pathname);
  };

  const handleHistoryClick = (item) => {
    setShowSearchDropdown(false);
    setShowHistoryDrawer(false);
    if (item.type === 'search') {
      setActiveTab('search');
      setQuery(item.query);
      setSearchMode(item.mode);
      setSourceFilter(item.source);
      setAnchorHadith(item.anchorHadith || null);
      setShowAnchorModal(false);
      executeSearch(item.query, item.mode, item.source, item.queryVector, item.excludeId, item.apiQuery, item.anchorHadith);
    } else if (item.type === 'quran') {
      setActiveTab('quran');
      setQuranTarget(item.surahId);
    }
  };

  const handleCopyHadith = (item) => {
    let formattedText = `Book ${item.book}, Volume ${item.volume}, ${item.sub_book}, Chapter: ${item.chapter}, Hadith ${item.hadith_number}\n\n${item.arabic_text}\n\n${item.english_text}`;
    const regex = /\((\d+):(\d+)\)/g; const matches = [...(item.english_text || "").matchAll(regex)]; const uniqueVerses = new Set();
    matches.forEach(m => uniqueVerses.add(`${m[1]}:${m[2]}`));
    if (uniqueVerses.size > 0) {
      formattedText += `\n\n--- Quranic References ---\n`;
      uniqueVerses.forEach(key => { if (quranData && quranData[key]) formattedText += `\n[Surah ${quranData[key].surahName} - ${key}]\n${quranData[key].ar}\n${quranData[key].en}\n`; });
    }
    formattedText = formattedText.trim() + `\n\n— Via Kisa\n${window.location.href}`;
    navigator.clipboard.writeText(formattedText).then(() => console.log("Copied!")).catch(err => console.error(err));
  };

  const handleVerseClick = (surah, ayah) => { const key = `${surah}:${ayah}`; if (quranData && quranData[key]) setQuranPopup({ surah, ayah, data: quranData[key] }); };

  const getRadialPosition = (index, total, rx, ry) => {
    const angle = (index * (360 / total) - 90) * (Math.PI / 180);
    return { x: Math.cos(angle) * rx, y: Math.sin(angle) * ry };
  };

  const uniqueBooks = data && data.clusters ? Array.from(new Set(data.clusters.flatMap(c => c.items ? c.items.map(item => item.book) : []))) : [];
  const isKeyword = searchMode === 'keyword';

  const appBgClass = activeTab === 'quran' ? (theme === 'dark' ? 'bg-[#121212] text-slate-100' : 'bg-[#f4ecd8] text-slate-900') :
    (activeTab === 'library' ? (theme === 'dark' ? 'bg-[#1c1c1e] text-zinc-100' : 'bg-[#f4f4f5] text-zinc-900') :
      (theme === 'dark' ? (isKeyword && activeTab === 'search' ? 'bg-slate-900 text-slate-100' : 'aurora-bg text-slate-100') : (isKeyword && activeTab === 'search' ? 'bg-slate-50 text-slate-900' : 'light-aurora-bg text-slate-900')));
  const isMapView = activeTab === 'search' && data && viewMode === 'map' && !loading;
  const lockMainScreen = isMapView;

  return (
    <div className={`min-h-screen w-full transition-colors duration-700 flex flex-col ${lockMainScreen ? 'overflow-hidden h-screen' : ''} ${appBgClass}`} style={{ WebkitOverflowScrolling: 'touch' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Amiri:wght@400;700&family=Scheherazade+New:wght@400;700&family=Noto+Naskh+Arabic:wght@400;700&display=swap');
        
        @font-face {
          font-family: 'XBZarFont';
          src: url('https://cdn.jsdelivr.net/gh/rastikerdar/xb-zar@v1.1.1/fonts/woff2/XBZar.woff2') format('woff2');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }

        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; -webkit-overflow-scrolling: touch; overscroll-behavior-y: contain; }
        .smart-scrollbar { --thumb-bg: transparent; scrollbar-width: thin; scrollbar-color: var(--thumb-bg) transparent; -webkit-overflow-scrolling: touch; overscroll-behavior-y: contain; }
        .smart-scrollbar::-webkit-scrollbar { width: 8px; }
        .smart-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .smart-scrollbar::-webkit-scrollbar-thumb { background-color: var(--thumb-bg); border-radius: 10px; }
        .smart-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(100, 116, 139, 0.8) !important; }
        .dark .smart-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(203, 213, 225, 0.8) !important; }
      `}</style>

      {showMobileMenu && <div className="fixed inset-0 z-[70] pointer-events-auto" onClick={() => setShowMobileMenu(false)} />}

      <header ref={headerRef} className="fixed top-0 w-full z-[75] p-4 sm:p-6 flex justify-between items-center pointer-events-none transition-all duration-500 ease-in-out">
        <div onClick={handleHomeClick} className="flex items-center gap-3 pointer-events-auto cursor-pointer group">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 group-hover:scale-105 ${activeTab === 'quran' ? 'bg-amber-500/10 border border-amber-500/20' : (activeTab === 'library' ? 'bg-[#c6a87c]/10 border border-[#c6a87c]/20' : (isKeyword ? 'bg-blue-500/10 border border-blue-500/20 shadow-sm' : 'bg-indigo-500/10 border border-indigo-500/20'))}`}>
            <KisaLogo className={`w-5 h-5 ${activeTab === 'library' ? 'text-[#c6a87c]' : 'text-amber-600 dark:text-amber-500'}`} />
          </div>
          <div>
            <h1 className="font-sans font-bold text-lg sm:text-xl tracking-tight hidden sm:block group-hover:opacity-80 transition-opacity">Kisa</h1>
            <div className="flex items-center gap-2 sm:mt-0.5">
              <p className="font-sans text-[10px] sm:text-xs opacity-60 hidden sm:block">{activeTab === 'quran' ? 'Quran Reader' : (activeTab === 'library' ? 'Digital Archive' : (isKeyword ? 'Database Index' : 'Semantic Explorer'))}</p>
              <span className="hidden sm:block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
              <button onClick={(e) => { e.stopPropagation(); setShowUpdates(true); }} className={`hidden sm:flex pointer-events-auto text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer items-center gap-1 px-1.5 py-0.5 rounded-md ${activeTab === 'library' ? 'text-[#c6a87c] bg-[#c6a87c]/10 hover:text-[#d4b78f]' : (activeTab === 'search' && isKeyword ? 'text-blue-500 bg-blue-500/10 hover:text-blue-600' : 'text-indigo-500 bg-indigo-500/10 hover:text-indigo-600')}`}>
                <Sparkles className="w-3 h-3" />What's New
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 relative z-[75] pointer-events-auto">
          <div className={`flex items-center rounded-full p-1 mr-1 sm:mr-2 ${(activeTab === 'quran' || activeTab === 'library') ? 'bg-white/40 dark:bg-[#252528]/80 backdrop-blur-md shadow-sm border border-slate-300/30 dark:border-zinc-700/50' : 'glass-panel border-white/20'}`}>
            <button onClick={() => setActiveTab('search')} className={`p-2 rounded-full transition-all duration-300 cursor-pointer ${activeTab === 'search' ? 'bg-indigo-500/20 text-indigo-500 dark:text-indigo-400' : `text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 ${activeTab === 'library' ? 'hover:text-[#c6a87c] dark:hover:text-[#d4b78f]' : ''}`}`} title="Search Engine"><Search className="w-4 h-4" /></button>
            <button onClick={() => setActiveTab('quran')} className={`p-2 rounded-full transition-all duration-300 cursor-pointer ${activeTab === 'quran' ? 'bg-amber-600/20 text-amber-800 dark:text-amber-500' : `text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 ${activeTab === 'library' ? 'hover:text-[#c6a87c] dark:hover:text-[#d4b78f]' : ''}`}`} title="Quran Reader"><BookOpen className="w-4 h-4" /></button>
            <button onClick={() => setActiveTab('library')} className={`p-2 rounded-full transition-all duration-300 cursor-pointer ${activeTab === 'library' ? 'bg-[#c6a87c]/20 text-[#c6a87c] dark:text-[#d4b78f]' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`} title="Transcript Library"><LibraryIcon className="w-4 h-4" /></button>
          </div>

          <div className="hidden md:flex items-center gap-2 sm:gap-4">
            {activeTab === 'search' && data && !isKeyword && (<div className="flex items-center glass-panel rounded-full p-1 border-white/20"><button onClick={() => setViewMode('map')} className={`p-2 rounded-full transition-all duration-300 cursor-pointer ${viewMode === 'map' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}><Layout className="w-4 h-4" /></button><button onClick={() => setViewMode('list')} className={`p-2 rounded-full transition-all duration-300 cursor-pointer ${viewMode === 'list' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}><List className="w-4 h-4" /></button></div>)}
            <button onClick={() => setShowHistoryDrawer(true)} className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center group transition-all duration-300 hover:scale-110 cursor-pointer"><Clock className={`w-5 h-5 text-slate-400 ${activeTab === 'library' ? 'group-hover:text-[#c6a87c]' : (activeTab === 'quran' ? 'group-hover:text-amber-500' : 'group-hover:text-indigo-500')}`} /></button>
            <button onClick={() => setShowInfo(true)} className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center group transition-all duration-300 hover:scale-110 cursor-pointer"><HelpCircle className={`w-5 h-5 text-slate-400 ${activeTab === 'library' ? 'group-hover:text-[#c6a87c]' : 'group-hover:text-indigo-500'}`} /></button>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center group transition-all duration-300 hover:scale-110 cursor-pointer">{theme === 'dark' ? <Sun className="w-5 h-5 text-slate-500 group-hover:text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-400 group-hover:text-slate-900" />}</button>
          </div>

          <div className="md:hidden flex items-center gap-1 sm:gap-2 relative">
            <button onClick={() => setShowHistoryDrawer(true)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${activeTab === 'library' ? 'bg-[#c6a87c]/10 text-[#c6a87c] border border-zinc-700/50' : (activeTab === 'quran' ? 'bg-white/40 dark:bg-slate-800/50 backdrop-blur-md shadow-sm border border-slate-300/30 dark:border-slate-700 text-slate-600 dark:text-slate-300' : 'glass-panel border-white/20 text-slate-500 dark:text-slate-400')}`}>
              <Clock className="w-5 h-5" />
            </button>
            <div className="relative">
              <button onClick={() => setShowMobileMenu(!showMobileMenu)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${activeTab === 'library' ? 'bg-[#c6a87c]/10 text-[#c6a87c] border border-zinc-700/50' : (activeTab === 'quran' ? 'bg-white/40 dark:bg-slate-800/50 backdrop-blur-md shadow-sm border border-slate-300/30 dark:border-slate-700 text-slate-600 dark:text-slate-300' : 'glass-panel border-white/20 text-slate-500 dark:text-slate-400')}`}>
                <Menu className="w-5 h-5" />
              </button>

              <AnimatePresence>
                {showMobileMenu && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`absolute right-0 top-full mt-2 w-48 rounded-xl shadow-xl p-2 flex flex-col gap-1 z-[75] ${activeTab === 'library' ? 'bg-white dark:bg-[#1c1c1e] border border-zinc-200 dark:border-zinc-800' : (activeTab === 'quran' ? 'bg-[#f4ecd8] dark:bg-[#1a1a1a] border border-slate-300 dark:border-slate-700' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800')}`}>
                    {activeTab === 'search' && data && <button onClick={() => { handleHomeClick(); setShowMobileMenu(false); }} className="w-full text-left flex items-center gap-3 p-3 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer"><Home className="w-4 h-4 shrink-0" /> Reset Search</button>}
                    {activeTab === 'search' && <button onClick={() => { navigator.clipboard.writeText(window.location.href); setCopiedLink(true); setTimeout(() => { setCopiedLink(false); setShowMobileMenu(false); }, 1000); }} className={`w-full text-left flex items-center gap-3 p-3 rounded-lg text-sm cursor-pointer ${copiedLink ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><Share2 className="w-4 h-4 shrink-0" /> Share Link</button>}
                    <button onClick={() => { setShowUpdates(true); setShowMobileMenu(false); }} className={`w-full text-left flex items-center gap-3 p-3 rounded-lg text-sm cursor-pointer ${activeTab === 'library' ? 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#2c2c2e]' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><Sparkles className="w-4 h-4 shrink-0" /> What's New</button>
                    <button onClick={() => { setShowInfo(true); setShowMobileMenu(false); }} className={`w-full text-left flex items-center gap-3 p-3 rounded-lg text-sm cursor-pointer ${activeTab === 'library' ? 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#2c2c2e]' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><HelpCircle className="w-4 h-4 shrink-0" /> Help & Guide</button>
                    <button onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); setShowMobileMenu(false); }} className={`w-full text-left flex items-center gap-3 p-3 rounded-lg text-sm cursor-pointer ${activeTab === 'library' ? 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#2c2c2e]' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{theme === 'dark' ? <Sun className={`w-4 h-4 shrink-0 ${activeTab === 'library' ? 'text-[#c6a87c]' : 'text-amber-500'}`} /> : <Moon className="w-4 h-4 shrink-0" />} Toggle Theme</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>
      </header>

      <main ref={containerRef} className={`relative w-full flex-grow flex flex-col ${lockMainScreen ? 'items-center justify-center h-screen overflow-hidden' : 'min-h-screen'}`}>

        {activeTab === 'quran' && <QuranReader activeFontFamily={activeFontFamily} fontStyle={fontStyle} setFontStyle={setFontStyle} handleSurahSelectHook={(id, name) => saveToHistory({ type: 'quran', surahId: id, surahName: name, timestamp: Date.now() })} externalSurahTarget={quranTarget} onTafsirClick={handleTafsirClick} />}

        {activeTab === 'library' && <TranscriptLibrary transcripts={transcriptData} />}

        <AnimatePresence>
          {activeTab === 'search' && !data && !loading && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }} className="z-10 flex flex-col items-center justify-center w-full max-w-2xl px-4 sm:px-6 mx-auto absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <h2 className={`font-serif text-3xl sm:text-4xl md:text-5xl font-medium mb-6 sm:mb-8 text-center leading-tight ${isKeyword ? 'text-slate-800 dark:text-slate-100' : ''}`}>Explore the Depths of <br /><span className="italic">Twelver Literature</span></h2>
              <div className="w-full relative group pointer-events-auto" ref={searchInputContainerRef}>
                <div className={`absolute inset-0 w-full h-full rounded-2xl border shadow-xl pointer-events-none z-0 transition-colors duration-700 ${isKeyword ? 'border-slate-300 dark:border-slate-700' : 'border-white/60 dark:border-white/10'}`} style={{ backgroundColor: isKeyword ? (theme === 'dark' ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.9)') : (theme === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.3)'), backdropFilter: 'blur(24px)' }}></div>

                <form onSubmit={handleSearchSubmit} className="relative z-10 flex flex-col p-2">
                  <div className={`flex items-center border-b relative ${isKeyword ? 'border-slate-300 dark:border-slate-700' : 'border-slate-200/50 dark:border-slate-700/50'}`}>
                    <input
                      type="text"
                      value={query}
                      onFocus={() => setShowSearchDropdown(true)}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={isKeyword ? "Enter an exact word or phrase..." : "Enter a phrase or concept (e.g. intellect)..."}
                      className="w-full bg-transparent appearance-none outline-none py-3 sm:py-4 pl-3 sm:pl-4 pr-14 sm:pr-16 text-base font-sans placeholder:text-slate-500 cursor-text"
                      style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}
                    />
                    <button type="submit" className={`absolute right-2 p-2 sm:p-2.5 rounded-xl transition-colors shadow-sm cursor-pointer ${isKeyword ? 'bg-blue-500/10 hover:bg-blue-50 text-blue-500 hover:text-white' : 'bg-indigo-500/10 hover:bg-indigo-500 text-indigo-500 hover:text-white'}`}><Search className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                  </div>

                  <AnimatePresence>
                    {showSearchDropdown && appHistory.length > 0 && query.trim() === '' && (
                      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className={`absolute left-0 right-0 top-full mt-2 rounded-xl shadow-2xl overflow-hidden z-50 border ${isKeyword ? 'bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-700' : 'glass-panel bg-white/95 dark:bg-slate-900/90 border-slate-200 dark:border-slate-700'}`}>
                        <div className={`px-4 py-2 text-[10px] uppercase tracking-widest font-bold border-b flex justify-between items-center ${isKeyword ? 'text-slate-500 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-800' : 'text-slate-500 bg-slate-50/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'}`}>
                          <span>Recent Activity</span>
                        </div>
                        <div className="flex flex-col">
                          {appHistory.slice(0, 5).map((item, i) => (
                            <div key={i} onClick={() => handleHistoryClick(item)} className={`px-4 py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 cursor-pointer transition-colors border-b last:border-b-0 group ${isKeyword ? 'hover:bg-blue-50/50 dark:hover:bg-blue-900/20 border-slate-100 dark:border-slate-800' : 'hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 border-slate-100 dark:border-slate-800/50'}`}>
                              <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                                {item.type === 'quran' ? <BookOpen className="w-4 h-4 text-amber-500 shrink-0" /> : (item.mode === 'keyword' ? <Database className="w-4 h-4 text-blue-500 shrink-0" /> : <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />)}
                                <span className={`font-medium truncate w-full text-sm sm:text-base transition-colors ${item.type === 'quran' ? 'text-amber-900 dark:text-amber-500 group-hover:text-amber-700 dark:group-hover:text-amber-400' : (item.mode === 'keyword' ? 'text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400' : 'text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400')}`}>
                                  {item.type === 'quran' ? `Surah ${item.surahName}` : item.query}
                                </span>
                              </div>
                              <span className="text-[10px] sm:text-xs font-mono text-slate-400 shrink-0 pl-7 sm:pl-0 opacity-70 group-hover:opacity-100 transition-opacity">{timeAgo(item.timestamp)}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="relative py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div className={`flex items-center rounded-lg p-1 border ${isKeyword ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700' : 'bg-white/30 dark:bg-slate-800/60 border-white/40 dark:border-slate-700/50'}`}>
                      <button type="button" onClick={() => { setSearchMode('concept'); setViewMode(window.innerWidth < 800 ? 'list' : 'map'); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 flex-1 sm:flex-none justify-center cursor-pointer ${!isKeyword ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}><Sparkles className="w-3.5 h-3.5" /> Concept</button>
                      <button type="button" onClick={() => { setSearchMode('keyword'); setViewMode('list'); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 flex-1 sm:flex-none justify-center cursor-pointer ${isKeyword ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}><Database className="w-3.5 h-3.5" /> Keyword</button>
                    </div>
                    <div className="flex items-center w-full sm:w-auto">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mr-3 hidden sm:flex"><BookOpen className="w-4 h-4" /><span className="text-xs uppercase tracking-wider font-semibold">Source:</span></div>
                      <button type="button" onClick={() => setShowDropdown(!showDropdown)} className={`flex items-center justify-between w-full sm:w-[220px] px-3 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium border border-transparent cursor-pointer ${isKeyword ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}><span className="truncate">{sourceFilter}</span><ChevronDown className="w-4 h-4 opacity-50 shrink-0 ml-2" /></button>
                      <AnimatePresence>
                        {showDropdown && (
                          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className={`absolute top-[100px] sm:top-14 right-2 sm:right-0 w-[calc(100%-16px)] sm:w-[220px] rounded-xl border shadow-xl overflow-hidden z-50 backdrop-blur-xl ${isKeyword ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600' : 'glass-panel bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-700'}`}>
                            {SOURCES.map((source) => (
                              <div
                                key={source}
                                onClick={() => { setSourceFilter(source); setShowDropdown(false); }}
                                className={`px-4 py-3 text-sm cursor-pointer transition-colors ${sourceFilter === source ? (isKeyword ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400') : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                              >
                                {source}
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activeTab === 'search' && loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, filter: "blur(10px)" }} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-0 h-0 flex items-center justify-center z-[100] pointer-events-none">
              <div className="flex flex-col items-center justify-center w-[300px]">
                <div className="relative flex items-center justify-center">
                  {!isKeyword ? (
                    <>
                      <motion.div className="w-32 h-32 rounded-full absolute bg-[var(--color-cluster-emerald)]/30 blur-2xl" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
                      <motion.div className="w-24 h-24 rounded-full absolute bg-[var(--color-cluster-amethyst)]/30 blur-xl" animate={{ scale: [1.2, 0.8, 1.2], rotate: 180 }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
                      <div className="w-16 h-16 rounded-full glass-panel flex items-center justify-center border-white/40 shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                        <KisaLogo className="w-8 h-8 animate-pulse text-amber-500" />
                      </div>
                    </>
                  ) : (
                    <>
                      <motion.div className="w-32 h-32 rounded-full absolute bg-blue-500/20 blur-xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} />
                      <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 border border-slate-200 flex items-center justify-center shadow-lg">
                        <KisaLogo className="w-8 h-8 animate-pulse text-amber-500" />
                      </div>
                    </>
                  )}
                </div>
                <motion.p className="mt-8 font-sans tracking-widest uppercase text-xs sm:text-sm font-semibold opacity-70 whitespace-nowrap text-center">
                  {loadingMessage}
                </motion.p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activeTab === 'search' && data && !loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 w-full h-full pointer-events-none">
              {viewMode === 'map' && !isKeyword && (
                <div className="absolute inset-0 w-full h-full overflow-hidden">
                  <div className="absolute top-1/2 left-1/2 w-0 h-0 flex items-center justify-center z-30 pointer-events-none">
                    <motion.div layoutId="search-node" className="flex flex-col items-center justify-center pointer-events-auto cursor-pointer" onClick={() => setActiveCluster(null)}>
                      <div className="glass-panel px-6 sm:px-8 py-3 sm:py-4 flex flex-col items-center gap-2 backdrop-blur-xl border-white/30 shadow-[0_0_50px_rgba(16,185,129,0.15)] group hover:scale-105 transition-transform mt-8">
                        {/* MAP VIEW: DYNAMIC CENTER NODE FOR ANCHORS */}
                        {anchorHadith ? (
                          <div className="flex flex-col items-center">
                            <div className="flex items-center gap-3">
                              <span className="font-serif text-xl sm:text-2xl font-medium whitespace-nowrap">Similar to</span>
                              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20 flex items-center justify-center"><span className="text-[10px] sm:text-xs font-bold">{data.total_results}</span></div>
                            </div>
                            <ChevronDown className="w-4 h-4 opacity-50 mt-1 mb-1 animate-bounce text-indigo-300" />
                            <button onClick={(e) => { e.stopPropagation(); setShowAnchorModal(true); }} className="flex items-center gap-1.5 text-[10px] sm:text-xs uppercase tracking-wider font-bold text-indigo-300 hover:text-white bg-indigo-900/40 px-4 py-1.5 rounded-full transition-colors shadow-sm border border-indigo-500/30 hover:border-indigo-400">
                              <Sparkles className="w-3 h-3" /> View Source
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="font-serif text-xl sm:text-2xl font-medium truncate max-w-[200px] sm:max-w-[280px]" title={query}>{query}</span>
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20 flex items-center justify-center"><span className="text-[10px] sm:text-xs font-bold">{data.total_results}</span></div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>

                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                    {(data.clusters || []).map((cluster, i) => {
                      const clusterCount = data.clusters ? Math.max(1, data.clusters.length) : 1;
                      const rx = Math.max(280, Math.min(centerPos.x - 150, 450));
                      const ry = Math.max(220, Math.min(centerPos.y - 140, 320));
                      const pos = getRadialPosition(i, clusterCount, rx, ry);

                      const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
                      const isActive = activeCluster === i;
                      const isHovered = hoveredCluster === i;
                      return (<motion.line key={`line-${i}`} x1={centerPos.x} y1={centerPos.y} x2={centerPos.x + pos.x} y2={centerPos.y + pos.y} stroke={color} strokeWidth={isActive ? 2 : isHovered ? 1.5 : 1} strokeOpacity={isActive ? 0.8 : isHovered ? 0.6 : 0.15} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: i * 0.2 }} className="transition-all duration-300" />);
                    })}
                  </svg>

                  {(data.clusters || []).map((cluster, i) => {
                    const clusterCount = data.clusters ? Math.max(1, data.clusters.length) : 1;
                    const itemsLength = cluster.items ? cluster.items.length : 0;

                    const rx = Math.max(280, Math.min(centerPos.x - 150, 450));
                    const ry = Math.max(220, Math.min(centerPos.y - 140, 320));
                    const pos = getRadialPosition(i, clusterCount, rx, ry);

                    const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
                    const isActive = activeCluster === i;
                    const isHovered = hoveredCluster === i;
                    const isFaded = activeCluster !== null && !isActive;

                    const isTopMatches = cluster.theme_label && cluster.theme_label.includes("Top Matches");
                    const screenScale = Math.min(1, windowWidth / 1200);
                    const baseScale = (isTopMatches ? 1.15 : 0.95) * screenScale;

                    return (
                      <div key={`cluster-wrap-${i}`} className="absolute top-1/2 left-1/2 w-0 h-0 flex items-center justify-center z-20 pointer-events-none">
                        <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: isFaded ? 0.2 : 1, x: pos.x, y: pos.y, scale: isActive ? baseScale * 1.05 : baseScale }} transition={{ type: "spring", stiffness: 60, delay: i * 0.1 }} className={`pointer-events-auto transition-all duration-300 mt-8 ${isFaded ? 'pointer-events-none grayscale' : ''}`} onMouseEnter={() => setHoveredCluster(i)} onMouseLeave={() => setHoveredCluster(null)}>

                          <div className="glass-panel flex flex-col cursor-pointer transition-all duration-300 shadow-lg relative group w-[240px] sm:w-[280px]" style={{ borderColor: isActive || isHovered ? color : (theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.6)'), boxShadow: isActive || isHovered ? `0 0 24px ${color}60` : '0 8px 32px rgba(0,0,0,0.05)' }}>
                            <div onClick={() => setActiveCluster(isActive ? null : i)} className="px-4 py-3 sm:px-5 sm:py-4 flex items-center justify-between gap-3">
                              <div className="absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300 group-hover:w-2" style={{ backgroundColor: color }} />
                              <div className="pl-2 pr-1 w-full">
                                <h3 className="font-mono font-medium text-xs sm:text-sm lg:text-base leading-snug whitespace-normal break-words">{cluster.theme_label}</h3>
                                <p className="text-[10px] sm:text-xs opacity-60 mt-1">{itemsLength} Hadiths</p>
                              </div>
                              <div className="opacity-50 group-hover:opacity-100 transition-opacity shrink-0">{isActive ? <X className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}</div>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
              )}

              {viewMode === 'list' && (
                <div className="z-30 w-full max-w-4xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-12 pointer-events-auto">
                  <div className={`p-5 sm:p-6 rounded-xl mb-6 sm:mb-8 border shadow-sm ${anchorHadith ? 'mt-10' : ''} ${isKeyword ? 'bg-white dark:bg-slate-800 border-slate-200' : 'glass-panel bg-white/40 dark:bg-slate-900/40 border-white/20'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h2 className={`font-serif text-xl sm:text-2xl md:text-3xl font-medium tracking-tight break-words whitespace-normal leading-snug ${isKeyword ? 'text-slate-800 dark:text-slate-100' : 'text-slate-900 dark:text-white'}`}>
                          {isKeyword ? 'Index Results:' : 'Search:'} <span className="italic text-indigo-400 dark:text-indigo-300">"{query}"</span>
                        </h2>
                        <div className="flex flex-wrap gap-2 mt-3">{uniqueBooks.map((bookName, idx) => (<span key={idx} className={`text-[10px] sm:text-xs uppercase tracking-wider font-bold px-2.5 py-1 rounded-md border ${isKeyword ? 'bg-blue-50 dark:bg-slate-700 text-blue-600 border-blue-200' : 'text-slate-500 bg-slate-500/10 border-slate-500/20'}`}>{bookName}</span>))}</div>
                      </div>
                      <div className={`flex gap-6 sm:border-l sm:pl-6 shrink-0 ${isKeyword ? 'border-slate-200' : 'border-slate-200 dark:border-slate-700/60'}`}>{!isKeyword && (<div><p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-1">Themes</p><p className="font-mono text-xl text-indigo-500 dark:text-indigo-400">{data.clusters ? data.clusters.length : 0}</p></div>)}<div><p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-1">{isKeyword ? 'Matches' : 'Hadiths'}</p><p className={`font-mono text-xl ${isKeyword ? 'text-blue-500' : 'text-emerald-500'}`}>{data.total_results}</p></div></div>
                    </div>

                    {/* LIST VIEW: EMBEDDED ANCHOR ACCORDION */}
                    {anchorHadith && (
                      <div className={`mt-5 pt-4 border-t ${isKeyword ? 'border-slate-200 dark:border-slate-700' : 'border-slate-200/50 dark:border-slate-700/50'}`}>
                        <div className="flex items-center justify-between cursor-pointer group" onClick={() => setShowAnchor(!showAnchor)}>
                          <div className="flex items-center gap-2">
                            <Sparkles className={`w-4 h-4 shrink-0 ${isKeyword ? 'text-blue-500' : 'text-indigo-500'}`} />
                            <span className={`text-xs sm:text-sm font-bold tracking-widest uppercase transition-colors break-words ${isKeyword ? 'text-blue-600 dark:text-blue-400 group-hover:text-blue-500' : 'text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-500'}`}>
                              View Anchored Source
                            </span>
                          </div>
                          <div className={`p-1.5 shrink-0 rounded-full transition-colors ${isKeyword ? 'bg-blue-50 text-blue-500 group-hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-indigo-50 text-indigo-500 group-hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
                            {showAnchor ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                        <AnimatePresence>
                          {showAnchor && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className={`pt-4 pb-2 text-sm sm:text-base font-serif leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                {anchorHadith.english_text}
                              </div>

                              {/* ANCHOR LIST VIEW: COPY BUTTON */}
                              <div className="mt-3 flex justify-end">
                                <button onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyHadith(anchorHadith);
                                  setAnchorCopied(true);
                                  setTimeout(() => setAnchorCopied(false), 2000);
                                }} className={`flex items-center gap-2 text-xs font-mono transition-colors px-3 py-1.5 rounded-md cursor-pointer ${anchorCopied ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : (isKeyword ? 'text-slate-500 hover:text-blue-500 hover:bg-slate-200/50 dark:hover:bg-slate-700/50' : 'text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700/50')}`}>
                                  {anchorCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}<span>{anchorCopied ? 'Copied!' : 'Copy Text'}</span>
                                </button>
                              </div>

                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                  <div className={`flex flex-col border-t ${isKeyword ? 'border-slate-200 dark:border-slate-700' : 'border-slate-200 dark:border-slate-800'}`}>
                    {(data.clusters || []).map((cluster, i) => {
                      const itemsLength = cluster.items ? cluster.items.length : 0;
                      return (
                        <motion.div key={`list-item-${i}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} onClick={() => setActiveCluster(i)} className={`group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 cursor-pointer border-b transition-all duration-300 ${isKeyword ? 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800' : 'border-slate-200 dark:border-slate-800 hover:bg-white/40 dark:hover:bg-slate-800/40'}`}>
                          <div className="flex items-start sm:items-center gap-4 sm:gap-6 flex-grow pr-8 sm:pr-0"><span className={`font-mono text-sm sm:text-base font-medium pt-0.5 sm:pt-0 ${isKeyword ? 'text-blue-400/60 group-hover:text-blue-500' : 'text-slate-400 group-hover:text-indigo-500'}`}>0{i + 1}</span><div><h3 className={`font-mono text-base sm:text-lg lg:text-xl font-medium tracking-tight transition-colors ${isKeyword ? 'text-slate-700 dark:text-slate-200 group-hover:text-blue-600' : 'text-slate-800 dark:text-slate-100 group-hover:text-indigo-600'}`}>{cluster.theme_label}</h3><div className="flex items-center gap-3 sm:gap-4 mt-1.5 sm:mt-2"><span className="font-mono text-[10px] sm:text-xs lg:text-sm text-slate-500">[{itemsLength} {isKeyword ? 'entries' : 'narrations'}]</span></div></div></div>
                          <div className="absolute right-4 sm:relative sm:right-0 sm:opacity-0 group-hover:opacity-100 transform sm:translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300 self-center"><ChevronRight className={`w-5 h-5 ${isKeyword ? 'text-blue-500' : 'text-indigo-500'}`} /></div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )}

              <AnimatePresence>
                {activeCluster !== null && data.clusters && data.clusters[activeCluster] && (() => {
                  const clusterItems = data.clusters[activeCluster].items || [];
                  const filteredItems = clusterItems.filter(item => { if (lengthFilter === 'All') return true; const len = String(item.english_text || '').length; if (lengthFilter === 'Short') return len < 300; if (lengthFilter === 'Medium') return len >= 300 && len <= 1000; if (lengthFilter === 'Long') return len > 1000; return true; });
                  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE) || 1, safeCurrentPage = Math.min(currentPage, totalPages), startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE, paginatedItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
                  return (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-auto p-4 sm:p-0">
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveCluster(null)} className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm cursor-pointer" />
                      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={`relative w-full sm:w-[90vw] max-w-[700px] h-[85vh] flex flex-col shadow-2xl rounded-2xl z-[1001] border ${isKeyword ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                        <div className={`flex justify-between items-center backdrop-blur-md pt-5 pb-4 px-4 sm:px-6 z-10 border-b rounded-t-2xl shrink-0 ${isKeyword ? 'bg-slate-50/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-700' : 'bg-slate-50/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800'}`}>
                          <h2 className={`text-lg sm:text-xl md:text-2xl font-mono font-bold tracking-tight truncate pr-4 ${isKeyword ? 'text-blue-600 dark:text-blue-400' : 'text-indigo-600 dark:text-indigo-400'}`}>{data.clusters[activeCluster].theme_label}</h2>
                          <button onClick={() => setActiveCluster(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer shrink-0"><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
                        </div>
                        <div className={`px-4 sm:px-6 py-3 border-b shrink-0 flex flex-wrap gap-2 items-center ${isKeyword ? 'bg-slate-100/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700' : 'bg-slate-200/30 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800'}`}>
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mr-1"><Filter className="w-3.5 h-3.5" /><span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Length:</span></div>
                          {['All', 'Short', 'Medium', 'Long'].map(f => (<button key={f} onClick={() => { setLengthFilter(f); setCurrentPage(1); if (modalScrollRef.current) modalScrollRef.current.scrollTop = 0; }} className={`px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors cursor-pointer ${lengthFilter === f ? (isKeyword ? 'bg-blue-500 text-white' : 'bg-indigo-500 text-white') : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>{f}</button>))}
                          <span className="ml-auto text-[10px] sm:text-xs font-mono text-slate-400">{filteredItems.length} matches</span>
                        </div>
                        <div ref={modalScrollRef} onScroll={handleModalScroll} className="p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 overflow-y-auto flex-grow smart-scrollbar">
                          {filteredItems.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-slate-400 italic mt-10"><p>No {lengthFilter.toLowerCase()} hadiths found.</p></div> : paginatedItems.map((item, idx) => (<HadithCard key={idx} item={item} onVerseClick={handleVerseClick} handleCopyHadith={handleCopyHadith} searchMode={searchMode} onFindSimilar={handleFindSimilar} />))}
                          {totalPages > 1 && filteredItems.length > 0 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 sm:pt-6 border-t border-slate-200 dark:border-slate-700/50 mt-2 sm:mt-4">
                              <button onClick={() => { setCurrentPage(prev => Math.max(prev - 1, 1)); modalScrollRef.current.scrollTop = 0; }} disabled={safeCurrentPage === 1} className={`flex items-center justify-center gap-1 w-full sm:w-auto px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${safeCurrentPage === 1 ? 'opacity-30 cursor-not-allowed text-slate-500' : (isKeyword ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10' : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10')}`}><ChevronLeft className="w-5 h-5" /> Previous</button>
                              <span className="font-mono text-xs sm:text-sm text-slate-500 dark:text-slate-400">Page {safeCurrentPage} of {totalPages}</span>
                              <button onClick={() => { setCurrentPage(prev => Math.min(prev + 1, totalPages)); modalScrollRef.current.scrollTop = 0; }} disabled={safeCurrentPage === totalPages} className={`flex items-center justify-center gap-1 w-full sm:w-auto px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${safeCurrentPage === totalPages ? 'opacity-30 cursor-not-allowed text-slate-500' : (isKeyword ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10' : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10')}`}>Next <ChevronRight className="w-5 h-5" /></button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  );
                })()}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- MAP VIEW: THE ANCHOR POPUP MODAL --- */}
        <AnimatePresence>
          {showAnchorModal && anchorHadith && (
            <div className="fixed inset-0 z-[5000] flex items-center justify-center pointer-events-auto p-4 sm:p-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAnchorModal(false)} className="absolute inset-0 bg-slate-900/80 backdrop-blur-md cursor-pointer" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full sm:w-[90vw] max-w-[600px] max-h-[85vh] flex flex-col shadow-2xl rounded-2xl z-[5001] overflow-hidden">
                <div className="flex justify-between items-center bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md pt-5 pb-4 px-6 z-10 border-b border-slate-200 dark:border-slate-800 shrink-0">
                  <div>
                    <h3 className="font-mono text-sm tracking-widest uppercase text-indigo-500 font-bold mb-0.5 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Anchored Source</h3>
                    <p className="text-[10px] sm:text-xs text-slate-400 font-mono m-0 leading-relaxed pr-4">
                      {anchorHadith.full_reference || `Book: ${anchorHadith.book}, Vol: ${anchorHadith.volume}, ${anchorHadith.sub_book}, Chapter: ${anchorHadith.chapter}`}
                    </p>
                  </div>
                  <button onClick={() => setShowAnchorModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer shrink-0 self-start"><X className="w-5 h-5 text-slate-500" /></button>
                </div>
                <div className="p-6 sm:p-8 overflow-y-auto flex-grow smart-scrollbar">
                  {anchorHadith.arabic_text && <div className="mb-6"><p className="font-arabic text-3xl sm:text-4xl text-right leading-[2.2] text-slate-800 dark:text-slate-100" dir="rtl" lang="ar" style={{ fontFamily: activeFontFamily, fontVariantLigatures: 'normal', fontFeatureSettings: '"ccmp" 1, "mark" 1, "mkmk" 1' }}>{anchorHadith.arabic_text}</p></div>}
                  <div className={anchorHadith.arabic_text ? "border-t border-slate-100 dark:border-slate-800 pt-6" : ""}><p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-serif">{anchorHadith.english_text}</p></div>

                  {/* ANCHOR MAP VIEW: COPY BUTTON */}
                  <div className="mt-6 flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={(e) => {
                      e.stopPropagation();
                      handleCopyHadith(anchorHadith);
                      setAnchorCopied(true);
                      setTimeout(() => setAnchorCopied(false), 2000);
                    }} className={`flex items-center gap-2 text-xs font-mono transition-colors px-4 py-2 rounded-md cursor-pointer ${anchorCopied ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : 'text-slate-500 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400'}`}>
                      {anchorCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}<span>{anchorCopied ? 'Copied!' : 'Copy Text'}</span>
                    </button>
                  </div>

                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* --- REVERSE QURAN TAFSIR POPUP --- */}
        <AnimatePresence>
          {(tafsirLoading || tafsirData) && tafsirTarget && (
            <div className="fixed inset-0 z-[4000] flex items-center justify-center pointer-events-auto p-4 sm:p-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setTafsirData(null); setTafsirLoading(false); setTafsirTarget(null); }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-md cursor-pointer" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-[#fbf8f1] dark:bg-slate-900 border border-slate-300 dark:border-slate-700 w-full sm:w-[90vw] max-w-[700px] h-[80vh] flex flex-col shadow-2xl rounded-2xl z-[4001] overflow-hidden">
                <div className="flex justify-between items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md pt-5 pb-4 px-6 z-10 border-b border-slate-200 dark:border-slate-800 shrink-0">
                  <div>
                    <h3 className="font-mono text-sm tracking-widest uppercase text-amber-600 dark:text-amber-500 font-bold mb-0.5 flex items-center gap-2"><LibraryBig className="w-4 h-4" /> Related Narrations</h3>
                    <p className="text-xs text-slate-500 font-mono m-0">Surah {tafsirTarget.surah}, Verse {tafsirTarget.ayah}</p>
                  </div>
                  <button onClick={() => { setTafsirData(null); setTafsirLoading(false); setTafsirTarget(null); }} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer shrink-0"><X className="w-5 h-5 text-slate-500" /></button>
                </div>
                <div ref={tafsirScrollRef} className="p-4 sm:p-6 overflow-y-auto flex-grow smart-scrollbar bg-slate-50 dark:bg-slate-900/50">
                  {tafsirLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400"><KisaLogo className="w-10 h-10 animate-pulse text-amber-500 mb-4" /><p className="text-sm font-mono uppercase tracking-widest">Scanning Database...</p></div>
                  ) : tafsirData?.empty || !tafsirData?.clusters || tafsirData.clusters.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 italic"><LibraryBig className="w-12 h-12 mb-4 opacity-20" /><p>No hadiths found in the database referencing this specific verse.</p></div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {(tafsirData.clusters || []).flatMap(c => c.items || []).map((item, idx) => (<HadithCard key={idx} item={item} searchMode="keyword" handleCopyHadith={handleCopyHadith} onFindSimilar={handleFindSimilar} />))}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {quranPopup && (
            <div className="fixed inset-0 z-[3000] flex items-center justify-center pointer-events-auto p-4 sm:p-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setQuranPopup(null)} className="absolute inset-0 bg-slate-900/80 backdrop-blur-md cursor-pointer" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full sm:w-[90vw] max-w-[600px] max-h-[85vh] flex flex-col shadow-2xl rounded-2xl z-[3001] overflow-hidden">
                <div className="flex justify-between items-center bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md pt-5 pb-4 px-6 z-10 border-b border-slate-200 dark:border-slate-800 shrink-0">
                  <div><h3 className="font-mono text-sm tracking-widest uppercase text-indigo-500 font-bold mb-0.5">Surah {quranPopup.data.surahName}</h3><p className="text-xs text-slate-400 font-mono m-0">Verse {quranPopup.ayah}</p></div>
                  <button onClick={() => setQuranPopup(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer shrink-0"><X className="w-5 h-5 text-slate-500" /></button>
                </div>
                <div className="p-6 sm:p-8 overflow-y-auto flex-grow smart-scrollbar">
                  <div className="mb-6"><p className="font-arabic text-3xl sm:text-4xl text-right leading-[2.2] text-slate-800 dark:text-slate-100" dir="rtl" lang="ar" style={{ fontFamily: activeFontFamily, fontVariantLigatures: 'normal', fontFeatureSettings: '"ccmp" 1, "mark" 1, "mkmk" 1' }}>{quranPopup.data.ar}</p></div>
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-6"><p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-serif">{quranPopup.data.en}</p></div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showHistoryDrawer && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center pointer-events-auto p-4 sm:p-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHistoryDrawer(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full sm:w-[90vw] max-w-[600px] max-h-[85vh] flex flex-col shadow-2xl rounded-2xl z-[2001]">
                <div className="flex justify-between items-center bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md pt-5 pb-4 px-5 sm:px-6 z-10 border-b border-slate-200 dark:border-slate-800 rounded-t-2xl shrink-0">
                  <h2 className="text-lg sm:text-xl font-mono font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2"><Clock className="w-5 h-5 text-indigo-500" />Study History</h2>
                  <div className="flex items-center gap-2">
                    {appHistory.length > 0 && <button onClick={() => setAppHistory([])} className="p-2 hover:bg-red-50 text-red-500 hover:text-red-600 dark:hover:bg-red-500/10 rounded-full transition-colors cursor-pointer shrink-0" title="Clear History"><Trash2 className="w-4 h-4 sm:w-5 sm:h-5" /></button>}
                    <button onClick={() => setShowHistoryDrawer(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer shrink-0"><X className="w-5 h-5" /></button>
                  </div>
                </div>
                <div className="overflow-y-auto flex-grow smart-scrollbar p-2 sm:p-4">
                  {appHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 italic"><History className="w-10 h-10 mb-4 opacity-20" /><p>Your study history is empty.</p></div>
                  ) : (
                    <div className="flex flex-col gap-1 sm:gap-2">
                      {appHistory.map((item, i) => (
                        <div key={i} onClick={() => handleHistoryClick(item)} className={`px-4 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 rounded-xl cursor-pointer transition-colors border group ${item.type === 'quran' ? 'hover:bg-amber-50 dark:hover:bg-amber-900/20 border-transparent hover:border-amber-200 dark:hover:border-amber-800/50' : (item.mode === 'keyword' ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20 border-transparent hover:border-blue-200 dark:hover:border-blue-800/50' : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border-transparent hover:border-indigo-200 dark:hover:border-indigo-800/50')}`}>
                          <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                            <div className={`p-2 sm:p-2.5 rounded-lg shrink-0 ${item.type === 'quran' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-500' : (item.mode === 'keyword' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-500' : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400')}`}>
                              {item.type === 'quran' ? <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" /> : (item.mode === 'keyword' ? <Database className="w-4 h-4 sm:w-5 sm:h-5" /> : <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />)}
                            </div>
                            <div className="flex flex-col min-w-0 flex-1 pr-2">
                              <span className={`font-semibold text-sm sm:text-base truncate w-full ${item.type === 'quran' ? 'text-amber-900 dark:text-amber-100' : 'text-slate-800 dark:text-slate-200'}`}>{item.type === 'quran' ? `Surah ${item.surahName}` : item.query}</span>
                              <span className="text-[10px] sm:text-xs text-slate-500 font-mono mt-0.5">{item.type === 'search' ? `${item.mode === 'concept' ? 'Semantic' : 'Exact Match'} • ${item.source}` : 'Quran Recitation'}</span>
                            </div>
                          </div>
                          <span className="text-[10px] sm:text-xs font-mono text-slate-400 self-end sm:self-auto shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">{timeAgo(item.timestamp)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showUpdates && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center pointer-events-auto p-4 sm:p-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowUpdates(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full sm:w-[90vw] max-w-[500px] max-h-[80vh] flex flex-col shadow-2xl rounded-2xl z-[2001]">
                <div className="flex justify-between items-center bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md pt-5 pb-4 px-5 z-10 border-b border-slate-200 dark:border-slate-800 rounded-t-2xl shrink-0"><h2 className="text-lg sm:text-xl font-mono font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2"><History className="w-5 h-5 text-indigo-500" />Updates Log</h2><button onClick={() => setShowUpdates(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer shrink-0"><X className="w-5 h-5" /></button></div>
                <div className="p-5 sm:p-6 overflow-y-auto flex-grow smart-scrollbar flex flex-col gap-6">
                  {APP_UPDATES.map((update, idx) => (
                    <div key={idx} className="relative pl-4 border-l-2 border-slate-200 dark:border-slate-700"><div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-indigo-500" /><div className="flex items-baseline justify-between mb-2"><h3 className="font-mono font-bold text-base sm:text-lg text-slate-800 dark:text-slate-200">{update.version}</h3><span className="text-[10px] sm:text-xs font-mono text-slate-400">{update.date}</span></div><ul className="flex flex-col gap-2 sm:gap-3">{update.changes.map((change, cIdx) => <li key={cIdx} className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2 leading-relaxed"><span className="text-indigo-400 mt-0.5 font-bold">•</span><span>{change}</span></li>)}</ul></div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showInfo && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center pointer-events-auto p-4 sm:p-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowInfo(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full sm:w-[90vw] max-w-[600px] max-h-[85vh] flex flex-col shadow-2xl rounded-2xl z-[2001]">
                <div className="flex justify-between items-center bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md pt-5 pb-4 px-5 z-10 border-b border-slate-200 dark:border-slate-800 rounded-t-2xl shrink-0"><h2 className="text-lg sm:text-xl font-mono font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2"><KisaLogo className="w-5 h-5 text-emerald-500" />How to Use Kisa</h2><button onClick={() => setShowInfo(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer shrink-0"><X className="w-5 h-5" /></button></div>

                {/* NEW INFO CONTENT SECTION */}
                <div className="p-5 sm:p-6 overflow-y-auto flex-grow smart-scrollbar flex flex-col gap-6 text-slate-700 dark:text-slate-300">

                  <div>
                    <h3 className="font-bold text-base sm:text-lg mb-2 text-slate-900 dark:text-white">Welcome to Kisa</h3>
                    <p className="leading-relaxed text-xs sm:text-sm">Kisa is a semantic search engine designed specifically to explore authentic Twelver Shia literature, prioritizing core texts like <i>al-Kafi</i>, <i>Bihar al-Anwar</i>, and <i>Basa'ir al-Darajat</i>. It maps verified texts mathematically so you can explore concepts without AI hallucinations.</p>
                  </div>
                  <hr className="border-slate-200 dark:border-slate-700" />

                  <div>
                    <h3 className="font-bold text-base sm:text-lg flex items-center gap-2 mb-3 text-slate-900 dark:text-white"><LibraryIcon className="w-4 h-4 text-emerald-500" /> Features</h3>

                    <div className="mb-4">
                      <h4 className="font-semibold text-sm sm:text-base flex items-center gap-1.5 mb-1"><Search className="w-3.5 h-3.5 text-indigo-500" /> Dual Search Engine</h4>
                      <ul className="flex flex-col gap-2 text-xs sm:text-sm pl-5 list-disc mb-2">
                        <li><b>Concept Mode:</b> Uses AI vector math to find underlying themes, even if exact words aren't used. Returns interactive thematic clusters.</li>
                        <li><b>Keyword Mode:</b> Strictly searches the exact English or Arabic text you type, functioning like a traditional database index.</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm sm:text-base flex items-center gap-1.5 mb-1"><LibraryBig className="w-3.5 h-3.5 text-[#c6a87c]" /> Digital Archive (Transcript Library)</h4>
                      <p className="leading-relaxed text-xs sm:text-sm mb-2">Read meticulously structured and translated transcripts of foundational scholarly series (e.g., The File of Fatima). Features a premium editorial UI with automatic section summaries, bold emphasis, and a persistent reading state.</p>
                    </div>
                  </div>
                  <hr className="border-slate-200 dark:border-slate-700" />

                  <div>
                    <h3 className="font-bold text-base sm:text-lg flex items-center gap-2 mb-3 text-slate-900 dark:text-white"><Sparkles className="w-4 h-4 text-amber-500" /> Advanced Features</h3>
                    <ul className="flex flex-col gap-4 text-xs sm:text-sm leading-relaxed">
                      <li>
                        <b className="text-slate-900 dark:text-slate-200 flex items-center gap-1.5 mb-0.5"><Layout className="w-3.5 h-3.5 text-indigo-400" /> Dynamic Concept Map</b>
                        Concept searches generate a beautiful, non-overlapping orbital map of themes. The "Top Matches" node is highlighted, and you can switch to a traditional List View at any time.
                      </li>
                      <li>
                        <b className="text-slate-900 dark:text-slate-200 flex items-center gap-1.5 mb-0.5"><Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Vector Hopping ("Find Similar")</b>
                        Click "Find Similar" on any hadith to use its mathematical signature to instantly discover related narrations. The original source is cleanly pinned to the top as an "Anchor" so you never lose your place.
                      </li>
                      <li>
                        <b className="text-slate-900 dark:text-slate-200 flex items-center gap-1.5 mb-0.5"><BookOpen className="w-3.5 h-3.5 text-amber-600" /> Reverse Quran Tafsir</b>
                        Read all 114 Surahs. If Kisa detects narrations referencing a specific Ayah, a "Related Hadiths" button appears. Click it to open a seamless popup of contextual narrations.
                      </li>
                    </ul>
                  </div>
                  <hr className="border-slate-200 dark:border-slate-700" />

                  <div>
                    <h3 className="font-bold text-base sm:text-lg flex items-center gap-2 mb-3 text-slate-900 dark:text-white"><Clock className="w-4 h-4 text-emerald-500" /> Workflow & Study Tools</h3>
                    <ul className="flex flex-col gap-3 text-xs sm:text-sm leading-relaxed list-disc pl-4">
                      <li><b className="text-slate-900 dark:text-slate-200">Study History & Quick Resume:</b> Click the empty search bar to instantly resume your 5 most recent searches/recitations, or click the Clock icon to open your full History drawer.</li>
                      <li><b className="text-slate-900 dark:text-slate-200">Source Filtering:</b> Use the Source dropdown to isolate searches strictly to specific books like <i>al-Kafi</i>.</li>
                      <li><b className="text-slate-900 dark:text-slate-200">Smart Copy:</b> Click "Copy Text" on any Hadith or Anchored Source to instantly copy the full reference, Arabic text, Chain of Narrators, English translation, and a Kisa link to your clipboard.</li>
                    </ul>
                  </div>

                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}