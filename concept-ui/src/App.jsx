import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Moon, Sun, Sparkles, X, ChevronRight, ChevronLeft, Home, Copy, ChevronDown, ChevronUp, List, Layout, Info, BookOpen, History, HelpCircle, Database, Filter, Share2, Check, Settings2, Menu } from 'lucide-react';
import quranData from './quran.json';

const APP_UPDATES = [{ version: "v2.10.0", date: "March 3, 2026", changes: ["Bug Fix: Restored the loading screen to the absolute center of the display.", "Fixed an animation clipping bug that caused an ugly square box to appear around the loading icon.", "Hard-anchored the map nodes to the center of the screen to prevent Safari from defaulting them to the top-left corner."] }, { version: "v2.9.9", date: "March 3, 2026", changes: ["Mobile Polish: Fixed the iOS auto-zoom bug by enforcing 16px minimum text size on search inputs.", "Enabled 'Enter' key submission on all search bars and automatic keyboard dismissal.", "Rebuilt the scrolling architecture so tapping the top of an iPhone screen instantly scrolls to the top of the page."] }, { version: "v2.9.6", date: "March 3, 2026", changes: ["Defeated all external CORS server blocks by locally hosting the pristine me_quran.ttf font file directly inside the app."] }];
const CLUSTER_COLORS = ['#10b981', '#8b5cf6', '#f59e0b', '#f43f5e', '#3b82f6'];
const SOURCES = ["All Twelver Sources", "al-Kafi", "Bihar al-Anwar", "Basa'ir al-Darajat"];

const HadithCard = ({ item, handleCopyHadith, searchMode, onVerseClick }) => {
  const [showArabic, setShowArabic] = useState(false);
  const [showChain, setShowChain] = useState(false);
  const [copied, setCopied] = useState(false);
  const isKeyword = searchMode === 'keyword';

  const getCleanData = () => {
    let displayNum = item.hadith_number;
    let engText = item.english_text || "";
    let araText = item.arabic_text || "";
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

  const handleCopyClick = () => {
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
        <button onClick={() => setShowArabic(!showArabic)} className={`flex items-center gap-1 text-sm font-medium transition-colors cursor-pointer ${isKeyword ? 'text-blue-500 hover:text-blue-600 dark:text-blue-400' : 'text-indigo-500 hover:text-indigo-600 dark:text-indigo-400'}`}>
          {showArabic ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />} {showArabic ? "Hide Original Arabic" : "View Original Arabic"}
        </button>
        <AnimatePresence>
          {showArabic && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className={`p-4 sm:p-5 rounded-lg mt-2 mb-4 border ${isKeyword ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800'}`}>
                <p className="font-arabic text-xl md:text-2xl text-right leading-[2.2] text-slate-700 dark:text-slate-300" dir="rtl" lang="ar" style={{ fontVariantLigatures: 'normal', fontFeatureSettings: '"ccmp" 1, "mark" 1, "mkmk" 1' }}>
                  {(displayNum && displayNum !== "Unknown") && `${displayNum}. `}{araText}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="mb-4">
        <button onClick={() => setShowChain(!showChain)} className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${isKeyword ? 'text-slate-500 hover:text-blue-500 dark:text-blue-400' : 'text-slate-400 hover:text-indigo-500 dark:text-indigo-400'}`}>
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
      <div className="mt-2 flex justify-end pt-4 border-t border-slate-50 dark:border-slate-700/50">
        <button onClick={handleCopyClick} className={`flex items-center gap-2 text-xs font-mono transition-colors px-3 py-1.5 rounded-md cursor-pointer ${copied ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : (isKeyword ? 'text-slate-500 hover:text-blue-500 hover:bg-slate-200/50 dark:hover:bg-slate-700/50' : 'text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700/50')}`}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}<span>{copied ? 'Copied!' : 'Copy Text'}</span>
        </button>
      </div>
    </div>
  );
};

const toArabicNum = (n) => {
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return n.toString().split('').map(d => digits[d]).join('');
};

const QuranReader = ({ activeFontFamily, fontStyle, setFontStyle }) => {
  const [selectedSurah, setSelectedSurah] = useState(1);
  const [showTranslation, setShowTranslation] = useState(true);
  const [readingMode, setReadingMode] = useState('verse');

  const [showSurahMenu, setShowSurahMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  // Search State
  const [quranSearchQuery, setQuranSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [targetVerse, setTargetVerse] = useState(null);

  const quranSearchInputRef = useRef(null);

  // Initialize Surah List
  const surahs = useMemo(() => {
    const list = [];
    for (let i = 1; i <= 114; i++) {
      if (quranData[`${i}:1`]) {
        list.push({ id: i, enName: quranData[`${i}:1`].surahName, arName: quranData[`${i}:1`].surahArName });
      }
    }
    return list;
  }, []);

  const surahAliases = {
    1: ["fatiha", "fatihah", "hamd"],
    9: ["tawbah", "baraah", "bara'ah", "tawba"],
    17: ["isra", "bani israel", "bani israeel"],
    40: ["ghafir", "mumin", "mu'min"],
    41: ["fussilat", "ha mim sajdah"],
    47: ["muhammad", "qital"],
    76: ["insan", "dahr"],
    94: ["sharh", "inshirah"],
    111: ["masad", "lahab"]
  };

  const normalize = (str) => {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/^(surah|sura)\s+/i, '')
      .replace(/^al-/i, '')
      .replace(/[^a-z0-9]/g, '')
      .replace(/ee/g, 'i')
      .replace(/oo/g, 'u')
      .replace(/aa/g, 'a')
      .replace(/ah$/g, 'a');
  };

  const searchableSurahs = useMemo(() => {
    return surahs.map(s => {
      let terms = [normalize(s.enName)];
      if (surahAliases[s.id]) {
        terms = [...terms, ...surahAliases[s.id].map(normalize)];
      }
      return { ...s, terms };
    });
  }, [surahs]);

  const getMaxVerses = (surahId) => {
    let aIdx = 1;
    while (quranData[`${surahId}:${aIdx}`]) aIdx++;
    return aIdx - 1;
  };

  const handleSearchChange = (val) => {
    setQuranSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }

    const query = val.trim();
    const numMatch = query.match(/^(\d+)\s*:\s*(\d+)$/);
    let results = [];

    if (numMatch) {
      const sId = parseInt(numMatch[1]);
      const vId = parseInt(numMatch[2]);
      if (sId >= 1 && sId <= 114) {
        const maxV = getMaxVerses(sId);
        if (vId >= 1 && vId <= maxV) {
          results.push({ type: 'verse', surahId: sId, verseId: vId, label: `Surah ${surahs.find(s => s.id === sId)?.enName}, Verse ${vId}` });
        }
      }
    } else {
      const normQuery = normalize(query);
      searchableSurahs.forEach(s => {
        if (s.terms.some(t => t.includes(normQuery))) {
          results.push({ type: 'surah', surahId: s.id, label: `${s.id}. Surah ${s.enName}` });
        }
      });
    }
    setSearchResults(results.slice(0, 5));
  };

  const handleSelectResult = (res) => {
    setQuranSearchQuery('');
    setSearchResults([]);
    setSelectedSurah(res.surahId);

    if (res.type === 'verse') {
      setReadingMode('verse');
      setTargetVerse(res.verseId);
    } else {
      setTargetVerse(1);
    }
  };

  const handleQuranSearchSubmit = (e) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      handleSelectResult(searchResults[0]);
    }
    if (quranSearchInputRef.current) {
      quranSearchInputRef.current.blur();
    }
  };

  const ayahsRaw = []; let aIdx = 1;
  while (quranData[`${selectedSurah}:${aIdx}`]) { ayahsRaw.push(quranData[`${selectedSurah}:${aIdx}`]); aIdx++; }

  let surahBismillah = null;
  const ayahs = ayahsRaw.map((ayah, idx) => {
    let arText = ayah.ar;
    if (idx === 0 && selectedSurah !== 1 && selectedSurah !== 9) {
      const bismillahEnd = Math.max(arText.indexOf('ٱلرَّحِيمِ'), arText.indexOf('الرَّحِيمِ'), arText.indexOf('الرحيم'));
      if (bismillahEnd !== -1) {
        const splitIndex = arText.indexOf(' ', bismillahEnd);
        if (splitIndex !== -1) {
          surahBismillah = arText.substring(0, splitIndex).trim();
          arText = arText.substring(splitIndex).trim();
        }
      }
    }
    return { ...ayah, ar: arText };
  });

  useEffect(() => {
    if (targetVerse && ayahs.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`verse-${selectedSurah}-${targetVerse}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('bg-amber-500/20', 'dark:bg-amber-500/30');
          setTimeout(() => {
            el.classList.remove('bg-amber-500/20', 'dark:bg-amber-500/30');
          }, 2000);
        }
        setTargetVerse(null);
      }, 100);
    }
  }, [selectedSurah, targetVerse, readingMode, ayahs]);

  return (
    <div className="w-full max-w-4xl px-4 sm:px-6 pt-24 sm:pt-28 pb-12 mx-auto min-h-screen flex flex-col items-center pointer-events-auto">

      {(showSurahMenu || showSettingsMenu || searchResults.length > 0) && (
        <div className="fixed inset-0 z-[60] pointer-events-auto" onClick={() => { setShowSurahMenu(false); setShowSettingsMenu(false); setSearchResults([]); }} />
      )}

      {/* SMART QURAN SEARCH BAR */}
      <div className="w-full relative mb-4 sm:mb-6 z-[70]">
        <form onSubmit={handleQuranSearchSubmit} className="flex items-center bg-white/40 dark:bg-black/30 backdrop-blur-sm border border-slate-300/50 dark:border-slate-800 rounded-2xl px-4 py-3 sm:py-3.5 shadow-sm transition-all focus-within:border-amber-500/50 dark:focus-within:border-amber-500/50 focus-within:bg-white/60 dark:focus-within:bg-black/50">
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 mr-3 shrink-0" />
          <input
            ref={quranSearchInputRef}
            type="text"
            value={quranSearchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search Surah (e.g. Baqarah) or Verse (e.g. 2:255)..."
            className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-500 text-base font-medium"
          />
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
          <button
            onClick={() => { setShowSurahMenu(!showSurahMenu); setShowSettingsMenu(false); }}
            className="w-full bg-white dark:bg-[#1a1a1a] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm rounded-lg px-4 py-2.5 flex justify-between items-center transition-colors font-medium shadow-sm hover:border-amber-500 dark:hover:border-amber-500 cursor-pointer"
          >
            <span className="truncate">{selectedSurah}. Surah {surahs.find(s => s.id === selectedSurah)?.enName}</span>
            <ChevronDown className="w-4 h-4 opacity-50" />
          </button>

          <AnimatePresence>
            {showSurahMenu && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full left-0 mt-2 w-full max-h-[300px] overflow-y-auto bg-[#f4ecd8] dark:bg-[#1a1a1a] border border-slate-300 dark:border-slate-700 rounded-xl shadow-xl z-[70] smart-scrollbar">
                {surahs.map(s => (
                  <div
                    key={s.id}
                    onClick={() => { setSelectedSurah(s.id); setShowSurahMenu(false); }}
                    className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex justify-between items-center ${selectedSurah === s.id ? 'bg-amber-200/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-500 font-bold' : 'text-slate-800 dark:text-slate-200 hover:bg-amber-200/40 dark:hover:bg-amber-600/20 hover:text-amber-900 dark:hover:text-amber-400'}`}
                  >
                    <span>{s.id}. Surah {s.enName}</span>
                    <span className="font-arabic text-base opacity-70" dir="rtl" lang="ar">{s.arName}</span>
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
            <button
              onClick={() => { setShowSettingsMenu(!showSettingsMenu); setShowSurahMenu(false); }}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border shadow-sm flex items-center gap-2 cursor-pointer ${showSettingsMenu ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 border-transparent' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <Settings2 className="w-4 h-4" /> Customise
            </button>

            <AnimatePresence>
              {showSettingsMenu && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute right-0 top-full mt-2 w-[220px] bg-[#f4ecd8] dark:bg-[#1a1a1a] border border-slate-300 dark:border-slate-700 rounded-xl shadow-xl z-[70] p-4 flex flex-col gap-4">

                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 mb-2">Quranic Font</p>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => { setFontStyle('madinah'); setShowSettingsMenu(false); }} className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors cursor-pointer ${fontStyle === 'madinah' ? 'bg-amber-200/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-500 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'}`}>Madinah</button>
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
        <h1 className="text-4xl sm:text-6xl font-arabic text-slate-900 dark:text-slate-50 pb-2 sm:pb-4 mb-4 sm:mb-5 leading-[1.5] sm:leading-[1.5] drop-shadow-sm" style={{ fontFamily: activeFontFamily, fontVariantLigatures: 'normal', fontFeatureSettings: '"ccmp" 1, "mark" 1, "mkmk" 1' }} dir="rtl" lang="ar">{surahs.find(s => s.id === selectedSurah)?.arName}</h1>
        <p className="text-amber-800 dark:text-amber-500 font-mono text-sm tracking-widest uppercase font-semibold">Surah {surahs.find(s => s.id === selectedSurah)?.enName}</p>
      </div>

      {surahBismillah && (
        <div className="text-center mb-12">
          <h2 className="font-arabic text-3xl sm:text-4xl text-slate-800 dark:text-slate-200 pb-2 leading-[1.5]" style={{ fontFamily: activeFontFamily, fontVariantLigatures: 'normal', fontFeatureSettings: '"ccmp" 1, "mark" 1, "mkmk" 1' }} dir="rtl" lang="ar">{surahBismillah}</h2>
        </div>
      )}

      {readingMode === 'flow' ? (
        <div className="w-full pb-10 max-w-4xl mx-auto px-2 sm:px-0">
          <div className="font-arabic text-3xl sm:text-4xl lg:text-[42px] text-right leading-[2.4] sm:leading-[2.6] text-slate-900 dark:text-slate-100 mb-12 text-justify" dir="rtl" lang="ar" style={{ fontFamily: activeFontFamily, fontVariantLigatures: 'normal', fontFeatureSettings: '"ccmp" 1, "mark" 1, "mkmk" 1' }}>
            {ayahs.map((ayah, idx) => (
              <span id={`verse-${selectedSurah}-${idx + 1}`} key={`ar-${idx}`} className="inline rounded-lg transition-colors duration-1000">
                {ayah.ar} <span className="text-amber-700 dark:text-amber-500 opacity-80 text-xl mx-2 font-sans">﴾{toArabicNum(idx + 1)}﴿</span>
              </span>
            ))}
          </div>
          <AnimatePresence>
            {showTranslation && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="border-t-2 border-[#d4c5b0] dark:border-[#2a2a2a] pt-8 mt-8">
                  <div className="text-lg sm:text-xl text-slate-800 dark:text-slate-300 leading-[2] sm:leading-[2.2] font-serif text-justify">
                    {ayahs.map((ayah, idx) => (<span key={`en-${idx}`} className="inline mr-3"><sup className="text-xs text-amber-700 dark:text-amber-500 font-bold mr-1 opacity-80">{idx + 1}</sup>{ayah.en}</span>))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="w-full flex flex-col pb-10">
          {ayahs.map((ayah, idx) => (
            <div id={`verse-${selectedSurah}-${idx + 1}`} key={idx} className="py-8 sm:py-10 border-b border-[#d4c5b0] dark:border-[#2a2a2a] first:pt-0 relative group flex flex-col sm:block rounded-xl transition-colors duration-1000 px-2 sm:px-4">
              <div className="mb-4 sm:mb-0 sm:absolute sm:top-12 sm:left-4">
                <span className="text-[10px] sm:text-xs font-mono font-bold text-amber-900 dark:text-amber-500 bg-[#eaddc6] dark:bg-[#1a1a1a] border border-[#d4c5b0] dark:border-[#333] px-2 py-1 rounded shadow-sm inline-block">
                  {selectedSurah}:{idx + 1}
                </span>
              </div>
              <div className="sm:pl-20">
                <p className="font-arabic text-3xl sm:text-4xl lg:text-[40px] text-right leading-[2.4] sm:leading-[2.5] text-slate-900 dark:text-slate-100 mb-6" dir="rtl" lang="ar" style={{ fontFamily: activeFontFamily, fontVariantLigatures: 'normal', fontFeatureSettings: '"ccmp" 1, "mark" 1, "mkmk" 1' }}>{ayah.ar} <span className="text-amber-700 dark:text-amber-500 opacity-80 ml-2 text-xl font-sans">﴾{toArabicNum(idx + 1)}﴿</span></p>
                <AnimatePresence>
                  {showTranslation && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="border-t border-[#d4c5b0]/50 dark:border-[#2a2a2a]/50 pt-5 mt-3"><p className="text-lg sm:text-xl text-slate-800 dark:text-slate-300 leading-relaxed font-serif">{ayah.en}</p></div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const [query, setQuery] = useState(urlParams.get('q') || '');
  const [searchMode, setSearchMode] = useState(urlParams.get('mode') || 'concept');
  const [sourceFilter, setSourceFilter] = useState(urlParams.get('source') || SOURCES[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [viewMode, setViewMode] = useState(window.innerWidth < 800 || urlParams.get('mode') === 'keyword' ? 'list' : 'map');
  const [activeCluster, setActiveCluster] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [lengthFilter, setLengthFilter] = useState('All');
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState('search');
  const [quranPopup, setQuranPopup] = useState(null);

  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const [fontStyle, setFontStyle] = useState('madinah');

  // Clean font map loading your local me_quran.ttf
  const activeFontFamily =
    fontStyle === 'madinah' ? '"MadinahFont", Arial, sans-serif' :
      fontStyle === 'uthmani' ? '"Amiri Quran", "Amiri", serif' :
        '"XBZarFont", Arial, sans-serif';

  const containerRef = useRef(null);
  const modalScrollRef = useRef(null);
  const [centerPos, setCenterPos] = useState({ x: 0, y: 0 });
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [loadingMessage, setLoadingMessage] = useState('Deep Search');
  const [showUpdates, setShowUpdates] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const handleModalScroll = (e) => {
    const el = e.currentTarget;
    el.style.setProperty('--thumb-bg', theme === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(15, 23, 42, 0.4)');
    setTimeout(() => el.style.setProperty('--thumb-bg', 'transparent'), 800);
  };

  useEffect(() => { theme === 'dark' ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark'); }, [theme]);
  useEffect(() => { const initialQ = urlParams.get('q'); if (initialQ && !data && !loading && activeTab === 'search') executeSearch(initialQ, searchMode, sourceFilter); }, []);
  useEffect(() => {
    if (!loading) return; let timeouts = [];
    if (searchMode === 'concept') {
      setLoadingMessage('Embedding query...');
      timeouts.push(setTimeout(() => setLoadingMessage('Waking up Cloud AI & Embedding query... ⏳'), 3000));
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
    const updateDimensions = () => {
      setWindowWidth(window.innerWidth);
      if (containerRef.current) setCenterPos({ x: containerRef.current.clientWidth / 2, y: containerRef.current.clientHeight / 2 });
      if (window.innerWidth < 800 && viewMode === 'map') setViewMode('list');
    };
    updateDimensions(); window.addEventListener('resize', updateDimensions); return () => window.removeEventListener('resize', updateDimensions);
  }, [data, viewMode, activeTab]);

  const executeSearch = async (searchQuery, currentMode, currentSource) => {
    if (!searchQuery.trim()) return;
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('q', searchQuery); newUrl.searchParams.set('mode', currentMode); newUrl.searchParams.set('source', currentSource);
    window.history.pushState({}, '', newUrl);
    setLoading(true);
    try {
      const response = await fetch('https://concept-atlas-backend.onrender.com/api/explore', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ query: searchQuery, source: currentSource, searchMode: currentMode }) });
      const result = await response.json();
      if (result.clusters && result.clusters.length > 0) { setData(result); if (currentMode === 'keyword') setViewMode('list'); }
      else setData(null);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    executeSearch(query, searchMode, sourceFilter);
  };

  const handleCopyHadith = (item) => {
    let formattedText = `Book ${item.book}, Volume ${item.volume}, ${item.sub_book}, Chapter: ${item.chapter}, Hadith ${item.hadith_number}\n\n${item.arabic_text}\n\n${item.english_text}`;
    const regex = /\((\d+):(\d+)\)/g; const matches = [...(item.english_text || "").matchAll(regex)]; const uniqueVerses = new Set();
    matches.forEach(m => uniqueVerses.add(`${m[1]}:${m[2]}`));
    if (uniqueVerses.size > 0) {
      formattedText += `\n\n--- Quranic References ---\n`;
      uniqueVerses.forEach(key => { if (quranData && quranData[key]) formattedText += `\n[Surah ${quranData[key].surahName} - ${key}]\n${quranData[key].ar}\n${quranData[key].en}\n`; });
    }
    formattedText += `\n— Via Concept Atlas\n${window.location.href}`;
    navigator.clipboard.writeText(formattedText).then(() => console.log("Copied!")).catch(err => console.error(err));
  };

  const handleVerseClick = (surah, ayah) => { const key = `${surah}:${ayah}`; if (quranData && quranData[key]) setQuranPopup({ surah, ayah, data: quranData[key] }); };

  const getRadialPosition = (index, total, rx, ry) => {
    const angle = (index * (360 / total) - 90) * (Math.PI / 180);
    const pullIn = (total > 4 && index % 2 !== 0) ? 0.55 : 1;
    return { x: Math.cos(angle) * (rx * pullIn), y: Math.sin(angle) * (ry * pullIn) };
  };

  const uniqueBooks = data ? Array.from(new Set(data.clusters.flatMap(c => c.items.map(item => item.book)))) : [];
  const isKeyword = searchMode === 'keyword';

  const appBgClass = activeTab === 'quran' ? (theme === 'dark' ? 'bg-[#121212] text-slate-100' : 'bg-[#f4ecd8] text-slate-900') : (theme === 'dark' ? (isKeyword && activeTab === 'search' ? 'bg-slate-900 text-slate-100' : 'aurora-bg text-slate-100') : (isKeyword && activeTab === 'search' ? 'bg-slate-50 text-slate-900' : 'light-aurora-bg text-slate-900'));

  const isMapView = activeTab === 'search' && data && viewMode === 'map' && !loading;
  const lockMainScreen = isMapView; // Only lock scroll if map is actively displayed

  return (
    <div className={`min-h-screen w-full transition-colors duration-700 flex flex-col ${lockMainScreen ? 'overflow-hidden h-screen' : 'overflow-x-hidden'} ${appBgClass}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri+Quran&display=swap');
        
        @font-face {
          font-family: 'MadinahFont';
          src: url('/me_quran.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }

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

      <header className="fixed top-0 w-full z-[75] p-4 sm:p-6 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeTab === 'search' && isKeyword ? 'bg-blue-500/10 border border-blue-500/20 shadow-sm' : 'glass-panel border-slate-400/20'}`}>
            {activeTab === 'quran' ? <BookOpen className="w-5 h-5 text-amber-700 dark:text-amber-500" /> : (isKeyword ? <Database className="w-5 h-5 text-blue-500" /> : <Sparkles className="w-5 h-5 text-[var(--color-cluster-emerald)]" />)}
          </div>
          <div>
            <h1 className="font-sans font-bold text-lg sm:text-xl tracking-tight hidden sm:block">Concept Atlas</h1>
            <div className="flex items-center gap-2 sm:mt-0.5"><p className="font-sans text-[10px] sm:text-xs opacity-60 hidden sm:block">{activeTab === 'quran' ? 'Quran Reader' : (isKeyword ? 'Database Index' : 'Semantic Explorer')}</p><span className="hidden sm:block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span><button onClick={() => setShowUpdates(true)} className={`hidden sm:flex pointer-events-auto text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer items-center gap-1 px-1.5 py-0.5 rounded-md ${activeTab === 'search' && isKeyword ? 'text-blue-500 bg-blue-500/10 hover:text-blue-600' : 'text-indigo-500 bg-indigo-500/10 hover:text-indigo-600'}`}><Sparkles className="w-3 h-3" />What's New</button></div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 relative z-[75] pointer-events-auto">

          <div className={`flex items-center rounded-full p-1 mr-2 ${activeTab === 'quran' ? 'bg-white/40 dark:bg-slate-800/50 backdrop-blur-md shadow-sm border border-slate-300/30 dark:border-slate-700' : 'glass-panel border-white/20'}`}>
            <button onClick={() => setActiveTab('search')} className={`p-2 rounded-full transition-all duration-300 cursor-pointer ${activeTab === 'search' ? 'bg-indigo-500/20 text-indigo-500 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`} title="Search Engine"><Search className="w-4 h-4" /></button>
            <button onClick={() => setActiveTab('quran')} className={`p-2 rounded-full transition-all duration-300 cursor-pointer ${activeTab === 'quran' ? 'bg-amber-600/20 text-amber-800 dark:text-amber-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`} title="Quran Reader"><BookOpen className="w-4 h-4" /></button>
          </div>

          <div className="hidden md:flex items-center gap-2 sm:gap-4">
            {activeTab === 'search' && data && !isKeyword && (<div className="flex items-center glass-panel rounded-full p-1 border-white/20"><button onClick={() => setViewMode('map')} className={`p-2 rounded-full transition-all duration-300 cursor-pointer ${viewMode === 'map' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}><Layout className="w-4 h-4" /></button><button onClick={() => setViewMode('list')} className={`p-2 rounded-full transition-all duration-300 cursor-pointer ${viewMode === 'list' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}><List className="w-4 h-4" /></button></div>)}
            <AnimatePresence>{activeTab === 'search' && data && (<motion.button initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onClick={() => { setData(null); setQuery(''); setActiveCluster(null); setHoveredCluster(null); window.history.pushState({}, '', window.location.pathname); }} className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/0 flex items-center justify-center group transition-all duration-300 hover:scale-110 cursor-pointer"><Home className="w-5 h-5 text-slate-400 group-hover:text-slate-900 dark:text-slate-500 dark:group-hover:text-white" /></motion.button>)}</AnimatePresence>
            {activeTab === 'search' && (<button onClick={() => { navigator.clipboard.writeText(window.location.href); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }} className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center group transition-all duration-300 hover:scale-110 cursor-pointer ${copiedLink ? 'text-emerald-500' : `text-slate-400 ${isKeyword ? 'hover:text-blue-500' : 'hover:text-indigo-500'}`}`}><Share2 className="w-5 h-5" /></button>)}
            <button onClick={() => setShowInfo(true)} className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center group transition-all duration-300 hover:scale-110 cursor-pointer"><HelpCircle className={`w-5 h-5 text-slate-400 ${activeTab === 'search' && isKeyword ? 'group-hover:text-blue-500' : 'group-hover:text-indigo-500'}`} /></button>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center group transition-all duration-300 hover:scale-110 cursor-pointer">{theme === 'dark' ? <Sun className="w-5 h-5 text-slate-500 group-hover:text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-400 group-hover:text-slate-900" />}</button>
          </div>

          <div className="md:hidden relative">
            <button onClick={() => setShowMobileMenu(!showMobileMenu)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${activeTab === 'quran' ? 'bg-white/40 dark:bg-slate-800/50 backdrop-blur-md shadow-sm border border-slate-300/30 dark:border-slate-700 text-slate-600 dark:text-slate-300' : 'glass-panel border-white/20 text-slate-500 dark:text-slate-400'}`}>
              <Menu className="w-5 h-5" />
            </button>

            <AnimatePresence>
              {showMobileMenu && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`absolute right-0 top-full mt-2 w-48 rounded-xl shadow-xl p-2 flex flex-col gap-1 z-[75] ${activeTab === 'quran' ? 'bg-[#f4ecd8] dark:bg-[#1a1a1a] border border-slate-300 dark:border-slate-700' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'}`}>
                  {activeTab === 'search' && data && <button onClick={() => { setData(null); setQuery(''); setActiveCluster(null); setShowMobileMenu(false); window.history.pushState({}, '', window.location.pathname); }} className="w-full text-left flex items-center gap-3 p-3 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer"><Home className="w-4 h-4 shrink-0" /> Reset Search</button>}
                  {activeTab === 'search' && <button onClick={() => { navigator.clipboard.writeText(window.location.href); setCopiedLink(true); setTimeout(() => { setCopiedLink(false); setShowMobileMenu(false); }, 1000); }} className={`w-full text-left flex items-center gap-3 p-3 rounded-lg text-sm cursor-pointer ${copiedLink ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><Share2 className="w-4 h-4 shrink-0" /> Share Link</button>}
                  <button onClick={() => { setShowUpdates(true); setShowMobileMenu(false); }} className="w-full text-left flex items-center gap-3 p-3 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><Sparkles className="w-4 h-4 shrink-0" /> What's New</button>
                  <button onClick={() => { setShowInfo(true); setShowMobileMenu(false); }} className="w-full text-left flex items-center gap-3 p-3 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><HelpCircle className="w-4 h-4 shrink-0" /> Help & Guide</button>
                  <button onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); setShowMobileMenu(false); }} className="w-full text-left flex items-center gap-3 p-3 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">{theme === 'dark' ? <Sun className="w-4 h-4 shrink-0 text-amber-500" /> : <Moon className="w-4 h-4 shrink-0" />} Toggle Theme</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </header>

      <main ref={containerRef} className={`relative w-full flex-grow flex flex-col ${lockMainScreen ? 'items-center justify-center h-screen overflow-hidden' : 'min-h-screen'}`}>
        {activeTab === 'quran' && <QuranReader activeFontFamily={activeFontFamily} fontStyle={fontStyle} setFontStyle={setFontStyle} />}

        <AnimatePresence>
          {activeTab === 'search' && !data && !loading && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }} className="z-10 flex flex-col items-center justify-center w-full max-w-2xl px-4 sm:px-6 mx-auto absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <h2 className={`font-serif text-3xl sm:text-4xl md:text-5xl font-medium mb-6 sm:mb-8 text-center leading-tight ${isKeyword ? 'text-slate-800 dark:text-slate-100' : ''}`}>Explore the Depths of <br /><span className="italic">Twelver Literature</span></h2>
              <div className="w-full relative group pointer-events-auto">
                <div className={`absolute inset-0 w-full h-full rounded-2xl border shadow-xl pointer-events-none z-0 transition-colors duration-700 ${isKeyword ? 'border-slate-300 dark:border-slate-700' : 'border-white/60 dark:border-white/10'}`} style={{ backgroundColor: isKeyword ? (theme === 'dark' ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.9)') : (theme === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.3)'), backdropFilter: 'blur(24px)' }}></div>
                <form onSubmit={handleSearchSubmit} className="relative z-10 flex flex-col p-2">
                  <div className={`flex items-center border-b relative ${isKeyword ? 'border-slate-300 dark:border-slate-700' : 'border-slate-200/50 dark:border-slate-700/50'}`}>
                    <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit(e); }} placeholder={isKeyword ? "Enter an exact word or phrase..." : "Enter a phrase or concept (e.g. intellect)..."} className="w-full bg-transparent appearance-none outline-none py-3 sm:py-4 pl-3 sm:pl-4 pr-14 sm:pr-16 text-base font-sans placeholder:text-slate-500 cursor-text" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }} />
                    <button type="submit" className={`absolute right-2 p-2 sm:p-2.5 rounded-xl transition-colors shadow-sm cursor-pointer ${isKeyword ? 'bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white' : 'bg-indigo-500/10 hover:bg-indigo-500 text-indigo-500 hover:text-white'}`}><Search className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                  </div>
                  <div className="relative py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div className={`flex items-center rounded-lg p-1 border ${isKeyword ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700' : 'bg-white/30 dark:bg-slate-800/60 border-white/40 dark:border-slate-700/50'}`}>
                      <button type="button" onClick={() => { setSearchMode('concept'); setViewMode(window.innerWidth < 800 ? 'list' : 'map'); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 flex-1 sm:flex-none justify-center cursor-pointer ${!isKeyword ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}><Sparkles className="w-3.5 h-3.5" /> Concept</button>
                      <button type="button" onClick={() => { setSearchMode('keyword'); setViewMode('list'); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 flex-1 sm:flex-none justify-center cursor-pointer ${isKeyword ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}><Database className="w-3.5 h-3.5" /> Keyword</button>
                    </div>
                    <div className="flex items-center w-full sm:w-auto">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mr-3 hidden sm:flex"><BookOpen className="w-4 h-4" /><span className="text-xs uppercase tracking-wider font-semibold">Source:</span></div>
                      <button type="button" onClick={() => setShowDropdown(!showDropdown)} className={`flex items-center justify-between w-full sm:w-[220px] px-3 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium border border-transparent cursor-pointer ${isKeyword ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}><span className="truncate">{sourceFilter}</span><ChevronDown className="w-4 h-4 opacity-50 shrink-0 ml-2" /></button>
                      <AnimatePresence>
                        {showDropdown && (
                          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className={`absolute top-[100px] sm:top-14 right-2 sm:right-0 w-[calc(100%-16px)] sm:w-[220px] rounded-xl border shadow-xl overflow-hidden z-50 backdrop-blur-xl ${isKeyword ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600' : 'glass-panel bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-700'}`}>
                            {SOURCES.map((source) => (<div key={source} onClick={() => { setSourceFilter(source); setShowDropdown(false); }} className={`px-4 py-3 text-sm cursor-pointer transition-colors ${sourceFilter === source ? (isKeyword ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600') : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50'}`}>{source}</div>))}
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
                        <Sparkles className="w-6 h-6 animate-pulse text-white" />
                      </div>
                    </>
                  ) : (
                    <>
                      <motion.div className="w-32 h-32 rounded-full absolute bg-blue-500/20 blur-xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} />
                      <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 border border-slate-200 flex items-center justify-center shadow-lg">
                        <Database className="w-6 h-6 animate-pulse text-blue-500" />
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
                      <div className="glass-panel px-6 sm:px-8 py-3 sm:py-4 flex items-center gap-3 backdrop-blur-xl border-white/30 shadow-[0_0_50px_rgba(16,185,129,0.15)] group hover:scale-105 transition-transform">
                        <span className="font-serif text-xl sm:text-2xl font-medium whitespace-nowrap">{query}</span>
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20 flex items-center justify-center"><span className="text-[10px] sm:text-xs font-bold">{data.total_results}</span></div>
                      </div>
                    </motion.div>
                  </div>

                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                    {data.clusters.map((cluster, i) => {
                      const rx = Math.max(160, centerPos.x - 160), ry = Math.max(140, centerPos.y - 120), pos = getRadialPosition(i, data.clusters.length, rx, ry), color = CLUSTER_COLORS[i % CLUSTER_COLORS.length], isActive = activeCluster === i, isHovered = hoveredCluster === i;
                      return (<motion.line key={`line-${i}`} x1={centerPos.x} y1={centerPos.y} x2={centerPos.x + pos.x} y2={centerPos.y + pos.y} stroke={color} strokeWidth={isActive ? 2 : 1} strokeOpacity={isActive ? 0.8 : 0.15} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: i * 0.2 }} className="transition-all duration-300" />);
                    })}
                  </svg>

                  {data.clusters.map((cluster, i) => {
                    const rx = Math.max(160, centerPos.x - 160), ry = Math.max(140, centerPos.y - 120), pos = getRadialPosition(i, data.clusters.length, rx, ry), color = CLUSTER_COLORS[i % CLUSTER_COLORS.length], isActive = activeCluster === i, isFaded = activeCluster !== null && !isActive, maxClusterSize = Math.max(...data.clusters.map(c => c.items.length)), baseScale = Math.max(0.65, (0.85 + ((cluster.items.length / maxClusterSize) * 0.45)) * Math.min(1, windowWidth / 1200));
                    return (
                      <div key={`cluster-wrap-${i}`} className="absolute top-1/2 left-1/2 w-0 h-0 flex items-center justify-center z-20 pointer-events-none">
                        <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: isFaded ? 0.2 : 1, x: pos.x, y: pos.y, scale: isActive ? baseScale * 1.05 : baseScale }} transition={{ type: "spring", stiffness: 60, delay: i * 0.1 }} className={`pointer-events-auto transition-all duration-300 ${isFaded ? 'pointer-events-none grayscale' : ''}`}>
                          <div className="glass-panel flex flex-col cursor-pointer transition-all duration-300 shadow-lg relative group w-max max-w-[220px] sm:max-w-[280px]" style={{ borderColor: isActive ? color : (theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.6)'), boxShadow: isActive ? `0 0 24px ${color}60` : '0 8px 32px rgba(0,0,0,0.05)' }}>
                            <div onClick={() => setActiveCluster(isActive ? null : i)} className="px-4 py-3 sm:px-5 sm:py-4 flex items-center justify-between gap-3">
                              <div className="absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300 group-hover:w-2" style={{ backgroundColor: color }} />
                              <div className="pl-2 pr-1 w-full">
                                <h3 className="font-mono font-medium text-xs sm:text-sm lg:text-base leading-snug whitespace-normal break-words">{cluster.theme_label}</h3>
                                <p className="text-[10px] sm:text-xs opacity-60 mt-1">{cluster.items.length} Hadiths</p>
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
                  <div className={`p-5 sm:p-6 rounded-xl mb-6 sm:mb-8 border shadow-sm ${isKeyword ? 'bg-white dark:bg-slate-800 border-slate-200' : 'glass-panel bg-white/40 dark:bg-slate-900/40 border-white/20'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0"><h2 className={`font-serif text-2xl sm:text-3xl font-medium tracking-tight truncate ${isKeyword ? 'text-slate-800 dark:text-slate-100' : 'text-slate-900 dark:text-white'}`}>{isKeyword ? 'Index Results:' : 'Search:'} <span className="italic break-words whitespace-normal">"{query}"</span></h2><div className="flex flex-wrap gap-2 mt-3">{uniqueBooks.map((bookName, idx) => (<span key={idx} className={`text-[10px] sm:text-xs uppercase tracking-wider font-bold px-2.5 py-1 rounded-md border ${isKeyword ? 'bg-blue-50 dark:bg-slate-700 text-blue-600 border-blue-200' : 'text-slate-500 bg-slate-500/10 border-slate-500/20'}`}>{bookName}</span>))}</div></div>
                      <div className={`flex gap-6 sm:border-l sm:pl-6 shrink-0 ${isKeyword ? 'border-slate-200' : 'border-slate-200 dark:border-slate-700/60'}`}>{!isKeyword && (<div><p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-1">Themes</p><p className="font-mono text-xl text-indigo-500 dark:text-indigo-400">{data.clusters.length}</p></div>)}<div><p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-1">{isKeyword ? 'Matches' : 'Hadiths'}</p><p className={`font-mono text-xl ${isKeyword ? 'text-blue-500' : 'text-emerald-500'}`}>{data.total_results}</p></div></div>
                    </div>
                  </div>
                  <div className={`flex flex-col border-t ${isKeyword ? 'border-slate-200 dark:border-slate-700' : 'border-slate-200 dark:border-slate-800'}`}>
                    {data.clusters.map((cluster, i) => (
                      <motion.div key={`list-item-${i}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} onClick={() => setActiveCluster(i)} className={`group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 cursor-pointer border-b transition-all duration-300 ${isKeyword ? 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800' : 'border-slate-200 dark:border-slate-800 hover:bg-white/40 dark:hover:bg-slate-800/40'}`}>
                        <div className="flex items-start sm:items-center gap-4 sm:gap-6 flex-grow pr-8 sm:pr-0"><span className={`font-mono text-sm sm:text-base font-medium pt-0.5 sm:pt-0 ${isKeyword ? 'text-blue-400/60 group-hover:text-blue-500' : 'text-slate-400 group-hover:text-indigo-500'}`}>0{i + 1}</span><div><h3 className={`font-mono text-base sm:text-lg lg:text-xl font-medium tracking-tight transition-colors ${isKeyword ? 'text-slate-700 dark:text-slate-200 group-hover:text-blue-600' : 'text-slate-800 dark:text-slate-100 group-hover:text-indigo-600'}`}>{cluster.theme_label}</h3><div className="flex items-center gap-3 sm:gap-4 mt-1.5 sm:mt-2"><span className="font-mono text-[10px] sm:text-xs lg:text-sm text-slate-500">[{cluster.items.length} {isKeyword ? 'entries' : 'narrations'}]</span></div></div></div>
                        <div className="absolute right-4 sm:relative sm:right-0 sm:opacity-0 group-hover:opacity-100 transform sm:translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300 self-center"><ChevronRight className={`w-5 h-5 ${isKeyword ? 'text-blue-500' : 'text-indigo-500'}`} /></div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <AnimatePresence>
                {activeCluster !== null && data.clusters[activeCluster] && (() => {
                  const filteredItems = data.clusters[activeCluster].items.filter(item => { if (lengthFilter === 'All') return true; const len = (item.english_text || '').length; if (lengthFilter === 'Short') return len < 300; if (lengthFilter === 'Medium') return len >= 300 && len <= 1000; if (lengthFilter === 'Long') return len > 1000; return true; });
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
                          {filteredItems.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-slate-400 italic mt-10"><p>No {lengthFilter.toLowerCase()} hadiths found.</p></div> : paginatedItems.map((item, idx) => (<HadithCard key={idx} item={item} onVerseClick={handleVerseClick} handleCopyHadith={handleCopyHadith} searchMode={searchMode} />))}
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
                <div className="flex justify-between items-center bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md pt-5 pb-4 px-5 z-10 border-b border-slate-200 dark:border-slate-800 rounded-t-2xl shrink-0"><h2 className="text-lg sm:text-xl font-mono font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2"><HelpCircle className="w-5 h-5 text-emerald-500" />How to Use Concept Atlas</h2><button onClick={() => setShowInfo(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer shrink-0"><X className="w-5 h-5" /></button></div>
                <div className="p-5 sm:p-6 overflow-y-auto flex-grow smart-scrollbar flex flex-col gap-6 text-slate-700 dark:text-slate-300">
                  <div><h3 className="font-bold text-base sm:text-lg mb-2 text-slate-900 dark:text-white">Welcome to the Explorer</h3><p className="leading-relaxed text-xs sm:text-sm">Concept Atlas is a semantic search engine designed specifically to explore authentic Twelver Shia literature, prioritizing core texts like <i>al-Kafi</i>, <i>Bihar al-Anwar</i>, and <i>Basa'ir al-Darajat</i>. It mathematically groups verified texts so you can explore concepts without AI hallucinations.</p></div>
                  <hr className="border-slate-200 dark:border-slate-700" />
                  <div><h3 className="font-bold text-base sm:text-lg flex items-center gap-2 mb-2 sm:mb-3 text-slate-900 dark:text-white"><Sparkles className="w-4 h-4 text-indigo-500" /> Concept Mode (Thematic Search)</h3><p className="leading-relaxed text-xs sm:text-sm mb-3">This mode uses AI vector math to find underlying themes, even if the exact words aren't used. It is perfect for exploring abstract theology like <i>"divine justice"</i> or <i>"the nature of the intellect."</i></p><div className="bg-orange-50 dark:bg-orange-500/10 border-l-4 border-orange-500 p-3 sm:p-4 rounded-r-lg"><p className="text-xs sm:text-sm font-semibold text-orange-800 dark:text-orange-300 mb-1">⚠️ The Historical Fact Trap</p><p className="text-xs sm:text-sm text-orange-700 dark:text-orange-200/80">Concept Mode finds themes, not historical facts. If you search <i>"How was Imam Jafar Sadiq martyred?"</i>, it won't give you a Wikipedia summary. Instead, it will pull dozens of thematic narrations about grief, martyrdom, and the Imam.</p></div></div>
                  <hr className="border-slate-200 dark:border-slate-700" />
                  <div><h3 className="font-bold text-base sm:text-lg flex items-center gap-2 mb-2 sm:mb-3 text-slate-900 dark:text-white"><Database className="w-4 h-4 text-blue-500" /> Keyword Mode (Exact Match)</h3><p className="leading-relaxed text-xs sm:text-sm mb-3">This mode strictly searches the exact English or Arabic text you type, functioning like a traditional database index.</p><div className="bg-blue-50 dark:bg-blue-500/10 border-l-4 border-blue-500 p-3 sm:p-4 rounded-r-lg"><p className="text-xs sm:text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">⚠️ The Translator's Trap</p><p className="text-xs sm:text-sm text-blue-700 dark:text-blue-200/80">If you search an English idiom like <i>"peak of affairs"</i>, you might miss a Hadith because the translator wrote <i>"summit of the matter"</i> instead. To bypass this, search using core "Anchor Words" like <i>"obeying the Imam"</i> to catch exactly what you are looking for.</p></div></div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}