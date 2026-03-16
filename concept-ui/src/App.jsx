import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Moon, Sun, Sparkles, X, ChevronRight, ChevronLeft, Home, Copy, ChevronDown, ChevronUp, List, Layout, Info, BookOpen, History, HelpCircle, Database, Filter, Share2, Check, Settings2, Menu, Clock, Trash2, LibraryBig, Youtube, Library as LibraryIcon, ArrowDown, User, Bookmark, Coins, HeartPulse, ShieldAlert } from 'lucide-react';
import quranData from './quran.json';
import verseMap from './verse_map.json';
import transcriptData from './transcripts.json';
import { supabase } from './supabaseClient';
import { quranBenefits, spiritualPrescriptions } from './quranBenefits';


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

  const [isSaved, setIsSaved] = useState(false);

  const handleSaveClick = async (e) => {
    e.stopPropagation();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      alert("Please Sign In from the top menu to save to your Vault.");
      return;
    }

    const sourceRef = `Book: ${item.book}, Vol: ${item.volume}, ${item.sub_book}, Chapter: ${item.chapter} ${displayNum !== "Unknown" ? `Hadith ${displayNum}` : ''}`;

    const { error } = await supabase.from('vault_items').insert([{
      user_id: session.user.id,
      content: textToCopy,
      source: sourceRef,
      type: 'hadith',
      note: ''
    }]);

    if (!error) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      window.dispatchEvent(new Event('vault-updated')); // Instantly updates the Vault UI!
    }
  };

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

        {/* This perfectly groups Save and Copy Text on the right edge */}
        <div className="flex items-center gap-2">
          <button onClick={handleSaveClick} className={`flex items-center gap-1.5 text-xs font-mono transition-colors px-3 py-1.5 rounded-md cursor-pointer ${isSaved ? 'text-[#c6a87c] bg-[#c6a87c]/10 border border-[#c6a87c]/20 shadow-sm' : (isKeyword ? 'text-slate-500 hover:text-[#c6a87c] hover:bg-[#c6a87c]/10 dark:hover:bg-[#c6a87c]/10 border border-transparent hover:border-[#c6a87c]/20' : 'text-slate-400 hover:text-[#c6a87c] hover:bg-[#c6a87c]/10 dark:hover:bg-[#c6a87c]/10 border border-transparent hover:border-[#c6a87c]/20')}`}>
            {isSaved ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}<span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>

          <button onClick={handleCopyClick} className={`flex items-center gap-2 text-xs font-mono transition-colors px-3 py-1.5 rounded-md cursor-pointer ${copied ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : (isKeyword ? 'text-slate-500 hover:text-blue-500 hover:bg-slate-200/50 dark:hover:bg-slate-700/50' : 'text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700/50')}`}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}<span>{copied ? 'Copied!' : 'Copy Text'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const QuranReader = ({ activeFontFamily, fontStyle, setFontStyle, handleSurahSelectHook, externalSurahTarget, onTafsirClick }) => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedSurah, setSelectedSurah] = useState(1);
  const [showTranslation, setShowTranslation] = useState(true);
  const [readingMode, setReadingMode] = useState('verse');
  const [showSurahMenu, setShowSurahMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showVirtues, setShowVirtues] = useState(false); // NEW: Controls the Fadhaa'il Sidebar
  const [quranSearchQuery, setQuranSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [targetVerse, setTargetVerse] = useState(null);
  const quranSearchInputRef = useRef(null);

  const [analytics, setAnalytics] = useState(() => {
    const saved = localStorage.getItem('kisa_analytics');
    return saved ? JSON.parse(saved) : { totalCompleted: 0, totalSeconds: 0, history: {}, dailyTime: {} };
  });

  const [resumeToast, setResumeToast] = useState(false);
  const [quranProgress, setQuranProgress] = useState(() => {
    const saved = localStorage.getItem('kisa_quran_progress');
    return saved ? JSON.parse(saved) : { lastSurah: null };
  });

  useEffect(() => {
    if (externalSurahTarget) {
      setSelectedSurah(externalSurahTarget);
      setCurrentView('reader');
    }
  }, [externalSurahTarget]);

  useEffect(() => {
    if (currentView !== 'reader') return;
    const timer = setInterval(() => {
      setAnalytics(prev => {
        const currentSecs = prev.totalSeconds !== undefined ? prev.totalSeconds : (prev.totalMinutes * 60 || 0);
        const dateObj = new Date();
        const todayStr = dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + String(dateObj.getDate()).padStart(2, '0');
        const dailyTimeData = prev.dailyTime || {};
        const todaySecs = (dailyTimeData[todayStr] || 0) + 10;
        const updated = { ...prev, totalSeconds: currentSecs + 10, dailyTime: { ...dailyTimeData, [todayStr]: todaySecs } };
        localStorage.setItem('kisa_analytics', JSON.stringify(updated));
        return updated;
      });
    }, 10000);
    return () => clearInterval(timer);
  }, [currentView]);

  // Auto-Save Verse Position on Scroll
  useEffect(() => {
    if (currentView !== 'reader') return;
    let ticking = false;
    let lastSaveTime = Date.now();

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const now = Date.now();
          if (now - lastSaveTime > 1000) { // Check every 1 second while scrolling
            const verses = document.querySelectorAll(`[id^="verse-${selectedSurah}-"]`);
            let currentVerse = null;

            for (let i = 0; i < verses.length; i++) {
              const rect = verses[i].getBoundingClientRect();
              // If the verse is within the top half of the screen
              if ((rect.top >= 0 && rect.top < window.innerHeight / 2) || (rect.top < 0 && rect.bottom > 100)) {
                currentVerse = parseInt(verses[i].id.split('-')[2]);
                break;
              }
            }

            if (currentVerse) {
              setQuranProgress(prev => {
                if (prev.lastSurah === selectedSurah && prev.lastVerse === currentVerse) return prev;
                const newProg = { lastSurah: selectedSurah, lastVerse: currentVerse, timestamp: now };
                localStorage.setItem('kisa_quran_progress', JSON.stringify(newProg));
                return newProg;
              });
            }
            lastSaveTime = now;
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentView, selectedSurah]);

  const heatmapDays = useMemo(() => {
    const dailyTimeData = analytics?.dailyTime || {};
    let successfulDays = 0;
    for (let i = 0; i <= 27; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      if ((dailyTimeData[dateStr] || 0) >= 300) successfulDays++;
    }
    const blocks = [];
    for (let i = 0; i <= 27; i++) blocks.push({ metGoal: i < successfulDays });
    return blocks;
  }, [analytics]);

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

  // Phase 3: Tafsir Map Calculations
  const surahTafsirCounts = useMemo(() => {
    const counts = {};
    for (let i = 1; i <= 114; i++) counts[i] = 0;
    // Scan the entire verseMap and tally up the Hadiths per Surah
    Object.entries(verseMap).forEach(([key, count]) => {
      const surahId = parseInt(key.split(':')[0]);
      if (counts[surahId] !== undefined) counts[surahId] += count;
    });
    return counts;
  }, []);

  // Find the highest count to calculate our heat percentages
  const maxTafsirCount = useMemo(() => Math.max(1, ...Object.values(surahTafsirCounts)), [surahTafsirCounts]);

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

  const openSurah = (id, specificVerse = null) => {
    if (!specificVerse) window.scrollTo(0, 0);
    setSelectedSurah(id);
    setCurrentView('reader');
    setQuranSearchQuery('');
    setSearchResults([]);
    setShowVirtues(false);

    if (specificVerse) {
      setTargetVerse(specificVerse);
      // Removed the early toast trigger from here!
    } else {
      // Only overwrite progress if starting a Surah fresh
      const newProg = { lastSurah: id, lastVerse: 1, timestamp: Date.now() };
      setQuranProgress(newProg);
      localStorage.setItem('kisa_quran_progress', JSON.stringify(newProg));
    }

    const s = surahs.find(x => x.id === id);
    if (s && handleSurahSelectHook) handleSurahSelectHook(id, s.enName);
  };

  const handleSelectResult = (res) => {
    openSurah(res.surahId);
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
      const bismillahRegex = /^(?:بِسْمِ|بسم)[\s\S]{10,40}?(?:الرَّحِيمِ|ٱلرَّحِيمِ|الرَّحِيمِ|ٱلرَّحِيمِ|الرحيم)(?:[\s\u06D6-\u06DC\u200B\u00A0]*)/;
      const match = arText.match(bismillahRegex);

      if (match) {
        surahBismillah = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
        arText = arText.substring(match[0].length).trim();
      } else {
        const words = arText.split(/[\s\u00A0]+/);
        if (words.length > 4) {
          surahBismillah = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
          arText = words.slice(4).join(' ').trim();
        }
      }
    }
    return { ...ayah, ar: arText };
  });

  useEffect(() => {
    if (targetVerse && ayahs.length > 0 && currentView === 'reader') {
      let previousY = -1;
      let checks = 0;

      // 1. Force scroll to top instantly so the user sees the Bismillah 
      // while the browser secretly calculates the heavy layout.
      window.scrollTo(0, 0);

      const checkStabilization = setInterval(() => {
        const el = document.getElementById(`verse-${selectedSurah}-${targetVerse}`);
        if (el) {
          const currentY = el.getBoundingClientRect().top + window.scrollY;

          if (Math.abs(currentY - previousY) < 5 || checks > 15) {
            clearInterval(checkStabilization);

            // 2. THE CINEMATIC SCROLL ENGINE
            const targetY = currentY - 120; // Account for sticky header
            const startY = window.scrollY;
            const distance = targetY - startY;

            // Dynamically calculate speed: Further away = faster top speed, capped at 1.8 seconds
            const duration = Math.min(1800, Math.max(800, Math.abs(distance) * 0.15));

            let start = null;
            const cinematicScroll = (timestamp) => {
              if (!start) start = timestamp;
              const progress = timestamp - start;
              const t = Math.min(progress / duration, 1);

              // Ease-Out-Quart formula for a premium "warp and brake" feel
              const easeOut = 1 - Math.pow(1 - t, 4);
              window.scrollTo(0, startY + (distance * easeOut));

              if (progress < duration) {
                window.requestAnimationFrame(cinematicScroll);
              } else {
                // 3. The Landing Highlight & Toast
                el.classList.add('bg-amber-500/20', 'dark:bg-amber-500/30', 'transition-colors', 'duration-1000');
                setTimeout(() => el.classList.remove('bg-amber-500/20', 'dark:bg-amber-500/30'), 2000);

                // Trigger the toast exactly when we arrive
                setResumeToast(true);
                setTimeout(() => setResumeToast(false), 3000);

                setTargetVerse(null);
              }
            };

            window.requestAnimationFrame(cinematicScroll);
          } else {
            previousY = currentY;
            checks++;
          }
        } else {
          clearInterval(checkStabilization);
          setTargetVerse(null);
        }
      }, 100);

      return () => clearInterval(checkStabilization);
    }
  }, [selectedSurah, targetVerse, readingMode, ayahs, currentView]);


  // ==============================================
  // DASHBOARD VIEW
  // ==============================================
  if (currentView === 'dashboard') {
    const totalSecs = analytics.totalSeconds !== undefined ? analytics.totalSeconds : (analytics.totalMinutes * 60 || 0);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const lastSurah = quranProgress.lastSurah ? surahs.find(s => s.id === quranProgress.lastSurah) : null;

    const dayOfWeek = new Date().getDay();
    const isJumuahEve = dayOfWeek === 4;
    const isJumuah = dayOfWeek === 5;

    return (
      <div className="w-full min-h-screen pt-24 sm:pt-32 pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col pointer-events-auto">

        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-4xl sm:text-5xl font-serif font-bold text-slate-900 dark:text-slate-50 mb-3">The Holy Quran</h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">Explore the divine revelation, mapped with Ahl al-Bayt commentary.</p>
        </div>

        {/* Stats & Heatmap Bar */}
        <div className="w-full bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 mb-10 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex gap-8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Reading Time</p>
              <p className="text-3xl font-serif font-bold text-slate-900 dark:text-slate-50">
                {hrs > 0 && <>{hrs}<span className="text-sm font-sans text-slate-500 font-normal mr-1">h</span></>}
                {mins}<span className="text-sm font-sans text-slate-500 font-normal">m</span>
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start md:items-end w-full md:w-auto">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5"><History className="w-3 h-3" /> 28-Day Habit</p>
            <div className="flex gap-1 flex-wrap">
              {heatmapDays.map((block, i) => (
                <div key={i} className={`w-3 h-3 sm:w-4 sm:h-4 rounded-sm transition-colors ${block.metGoal ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'bg-slate-100 dark:bg-slate-800'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Pick Up Where You Left Off */}
        {lastSurah && !quranSearchQuery.trim() && (
          <div onClick={() => openSurah(lastSurah.id, quranProgress.lastVerse)} className="w-full bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/30 hover:bg-amber-500/20 rounded-2xl p-6 sm:p-8 mb-12 cursor-pointer transition-all duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-sm group">
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                <span className="text-amber-600 dark:text-amber-500 font-bold text-[10px] sm:text-xs uppercase tracking-widest">Continue Reading</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50 group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors">
                Surah {lastSurah.enName} <span className="text-slate-500 dark:text-slate-400 text-base sm:text-lg font-normal ml-2">Verse {quranProgress.lastVerse || 1}</span>
              </h2>
            </div>
            <div className="w-12 h-12 rounded-full bg-white dark:bg-[#1a1a1a] shadow-md border border-amber-500/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <ChevronRight className="w-6 h-6 text-amber-600 dark:text-amber-500" />
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative w-full mb-12 z-[70]">
          <form onSubmit={handleQuranSearchSubmit} className="flex items-center bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 shadow-sm transition-all focus-within:border-amber-500/50 focus-within:ring-1 focus-within:ring-amber-500/50">
            <Search className="w-5 h-5 text-slate-400 mr-4 shrink-0" />
            <input ref={quranSearchInputRef} type="text" value={quranSearchQuery} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Search for any Surah or specific Verse (e.g. 2:255)..." className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 text-base font-medium" />
            {quranSearchQuery && <button type="button" onClick={() => { setQuranSearchQuery(''); setSearchResults([]); quranSearchInputRef.current?.focus(); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"><X className="w-5 h-5 text-slate-400" /></button>}
          </form>
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute left-0 top-full mt-3 w-full bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-[75] overflow-hidden">
                {searchResults.map((res, i) => (
                  <div key={i} onClick={() => handleSelectResult(res)} className="px-5 py-4 cursor-pointer border-b last:border-b-0 border-slate-100 dark:border-slate-800 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors flex items-center justify-between group">
                    <span className="text-base font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors">{res.label}</span>
                    <span className="text-[10px] uppercase tracking-widest text-amber-600 dark:text-amber-500 font-bold opacity-80 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded">{res.type}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Phase 2: DIVINE PRESCRIPTIONS */}
        {!quranSearchQuery.trim() && (
          <div className="mb-12">
            <h3 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 mb-6 flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-amber-500" /> Divine Prescriptions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {spiritualPrescriptions.map((prescription, idx) => {
                // Map the string icon from JSON to the Lucide component
                const IconComponent = prescription.icon === 'Coins' ? Coins : (prescription.icon === 'HeartPulse' ? HeartPulse : ShieldAlert);
                return (
                  <div key={idx} className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col h-full hover:border-amber-500/30 transition-colors group">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 group-hover:scale-110 transition-transform">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-lg text-slate-900 dark:text-slate-50">{prescription.title}</h4>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 flex-grow leading-relaxed">{prescription.description}</p>
                    <div className="flex flex-wrap gap-2 mt-auto">
                      {prescription.surahs.map(sId => {
                        const sName = surahs.find(s => s.id === sId)?.enName;
                        return (
                          <button key={sId} onClick={() => openSurah(sId)} className="text-[10px] font-bold uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-400 transition-colors px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-amber-500/30 cursor-pointer">
                            {sName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Smart Amaal Grid */}
        {!quranSearchQuery.trim() && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2 mb-5"><Moon className="w-4 h-4 text-amber-500" /> Nightly Amaal</h3>
              <div className="flex flex-col gap-3">
                <button onClick={() => openSurah(56)} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-amber-500/30 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all group cursor-pointer">
                  <div className="flex flex-col text-left"><span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 transition-colors">Surah Al-Waqi'ah</span><span className="text-xs text-slate-500 mt-1">For sustenance and protection</span></div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-amber-500 transition-colors" />
                </button>
                <button onClick={() => openSurah(67)} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-amber-500/30 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all group cursor-pointer">
                  <div className="flex flex-col text-left"><span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 transition-colors">Surah Al-Mulk</span><span className="text-xs text-slate-500 mt-1">For intercession in the grave</span></div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-amber-500 transition-colors" />
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2 mb-5"><Sparkles className="w-4 h-4 text-indigo-500" /> {(isJumuahEve || isJumuah) ? "Recommended Today" : "Tafsir Spotlight"}</h3>
              {(isJumuahEve || isJumuah) ? (
                <div className="flex flex-col gap-3">
                  <button onClick={() => openSurah(18)} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all group cursor-pointer">
                    <div className="flex flex-col text-left"><span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">Surah Al-Kahf</span><span className="text-xs text-slate-500 mt-1">Highly recommended for Fridays</span></div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  </button>
                  <button onClick={() => openSurah(36)} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all group cursor-pointer">
                    <div className="flex flex-col text-left"><span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">Surah Yasin</span><span className="text-xs text-slate-500 mt-1">The Heart of the Quran</span></div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  </button>
                </div>
              ) : (
                <div onClick={() => openSurah(2)} className="flex-grow flex flex-col justify-center p-6 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all cursor-pointer group relative overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 opacity-[0.03] dark:opacity-5"><BookOpen className="w-48 h-48" /></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-2">Deep Dive</span>
                  <span className="font-bold text-xl text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors mb-3">Surah Al-Baqarah</span>
                  <span className="text-sm text-slate-500 leading-relaxed relative z-10">Explore the longest chapter of the Quran, mathematically mapped with over 450+ verified narrations from the Ahl al-Bayt in Kisa's database.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Phase 3: THE TAFSIR MAP (Visual Index) */}
        {!quranSearchQuery.trim() && (
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pt-8 border-t border-slate-200 dark:border-slate-800/80">
              <div>
                <h3 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-3">
                  <LibraryIcon className="w-6 h-6 text-amber-500" /> The Tafsir Map
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium uppercase tracking-widest">Full 114 Surah Index</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 bg-white dark:bg-[#1a1a1a] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="uppercase tracking-widest font-bold">Commentary Depth:</span>
                <span className="w-2.5 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600"></span>
                <span>Low</span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></span>
                <span>High</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {surahs.map(s => {
                const count = surahTafsirCounts[s.id];
                // Logarithmic scaling ensures massive Surahs don't completely eclipse smaller ones
                const heatPercentage = count > 0 ? (Math.log(count + 1) / Math.log(maxTafsirCount + 1)) * 100 : 0;

                return (
                  <button
                    key={s.id}
                    onClick={() => openSurah(s.id)}
                    className="relative bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 hover:border-amber-500/50 hover:shadow-lg transition-all duration-300 group overflow-hidden cursor-pointer flex flex-col text-left h-full"
                  >
                    {/* The Thermometer Heat Fill */}
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-500/10 dark:from-amber-500/20 to-transparent transition-all duration-500 group-hover:opacity-100"
                      style={{ height: `${Math.max(0, heatPercentage)}%`, opacity: count > 0 ? 0.6 : 0 }}
                    />
                    {/* Subtle top glowing border for high-count Surahs */}
                    {heatPercentage > 60 && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />
                    )}

                    <div className="relative z-10 flex justify-between items-start mb-3">
                      <span className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded">{s.id}</span>
                      <span className="font-arabic text-lg sm:text-xl text-slate-800 dark:text-slate-200 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors drop-shadow-sm">{s.arName}</span>
                    </div>

                    <div className="relative z-10 flex flex-col mt-auto">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-50 group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors truncate mb-0.5">{s.enName}</span>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <span className="text-[9px] text-slate-500 uppercase tracking-widest">{s.ayahCount} Ayahs</span>
                        {count > 0 ? (
                          <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded text-[9px] font-bold text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/50 shadow-sm">
                            <LibraryBig className="w-2.5 h-2.5" /> {count}
                          </div>
                        ) : (
                          <span className="text-[9px] text-slate-400 opacity-40">-</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>
    );
  }

  // ==============================================
  // READER VIEW
  // ==============================================
  return (
    <div className="w-full max-w-4xl px-4 sm:px-6 pt-24 sm:pt-28 pb-12 mx-auto min-h-screen flex flex-col items-center pointer-events-auto">
      {(showSurahMenu || showSettingsMenu || showVirtues) && (<div className="fixed inset-0 z-[60] pointer-events-auto" onClick={() => { setShowSurahMenu(false); setShowSettingsMenu(false); setShowVirtues(false); }} />)}

      <AnimatePresence>
        {resumeToast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-24 left-1/2 -translate-x-1/2 z-[400] bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-full shadow-2xl text-[10px] sm:text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Resumed where you left off
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back to Dashboard Button */}
      <div className="w-full flex justify-start mb-6">
        <button onClick={() => setCurrentView('dashboard')} className="flex items-center gap-2 text-slate-500 hover:text-amber-600 dark:hover:text-amber-500 transition-colors text-xs sm:text-sm font-bold uppercase tracking-widest cursor-pointer">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </button>
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
                  <div key={s.id} onClick={() => { openSurah(s.id); setShowSurahMenu(false); }} className={`px-4 py-3.5 cursor-pointer transition-colors flex justify-between items-center border-b last:border-b-0 border-slate-300/40 dark:border-slate-700/50 ${selectedSurah === s.id ? 'bg-amber-200/60 dark:bg-amber-900/40' : 'hover:bg-amber-200/50 dark:hover:bg-amber-600/10'}`}>
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

          {/* NEW: VIRTUES & REWARDS BUTTON */}
          <button onClick={() => setShowVirtues(true)} className="px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border border-amber-400/50 cursor-pointer hover:scale-105">
            <Sparkles className="w-4 h-4" /> <span className="hidden sm:inline">Virtues</span>
          </button>

          <div className="relative">
            <button onClick={() => { setShowSettingsMenu(!showSettingsMenu); setShowSurahMenu(false); }} className={`px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border shadow-sm flex items-center gap-2 cursor-pointer ${showSettingsMenu ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 border-transparent' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <Settings2 className="w-4 h-4" /> <span className="hidden sm:inline">Customise</span>
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

      {/* NEW: VIRTUES SLIDE-OUT SIDEBAR */}
      <AnimatePresence>
        {showVirtues && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowVirtues(false)} className="fixed inset-0 bg-black/40 z-[80] backdrop-blur-sm" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white dark:bg-[#1a1a1a] z-[90] shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col pointer-events-auto">

              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-amber-50/50 dark:bg-amber-900/10">
                <div>
                  <h3 className="font-bold text-xl text-slate-900 dark:text-slate-50 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" /> Fadhaa'il
                  </h3>
                  <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mt-1">Surah {surahs.find(s => s.id === selectedSurah)?.enName}</p>
                </div>
                <button onClick={() => setShowVirtues(false)} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors cursor-pointer"><X className="w-5 h-5 text-slate-500" /></button>
              </div>

              <div className="p-6 overflow-y-auto flex-grow smart-scrollbar">
                {quranBenefits[selectedSurah] ? (
                  <>
                    <div className="inline-block px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 text-[10px] font-bold uppercase tracking-widest rounded-md mb-6 border border-amber-200 dark:border-amber-800/50">
                      {quranBenefits[selectedSurah].tagline}
                    </div>
                    <div className="flex flex-col gap-6">
                      {quranBenefits[selectedSurah].benefits.map((benefit, i) => (
                        <p key={i} className="text-base sm:text-[17px] leading-[1.8] text-slate-800 dark:text-slate-200 font-serif">
                          {benefit}
                        </p>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
                    <BookOpen className="w-12 h-12 mb-4 text-slate-400" />
                    <p className="text-sm text-slate-500 px-4">Specific virtues for this Surah are not yet indexed in the current database version.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="text-center mb-12 flex flex-col items-center">
        <p className="text-amber-800 dark:text-amber-500 font-mono text-[10px] sm:text-xs tracking-[0.2em] uppercase font-bold mb-3 sm:mb-4">
          Surah {surahs.find(s => s.id === selectedSurah)?.enName}
        </p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-arabic text-slate-900 dark:text-slate-50 mb-4 sm:mb-5 leading-[1.5] drop-shadow-sm" style={{ fontFamily: activeFontFamily }} dir="rtl" lang="ar">
          {surahs.find(s => s.id === selectedSurah)?.arName}
        </h1>
        {surahBismillah && (
          <h2 className="font-arabic text-4xl sm:text-5xl md:text-6xl text-slate-700 dark:text-slate-300 leading-[1.5] mt-2 opacity-90" style={{ fontFamily: activeFontFamily }} dir="rtl" lang="ar">
            {surahBismillah}
          </h2>
        )}
      </div>

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
  const [currentView, setCurrentView] = useState('home');
  const [activeDoc, setActiveDoc] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [isArchiveOpen, setIsArchiveOpen] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(true);
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState('sans');
  const [isTocOpen, setIsTocOpen] = useState(false);

  const [readingProgress, setReadingProgress] = useState(() => {
    const saved = localStorage.getItem('kisa_progress');
    return saved ? JSON.parse(saved) : {};
  });

  const [analytics, setAnalytics] = useState(() => {
    const saved = localStorage.getItem('kisa_analytics');
    return saved ? JSON.parse(saved) : { totalCompleted: 0, totalSeconds: 0, history: {} };
  });

  const [resumeToast, setResumeToast] = useState(false);
  const [isExploding, setIsExploding] = useState(false);

  const maxScrollYRef = useRef(0);
  const returnDesktopRef = useRef(null);
  const returnMobileRef = useRef(null);
  const isShowingReturnRef = useRef(false);
  const progressBarRef = useRef(null);
  const stickySegmentRef = useRef(null);
  const lastSaveTimeRef = useRef(0);
  const lastScrollYRef = useRef(0);
  const isZenModeRef = useRef(false);
  const mobileFabRef = useRef(null);
  const desktopFabRef = useRef(null);

  // --- DASHBOARD LOGIC ---

  const { resumeDoc, upNextDoc } = useMemo(() => {
    const progressEntries = Object.entries(readingProgress);
    if (progressEntries.length === 0) return { resumeDoc: null, upNextDoc: null };

    progressEntries.sort((a, b) => (b[1].lastAccessed || 0) - (a[1].lastAccessed || 0));
    const lastDocId = progressEntries[0][0];
    const lastDocStatus = progressEntries[0][1].status;
    const lastDoc = transcripts.find(t => t.id === lastDocId);

    if (!lastDoc) return { resumeDoc: null, upNextDoc: null };

    if (lastDocStatus === 'in-progress') {
      return { resumeDoc: lastDoc, upNextDoc: null };
    } else if (lastDocStatus === 'completed') {
      const seriesDocs = transcripts.filter(t => t.series === lastDoc.series);
      const currentIndex = seriesDocs.findIndex(t => t.id === lastDoc.id);

      if (currentIndex !== -1 && currentIndex + 1 < seriesDocs.length) {
        for (let i = currentIndex + 1; i < seriesDocs.length; i++) {
          const docProgress = readingProgress[seriesDocs[i].id];
          if (!docProgress || docProgress.status !== 'completed') {
            return { resumeDoc: null, upNextDoc: seriesDocs[i] };
          }
        }
      }
    }
    return { resumeDoc: null, upNextDoc: null };
  }, [readingProgress, transcripts]);

  const heatmapDays = useMemo(() => {
    const dailyTimeData = analytics?.dailyTime || {};
    let successfulDays = 0;

    // Count how many days in the current 28-day window met the 10-minute (600 seconds) goal
    for (let i = 0; i <= 27; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

      if ((dailyTimeData[dateStr] || 0) >= 600) {
        successfulDays++;
      }
    }

    // Generate an array of 28 blocks, filling them with green from left to right based on the count
    const blocks = [];
    for (let i = 0; i <= 27; i++) {
      blocks.push({
        metGoal: i < successfulDays
      });
    }
    return blocks;
  }, [analytics]);

  const [expandedSeries, setExpandedSeries] = useState({});
  const [dashExpanded, setDashExpanded] = useState({});

  const toggleSeries = (seriesName) => setExpandedSeries(prev => ({ ...prev, [seriesName]: !prev[seriesName] }));
  const toggleDashSeries = (seriesName) => setDashExpanded(prev => ({ ...prev, [seriesName]: !prev[seriesName] }));

  const groupedTranscripts = useMemo(() => {
    return transcripts.reduce((acc, doc) => {
      const seriesName = doc.series || (doc.title.includes(' - ') ? doc.title.split(' - ')[0] : 'General Transcripts');
      if (!acc[seriesName]) acc[seriesName] = [];
      acc[seriesName].push(doc);
      return acc;
    }, {});
  }, [transcripts]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const results = [];

    transcripts.forEach(doc => {
      const matches = [];
      (doc.content || []).forEach(block => {
        if (block.text && block.text.toLowerCase().includes(query)) {
          matches.push(block.text);
        }
      });
      const titleMatch = (doc.title || '').toLowerCase().includes(query);
      const seriesMatch = (doc.series || '').toLowerCase().includes(query);

      if (matches.length > 0 || titleMatch || seriesMatch) {
        results.push({ doc, matches });
      }
    });
    return results;
  }, [searchQuery, transcripts]);

  const getSnippet = (text, q) => {
    const qLower = q.toLowerCase();
    const textLower = text.toLowerCase();
    const index = textLower.indexOf(qLower);
    if (index === -1) return text.substring(0, 150) + "...";

    const start = Math.max(0, index - 80);
    const end = Math.min(text.length, index + q.length + 80);

    let snippet = text.substring(start, end);
    if (start > 0) snippet = "..." + snippet;
    if (end < text.length) snippet = snippet + "...";
    return snippet;
  };

  const highlightMatch = (text, q) => {
    if (!q) return text;
    const parts = text.split(new RegExp(`(${q})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase()
        ? <strong key={i} className="bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 font-bold px-0.5 rounded">{part}</strong>
        : part
    );
  };

  const openReader = (doc) => {
    setActiveDoc(doc);
    setCurrentView('reader');

    const savedData = JSON.parse(localStorage.getItem('kisa_progress') || '{}');
    const docData = savedData[doc.id] || { position: 0, percentage: 0, status: 'in-progress' };

    docData.lastAccessed = Date.now();
    if (docData.status !== 'completed') docData.status = 'in-progress';

    savedData[doc.id] = docData;
    localStorage.setItem('kisa_progress', JSON.stringify(savedData));
    setReadingProgress(savedData);

    // Log a daily activity point just for studying!
    const dateObj = new Date();
    const today = dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + String(dateObj.getDate()).padStart(2, '0');

    setAnalytics(prev => {
      const newAnalytics = { ...prev };
      newAnalytics.history = { ...(prev.history || {}) };
      newAnalytics.history[today] = (newAnalytics.history[today] || 0) + 1;
      localStorage.setItem('kisa_analytics', JSON.stringify(newAnalytics));
      return newAnalytics;
    });
  };

  const closeReader = () => {
    setCurrentView('home');
    setActiveDoc(null);
    setSearchQuery('');
  };

  useEffect(() => {
    if (currentView !== 'reader' || !activeDoc) return;

    // This timer ticks every 10 seconds you are actively reading
    const timer = setInterval(() => {
      setAnalytics(prev => {
        const currentSecs = prev.totalSeconds !== undefined ? prev.totalSeconds : (prev.totalMinutes * 60 || 0);

        // Get today's exact date string
        const dateObj = new Date();
        const todayStr = dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + String(dateObj.getDate()).padStart(2, '0');

        // Add 10 seconds to today's specific tracking log
        const dailyTimeData = prev.dailyTime || {};
        const todaySecs = (dailyTimeData[todayStr] || 0) + 10;

        const updated = {
          ...prev,
          totalSeconds: currentSecs + 10,
          dailyTime: { ...dailyTimeData, [todayStr]: todaySecs } // Saves today's progress
        };
        localStorage.setItem('kisa_analytics', JSON.stringify(updated));
        return updated;
      });
    }, 10000);

    return () => clearInterval(timer);
  }, [currentView, activeDoc]);

  // Smoother, slower Firework Handler
  const handleMarkAsRead = () => {
    setIsExploding(true);

    setTimeout(() => {
      setIsExploding(false);
      const now = Date.now();
      const dateObj = new Date();
      const today = dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + String(dateObj.getDate()).padStart(2, '0');

      const currentSavedData = JSON.parse(localStorage.getItem('kisa_progress') || '{}');
      currentSavedData[activeDoc.id] = {
        ...currentSavedData[activeDoc.id],
        status: 'completed',
        percentage: 100,
        lastAccessed: now
      };
      localStorage.setItem('kisa_progress', JSON.stringify(currentSavedData));
      setReadingProgress(currentSavedData);

      setAnalytics(prev => {
        const newAnalytics = { ...prev };
        newAnalytics.history = { ...(prev.history || {}) };
        newAnalytics.totalCompleted += 1;
        newAnalytics.history[today] = (newAnalytics.history[today] || 0) + 1;
        localStorage.setItem('kisa_analytics', JSON.stringify(newAnalytics));
        return newAnalytics;
      });

      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }, 1200); // Wait 1.2s for fireworks to complete
  };

  const handleResetProgress = () => {
    const currentSavedData = JSON.parse(localStorage.getItem('kisa_progress') || '{}');
    if (currentSavedData[activeDoc.id]) {
      currentSavedData[activeDoc.id] = {
        ...currentSavedData[activeDoc.id],
        status: 'unread',
        percentage: 0
      };
      localStorage.setItem('kisa_progress', JSON.stringify(currentSavedData));
      setReadingProgress(currentSavedData);

      setAnalytics(prev => {
        const newAnalytics = { ...prev };
        newAnalytics.history = { ...(prev.history || {}) };
        newAnalytics.totalCompleted = Math.max(0, newAnalytics.totalCompleted - 1);
        localStorage.setItem('kisa_analytics', JSON.stringify(newAnalytics));
        return newAnalytics;
      });
    }
  };

  const nextDocInSeries = useMemo(() => {
    if (!activeDoc || !activeDoc.series) return null;
    const seriesDocs = transcripts.filter(t => t.series === activeDoc.series);
    const currentIndex = seriesDocs.findIndex(t => t.id === activeDoc.id);
    for (let i = currentIndex + 1; i < seriesDocs.length; i++) {
      const docProgress = readingProgress[seriesDocs[i].id];
      if (!docProgress || docProgress.status !== 'completed') {
        return seriesDocs[i];
      }
    }
    return null;
  }, [activeDoc, transcripts, readingProgress]);

  const readingTime = useMemo(() => {
    if (!activeDoc) return 0;
    const textString = (activeDoc.content || []).map(b => b.text || '').join(' ');
    const wordCount = textString.trim().split(/\s+/).length;
    return Math.ceil(wordCount / 200);
  }, [activeDoc]);

  let seriesTitle = activeDoc?.series;
  let mainTitle = activeDoc?.title;
  if (activeDoc && !seriesTitle && activeDoc.title.includes(' - ')) {
    const parts = activeDoc.title.split(' - ');
    seriesTitle = parts[0];
    mainTitle = parts.slice(1).join(' - ');
  } else if (activeDoc && seriesTitle && activeDoc.title.startsWith(seriesTitle + ' - ')) {
    mainTitle = activeDoc.title.replace(seriesTitle + ' - ', '');
  }

  const tocItems = activeDoc ? (activeDoc.content || [])
    .map((block, index) => ({ ...block, index }))
    .filter(block => block.type === 'h2') : [];

  const scrollToSegment = (idx) => {
    const el = document.getElementById(`segment-${idx}`);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (currentView !== 'reader' || !activeDoc) return;

    setIsTocOpen(false);
    const savedData = JSON.parse(localStorage.getItem('kisa_progress') || '{}');
    const docData = savedData[activeDoc.id];

    if (docData && docData.position > 300) {
      setTimeout(() => {
        window.scrollTo({ top: docData.position, behavior: 'auto' });
        setResumeToast(true);
        setTimeout(() => setResumeToast(false), 3000);
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY;
          if (y >= maxScrollYRef.current - 50) maxScrollYRef.current = Math.max(y, maxScrollYRef.current);

          const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
          const scrolled = height > 0 ? (y / height) * 100 : 0;

          if (progressBarRef.current) progressBarRef.current.style.width = `${scrolled}%`;

          if (y < 100) isZenModeRef.current = false;
          else if (y > lastScrollYRef.current + 12) isZenModeRef.current = true;
          else if (y < lastScrollYRef.current - 12) isZenModeRef.current = false;
          lastScrollYRef.current = y;

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
              stickySegmentRef.current.style.transform = 'translateY(-20px)';
            }
          }

          const now = Date.now();
          if (now - lastSaveTimeRef.current > 1000) {
            const currentSavedData = JSON.parse(localStorage.getItem('kisa_progress') || '{}');
            const currentStatus = currentSavedData[activeDoc.id]?.status;

            const newStatus = currentStatus === 'completed' ? 'completed' : (scrolled > 2 ? 'in-progress' : 'unread');

            currentSavedData[activeDoc.id] = {
              position: y,
              percentage: scrolled,
              status: newStatus,
              lastAccessed: now
            };
            localStorage.setItem('kisa_progress', JSON.stringify(currentSavedData));

            if (currentStatus !== newStatus) setReadingProgress(currentSavedData);
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
  }, [currentView, activeDoc]);

  const jumpBack = () => window.scrollTo({ top: maxScrollYRef.current, behavior: 'smooth' });

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
                      onClick={() => { openReader(doc); setIsMobileDrawerOpen(false); }}
                      className={`text-left py-2.5 px-3 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${activeDoc?.id === doc.id ? 'bg-zinc-50 dark:bg-[#1c1c1e] text-zinc-900 dark:text-white font-bold shadow-sm border border-zinc-200 dark:border-zinc-700' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 border border-transparent hover:bg-zinc-50 dark:hover:bg-[#2c2c2e]'}`}
                    >
                      <span className="text-sm leading-snug block flex-1">{displayTitle}</span>
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
      <div className="h-10 md:hidden shrink-0" />
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
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block ml-1 mb-2">Archive List</span>
        <ArchiveList />
      </div>
    </div>
  );

  if (currentView === 'home') {
    const totalSecs = analytics.totalSeconds !== undefined ? analytics.totalSeconds : (analytics.totalMinutes * 60 || 0);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);

    return (
      <div className="w-full min-h-screen pt-24 sm:pt-32 pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col pointer-events-auto">

        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-4xl sm:text-5xl font-serif font-bold text-zinc-900 dark:text-white mb-3">Digital Archive</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-lg">Explore translated scholarly series and foundational lectures.</p>
        </div>

        <div className="w-full bg-white dark:bg-[#1c1c1e] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 mb-10 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex gap-8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Total Completed</p>
              <p className="text-3xl font-serif font-bold text-zinc-900 dark:text-white">{analytics.totalCompleted} <span className="text-sm font-sans text-zinc-500 font-normal">transcripts</span></p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Reading Time</p>
              <p className="text-3xl font-serif font-bold text-zinc-900 dark:text-white">
                {hrs > 0 && <>{hrs}<span className="text-sm font-sans text-zinc-500 font-normal mr-1">h</span></>}
                {mins}<span className="text-sm font-sans text-zinc-500 font-normal">m</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end w-full md:w-auto">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-1.5"><History className="w-3 h-3" /> 28-Day Activity</p>
            <div className="flex gap-1 flex-wrap">
              {heatmapDays.map((block, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 sm:w-4 sm:h-4 rounded-sm transition-colors ${block.metGoal
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                    : 'bg-zinc-100 dark:bg-zinc-800'
                    }`}
                />
              ))}
            </div>
          </div>
        </div>

        {!searchQuery.trim() && (resumeDoc || upNextDoc) && (() => {
          const targetDoc = resumeDoc || upNextDoc;
          const isUpNext = !!upNextDoc;

          let targetSeries = targetDoc.series;
          let targetDisplayTitle = targetDoc.title;

          if (!targetSeries && targetDoc.title.includes(' - ')) {
            targetSeries = targetDoc.title.split(' - ')[0];
            targetDisplayTitle = targetDoc.title.split(' - ').slice(1).join(' - ');
          } else if (targetSeries && targetDoc.title.startsWith(targetSeries + ' - ')) {
            targetDisplayTitle = targetDoc.title.replace(targetSeries + ' - ', '');
          }

          return (
            <div
              onClick={() => openReader(targetDoc)}
              className={`w-full bg-gradient-to-r ${isUpNext ? 'from-emerald-500/5' : 'from-[#c6a87c]/10'} to-transparent border ${isUpNext ? 'border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/5 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-[#c6a87c]/30 hover:bg-[#c6a87c]/20'} rounded-2xl p-6 sm:p-8 mb-12 cursor-pointer transition-all duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-sm group`}
            >
              <div>
                <div className="flex items-center flex-wrap gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    {isUpNext ? <List className="w-4 h-4 text-emerald-500" /> : <Clock className="w-4 h-4 text-[#c6a87c]" />}
                    <span className={`${isUpNext ? 'text-emerald-500' : 'text-[#c6a87c]'} font-bold text-[10px] sm:text-xs uppercase tracking-widest`}>
                      {isUpNext ? 'Up Next' : 'Continue Reading'}
                    </span>
                  </div>
                  {targetSeries && (
                    <>
                      <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">•</span>
                      <span className="text-zinc-500 dark:text-zinc-400 font-bold text-[10px] sm:text-xs uppercase tracking-widest bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-md border border-zinc-200/50 dark:border-zinc-700/50">
                        {targetSeries}
                      </span>
                    </>
                  )}
                </div>
                <h2 className={`text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white transition-colors ${isUpNext ? 'group-hover:text-emerald-500' : 'group-hover:text-[#c6a87c]'}`}>{targetDisplayTitle}</h2>

                {!isUpNext && (
                  <div className="w-48 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mt-4 overflow-hidden">
                    <div className="h-full bg-[#c6a87c]" style={{ width: `${readingProgress[targetDoc.id]?.percentage || 0}%` }} />
                  </div>
                )}
              </div>
              <div className={`w-12 h-12 rounded-full bg-white dark:bg-[#1c1c1e] shadow-md border ${isUpNext ? 'border-emerald-500/30' : 'border-[#c6a87c]/30'} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                <ChevronRight className={`w-6 h-6 ${isUpNext ? 'text-emerald-500' : 'text-[#c6a87c]'}`} />
              </div>
            </div>
          );
        })()}

        <form onSubmit={(e) => { e.preventDefault(); document.activeElement?.blur(); }} className="relative mb-12">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-zinc-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-12 pr-4 py-4 sm:py-5 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-[#1c1c1e] shadow-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#c6a87c] focus:border-transparent transition-all"
            placeholder="Search all transcripts by specific words or phrases..."
          />
          {searchQuery.trim() && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                {searchResults.length} {searchResults.length === 1 ? 'doc' : 'docs'}
              </span>
              <button type="button" onClick={() => setSearchQuery('')} className="p-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </form>

        {searchQuery.trim() ? (
          <div className="flex flex-col gap-5">
            {searchResults.length === 0 ? (
              <div className="text-center py-20 text-zinc-500 italic">No matches found for "{searchQuery}"</div>
            ) : (
              searchResults.map((res, idx) => (
                <div
                  key={idx}
                  onClick={() => openReader(res.doc)}
                  className="bg-white dark:bg-[#1c1c1e] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 cursor-pointer hover:shadow-lg hover:border-[#c6a87c]/50 transition-all duration-300 group"
                >
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{res.doc.series}</span>
                  <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mt-1 mb-4 group-hover:text-[#c6a87c] transition-colors">{res.doc.title.replace(res.doc.series + ' - ', '')}</h3>

                  {res.matches.length > 0 && (
                    <div className="flex flex-col gap-3">
                      {res.matches.slice(0, 3).map((match, mIdx) => (
                        <p key={mIdx} className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 font-serif leading-relaxed border-l-2 border-[#c6a87c]/30 pl-4 py-1">
                          {highlightMatch(getSnippet(match, searchQuery), searchQuery)}
                        </p>
                      ))}
                      {res.matches.length > 3 && (
                        <span className="text-xs text-zinc-400 italic pl-4">+ {res.matches.length - 3} more matches inside</span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

        ) : (

          <div className="flex flex-col gap-8">
            {Object.entries(groupedTranscripts).map(([groupSeriesName, docs]) => (
              <div key={groupSeriesName} className="bg-white dark:bg-[#1c1c1e] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden transition-all">

                <button
                  onClick={() => toggleDashSeries(groupSeriesName)}
                  className="flex items-center justify-between w-full p-5 sm:p-6 cursor-pointer hover:bg-zinc-50 dark:hover:bg-[#252528] transition-colors group"
                >
                  <h2 className="text-xl sm:text-2xl font-sans font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-200 flex items-center gap-3">
                    <LibraryIcon className="w-6 h-6 text-[#c6a87c]" />
                    {groupSeriesName}
                  </h2>
                  <div className={`p-2 rounded-full transition-colors ${dashExpanded[groupSeriesName] ? 'bg-[#c6a87c]/10 text-[#c6a87c]' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:text-[#c6a87c]'}`}>
                    {dashExpanded[groupSeriesName] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                <AnimatePresence>
                  {dashExpanded[groupSeriesName] && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-zinc-200 dark:border-zinc-800">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 p-5 sm:p-6 bg-zinc-50/50 dark:bg-[#161618]">
                        {docs.map(doc => {
                          const displayTitle = doc.title.startsWith(groupSeriesName + ' - ') ? doc.title.replace(groupSeriesName + ' - ', '') : doc.title;
                          const status = readingProgress[doc.id]?.status || 'unread';
                          const progress = readingProgress[doc.id]?.percentage || 0;

                          return (
                            <div
                              key={doc.id}
                              onClick={() => openReader(doc)}
                              className="bg-white dark:bg-[#1c1c1e] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 cursor-pointer hover:shadow-lg hover:border-[#c6a87c]/50 transition-all duration-300 flex flex-col justify-between group h-full relative overflow-hidden"
                            >
                              {status === 'in-progress' && (
                                <div className="absolute top-0 left-0 w-full h-1 bg-zinc-100 dark:bg-zinc-800">
                                  <div className="h-full bg-[#c6a87c]" style={{ width: `${progress}%` }} />
                                </div>
                              )}
                              {status === 'completed' && <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />}

                              <div>
                                <div className="flex justify-between items-start mb-4">
                                  <span className="text-[10px] font-bold uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-1 rounded">
                                    {doc.speaker}
                                  </span>
                                  {status === 'completed' ? (
                                    <Check className="w-4 h-4 text-emerald-500" />
                                  ) : (
                                    <BookOpen className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:text-[#c6a87c] transition-colors" />
                                  )}
                                </div>
                                <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white leading-snug mb-2 group-hover:text-[#c6a87c] transition-colors line-clamp-3">
                                  {displayTitle}
                                </h3>
                              </div>

                              <div className="mt-5 flex items-center justify-between text-zinc-400">
                                <span className="text-xs font-semibold uppercase tracking-wider">Read</span>
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

        )}
      </div>
    );
  }

  // FIX: Safety guard to prevent blank screen crashes on transition
  if (!activeDoc) return null;

  return (
    <div className="w-full min-h-screen pt-20 sm:pt-32 pb-32 flex flex-col items-center font-sans relative px-0 sm:px-6 lg:px-8">

      <div className="w-full max-w-[1400px] mx-auto mb-6 px-4 sm:px-0 flex justify-start pointer-events-auto">
        <button
          onClick={closeReader}
          className="flex items-center gap-2 text-zinc-500 hover:text-[#c6a87c] transition-colors text-xs sm:text-sm font-bold uppercase tracking-widest cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      </div>

      <div className="fixed top-0 left-0 w-full h-1 z-[300] bg-zinc-200/50 dark:bg-zinc-800/50">
        <div ref={progressBarRef} className="h-full bg-[#c6a87c] will-change-[width]" style={{ width: '0%' }} />
      </div>

      <div
        ref={stickySegmentRef}
        className="fixed top-1 left-0 w-full z-[250] py-1.5 px-4 text-center text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 bg-[#fbfbfb]/95 dark:bg-[#1c1c1e]/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 shadow-sm transition-all duration-300 pointer-events-none will-change-transform truncate"
        style={{ opacity: 0, transform: 'translateY(-20px)' }}
      />

      <AnimatePresence>
        {resumeToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[400] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2.5 rounded-full shadow-2xl text-[10px] sm:text-xs font-bold uppercase tracking-widest flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#c6a87c]" /> Resumed where you left off
          </motion.div>
        )}
      </AnimatePresence>

      <button
        ref={returnDesktopRef} onClick={jumpBack}
        style={{ opacity: 0, pointerEvents: 'none', transform: 'translateY(-50%) translateX(20px)' }}
        className="hidden md:flex fixed top-1/2 right-4 lg:right-6 z-[100] bg-white dark:bg-[#252528] text-[#c6a87c] border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-full shadow-2xl flex-col items-center gap-3 cursor-pointer hover:scale-105 transition-all duration-300"
      >
        <span style={{ writingMode: 'vertical-rl' }} className="text-[10px] font-bold uppercase tracking-widest mb-2 mt-1">Return to Reading</span>
        <ArrowDown className="w-4 h-4 animate-bounce mb-1" />
      </button>

      <button
        ref={returnMobileRef} onClick={jumpBack}
        style={{ opacity: 0, pointerEvents: 'none', transform: 'translateY(20px) scale(0.8)' }}
        className="md:hidden fixed bottom-[88px] right-3 z-[100] w-12 h-12 bg-zinc-900 dark:bg-[#e4d3ba] text-[#d4b78f] dark:text-[#5c4a30] border border-zinc-700 dark:border-zinc-300 rounded-full shadow-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300"
      >
        <span className="font-extrabold text-[14px] leading-none mt-1">R</span>
        <ArrowDown className="w-3.5 h-3.5 animate-bounce mt-0.5" />
      </button>

      <div ref={desktopFabRef} className="hidden md:block fixed top-32 left-8 z-50 transition-all duration-300 will-change-transform pointer-events-auto">
        <AnimatePresence>
          {!isArchiveOpen && (
            <motion.button initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onClick={() => setIsArchiveOpen(true)} className="p-3 bg-white dark:bg-[#252528] border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-full text-zinc-500 hover:text-[#c6a87c] transition-colors cursor-pointer group" title="Open Archive Menu">
              <List className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <button
        ref={mobileFabRef} onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
        className="md:hidden fixed bottom-6 right-3 z-[210] w-12 h-12 bg-white dark:bg-[#252528] text-[#c6a87c] border border-zinc-200 dark:border-zinc-800 rounded-full shadow-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 will-change-transform"
      >
        <AnimatePresence mode="wait">
          {isMobileDrawerOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><X className="w-5 h-5 text-zinc-500" /></motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><List className="w-5 h-5" /></motion.div>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {isMobileDrawerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileDrawerOpen(false)} className="md:hidden fixed inset-0 bg-black/40 z-[190] cursor-pointer backdrop-blur-sm" style={{ touchAction: 'none' }} />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="md:hidden fixed top-0 bottom-0 left-0 w-[85vw] max-w-[340px] bg-white dark:bg-[#1c1c1e] z-[200] shadow-2xl border-r border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden">
              <LibraryTools isMobile={true} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="w-full max-w-[1400px] mx-auto flex items-start gap-0 md:gap-8 lg:gap-12">
        <motion.div animate={{ width: isArchiveOpen ? 320 : 0, opacity: isArchiveOpen ? 1 : 0 }} transition={{ duration: 0.4, ease: "easeInOut" }} className="hidden md:block shrink-0 overflow-hidden sticky top-32 self-start h-[calc(100vh-140px)]">
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
                <button onClick={() => setIsTocOpen(!isTocOpen)} className="w-full flex items-center justify-between px-5 sm:px-6 py-4 cursor-pointer hover:bg-zinc-100 dark:hover:bg-[#252528] transition-colors">
                  <div className="flex items-center gap-3">
                    <List className="w-5 h-5 text-[#c6a87c]" />
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Table of Contents</span>
                  </div>
                  {isTocOpen ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                </button>
                <AnimatePresence>
                  {isTocOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-5 sm:px-6 pb-5 pt-2 flex flex-col gap-3 border-t border-zinc-200 dark:border-zinc-800/80 mx-2">
                        {tocItems.map((item) => (
                          <button key={item.index} onClick={() => scrollToSegment(item.index)} className="text-left text-sm sm:text-base font-medium text-zinc-600 dark:text-zinc-400 hover:text-[#c6a87c] dark:hover:text-[#d4b78f] transition-colors flex items-start gap-3 group cursor-pointer">
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
              {(activeDoc.content || []).map((block, idx) => {
                if (block.type === 'h2') return <h2 id={`segment-${idx}`} key={idx} className="segment-header font-bold text-zinc-900 dark:text-white mt-14 mb-6 tracking-tight scroll-mt-24 font-sans" style={{ fontSize: `${fontSize * 1.3}px`, lineHeight: 1.3 }}>{block.text}</h2>;
                if (block.type === 'summary') return (
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

            {/* MINIMALIST EDITORIAL: MARK AS READ & UP NEXT BUTTON SECTION WITH JUTTER FIX */}
            <div className="mt-16 pt-12 border-t border-zinc-200 dark:border-zinc-800/80 flex flex-col items-center min-h-[140px] justify-center">
              <AnimatePresence mode="wait">
                {readingProgress[activeDoc.id]?.status === 'completed' ? (
                  <motion.div
                    key="completed-state"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      {nextDocInSeries ? (
                        <button
                          onClick={() => openReader(nextDocInSeries)}
                          className="px-6 py-2.5 bg-zinc-50 dark:bg-[#1c1c1e] text-zinc-800 dark:text-zinc-200 font-bold rounded-full border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-[#c6a87c] hover:text-[#c6a87c] transition-all duration-300 flex items-center gap-2 text-xs uppercase tracking-widest cursor-pointer"
                        >
                          <span>Start Next Episode</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 text-[#c6a87c]">
                          <Check className="w-4 h-4" />
                          <span className="font-serif italic text-lg sm:text-xl text-zinc-600 dark:text-zinc-400">Series Completed.</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleResetProgress}
                      className="text-[10px] uppercase tracking-widest text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors mt-2 cursor-pointer"
                    >
                      Reset Progress
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="unread-state"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                  >
                    <button
                      onClick={handleMarkAsRead}
                      className={`relative overflow-hidden px-8 py-3 bg-transparent border ${isExploding ? 'border-[#10b981]' : 'border-zinc-300 dark:border-zinc-700 hover:border-[#c6a87c] hover:text-[#c6a87c]'} text-zinc-600 dark:text-zinc-400 font-bold rounded-full transition-all duration-300 flex items-center gap-2 text-xs uppercase tracking-widest cursor-pointer`}
                    >
                      <AnimatePresence>
                        {isExploding && (
                          <motion.div
                            initial={{ opacity: 0.8, backgroundColor: "#10b981" }}
                            animate={{ opacity: 0 }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                            className="absolute inset-0 z-0"
                          />
                        )}
                      </AnimatePresence>

                      {isExploding && (
                        <div className="absolute inset-0 z-0 flex items-center justify-center">
                          {Array.from({ length: 25 }).map((_, i) => {
                            const angle = (i / 25) * Math.PI * 2;
                            const distance = 30 + Math.random() * 40;
                            const isGold = Math.random() > 0.5;
                            return (
                              <motion.div
                                key={i}
                                initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                                animate={{
                                  x: Math.cos(angle) * distance,
                                  y: Math.sin(angle) * distance,
                                  scale: 0,
                                  opacity: 0
                                }}
                                transition={{ duration: 1.2, ease: "easeOut" }}
                                className={`absolute w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${isGold ? 'bg-[#c6a87c]' : 'bg-white'}`}
                              />
                            );
                          })}
                        </div>
                      )}

                      <Check className={`w-4 h-4 relative z-10 transition-colors ${isExploding ? 'text-white' : ''}`} />
                      <span className={`relative z-10 transition-colors ${isExploding ? 'text-white' : ''}`}>Mark as Read</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
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

  // --- AUTHENTICATION & SESSION STATE ---
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState({ text: '', type: '' });

  // THE MISSING PIECE RESTORED:
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const [vaultItems, setVaultItems] = useState([]);

  const [vaultSearch, setVaultSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState('All');
  const [expandedVaultItems, setExpandedVaultItems] = useState({});
  const [newFolderInput, setNewFolderInput] = useState('');
  const [movingItemId, setMovingItemId] = useState(null);
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(true);

  // Extract unique folders from user's saved items
  const customFolders = useMemo(() => {
    const folders = new Set(vaultItems.map(item => item.folder_name).filter(Boolean));
    return Array.from(folders).sort();
  }, [vaultItems]);

  const filteredVaultItems = useMemo(() => {
    let filtered = vaultItems;
    if (activeFolder === 'Uncategorized') filtered = filtered.filter(item => !item.folder_name);
    else if (activeFolder !== 'All') filtered = filtered.filter(item => item.folder_name === activeFolder);

    if (vaultSearch.trim()) {
      const q = vaultSearch.toLowerCase();
      filtered = filtered.filter(item => (item.content && item.content.toLowerCase().includes(q)) || (item.source && item.source.toLowerCase().includes(q)));
    }
    return filtered;
  }, [vaultItems, activeFolder, vaultSearch]);

  const toggleVaultExpand = (id) => setExpandedVaultItems(prev => ({ ...prev, [id]: !prev[id] }));

  const assignToFolder = async (itemId, folderName) => {
    // 1. Optimistic Update
    setVaultItems(prev => prev.map(item => item.id === itemId ? { ...item, folder_name: folderName } : item));
    setMovingItemId(null);

    // 2. Cloud Sync
    const { error } = await supabase.from('vault_items').update({ folder_name: folderName }).eq('id', itemId);
    if (error) {
      alert(`Supabase Error: ${error.message}`);
      fetchVaultItems(); // Reverts the UI
    }
  };


  const fetchVaultItems = async () => {
    if (!user) return;
    const { data } = await supabase.from('vault_items').select('*').order('created_at', { ascending: false });
    if (data) setVaultItems(data);
  };

  useEffect(() => {
    if (user) fetchVaultItems();
    else setVaultItems([]);

    // Listen for custom save events from anywhere in the app to instantly refresh!
    const handleVaultUpdate = () => fetchVaultItems();
    window.addEventListener('vault-updated', handleVaultUpdate);
    return () => window.removeEventListener('vault-updated', handleVaultUpdate);
  }, [user]);

  useEffect(() => {
    // 1. Check for an active session when the app loads
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    // 2. Listen silently in the background for login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      setAuthMessage({ text: 'Please enter both email and password.', type: 'error' });
      return;
    }
    if (authPassword.length < 6) {
      setAuthMessage({ text: 'Password must be at least 6 characters.', type: 'error' });
      return;
    }

    setAuthLoading(true);
    setAuthMessage({ text: '', type: '' });

    let error;
    if (isSignUp) {
      // Create new account
      const { data, error: signUpError } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
      error = signUpError;
      // Catch if user already exists
      if (!error && data?.user?.identities?.length === 0) {
        error = { message: "An account with this email already exists. Please sign in." };
      } else if (!error) {
        setAuthMessage({ text: 'Account created! You are now signed in.', type: 'success' });
        setTimeout(() => { setShowAuthModal(false); setAuthPassword(''); }, 1500);
      }
    } else {
      // Log into existing account
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      error = signInError;
      if (!error) {
        setShowAuthModal(false);
        setAuthPassword('');
      }
    }

    if (error) setAuthMessage({ text: error.message, type: 'error' });
    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setShowVault(false);
  };

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

  // --- GHOST SCHOLAR TYPING EFFECT ---
  const [ghostText, setGhostText] = useState('');
  const [ghostIndex, setGhostIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Only run the typing effect if we are on the Search tab and in Concept mode
    if (activeTab !== 'search' || isKeyword) return;

    const ghostPhrases = [
      "Search the concept of Bada'...",
      "Importance of knowing your Imam...",
      "Find hadiths regarding the intellect...",
      "Trace the attributes of the Ahl al-Bayt...",
      "Find rulings for the traveller's prayer..."
    ];

    const currentPhrase = ghostPhrases[ghostIndex];
    let timer;

    if (isDeleting) {
      timer = setTimeout(() => {
        setGhostText(currentPhrase.substring(0, ghostText.length - 1));
        if (ghostText.length <= 1) {
          setIsDeleting(false);
          setGhostIndex((prev) => (prev + 1) % ghostPhrases.length);
        }
      }, 35); // Erasing speed
    } else {
      if (ghostText.length === currentPhrase.length) {
        timer = setTimeout(() => setIsDeleting(true), 3000); // Pause for 3 seconds when finished
      } else {
        timer = setTimeout(() => {
          setGhostText(currentPhrase.substring(0, ghostText.length + 1));
        }, 65); // Typing speed
      }
    }
    return () => clearTimeout(timer);
  }, [ghostText, isDeleting, ghostIndex, activeTab, isKeyword]);

  // --- MAGNETIC BUTTON PHYSICS ---
  const [magneticPos, setMagneticPos] = useState({ x: 0, y: 0 });
  const btnRef = useRef(null);

  const appBgClass = activeTab === 'quran' ? (theme === 'dark' ? 'bg-[#121212] text-slate-100' : 'bg-[#f4ecd8] text-slate-900') :
    (activeTab === 'library' ? (theme === 'dark' ? 'bg-[#1c1c1e] text-zinc-100' : 'bg-[#f4f4f5] text-zinc-900') :
      (theme === 'dark' ? 'bg-[#030A06] text-[#FAFAFA]' : 'bg-[#EAE4D3] text-[#2D241C]'));
  const isMapView = activeTab === 'search' && data && viewMode === 'map' && !loading;
  const lockMainScreen = isMapView;

  return (
    <div className={`min-h-screen w-full transition-colors duration-700 flex flex-col relative ${lockMainScreen ? 'overflow-hidden h-screen' : ''} ${appBgClass}`} style={{ WebkitOverflowScrolling: 'touch' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Amiri:wght@400;700&family=Scheherazade+New:wght@400;700&family=Noto+Naskh+Arabic:wght@400;700&display=swap');
        
        @font-face {
          font-family: 'XBZarFont';
          src: url('https://cdn.jsdelivr.net/gh/rastikerdar/xb-zar@v1.1.1/fonts/woff2/XBZar.woff2') format('woff2');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }

        html { overflow-y: scroll !important; }
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; -webkit-overflow-scrolling: touch; overscroll-behavior-y: contain; }
        .smart-scrollbar { --thumb-bg: transparent; scrollbar-width: thin; scrollbar-color: var(--thumb-bg) transparent; -webkit-overflow-scrolling: touch; overscroll-behavior-y: contain; }
        
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background-color: rgba(198, 168, 124, 0.15); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background-color: rgba(198, 168, 124, 0.8) !important; }
        
        .gilded-noise {
          position: absolute; inset: 0; z-index: 0; opacity: 0.04; pointer-events: none; mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }
        
        .gilded-halo {
          position: absolute; inset: 0;
          background: radial-gradient(circle at 50% 42%, rgba(198, 168, 124, 0.08) 0%, rgba(6, 33, 22, 0.75) 45%, rgba(2, 6, 4, 1) 100%);
          pointer-events: none; z-index: 0;
        }

        .parchment-halo {
          position: absolute; inset: 0;
          background: radial-gradient(circle at 50% 40%, rgba(253, 251, 247, 0.4) 0%, rgba(234, 228, 211, 0) 70%);
          pointer-events: none; z-index: 0;
        }

        .hover-sheen {
          position: absolute !important;
          overflow: hidden;
        }
        .hover-sheen::after {
          content: "";
          position: absolute;
          top: 0;
          left: -150%;
          width: 50%;
          height: 100%;
          background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.85), transparent);
          transform: skewX(-25deg);
          transition: left 0.45s ease-in-out;
          pointer-events: none;
        }
        .hover-sheen:hover::after {
          left: 200%;
        }
      `}</style>

      {showMobileMenu && <div className="fixed inset-0 z-[70] pointer-events-auto" onClick={() => setShowMobileMenu(false)} />}

      {/* --- THE SCHOLAR'S VAULT MODAL (INDUSTRIAL LOCKBOX) --- */}
      <AnimatePresence>
        {showVault && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[6000] flex items-center justify-center p-4 sm:p-6 bg-neutral-950/80 backdrop-blur-sm pointer-events-auto">
            {/* The Heavy Metal Lockbox */}
            <motion.div initial={{ scale: 0.98, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.98, y: 10 }} transition={{ duration: 0.2 }} className="relative w-full max-w-6xl h-[90vh] flex flex-col md:flex-row bg-neutral-900 border border-neutral-700 rounded-xl shadow-[0_30px_60px_rgba(0,0,0,0.9)] overflow-hidden">

              {/* SIDEBAR: FOLDERS (Horizontal Tabs on Mobile, Vertical Panel on Desktop) */}
              <div className="w-full md:w-64 lg:w-72 bg-neutral-800 border-b-2 md:border-b-0 md:border-r-2 border-neutral-950 flex flex-col shrink-0 z-20 shadow-[0_8px_30px_rgba(0,0,0,0.6)] md:shadow-[8px_0_30px_rgba(0,0,0,0.6)] relative">
                <div className="p-4 md:p-6 flex justify-between items-center bg-neutral-800 shrink-0">
                  <h2 className="font-serif text-lg md:text-xl font-bold text-neutral-100 flex items-center gap-2 md:gap-3 tracking-wide">
                    <Bookmark className="w-4 h-4 md:w-5 md:h-5 text-[#B56D43]" /> THE VAULT
                  </h2>
                  <button onClick={() => setShowVault(false)} className="md:hidden p-1.5 text-neutral-400 hover:text-white bg-neutral-900 rounded-md border border-neutral-700 transition-colors shadow-inner"><X className="w-4 h-4" /></button>
                </div>

                {/* Desktop Vertical Folder List */}
                <div className="hidden md:block p-4 overflow-y-auto smart-scrollbar flex-grow">
                  <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 px-3">Library</div>
                  <button onClick={() => setActiveFolder('All')} className={`w-full text-left px-4 py-3 rounded-md text-sm font-bold transition-all mb-2 flex items-center gap-3 ${activeFolder === 'All' ? 'bg-neutral-900 text-[#B56D43] border-l-4 border-[#B56D43] shadow-inner' : 'text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200 border-l-4 border-transparent'}`}>All Records</button>
                  <button onClick={() => setActiveFolder('Uncategorized')} className={`w-full text-left px-4 py-3 rounded-md text-sm font-bold transition-all mb-8 flex items-center gap-3 ${activeFolder === 'Uncategorized' ? 'bg-neutral-900 text-[#B56D43] border-l-4 border-[#B56D43] shadow-inner' : 'text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200 border-l-4 border-transparent'}`}>Uncategorized</button>

                  <button onClick={() => setIsCollectionsOpen(!isCollectionsOpen)} className="w-full flex justify-between items-center text-[10px] font-bold text-neutral-500 hover:text-neutral-300 uppercase tracking-widest mb-3 px-3 transition-colors cursor-pointer group">
                    <span>Collections</span>
                    {isCollectionsOpen ? <ChevronUp className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" /> : <ChevronDown className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />}
                  </button>

                  <AnimatePresence>
                    {isCollectionsOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden flex flex-col gap-1.5">
                        {customFolders.map(folder => (
                          <button key={folder} onClick={() => setActiveFolder(folder)} className={`w-full text-left px-4 py-3 rounded-md text-sm font-bold transition-all flex items-center gap-3 ${activeFolder === folder ? 'bg-neutral-900 text-[#B56D43] border-l-4 border-[#B56D43] shadow-inner' : 'text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200 border-l-4 border-transparent'}`}>
                            <Layout className="w-3.5 h-3.5 opacity-70" /> <span className="truncate">{folder}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Mobile Horizontal Folder Row */}
                <div className="md:hidden flex items-center overflow-x-auto hide-scroll px-4 pb-4 gap-2 shrink-0 border-b border-neutral-900">
                  <button onClick={() => setActiveFolder('All')} className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all border shadow-[0_4px_10px_rgba(0,0,0,0.3)] ${activeFolder === 'All' ? 'bg-neutral-950 text-[#B56D43] border-[#B56D43]' : 'bg-neutral-800 text-neutral-400 border-neutral-600 hover:bg-neutral-700'}`}>All Records</button>
                  <button onClick={() => setActiveFolder('Uncategorized')} className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all border shadow-[0_4px_10px_rgba(0,0,0,0.3)] ${activeFolder === 'Uncategorized' ? 'bg-neutral-950 text-[#B56D43] border-[#B56D43]' : 'bg-neutral-800 text-neutral-400 border-neutral-600 hover:bg-neutral-700'}`}>Uncategorized</button>
                  {customFolders.map(folder => (
                    <button key={folder} onClick={() => setActiveFolder(folder)} className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all border shadow-[0_4px_10px_rgba(0,0,0,0.3)] flex items-center gap-2 ${activeFolder === folder ? 'bg-neutral-950 text-[#B56D43] border-[#B56D43]' : 'bg-neutral-800 text-neutral-400 border-neutral-600 hover:bg-neutral-700'}`}>
                      <Layout className="w-3 h-3 opacity-70" /> {folder}
                    </button>
                  ))}
                </div>
              </div>

              {/* MAIN CONTENT AREA (Recessed Chamber) */}
              <div className="flex-grow flex flex-col min-w-0 bg-neutral-950 relative shadow-[inset_15px_15px_40px_rgba(0,0,0,0.8)] overflow-hidden">

                {/* Header & Search */}
                <div className="px-6 py-4 md:py-5 border-b-2 border-neutral-900 flex items-center justify-between gap-4 shrink-0 z-10 relative bg-neutral-950/80 backdrop-blur-md shadow-[0_10px_20px_rgba(0,0,0,0.4)]">
                  <div className="relative flex-grow max-w-md group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-[#B56D43] transition-colors" />
                    <input type="text" value={vaultSearch} onChange={(e) => setVaultSearch(e.target.value)} placeholder="Search lockbox..." className="w-full pl-11 pr-4 py-2.5 md:py-3 bg-neutral-900 border border-neutral-700 rounded-md text-sm font-mono text-neutral-100 placeholder-neutral-600 focus:border-[#B56D43] focus:ring-1 focus:ring-[#B56D43] outline-none transition-all shadow-inner" />
                  </div>
                  <button onClick={() => setShowVault(false)} className="hidden md:flex items-center justify-center p-2.5 text-neutral-500 hover:text-white bg-neutral-800 border border-neutral-600 hover:border-neutral-400 rounded-md transition-all cursor-pointer shadow-[0_4px_10px_rgba(0,0,0,0.5)]"><X className="w-5 h-5" /></button>
                </div>

                {/* Items List */}
                <div className="flex-grow overflow-y-auto p-4 sm:p-6 md:p-8 smart-scrollbar relative z-10">
                  {filteredVaultItems.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 opacity-40">
                      <Bookmark className="w-16 h-16 mb-4 text-[#B56D43] opacity-50" />
                      <p className="text-xl font-serif text-neutral-400">Lockbox is empty.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6 md:gap-8 max-w-4xl mx-auto pb-24 md:pb-20">
                      {filteredVaultItems.map((item) => {
                        const isExpanded = expandedVaultItems[item.id];
                        const safeContent = item.content || '';
                        const needsExpansion = safeContent.length > 400;
                        const displayContent = !needsExpansion || isExpanded ? safeContent : safeContent.substring(0, 400) + '...';
                        return (
                          <div key={item.id} className="bg-neutral-800 border-t border-l border-neutral-600 border-b-2 border-r-2 border-neutral-950 rounded-lg p-5 sm:p-8 shadow-[4px_4px_15px_rgba(0,0,0,0.6)] md:shadow-[8px_8px_20px_rgba(0,0,0,0.6)] transition-all group relative flex flex-col">

                            <div className="flex flex-wrap justify-between items-start gap-3 mb-5 pb-4 border-b border-neutral-700/50">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-3 py-1.5 bg-neutral-900 text-neutral-300 rounded text-[10px] font-mono uppercase tracking-widest font-bold border border-neutral-700 shadow-inner">{item.source}</span>
                                {item.folder_name && <span className="px-3 py-1.5 bg-neutral-900 text-[#B56D43] rounded text-[10px] font-mono uppercase tracking-widest font-bold border border-[#B56D43]/40 shadow-inner flex items-center gap-1.5"><Layout className="w-3 h-3" />{item.folder_name}</span>}
                              </div>
                              <span className="text-[10px] font-mono text-neutral-500 pt-1.5 font-bold">{new Date(item.created_at).toLocaleDateString()}</span>
                            </div>

                            <div className="flex-grow">
                              <p className="text-sm sm:text-base md:text-lg font-serif leading-[1.85] text-neutral-100 whitespace-pre-wrap antialiased">
                                {displayContent}
                              </p>

                              {needsExpansion && (
                                <button onClick={() => toggleVaultExpand(item.id)} className="mt-5 text-[10px] font-bold uppercase tracking-widest text-[#B56D43] hover:text-[#d38253] transition-colors flex items-center gap-1.5 cursor-pointer">
                                  {isExpanded ? 'Collapse' : 'Read Full Text'} {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                              )}
                            </div>

                            <div className="mt-6 md:mt-8 pt-4 md:pt-5 border-t border-neutral-700/50 flex justify-end items-center gap-2 md:gap-3">

                              {/* Folder Movement Dropdown (POPS UP) */}
                              <div className="relative">
                                <button onClick={() => setMovingItemId(movingItemId === item.id ? null : item.id)} className={`flex items-center gap-2 px-3 md:px-4 py-2.5 text-[10px] uppercase tracking-widest font-bold rounded shadow-[0_4px_10px_rgba(0,0,0,0.3)] transition-all border cursor-pointer ${movingItemId === item.id ? 'bg-neutral-900 text-[#B56D43] border-[#B56D43]/50 shadow-inner' : 'bg-neutral-800 text-neutral-400 hover:text-white border-neutral-600 hover:border-neutral-400 hover:bg-neutral-700'}`} title="Move to Folder">
                                  <List className="w-4 h-4" /> <span className="hidden sm:inline">Folder</span>
                                </button>

                                <AnimatePresence>
                                  {movingItemId === item.id && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setMovingItemId(null); }} />
                                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} transition={{ duration: 0.15 }} className="absolute right-[-60px] sm:right-0 bottom-full mb-3 w-[260px] max-w-[85vw] bg-neutral-800 border-2 border-neutral-600 rounded-md shadow-[0_15px_50px_rgba(0,0,0,0.9)] z-50 overflow-hidden">
                                        <div className="flex items-center gap-2 px-3 py-3 border-b-2 border-neutral-900 bg-neutral-900 relative z-10">
                                          <input type="text" value={newFolderInput} onChange={(e) => setNewFolderInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newFolderInput.trim()) { assignToFolder(item.id, newFolderInput.trim()); setNewFolderInput(''); } }} placeholder="New folder..." className="w-full text-xs font-mono bg-neutral-950 border border-neutral-700 rounded px-3 py-2.5 outline-none text-neutral-100 placeholder-neutral-600 focus:border-[#B56D43] focus:ring-1 focus:ring-[#B56D43] transition-all shadow-inner" />
                                          <button onClick={() => { if (newFolderInput.trim()) { assignToFolder(item.id, newFolderInput.trim()); setNewFolderInput(''); } }} className="p-2.5 bg-neutral-800 text-[#B56D43] rounded border border-neutral-700 hover:border-[#B56D43] transition-colors shadow-[0_2px_5px_rgba(0,0,0,0.5)] cursor-pointer">
                                            <Check className="w-4 h-4" />
                                          </button>
                                        </div>
                                        <div className="max-h-40 overflow-y-auto smart-scrollbar py-1 relative z-10">
                                          {customFolders.map(f => (
                                            <button key={f} onClick={() => assignToFolder(item.id, f)} className="w-full text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-neutral-400 hover:bg-neutral-700 hover:text-white transition-colors truncate flex items-center gap-3 cursor-pointer">
                                              <Layout className="w-3.5 h-3.5 opacity-60 text-[#B56D43]" /> {f}
                                            </button>
                                          ))}
                                        </div>
                                        {item.folder_name && <button onClick={() => assignToFolder(item.id, null)} className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-500/10 hover:text-red-400 transition-colors border-t-2 border-neutral-900 cursor-pointer relative z-10">Remove from Folder</button>}
                                      </motion.div>
                                    </>
                                  )}
                                </AnimatePresence>
                              </div>

                              <button onClick={(e) => {
                                navigator.clipboard.writeText(`${item.source}\n\n${item.content}`);
                                const btn = e.currentTarget;
                                const originalHtml = btn.innerHTML;
                                btn.innerHTML = `<svg class="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span class="text-emerald-400 hidden sm:inline">Copied</span>`;
                                btn.classList.add('bg-neutral-900', 'border-emerald-500/50', 'shadow-inner');
                                setTimeout(() => {
                                  btn.innerHTML = originalHtml;
                                  btn.classList.remove('bg-neutral-900', 'border-emerald-500/50', 'shadow-inner');
                                }, 2000);
                              }} className="flex items-center gap-2 px-3 md:px-4 py-2.5 text-[10px] uppercase tracking-widest font-bold text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 shadow-[0_4px_10px_rgba(0,0,0,0.3)] rounded transition-all border border-neutral-600 hover:border-neutral-400 cursor-pointer" title="Copy Text">
                                <Copy className="w-4 h-4" /> <span className="hidden sm:inline">Copy</span>
                              </button>

                              <button onClick={async () => { await supabase.from('vault_items').delete().eq('id', item.id); fetchVaultItems(); }} className="flex items-center justify-center p-2.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 rounded border border-transparent transition-all cursor-pointer md:ml-1" title="Delete Record">
                                <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                              </button>

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- PREMIUM AUTHENTICATION MODAL --- */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#FDFBF7]/40 dark:bg-[#020805]/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="relative w-full max-w-md p-8 bg-[#FDFBF7] dark:bg-[#0A120E] border border-[#5C4A3D]/10 dark:border-[#c6a87c]/20 rounded-[2rem] shadow-2xl">
              <button onClick={() => setShowAuthModal(false)} className="absolute top-5 right-5 p-2 text-[#5C4A3D]/60 dark:text-[#FAFAFA]/60 hover:text-[#2D241C] dark:hover:text-[#c6a87c] transition-colors rounded-full hover:bg-[#5C4A3D]/5 dark:hover:bg-[#c6a87c]/10"><X className="w-5 h-5" /></button>
              <div className="text-center mb-8">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#c6a87c]/10 flex items-center justify-center border border-[#c6a87c]/20"><Bookmark className="w-5 h-5 text-[#c6a87c]" /></div>
                <h2 className="text-2xl font-serif text-[#2D241C] dark:text-[#FAFAFA] mb-2">The Scholar's Vault</h2>
                <p className="text-sm text-[#5C4A3D]/80 dark:text-[#FAFAFA]/60">Secure your research globally. No magic links required.</p>
              </div>
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div><input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="name@example.com" required className="w-full bg-transparent appearance-none outline-none rounded-xl py-3 px-4 text-base font-sans text-[#2D241C] dark:text-[#FAFAFA] placeholder:text-[#5C4A3D]/40 dark:placeholder:text-[#c6a87c]/40 border border-[#5C4A3D]/20 dark:border-[#c6a87c]/30 focus:border-[#c6a87c] focus:ring-1 focus:ring-[#c6a87c] transition-all" /></div>
                <div><input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Password (min 6 chars)" required className="w-full bg-transparent appearance-none outline-none rounded-xl py-3 px-4 text-base font-sans text-[#2D241C] dark:text-[#FAFAFA] placeholder:text-[#5C4A3D]/40 dark:placeholder:text-[#c6a87c]/40 border border-[#5C4A3D]/20 dark:border-[#c6a87c]/30 focus:border-[#c6a87c] focus:ring-1 focus:ring-[#c6a87c] transition-all" /></div>
                <button type="submit" disabled={authLoading} className="w-full flex items-center justify-center py-3.5 rounded-xl font-medium text-[#FDFBF7] dark:text-[#0A120E] bg-[#2D241C] dark:bg-[#c6a87c] hover:bg-[#1A1510] dark:hover:bg-[#d4ba96] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {authLoading ? 'Authenticating...' : (isSignUp ? 'Create Account' : 'Sign In')}
                </button>
              </form>
              <div className="mt-5 text-center">
                <button onClick={() => { setIsSignUp(!isSignUp); setAuthMessage({ text: '', type: '' }); }} className="text-sm font-medium text-[#5C4A3D]/80 dark:text-[#c6a87c]/80 hover:text-[#2D241C] dark:hover:text-[#FAFAFA] transition-colors cursor-pointer">
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
                </button>
              </div>
              {authMessage.text && (
                <div className={`mt-5 p-3.5 rounded-xl text-sm text-center font-medium ${authMessage.type === 'error' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' : 'bg-[#c6a87c]/10 text-[#5C4A3D] dark:text-[#c6a87c] border border-[#c6a87c]/20'}`}>
                  {authMessage.text}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- SIGN OUT CONFIRMATION MODAL --- */}
      <AnimatePresence>
        {showSignOutConfirm && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-[#FDFBF7]/40 dark:bg-[#020805]/60 backdrop-blur-md pointer-events-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm p-6 sm:p-8 bg-[#FDFBF7] dark:bg-[#0A120E] border border-[#5C4A3D]/10 dark:border-[#c6a87c]/20 rounded-[2rem] shadow-2xl text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <User className="w-5 h-5 text-red-500" />
              </div>
              <h2 className="text-xl sm:text-2xl font-serif text-[#2D241C] dark:text-[#FAFAFA] mb-2">Sign Out?</h2>
              <p className="text-sm text-[#5C4A3D]/80 dark:text-[#FAFAFA]/60 mb-6">Are you sure you want to sign out of your account?</p>
              <div className="flex gap-3">
                <button onClick={() => setShowSignOutConfirm(false)} className="flex-1 py-3 rounded-xl font-medium text-[#5C4A3D] dark:text-[#FAFAFA] bg-[#F8F5EE] dark:bg-[#1A1510] hover:bg-[#EAE4D3] dark:hover:bg-[#251E17] transition-colors border border-[#5C4A3D]/10 dark:border-[#c6a87c]/20 cursor-pointer">Cancel</button>
                <button onClick={() => { handleSignOut(); setShowSignOutConfirm(false); }} className="flex-1 py-3 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 transition-colors shadow-sm cursor-pointer">Sign Out</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {activeTab === 'search' && (
        <>
          <div className="gilded-halo dark:block hidden" />
          <div className="parchment-halo dark:hidden block" />
          <div className="gilded-noise" />
        </>
      )}

      <header ref={headerRef} className="fixed top-4 sm:top-4 w-full z-[75] p-4 sm:p-6 flex justify-between items-center pointer-events-none transition-all duration-500 ease-in-out">
        <div onClick={handleHomeClick} className="flex items-center gap-3 pointer-events-auto cursor-pointer group">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 group-hover:scale-105 border ${activeTab === 'quran' ? 'bg-amber-500/10 border-amber-500/20' : (activeTab === 'library' ? 'bg-[#c6a87c]/10 border-[#c6a87c]/20' : 'bg-[#FDFBF7]/50 dark:bg-[#c6a87c]/5 border-[#5C4A3D]/15 dark:border-[#c6a87c]/20 backdrop-blur-md shadow-sm')}`}>
            <KisaLogo className={`w-5 h-5 ${activeTab === 'library' ? 'text-[#c6a87c]' : (activeTab === 'quran' ? 'text-amber-600 dark:text-amber-500' : 'text-[#2D241C] dark:text-[#c6a87c]')}`} />
          </div>
          <div>
            <h1 className="font-sans font-bold text-lg sm:text-xl tracking-tight hidden sm:block group-hover:opacity-80 transition-opacity text-[#2D241C] dark:text-[#FAFAFA]">Kisa</h1>
            <div className="flex items-center gap-2 sm:mt-0.5">
              <p className="font-sans text-[10px] sm:text-xs opacity-60 hidden sm:block text-[#2D241C] dark:text-[#FAFAFA]">{activeTab === 'quran' ? 'Quran Reader' : (activeTab === 'library' ? 'Digital Archive' : 'Database Index')}</p>
              <span className="hidden sm:block w-1 h-1 rounded-full bg-[#5C4A3D]/30 dark:bg-[#c6a87c]/40"></span>
              <button onClick={(e) => { e.stopPropagation(); setShowUpdates(true); }} className={`hidden sm:flex pointer-events-auto text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer items-center gap-1 px-1.5 py-0.5 rounded-md ${activeTab === 'library' ? 'text-[#c6a87c] bg-[#c6a87c]/10 hover:text-[#d4b78f]' : (activeTab === 'quran' ? 'text-amber-500 bg-amber-500/10 hover:text-amber-400' : 'text-[#5C4A3D] dark:text-[#c6a87c] bg-[#FDFBF7]/60 dark:bg-[#c6a87c]/10 hover:bg-[#FDFBF7] dark:hover:bg-[#c6a87c]/20')}`}>
                <Sparkles className="w-3 h-3" />What's New
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 relative z-[75] pointer-events-auto">
          <div className={`flex items-center rounded-full p-1 mr-1 sm:mr-2 border shadow-sm ${activeTab === 'search' ? 'bg-[#FDFBF7]/50 dark:bg-[#020604]/40 border-[#5C4A3D]/15 dark:border-[#c6a87c]/20 backdrop-blur-xl' : 'bg-white/40 dark:bg-[#252528]/80 border-slate-300/30 dark:border-zinc-700/50 backdrop-blur-md'}`}>
            <button onClick={() => setActiveTab('search')} className={`p-2 rounded-full transition-all duration-300 cursor-pointer ${activeTab === 'search' ? 'bg-[#FDFBF7] dark:bg-[#c6a87c]/15 text-[#2D241C] dark:text-[#c6a87c] shadow-sm' : 'text-[#5C4A3D]/70 hover:text-[#2D241C] dark:text-[#c6a87c]/50 dark:hover:text-[#c6a87c]'}`} title="Search Engine"><Search className="w-4 h-4" /></button>
            <button onClick={() => setActiveTab('quran')} className={`p-2 rounded-full transition-all duration-300 cursor-pointer ${activeTab === 'quran' ? 'bg-amber-600/20 text-amber-800 dark:text-amber-500' : 'text-[#5C4A3D]/70 hover:text-[#2D241C] dark:text-[#c6a87c]/50 dark:hover:text-[#c6a87c]'}`} title="Quran Reader"><BookOpen className="w-4 h-4" /></button>
            <button onClick={() => setActiveTab('library')} className={`p-2 rounded-full transition-all duration-300 cursor-pointer ${activeTab === 'library' ? 'bg-[#c6a87c]/20 text-[#c6a87c] dark:text-[#d4b78f]' : 'text-[#5C4A3D]/70 hover:text-[#2D241C] dark:text-[#c6a87c]/50 dark:hover:text-[#c6a87c]'}`} title="Transcript Library"><LibraryIcon className="w-4 h-4" /></button>
          </div>

          <div className="hidden md:flex items-center gap-2 sm:gap-4">
            {activeTab === 'search' && data && !isKeyword && (<div className="flex items-center bg-[#FDFBF7]/50 dark:bg-[#020604]/40 border border-[#5C4A3D]/15 dark:border-[#c6a87c]/20 backdrop-blur-xl rounded-full p-1"><button onClick={() => setViewMode('map')} className={`p-2 rounded-full transition-all duration-300 cursor-pointer ${viewMode === 'map' ? 'bg-[#FDFBF7] dark:bg-[#c6a87c]/15 text-[#2D241C] dark:text-[#c6a87c] shadow-sm' : 'text-[#5C4A3D]/70 hover:text-[#2D241C] dark:text-[#c6a87c]/50 dark:hover:text-[#c6a87c]'}`}><Layout className="w-4 h-4" /></button><button onClick={() => setViewMode('list')} className={`p-2 rounded-full transition-all duration-300 cursor-pointer ${viewMode === 'list' ? 'bg-[#FDFBF7] dark:bg-[#c6a87c]/15 text-[#2D241C] dark:text-[#c6a87c] shadow-sm' : 'text-[#5C4A3D]/70 hover:text-[#2D241C] dark:text-[#c6a87c]/50 dark:hover:text-[#c6a87c]'}`}><List className="w-4 h-4" /></button></div>)}
            <button onClick={() => setShowHistoryDrawer(true)} className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center group transition-all duration-300 hover:scale-110 cursor-pointer"><Clock className={`w-5 h-5 text-[#5C4A3D]/80 dark:text-[#c6a87c]/60 ${activeTab === 'library' ? 'group-hover:text-[#c6a87c]' : (activeTab === 'quran' ? 'group-hover:text-amber-500' : 'group-hover:text-[#2D241C] dark:group-hover:text-[#c6a87c]')}`} /></button>
            <button onClick={() => setShowInfo(true)} className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center group transition-all duration-300 hover:scale-110 cursor-pointer"><HelpCircle className={`w-5 h-5 text-[#5C4A3D]/80 dark:text-[#c6a87c]/60 ${activeTab === 'library' ? 'group-hover:text-[#c6a87c]' : (activeTab === 'quran' ? 'group-hover:text-amber-500' : 'group-hover:text-[#2D241C] dark:group-hover:text-[#c6a87c]')}`} /></button>

            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center group transition-all duration-300 hover:scale-110 cursor-pointer">{theme === 'dark' ? <Sun className="w-5 h-5 text-[#c6a87c]/60 group-hover:text-yellow-400" /> : <Moon className="w-5 h-5 text-[#5C4A3D]/80 group-hover:text-[#2D241C]" />}</button>

            {/* VAULT / AUTH BUTTON */}
            {user ? (
              <div className="flex items-center gap-3">
                <button onClick={() => setShowVault(true)} title="Vault" className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-[#c6a87c] bg-[#c6a87c]/10 hover:bg-[#c6a87c]/20 transition-colors border border-[#c6a87c]/20 cursor-pointer">
                  <Bookmark className="w-5 h-5" />
                </button>
                <button onClick={() => setShowSignOutConfirm(true)} className="text-[10px] uppercase font-bold tracking-widest text-[#5C4A3D]/60 dark:text-[#c6a87c]/50 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer pr-1">
                  Sign Out
                </button>
              </div>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="flex items-center gap-2 text-sm font-medium text-[#5C4A3D] dark:text-[#FAFAFA] hover:text-[#2D241C] dark:hover:text-[#c6a87c] transition-colors cursor-pointer">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}
          </div>

          <div className="md:hidden flex items-center gap-1 sm:gap-2 relative">

            {/* MOBILE VAULT / AUTH BUTTON */}
            {user ? (
              <button onClick={() => setShowVault(true)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer border shadow-sm ${activeTab === 'library' ? 'bg-[#c6a87c]/10 text-[#c6a87c] border-zinc-700/50' : (activeTab === 'quran' ? 'bg-white/40 dark:bg-slate-800/50 backdrop-blur-md border-slate-300/30 dark:border-slate-700 text-amber-600 dark:text-amber-500' : 'bg-[#FDFBF7]/60 dark:bg-[#020604]/40 border-[#5C4A3D]/15 dark:border-[#c6a87c]/20 backdrop-blur-xl text-[#c6a87c]')}`}>
                <Bookmark className="w-5 h-5" />
              </button>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer border shadow-sm ${activeTab === 'library' ? 'bg-[#c6a87c]/10 text-[#c6a87c] border-zinc-700/50' : (activeTab === 'quran' ? 'bg-white/40 dark:bg-slate-800/50 backdrop-blur-md border-slate-300/30 dark:border-slate-700 text-slate-600 dark:text-slate-300' : 'bg-[#FDFBF7]/60 dark:bg-[#020604]/40 border-[#5C4A3D]/15 dark:border-[#c6a87c]/20 backdrop-blur-xl text-[#2D241C] dark:text-[#c6a87c]')}`}>
                <User className="w-5 h-5" />
              </button>
            )}

            <button onClick={() => setShowHistoryDrawer(true)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer border shadow-sm ${activeTab === 'library' ? 'bg-[#c6a87c]/10 text-[#c6a87c] border-zinc-700/50' : (activeTab === 'quran' ? 'bg-white/40 dark:bg-slate-800/50 backdrop-blur-md border-slate-300/30 dark:border-slate-700 text-slate-600 dark:text-slate-300' : 'bg-[#FDFBF7]/60 dark:bg-[#020604]/40 border-[#5C4A3D]/15 dark:border-[#c6a87c]/20 backdrop-blur-xl text-[#2D241C] dark:text-[#c6a87c]')}`}>
              <Clock className="w-5 h-5" />
            </button>
            <div className="relative">
              <button onClick={() => setShowMobileMenu(!showMobileMenu)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer border shadow-sm ${activeTab === 'library' ? 'bg-[#c6a87c]/10 text-[#c6a87c] border-zinc-700/50' : (activeTab === 'quran' ? 'bg-white/40 dark:bg-slate-800/50 backdrop-blur-md border-slate-300/30 dark:border-slate-700 text-slate-600 dark:text-slate-300' : 'bg-[#FDFBF7]/60 dark:bg-[#020604]/40 border-[#5C4A3D]/15 dark:border-[#c6a87c]/20 backdrop-blur-xl text-[#2D241C] dark:text-[#c6a87c]')}`}>
                <Menu className="w-5 h-5" />
              </button>
              <AnimatePresence>
                {showMobileMenu && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`absolute right-0 top-full mt-2 w-48 rounded-xl shadow-xl p-2 flex flex-col gap-1 z-[75] border ${activeTab === 'library' ? 'bg-white dark:bg-[#1c1c1e] border-zinc-200 dark:border-zinc-800' : (activeTab === 'quran' ? 'bg-[#f4ecd8] dark:bg-[#1a1a1a] border-slate-300 dark:border-slate-700' : 'bg-[#FDFBF7]/95 dark:bg-[#030A06] border-[#5C4A3D]/15 dark:border-[#c6a87c]/20 backdrop-blur-2xl')}`}>
                    {activeTab === 'search' && data && <button onClick={() => { handleHomeClick(); setShowMobileMenu(false); }} className="w-full text-left flex items-center gap-3 p-3 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer"><Home className="w-4 h-4 shrink-0" /> Reset Search</button>}
                    {activeTab === 'search' && <button onClick={() => { navigator.clipboard.writeText(window.location.href); setCopiedLink(true); setTimeout(() => { setCopiedLink(false); setShowMobileMenu(false); }, 1000); }} className={`w-full text-left flex items-center gap-3 p-3 rounded-lg text-sm cursor-pointer ${copiedLink ? 'text-emerald-500' : 'text-[#2D241C] dark:text-[#FAFAFA] hover:bg-[#EAE4D3]/50 dark:hover:bg-[#c6a87c]/10'}`}><Share2 className="w-4 h-4 shrink-0" /> Share Link</button>}
                    <button onClick={() => { setShowUpdates(true); setShowMobileMenu(false); }} className={`w-full text-left flex items-center gap-3 p-3 rounded-lg text-sm cursor-pointer ${activeTab === 'library' ? 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#2c2c2e]' : 'text-[#2D241C] dark:text-[#FAFAFA] hover:bg-[#EAE4D3]/50 dark:hover:bg-[#c6a87c]/10'}`}><Sparkles className="w-4 h-4 shrink-0" /> What's New</button>
                    <button onClick={() => { setShowInfo(true); setShowMobileMenu(false); }} className={`w-full text-left flex items-center gap-3 p-3 rounded-lg text-sm cursor-pointer ${activeTab === 'library' ? 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#2c2c2e]' : 'text-[#2D241C] dark:text-[#FAFAFA] hover:bg-[#EAE4D3]/50 dark:hover:bg-[#c6a87c]/10'}`}><HelpCircle className="w-4 h-4 shrink-0" /> Help & Guide</button>
                    {user && (
                      <button onClick={() => { setShowSignOutConfirm(true); setShowMobileMenu(false); }} className={`w-full text-left flex items-center gap-3 p-3 rounded-lg text-sm cursor-pointer text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors`}>
                        <User className="w-4 h-4 shrink-0" /> Sign Out
                      </button>
                    )}
                    <button onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); setShowMobileMenu(false); }} className={`w-full text-left flex items-center gap-3 p-3 rounded-lg text-sm cursor-pointer ${activeTab === 'library' ? 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#2c2c2e]' : 'text-[#2D241C] dark:text-[#FAFAFA] hover:bg-[#EAE4D3]/50 dark:hover:bg-[#c6a87c]/10'}`}>{theme === 'dark' ? <Sun className={`w-4 h-4 shrink-0 ${activeTab === 'library' ? 'text-[#c6a87c]' : 'text-amber-500'}`} /> : <Moon className="w-4 h-4 shrink-0 text-[#5C4A3D]" />} Toggle Theme</button>
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
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }} className="z-10 flex flex-col items-center justify-center w-full max-w-2xl px-4 sm:px-6 mx-auto absolute top-[45%] left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal mb-4 text-center leading-tight text-[#2D241C] dark:text-[#FAFAFA] drop-shadow-sm dark:drop-shadow-md">
                Explore the Depths of <br /><span className="italic text-[#c6a87c] drop-shadow-sm dark:drop-shadow-lg">Twelver Literature</span>
              </h2>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }} className="flex flex-wrap justify-center items-center gap-3 sm:gap-4 mb-10 sm:mb-12 text-[9px] sm:text-[10px] uppercase tracking-[0.25em] font-semibold text-[#5C4A3D] dark:text-[#c6a87c]/80">
                <span className="flex items-center gap-1.5 cursor-default"><BookOpen className="w-3 h-3 opacity-80 text-[#c6a87c]" /> <span className="text-[#2D241C] dark:text-[#FAFAFA]">14,500+</span> Narrations</span>
                <span className="opacity-40 text-[#c6a87c]">•</span>
                <span className="flex items-center gap-1.5 cursor-default"><Sparkles className="w-3 h-3 opacity-80 text-[#c6a87c]" /> <span className="text-[#2D241C] dark:text-[#FAFAFA]">2.4M</span> Semantic Links</span>
                <span className="opacity-40 text-[#c6a87c]">•</span>
                <span className="flex items-center gap-1.5 cursor-default"><Clock className="w-3 h-3 opacity-80 text-[#c6a87c]" /> <span className="text-[#2D241C] dark:text-[#FAFAFA]">50+ Hrs</span> Scholarship</span>
              </motion.div>

              <div className="w-full relative group pointer-events-auto" ref={searchInputContainerRef}>
                <div className="absolute inset-0 w-full h-full rounded-2xl border pointer-events-none z-0 transition-all duration-700 bg-[#F8F5EE]/50 dark:bg-[#020805]/40 border-[#5C4A3D]/15 dark:border-[#c6a87c]/20 shadow-[0_8px_32px_rgba(45,36,28,0.05)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl group-focus-within:border-[#c6a87c]/60 group-focus-within:shadow-[0_0_40px_rgba(198,168,124,0.15)]"></div>
                <form onSubmit={handleSearchSubmit} className="relative z-10 flex flex-col p-2">
                  <div className="flex items-center border-b relative border-[#5C4A3D]/15 dark:border-[#c6a87c]/20 transition-colors duration-500 group-focus-within:border-[#c6a87c]/50">
                    <input type="text" value={query} onFocus={() => setShowSearchDropdown(true)} onChange={(e) => setQuery(e.target.value)} placeholder={isKeyword ? "Enter an exact word or phrase..." : ghostText} className="w-full bg-transparent appearance-none outline-none rounded-none py-3 sm:py-4 pl-3 sm:pl-4 pr-14 sm:pr-16 text-base font-sans text-[#2D241C] dark:text-[#FAFAFA] placeholder:text-[#5C4A3D]/60 dark:placeholder:text-[#c6a87c]/40 cursor-text caret-[#c6a87c]" />
                    <motion.button ref={btnRef} type="submit" animate={{ x: magneticPos.x, y: magneticPos.y }} transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }} onMouseMove={(e) => { if (!btnRef.current) return; const { left, top, width, height } = btnRef.current.getBoundingClientRect(); const x = (e.clientX - (left + width / 2)) * 0.4; const y = (e.clientY - (top + height / 2)) * 0.4; setMagneticPos({ x, y }); }} onMouseLeave={() => setMagneticPos({ x: 0, y: 0 })} className="hover-sheen absolute right-2 p-2 sm:p-2.5 rounded-xl shadow-sm cursor-pointer bg-[#FDFBF7]/80 dark:bg-[#c6a87c]/10 hover:bg-[#FDFBF7] dark:hover:bg-[#c6a87c]/20 text-[#c6a87c] dark:hover:text-[#FAFAFA] border border-[#5C4A3D]/5 dark:border-[#c6a87c]/20 transition-colors flex items-center justify-center z-10">
                      <Search className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
                    </motion.button>
                  </div>
                  <AnimatePresence>
                    {showSearchDropdown && appHistory.length > 0 && query.trim() === '' && (
                      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute left-0 right-0 top-full mt-2 rounded-xl shadow-2xl overflow-hidden z-50 border bg-[#FDFBF7]/95 dark:bg-[#030A06]/95 border-[#5C4A3D]/15 dark:border-[#c6a87c]/20 backdrop-blur-2xl">
                        <div className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold border-b flex justify-between items-center text-[#5C4A3D]/80 dark:text-[#c6a87c]/80 bg-[#F8F5EE]/50 dark:bg-[#c6a87c]/5 border-[#5C4A3D]/15 dark:border-[#c6a87c]/20">
                          <span>Recent Activity</span>
                        </div>
                        <div className="flex flex-col">
                          {appHistory.slice(0, 5).map((item, i) => (
                            <div key={i} onClick={() => handleHistoryClick(item)} className="px-4 py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 cursor-pointer transition-colors border-b last:border-b-0 group hover:bg-[#EAE4D3]/40 dark:hover:bg-[#c6a87c]/10 border-[#5C4A3D]/10 dark:border-[#c6a87c]/10">
                              <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                                {item.type === 'quran' ? <BookOpen className="w-4 h-4 text-amber-600 shrink-0" /> : (item.mode === 'keyword' ? <Database className="w-4 h-4 text-[#5C4A3D]/60 dark:text-[#c6a87c]/60 shrink-0" /> : <Sparkles className="w-4 h-4 text-[#c6a87c] shrink-0" />)}
                                <span className="font-medium truncate w-full text-sm sm:text-base transition-colors text-[#2D241C] dark:text-[#c6a87c] group-hover:dark:text-[#FAFAFA]">{item.type === 'quran' ? `Surah ${item.surahName}` : item.query}</span>
                              </div>
                              <span className="text-[10px] sm:text-xs font-mono text-[#5C4A3D]/60 dark:text-[#c6a87c]/50 shrink-0 pl-7 sm:pl-0 opacity-70 group-hover:opacity-100 transition-opacity">{timeAgo(item.timestamp)}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="relative py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center rounded-lg p-1 border bg-[#F8F5EE]/60 dark:bg-[#020805]/60 border-[#5C4A3D]/15 dark:border-[#c6a87c]/10 shadow-inner">
                      <button type="button" onClick={() => { setSearchMode('concept'); setViewMode(window.innerWidth < 800 ? 'list' : 'map'); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 flex-1 sm:flex-none justify-center cursor-pointer ${!isKeyword ? 'bg-[#FDFBF7] dark:bg-[#c6a87c]/15 text-[#2D241C] dark:text-[#c6a87c] shadow-sm border border-[#5C4A3D]/15 dark:border-[#c6a87c]/30' : 'text-[#5C4A3D]/80 hover:text-[#2D241C] dark:text-[#c6a87c]/50 dark:hover:text-[#c6a87c] border border-transparent'}`}><Sparkles className="w-3.5 h-3.5 opacity-70" /> Concept</button>
                      <button type="button" onClick={() => { setSearchMode('keyword'); setViewMode('list'); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 flex-1 sm:flex-none justify-center cursor-pointer ${isKeyword ? 'bg-[#FDFBF7] dark:bg-[#c6a87c]/15 text-[#2D241C] dark:text-[#c6a87c] shadow-sm border border-[#5C4A3D]/15 dark:border-[#c6a87c]/30' : 'text-[#5C4A3D]/80 hover:text-[#2D241C] dark:text-[#c6a87c]/50 dark:hover:text-[#c6a87c] border border-transparent'}`}><Database className="w-3.5 h-3.5 opacity-70" /> Keyword</button>
                    </div>
                    <div className="flex items-center w-full sm:w-auto">
                      <div className="flex items-center gap-2 text-[#5C4A3D]/80 dark:text-[#c6a87c]/70 mr-3 hidden sm:flex"><BookOpen className="w-4 h-4 opacity-70" /><span className="text-xs uppercase tracking-wider font-semibold">Source:</span></div>
                      <button type="button" onClick={() => setShowDropdown(!showDropdown)} className="flex items-center justify-between w-full sm:w-[220px] px-3 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium border border-transparent cursor-pointer bg-[#F8F5EE]/60 dark:bg-[#020805]/60 text-[#2D241C] dark:text-[#c6a87c]/80 hover:bg-[#FDFBF7] dark:hover:bg-[#c6a87c]/10 dark:hover:text-[#c6a87c] dark:hover:border-[#c6a87c]/20"><span className="truncate">{sourceFilter}</span><ChevronDown className="w-4 h-4 opacity-50 shrink-0 ml-2" /></button>
                      <AnimatePresence>
                        {showDropdown && (
                          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute top-[100px] sm:top-14 right-2 sm:right-0 w-[calc(100%-16px)] sm:w-[220px] rounded-xl border shadow-xl overflow-hidden z-50 backdrop-blur-2xl bg-[#FDFBF7]/95 dark:bg-[#040F0B]/95 border-[#5C4A3D]/15 dark:border-[#c6a87c]/20">
                            {SOURCES.map((source) => (
                              <div key={source} onClick={() => { setSourceFilter(source); setShowDropdown(false); }} className={`px-4 py-3 text-sm cursor-pointer transition-colors ${sourceFilter === source ? 'bg-[#EAE4D3]/60 dark:bg-[#c6a87c]/15 text-[#2D241C] dark:text-[#FAFAFA] font-bold' : 'text-[#5C4A3D] dark:text-[#c6a87c]/80 hover:bg-[#F8F5EE] dark:hover:bg-[#c6a87c]/10 dark:hover:text-[#c6a87c]'}`}>
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
                      <motion.div className="w-32 h-32 rounded-full absolute bg-[#FDFBF7]/80 dark:bg-[#c6a87c]/10 blur-2xl" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
                      <motion.div className="w-24 h-24 rounded-full absolute bg-[#c6a87c]/20 dark:bg-[#062116]/40 blur-xl" animate={{ scale: [1.2, 0.8, 1.2], rotate: 180 }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
                      <div className="w-16 h-16 rounded-full bg-[#FDFBF7]/90 dark:bg-[#020604]/60 backdrop-blur-md flex items-center justify-center border border-[#5C4A3D]/15 dark:border-[#c6a87c]/20 shadow-[0_0_40px_rgba(253,251,247,0.8)] dark:shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                        <KisaLogo className="w-8 h-8 animate-pulse text-[#c6a87c]" />
                      </div>
                    </>
                  ) : (
                    <>
                      <motion.div className="w-32 h-32 rounded-full absolute bg-[#FDFBF7]/80 dark:bg-[#c6a87c]/10 blur-xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} />
                      <div className="w-16 h-16 rounded-full bg-[#FDFBF7] dark:bg-[#030A06] border border-[#5C4A3D]/15 dark:border-[#c6a87c]/20 flex items-center justify-center shadow-lg">
                        <KisaLogo className="w-8 h-8 animate-pulse text-[#c6a87c]" />
                      </div>
                    </>
                  )}
                </div>
                <motion.p className="mt-8 font-sans tracking-widest uppercase text-xs sm:text-sm font-semibold opacity-70 whitespace-nowrap text-center text-[#5C4A3D] dark:text-[#c6a87c]/80">
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
                      <div className="bg-[#FDFBF7]/80 dark:bg-[#020805]/60 px-6 sm:px-8 py-3 sm:py-4 flex flex-col items-center gap-2 backdrop-blur-xl border border-[#5C4A3D]/15 dark:border-[#c6a87c]/20 rounded-2xl shadow-[0_0_50px_rgba(45,36,28,0.06)] dark:shadow-[0_0_50px_rgba(198,168,124,0.1)] group hover:scale-105 transition-transform mt-8">
                        {anchorHadith ? (
                          <div className="flex flex-col items-center text-[#2D241C] dark:text-[#FAFAFA]">
                            <div className="flex items-center gap-3">
                              <span className="font-serif text-xl sm:text-2xl font-medium whitespace-nowrap">Similar to</span>
                              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#5C4A3D]/10 dark:bg-[#c6a87c]/20 flex items-center justify-center"><span className="text-[10px] sm:text-xs font-bold text-[#c6a87c]">{data.total_results}</span></div>
                            </div>
                            <ChevronDown className="w-4 h-4 opacity-50 mt-1 mb-1 animate-bounce text-[#5C4A3D] dark:text-[#c6a87c]" />
                            <button onClick={(e) => { e.stopPropagation(); setShowAnchorModal(true); }} className="flex items-center gap-1.5 text-[10px] sm:text-xs uppercase tracking-wider font-bold text-[#5C4A3D] dark:text-[#c6a87c] hover:text-[#2D241C] dark:hover:text-[#FAFAFA] bg-[#FDFBF7] dark:bg-[#c6a87c]/10 px-4 py-1.5 rounded-full transition-colors shadow-sm border border-[#5C4A3D]/15 dark:border-[#c6a87c]/30 hover:border-[#c6a87c]/40 dark:hover:border-[#c6a87c]/60">
                              <Sparkles className="w-3 h-3" /> View Source
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 text-[#2D241C] dark:text-[#FAFAFA]">
                            <span className="font-serif text-xl sm:text-2xl font-medium truncate max-w-[200px] sm:max-w-[280px]" title={query}>{query}</span>
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#5C4A3D]/10 dark:bg-[#c6a87c]/20 flex items-center justify-center"><span className="text-[10px] sm:text-xs font-bold text-[#c6a87c]">{data.total_results}</span></div>
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
                      const color = theme === 'dark' ? '#c6a87c' : '#5C4A3D';
                      const isActive = activeCluster === i;
                      const isHovered = hoveredCluster === i;
                      return (<motion.line key={`line-${i}`} x1={centerPos.x} y1={centerPos.y} x2={centerPos.x + pos.x} y2={centerPos.y + pos.y} stroke={color} strokeWidth={isActive ? 2 : isHovered ? 1.5 : 1} strokeOpacity={isActive ? 0.5 : isHovered ? 0.3 : 0.1} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: i * 0.2 }} className="transition-all duration-300" />);
                    })}
                  </svg>
                  {(data.clusters || []).map((cluster, i) => {
                    const clusterCount = data.clusters ? Math.max(1, data.clusters.length) : 1;
                    const itemsLength = cluster.items ? cluster.items.length : 0;
                    const rx = Math.max(280, Math.min(centerPos.x - 150, 450));
                    const ry = Math.max(220, Math.min(centerPos.y - 140, 320));
                    const pos = getRadialPosition(i, clusterCount, rx, ry);
                    const color = theme === 'dark' ? '#c6a87c' : '#5C4A3D';
                    const isActive = activeCluster === i;
                    const isHovered = hoveredCluster === i;
                    const isFaded = activeCluster !== null && !isActive;
                    const isTopMatches = cluster.theme_label && cluster.theme_label.includes("Top Matches");
                    const screenScale = Math.min(1, windowWidth / 1200);
                    const baseScale = (isTopMatches ? 1.15 : 0.95) * screenScale;

                    return (
                      <div key={`cluster-wrap-${i}`} className="absolute top-1/2 left-1/2 w-0 h-0 flex items-center justify-center z-20 pointer-events-none">
                        <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: isFaded ? 0.2 : 1, x: pos.x, y: pos.y, scale: isActive ? baseScale * 1.05 : baseScale }} transition={{ type: "spring", stiffness: 60, delay: i * 0.1 }} className={`pointer-events-auto transition-all duration-300 mt-8 ${isFaded ? 'pointer-events-none grayscale blur-[2px]' : ''}`} onMouseEnter={() => setHoveredCluster(i)} onMouseLeave={() => setHoveredCluster(null)}>
                          <div onClick={() => setActiveCluster(isActive ? null : i)} className="flex flex-col justify-center cursor-pointer transition-all duration-400 relative group w-[220px] sm:w-[260px] bg-[#FDFBF7]/90 dark:bg-[#030A06]/90 backdrop-blur-2xl rounded-2xl px-5 py-4" style={{ border: `1px solid ${isActive || isHovered ? color : (theme === 'dark' ? 'rgba(198, 168, 124, 0.2)' : 'rgba(92, 74, 61, 0.15)')}`, boxShadow: isActive || isHovered ? `0 4px 20px ${theme === 'dark' ? 'rgba(198, 168, 124, 0.15)' : 'rgba(92, 74, 61, 0.15)'}` : '0 8px 32px rgba(0,0,0,0.08)' }}>
                            <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-md transition-all duration-300" style={{ backgroundColor: isActive || isHovered ? color : 'transparent' }} />
                            <div className="pl-2 relative z-10 flex flex-col text-left">
                              <h3 className="font-sans font-semibold text-sm sm:text-base leading-snug whitespace-normal break-words text-[#2D241C] dark:text-[#FAFAFA] group-hover:opacity-80 transition-opacity">{cluster.theme_label}</h3>
                              <div className="mt-2.5 flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                                <BookOpen className="w-3.5 h-3.5 text-[#5C4A3D] dark:text-[#c6a87c]" />
                                <span className="font-mono text-[10px] tracking-widest uppercase font-bold text-[#5C4A3D] dark:text-[#c6a87c]">{itemsLength} Narrations</span>
                              </div>
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
                  <div className={`p-5 sm:p-6 rounded-xl mb-6 sm:mb-8 border shadow-sm ${anchorHadith ? 'mt-10' : ''} ${isKeyword ? 'bg-[#FDFBF7]/80 dark:bg-[#030A06]/80 border-[#5C4A3D]/15 dark:border-[#c6a87c]/20 backdrop-blur-xl' : 'bg-[#FDFBF7]/60 dark:bg-[#030A06]/80 border-[#5C4A3D]/15 dark:border-[#c6a87c]/20 backdrop-blur-xl'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h2 className={`font-serif text-xl sm:text-2xl md:text-3xl font-normal tracking-tight break-words whitespace-normal leading-snug text-[#2D241C] dark:text-[#FAFAFA]`}>
                          {isKeyword ? 'Index Results:' : 'Search:'} <span className="italic text-[#c6a87c]">"{query}"</span>
                        </h2>
                        <div className="flex flex-wrap gap-2 mt-3">{uniqueBooks.map((bookName, idx) => (<span key={idx} className={`text-[10px] sm:text-xs uppercase tracking-wider font-bold px-2.5 py-1 rounded-md border ${isKeyword ? 'bg-[#FDFBF7] dark:bg-[#c6a87c]/10 text-[#5C4A3D] dark:text-[#c6a87c] border-[#5C4A3D]/15 dark:border-[#c6a87c]/30' : 'text-[#5C4A3D] dark:text-[#c6a87c] bg-[#F8F5EE]/60 dark:bg-[#c6a87c]/10 border-[#5C4A3D]/15 dark:border-[#c6a87c]/30'}`}>{bookName}</span>))}</div>
                      </div>
                      <div className={`flex gap-6 sm:border-l sm:pl-6 shrink-0 ${isKeyword ? 'border-[#5C4A3D]/15 dark:border-[#c6a87c]/20' : 'border-[#5C4A3D]/15 dark:border-[#c6a87c]/20'}`}>{!isKeyword && (<div><p className="text-[10px] uppercase tracking-widest text-[#5C4A3D]/70 dark:text-[#c6a87c]/60 font-semibold mb-1">Themes</p><p className="font-mono text-xl text-[#2D241C] dark:text-[#FAFAFA]">{data.clusters ? data.clusters.length : 0}</p></div>)}<div><p className="text-[10px] uppercase tracking-widest text-[#5C4A3D]/70 dark:text-[#c6a87c]/60 font-semibold mb-1">{isKeyword ? 'Matches' : 'Hadiths'}</p><p className="font-mono text-xl text-[#2D241C] dark:text-[#FAFAFA]">{data.total_results}</p></div></div>
                    </div>

                    {anchorHadith && (
                      <div className={`mt-5 pt-4 border-t ${isKeyword ? 'border-[#5C4A3D]/15 dark:border-[#c6a87c]/20' : 'border-[#5C4A3D]/15 dark:border-[#c6a87c]/20'}`}>
                        <div className="flex items-center justify-between cursor-pointer group" onClick={() => setShowAnchor(!showAnchor)}>
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 shrink-0 text-[#5C4A3D]/70 dark:text-[#c6a87c]/80" />
                            <span className="text-xs sm:text-sm font-bold tracking-widest uppercase transition-colors break-words text-[#5C4A3D] dark:text-[#c6a87c] group-hover:text-[#2D241C] dark:group-hover:text-[#FAFAFA]">
                              View Anchored Source
                            </span>
                          </div>
                          <div className="p-1.5 shrink-0 rounded-full transition-colors bg-[#FDFBF7] dark:bg-[#c6a87c]/10 text-[#c6a87c] group-hover:bg-[#EAE4D3] dark:group-hover:bg-[#c6a87c]/20">
                            {showAnchor ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                        <AnimatePresence>
                          {showAnchor && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="pt-4 pb-2 text-sm sm:text-base font-serif leading-relaxed text-[#2D241C] dark:text-[#c6a87c]">
                                {anchorHadith.english_text}
                              </div>
                              <div className="mt-3 flex justify-end">
                                <button onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyHadith(anchorHadith);
                                  setAnchorCopied(true);
                                  setTimeout(() => setAnchorCopied(false), 2000);
                                }} className={`flex items-center gap-2 text-xs font-mono transition-colors px-3 py-1.5 rounded-md cursor-pointer ${anchorCopied ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : 'text-[#5C4A3D] hover:text-[#2D241C] dark:text-[#c6a87c]/80 hover:bg-[#FDFBF7] dark:hover:bg-[#c6a87c]/10'}`}>
                                  {anchorCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}<span>{anchorCopied ? 'Copied!' : 'Copy Text'}</span>
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                  <div className={`flex flex-col border-t ${isKeyword ? 'border-[#5C4A3D]/15 dark:border-[#c6a87c]/20' : 'border-[#5C4A3D]/15 dark:border-[#c6a87c]/20'}`}>
                    {(data.clusters || []).map((cluster, i) => {
                      const itemsLength = cluster.items ? cluster.items.length : 0;
                      return (
                        <motion.div key={`list-item-${i}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} onClick={() => setActiveCluster(i)} className={`group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 cursor-pointer border-b transition-all duration-300 ${isKeyword ? 'border-[#5C4A3D]/15 dark:border-[#c6a87c]/10 hover:bg-[#FDFBF7]/50 dark:hover:bg-[#c6a87c]/5' : 'border-[#5C4A3D]/15 dark:border-[#c6a87c]/10 hover:bg-[#FDFBF7]/50 dark:hover:bg-[#c6a87c]/5'}`}>
                          <div className="flex items-start sm:items-center gap-4 sm:gap-6 flex-grow pr-8 sm:pr-0"><span className="font-mono text-sm sm:text-base font-medium pt-0.5 sm:pt-0 text-[#5C4A3D]/50 group-hover:text-[#2D241C] dark:text-[#c6a87c]/50 dark:group-hover:text-[#FAFAFA]">0{i + 1}</span><div><h3 className="font-mono text-base sm:text-lg lg:text-xl font-medium tracking-tight transition-colors text-[#2D241C] dark:text-[#c6a87c] group-hover:text-black dark:group-hover:text-[#FAFAFA]">{cluster.theme_label}</h3><div className="flex items-center gap-3 sm:gap-4 mt-1.5 sm:mt-2"><span className="font-mono text-[10px] sm:text-xs lg:text-sm text-[#5C4A3D]/70 dark:text-[#c6a87c]/60">[{itemsLength} {isKeyword ? 'entries' : 'narrations'}]</span></div></div></div>
                          <div className="absolute right-4 sm:relative sm:right-0 sm:opacity-0 group-hover:opacity-100 transform sm:translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300 self-center"><ChevronRight className="w-5 h-5 text-[#5C4A3D] group-hover:text-[#2D241C] dark:text-[#c6a87c]/60 dark:group-hover:text-[#FAFAFA]" /></div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activeCluster !== null && data?.clusters && data.clusters[activeCluster] && (() => {
            const clusterItems = data.clusters[activeCluster].items || [];
            const filteredItems = clusterItems.filter(item => { if (lengthFilter === 'All') return true; const len = String(item.english_text || '').length; if (lengthFilter === 'Short') return len < 300; if (lengthFilter === 'Medium') return len >= 300 && len <= 1000; if (lengthFilter === 'Long') return len > 1000; return true; });
            const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE) || 1, safeCurrentPage = Math.min(currentPage, totalPages), startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE, paginatedItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
            return (
              <div className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-auto p-4 sm:p-0">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveCluster(null)} className="absolute inset-0 bg-[#2D241C]/60 dark:bg-[#020604]/80 backdrop-blur-md cursor-pointer" />
                <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={`relative w-full sm:w-[90vw] max-w-[700px] h-[85vh] flex flex-col shadow-2xl rounded-2xl z-[1001] border bg-[#EAE4D3] dark:bg-[#030A06] border-[#5C4A3D]/20 dark:border-[#c6a87c]/20`}>
                  <div className={`flex justify-between items-center backdrop-blur-xl pt-5 pb-4 px-4 sm:px-6 z-10 border-b rounded-t-2xl shrink-0 bg-[#FDFBF7]/60 dark:bg-[#c6a87c]/5 border-[#5C4A3D]/15 dark:border-[#c6a87c]/20`}>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-mono font-normal tracking-tight truncate pr-4 text-[#2D241C] dark:text-[#FAFAFA]">{data.clusters[activeCluster].theme_label}</h2>
                    <button onClick={() => setActiveCluster(null)} className="p-2 hover:bg-[#FDFBF7] dark:hover:bg-[#c6a87c]/10 rounded-full transition-colors cursor-pointer shrink-0"><X className="w-5 h-5 sm:w-6 sm:h-6 text-[#5C4A3D] dark:text-[#c6a87c]" /></button>
                  </div>
                  <div className={`px-4 sm:px-6 py-3 border-b shrink-0 flex flex-wrap gap-2 items-center bg-[#F8F5EE]/40 dark:bg-black/20 border-[#5C4A3D]/15 dark:border-[#c6a87c]/20`}>
                    <div className="flex items-center gap-1.5 text-[#5C4A3D]/70 dark:text-[#c6a87c]/70 mr-1"><Filter className="w-3.5 h-3.5" /><span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Length:</span></div>
                    {['All', 'Short', 'Medium', 'Long'].map(f => (<button key={f} onClick={() => { setLengthFilter(f); setCurrentPage(1); if (modalScrollRef.current) modalScrollRef.current.scrollTop = 0; }} className={`px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors cursor-pointer ${lengthFilter === f ? 'bg-[#5C4A3D] dark:bg-[#c6a87c]/20 text-[#FAFAFA]' : 'bg-[#FDFBF7] dark:bg-[#c6a87c]/5 text-[#5C4A3D] dark:text-[#c6a87c] border border-[#5C4A3D]/15 dark:border-transparent hover:bg-[#EAE4D3] dark:hover:bg-[#c6a87c]/10'}`}>{f}</button>))}
                    <span className="ml-auto text-[10px] sm:text-xs font-mono text-[#5C4A3D]/60 dark:text-[#c6a87c]/50">{filteredItems.length} matches</span>
                  </div>
                  <div ref={modalScrollRef} onScroll={handleModalScroll} className="p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 overflow-y-auto flex-grow smart-scrollbar">
                    {filteredItems.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-[#5C4A3D]/50 dark:text-[#c6a87c]/50 italic mt-10"><p>No {lengthFilter.toLowerCase()} hadiths found.</p></div> : paginatedItems.map((item, idx) => (<HadithCard key={idx} item={item} onVerseClick={handleVerseClick} handleCopyHadith={handleCopyHadith} searchMode={searchMode} onFindSimilar={handleFindSimilar} />))}
                    {totalPages > 1 && filteredItems.length > 0 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 sm:pt-6 border-t border-[#5C4A3D]/15 dark:border-[#c6a87c]/20 mt-2 sm:mt-4">
                        <button onClick={() => { setCurrentPage(prev => Math.max(prev - 1, 1)); modalScrollRef.current.scrollTop = 0; }} disabled={safeCurrentPage === 1} className={`flex items-center justify-center gap-1 w-full sm:w-auto px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${safeCurrentPage === 1 ? 'opacity-30 cursor-not-allowed text-[#5C4A3D]/50 dark:text-slate-500' : 'text-[#2D241C] dark:text-[#c6a87c] hover:bg-[#FDFBF7] dark:hover:bg-[#c6a87c]/10'}`}><ChevronLeft className="w-5 h-5" /> Previous</button>
                        <span className="font-mono text-xs sm:text-sm text-[#5C4A3D]/60 dark:text-[#c6a87c]/60">Page {safeCurrentPage} of {totalPages}</span>
                        <button onClick={() => { setCurrentPage(prev => Math.min(prev + 1, totalPages)); modalScrollRef.current.scrollTop = 0; }} disabled={safeCurrentPage === totalPages} className={`flex items-center justify-center gap-1 w-full sm:w-auto px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${safeCurrentPage === totalPages ? 'opacity-30 cursor-not-allowed text-[#5C4A3D]/50 dark:text-slate-500' : 'text-[#2D241C] dark:text-[#c6a87c] hover:bg-[#FDFBF7] dark:hover:bg-[#c6a87c]/10'}`}>Next <ChevronRight className="w-5 h-5" /></button>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            );
          })()}
        </AnimatePresence>

        {/* --- MAP VIEW: THE ANCHOR POPUP MODAL --- */}
        <AnimatePresence>
          {showAnchorModal && anchorHadith && (
            <div className="fixed inset-0 z-[5000] flex items-center justify-center pointer-events-auto p-4 sm:p-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAnchorModal(false)} className="absolute inset-0 bg-[#2D241C]/60 dark:bg-[#020604]/80 backdrop-blur-md cursor-pointer" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-[#EAE4D3] dark:bg-[#030A06] border border-[#5C4A3D]/20 dark:border-[#c6a87c]/20 w-full sm:w-[90vw] max-w-[600px] max-h-[85vh] flex flex-col shadow-2xl rounded-2xl z-[5001] overflow-hidden">
                <div className="flex justify-between items-center bg-[#FDFBF7]/60 dark:bg-[#c6a87c]/5 backdrop-blur-xl pt-5 pb-4 px-6 z-10 border-b border-[#5C4A3D]/15 dark:border-[#c6a87c]/20 shrink-0">
                  <div>
                    <h3 className="font-mono text-sm tracking-widest uppercase text-[#2D241C] dark:text-[#FAFAFA] font-bold mb-0.5 flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#c6a87c]" /> Anchored Source</h3>
                    <p className="text-[10px] sm:text-xs text-[#5C4A3D]/60 dark:text-[#c6a87c]/60 font-mono m-0 leading-relaxed pr-4">
                      {anchorHadith.full_reference || `Book: ${anchorHadith.book}, Vol: ${anchorHadith.volume}, ${anchorHadith.sub_book}, Chapter: ${anchorHadith.chapter}`}
                    </p>
                  </div>
                  <button onClick={() => setShowAnchorModal(false)} className="p-2 hover:bg-[#FDFBF7] dark:hover:bg-[#c6a87c]/10 rounded-full transition-colors cursor-pointer shrink-0 self-start"><X className="w-5 h-5 text-[#5C4A3D] dark:text-[#c6a87c]" /></button>
                </div>
                <div className="p-6 sm:p-8 overflow-y-auto flex-grow smart-scrollbar">
                  {anchorHadith.arabic_text && <div className="mb-6"><p className="font-arabic text-3xl sm:text-4xl text-right leading-[2.2] text-[#2D241C] dark:text-slate-100" dir="rtl" lang="ar" style={{ fontFamily: activeFontFamily, fontVariantLigatures: 'normal', fontFeatureSettings: '"ccmp" 1, "mark" 1, "mkmk" 1' }}>{anchorHadith.arabic_text}</p></div>}
                  <div className={anchorHadith.arabic_text ? "border-t border-[#5C4A3D]/10 dark:border-[#c6a87c]/20 pt-6" : ""}><p className="text-base sm:text-lg text-[#5C4A3D] dark:text-[#c6a87c] leading-relaxed font-serif">{anchorHadith.english_text}</p></div>
                  <div className="mt-6 flex justify-end pt-4 border-t border-[#5C4A3D]/10 dark:border-[#c6a87c]/20">
                    <button onClick={(e) => {
                      e.stopPropagation();
                      handleCopyHadith(anchorHadith);
                      setAnchorCopied(true);
                      setTimeout(() => setAnchorCopied(false), 2000);
                    }} className={`flex items-center gap-2 text-xs font-mono transition-colors px-4 py-2 rounded-md cursor-pointer ${anchorCopied ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : 'text-[#5C4A3D] hover:text-[#2D241C] hover:bg-[#FDFBF7] dark:bg-[#c6a87c]/10 dark:hover:bg-[#c6a87c]/20 dark:text-[#c6a87c] dark:hover:text-[#FAFAFA]'}`}>
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
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setTafsirData(null); setTafsirLoading(false); setTafsirTarget(null); }} className="absolute inset-0 bg-[#2D241C]/60 dark:bg-[#020604]/80 backdrop-blur-md cursor-pointer" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-[#EAE4D3] dark:bg-[#030A06] border border-[#5C4A3D]/20 dark:border-[#c6a87c]/20 w-full sm:w-[90vw] max-w-[700px] h-[80vh] flex flex-col shadow-2xl rounded-2xl z-[4001] overflow-hidden">
                <div className="flex justify-between items-center bg-[#FDFBF7]/60 dark:bg-[#c6a87c]/5 backdrop-blur-xl pt-5 pb-4 px-6 z-10 border-b border-[#5C4A3D]/15 dark:border-[#c6a87c]/20 shrink-0">
                  <div>
                    <h3 className="font-mono text-sm tracking-widest uppercase text-amber-600 dark:text-amber-500 font-bold mb-0.5 flex items-center gap-2"><LibraryBig className="w-4 h-4" /> Related Narrations</h3>
                    <p className="text-xs text-[#5C4A3D]/60 dark:text-[#c6a87c]/60 font-mono m-0">Surah {tafsirTarget.surah}, Verse {tafsirTarget.ayah}</p>
                  </div>
                  <button onClick={() => { setTafsirData(null); setTafsirLoading(false); setTafsirTarget(null); }} className="p-2 hover:bg-[#FDFBF7] dark:hover:bg-[#c6a87c]/10 rounded-full transition-colors cursor-pointer shrink-0"><X className="w-5 h-5 text-[#5C4A3D] dark:text-[#c6a87c]" /></button>
                </div>
                <div ref={tafsirScrollRef} className="p-4 sm:p-6 overflow-y-auto flex-grow smart-scrollbar bg-[#EAE4D3]/50 dark:bg-black/20">
                  {tafsirLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-[#5C4A3D]/60 dark:text-[#c6a87c]/60"><KisaLogo className="w-10 h-10 animate-pulse text-amber-500 mb-4" /><p className="text-sm font-mono uppercase tracking-widest">Scanning Database...</p></div>
                  ) : tafsirData?.empty || !tafsirData?.clusters || tafsirData.clusters.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-[#5C4A3D]/50 dark:text-[#c6a87c]/40 italic"><LibraryBig className="w-12 h-12 mb-4 opacity-20" /><p>No hadiths found in the database referencing this specific verse.</p></div>
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
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setQuranPopup(null)} className="absolute inset-0 bg-[#2D241C]/60 dark:bg-[#020604]/80 backdrop-blur-md cursor-pointer" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-[#EAE4D3] dark:bg-[#030A06] border border-[#5C4A3D]/20 dark:border-[#c6a87c]/20 w-full sm:w-[90vw] max-w-[600px] max-h-[85vh] flex flex-col shadow-2xl rounded-2xl z-[3001] overflow-hidden">
                <div className="flex justify-between items-center bg-[#FDFBF7]/60 dark:bg-[#c6a87c]/5 backdrop-blur-xl pt-5 pb-4 px-6 z-10 border-b border-[#5C4A3D]/15 dark:border-[#c6a87c]/20 shrink-0">
                  <div><h3 className="font-mono text-sm tracking-widest uppercase text-[#2D241C] dark:text-[#FAFAFA] font-bold mb-0.5">Surah {quranPopup.data.surahName}</h3><p className="text-xs text-[#5C4A3D]/60 dark:text-[#c6a87c]/60 font-mono m-0">Verse {quranPopup.ayah}</p></div>
                  <button onClick={() => setQuranPopup(null)} className="p-2 hover:bg-[#FDFBF7] dark:hover:bg-[#c6a87c]/10 rounded-full transition-colors cursor-pointer shrink-0"><X className="w-5 h-5 text-[#5C4A3D] dark:text-[#c6a87c]" /></button>
                </div>
                <div className="p-6 sm:p-8 overflow-y-auto flex-grow smart-scrollbar">
                  <div className="mb-6"><p className="font-arabic text-3xl sm:text-4xl text-right leading-[2.2] text-[#2D241C] dark:text-slate-100" dir="rtl" lang="ar" style={{ fontFamily: activeFontFamily, fontVariantLigatures: 'normal', fontFeatureSettings: '"ccmp" 1, "mark" 1, "mkmk" 1' }}>{quranPopup.data.ar}</p></div>
                  <div className="border-t border-[#5C4A3D]/10 dark:border-[#c6a87c]/20 pt-6"><p className="text-base sm:text-lg text-[#5C4A3D] dark:text-[#c6a87c] leading-relaxed font-serif">{quranPopup.data.en}</p></div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showHistoryDrawer && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center pointer-events-auto p-4 sm:p-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHistoryDrawer(false)} className="absolute inset-0 bg-[#2D241C]/60 dark:bg-[#020604]/80 backdrop-blur-md cursor-pointer" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-[#EAE4D3] dark:bg-[#030A06] border border-[#5C4A3D]/20 dark:border-[#c6a87c]/20 w-full sm:w-[90vw] max-w-[600px] max-h-[85vh] flex flex-col shadow-2xl rounded-2xl z-[2001]">
                <div className="flex justify-between items-center bg-[#FDFBF7]/60 dark:bg-[#c6a87c]/5 backdrop-blur-xl pt-5 pb-4 px-5 sm:px-6 z-10 border-b border-[#5C4A3D]/15 dark:border-[#c6a87c]/20 rounded-t-2xl shrink-0">
                  <h2 className="text-lg sm:text-xl font-mono font-bold tracking-tight text-[#2D241C] dark:text-[#FAFAFA] flex items-center gap-2"><Clock className="w-5 h-5 text-[#5C4A3D] dark:text-[#c6a87c]" />Study History</h2>
                  <div className="flex items-center gap-2">
                    {appHistory.length > 0 && <button onClick={() => setAppHistory([])} className="p-2 hover:bg-red-50 text-red-500 hover:text-red-600 dark:hover:bg-red-500/10 rounded-full transition-colors cursor-pointer shrink-0" title="Clear History"><Trash2 className="w-4 h-4 sm:w-5 sm:h-5" /></button>}
                    <button onClick={() => setShowHistoryDrawer(false)} className="p-2 hover:bg-[#FDFBF7] dark:hover:bg-[#c6a87c]/10 rounded-full transition-colors cursor-pointer shrink-0"><X className="w-5 h-5 text-[#5C4A3D] dark:text-[#c6a87c]" /></button>
                  </div>
                </div>
                <div className="overflow-y-auto flex-grow smart-scrollbar p-2 sm:p-4">
                  {appHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-[#5C4A3D]/50 dark:text-[#c6a87c]/50 italic"><History className="w-10 h-10 mb-4 opacity-20" /><p>Your study history is empty.</p></div>
                  ) : (
                    <div className="flex flex-col gap-1 sm:gap-2">
                      {appHistory.map((item, i) => (
                        <div key={i} onClick={() => handleHistoryClick(item)} className={`px-4 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 rounded-xl cursor-pointer transition-colors border group hover:bg-[#FDFBF7]/60 dark:hover:bg-[#c6a87c]/10 border-transparent hover:border-[#5C4A3D]/15 dark:hover:border-[#c6a87c]/30`}>
                          <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                            <div className={`p-2 sm:p-2.5 rounded-lg shrink-0 bg-[#FDFBF7]/80 dark:bg-black/20 text-[#5C4A3D] dark:text-slate-300 border border-transparent dark:border-[#c6a87c]/10`}>
                              {item.type === 'quran' ? <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" /> : (item.mode === 'keyword' ? <Database className="w-4 h-4 sm:w-5 sm:h-5" /> : <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#c6a87c]" />)}
                            </div>
                            <div className="flex flex-col min-w-0 flex-1 pr-2">
                              <span className="font-semibold text-sm sm:text-base truncate w-full text-[#2D241C] dark:text-[#c6a87c] group-hover:dark:text-[#FAFAFA]">{item.type === 'quran' ? `Surah ${item.surahName}` : item.query}</span>
                              <span className="text-[10px] sm:text-xs text-[#5C4A3D]/60 dark:text-[#c6a87c]/50 font-mono mt-0.5">{item.type === 'search' ? `${item.mode === 'concept' ? 'Semantic' : 'Exact Match'} • ${item.source}` : 'Quran Recitation'}</span>
                            </div>
                          </div>
                          <span className="text-[10px] sm:text-xs font-mono text-[#5C4A3D]/50 dark:text-[#c6a87c]/40 self-end sm:self-auto shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">{timeAgo(item.timestamp)}</span>
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
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowUpdates(false)} className="absolute inset-0 bg-[#2D241C]/60 dark:bg-[#020604]/80 backdrop-blur-md cursor-pointer" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-[#EAE4D3] dark:bg-[#030A06] border border-[#5C4A3D]/20 dark:border-[#c6a87c]/20 w-full sm:w-[90vw] max-w-[500px] max-h-[80vh] flex flex-col shadow-2xl rounded-2xl z-[2001]">
                <div className="flex justify-between items-center bg-[#FDFBF7]/60 dark:bg-[#c6a87c]/5 backdrop-blur-xl pt-5 pb-4 px-5 z-10 border-b border-[#5C4A3D]/15 dark:border-[#c6a87c]/20 rounded-t-2xl shrink-0"><h2 className="text-lg sm:text-xl font-mono font-bold tracking-tight text-[#2D241C] dark:text-[#FAFAFA] flex items-center gap-2"><History className="w-5 h-5 text-[#5C4A3D] dark:text-[#c6a87c]" />Updates Log</h2><button onClick={() => setShowUpdates(false)} className="p-2 hover:bg-[#FDFBF7] dark:hover:bg-[#c6a87c]/10 rounded-full transition-colors cursor-pointer shrink-0"><X className="w-5 h-5 text-[#5C4A3D] dark:text-[#c6a87c]" /></button></div>
                <div className="p-5 sm:p-6 overflow-y-auto flex-grow smart-scrollbar flex flex-col gap-6">
                  {APP_UPDATES.map((update, idx) => (
                    <div key={idx} className="relative pl-4 border-l-2 border-[#5C4A3D]/15 dark:border-[#c6a87c]/20"><div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-[#5C4A3D]/80 dark:bg-[#c6a87c]" /><div className="flex items-baseline justify-between mb-2"><h3 className="font-mono font-bold text-base sm:text-lg text-[#2D241C] dark:text-[#FAFAFA]">{update.version}</h3><span className="text-[10px] sm:text-xs font-mono text-[#5C4A3D]/60 dark:text-[#c6a87c]/60">{update.date}</span></div><ul className="flex flex-col gap-2 sm:gap-3">{update.changes.map((change, cIdx) => <li key={cIdx} className="text-xs sm:text-sm text-[#5C4A3D] dark:text-[#c6a87c] flex items-start gap-2 leading-relaxed"><span className="text-[#5C4A3D]/40 dark:text-[#c6a87c]/50 mt-0.5 font-bold">•</span><span>{change}</span></li>)}</ul></div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showInfo && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center pointer-events-auto p-4 sm:p-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowInfo(false)} className="absolute inset-0 bg-[#2D241C]/60 dark:bg-[#020604]/80 backdrop-blur-md cursor-pointer" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-[#EAE4D3] dark:bg-[#030A06] border border-[#5C4A3D]/20 dark:border-[#c6a87c]/20 w-full sm:w-[90vw] max-w-[600px] max-h-[85vh] flex flex-col shadow-2xl rounded-2xl z-[2001]">
                <div className="flex justify-between items-center bg-[#FDFBF7]/60 dark:bg-[#c6a87c]/5 backdrop-blur-xl pt-5 pb-4 px-5 z-10 border-b border-[#5C4A3D]/15 dark:border-[#c6a87c]/20 rounded-t-2xl shrink-0"><h2 className="text-lg sm:text-xl font-mono font-bold tracking-tight text-[#2D241C] dark:text-[#FAFAFA] flex items-center gap-2"><KisaLogo className="w-5 h-5 text-[#5C4A3D] dark:text-[#c6a87c]" />How to Use Kisa</h2><button onClick={() => setShowInfo(false)} className="p-2 hover:bg-[#FDFBF7] dark:hover:bg-[#c6a87c]/10 rounded-full transition-colors cursor-pointer shrink-0"><X className="w-5 h-5 text-[#5C4A3D] dark:text-[#c6a87c]" /></button></div>

                <div className="p-5 sm:p-6 overflow-y-auto flex-grow smart-scrollbar flex flex-col gap-6 text-[#5C4A3D] dark:text-[#c6a87c]">
                  <div>
                    <h3 className="font-bold text-base sm:text-lg mb-2 text-[#2D241C] dark:text-[#FAFAFA]">Welcome to Kisa</h3>
                    <p className="leading-relaxed text-xs sm:text-sm">Kisa is a semantic search engine designed specifically to explore authentic Twelver Shia literature, prioritizing core texts like <i>al-Kafi</i>, <i>Bihar al-Anwar</i>, and <i>Basa'ir al-Darajat</i>. It maps verified texts mathematically so you can explore concepts without AI hallucinations.</p>
                  </div>
                  <hr className="border-[#5C4A3D]/10 dark:border-[#c6a87c]/10" />

                  <div>
                    <h3 className="font-bold text-base sm:text-lg flex items-center gap-2 mb-3 text-[#2D241C] dark:text-[#FAFAFA]"><LibraryIcon className="w-4 h-4 text-[#5C4A3D]/70 dark:text-[#c6a87c]" /> Features</h3>
                    <div className="mb-4">
                      <h4 className="font-semibold text-sm sm:text-base flex items-center gap-1.5 mb-1"><Search className="w-3.5 h-3.5 text-[#5C4A3D]/70 dark:text-[#c6a87c]" /> Dual Search Engine</h4>
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
                  <hr className="border-[#5C4A3D]/10 dark:border-[#c6a87c]/10" />

                  <div>
                    <h3 className="font-bold text-base sm:text-lg flex items-center gap-2 mb-3 text-[#2D241C] dark:text-[#FAFAFA]"><Sparkles className="w-4 h-4 text-[#5C4A3D]/70 dark:text-[#c6a87c]" /> Advanced Features</h3>
                    <ul className="flex flex-col gap-4 text-xs sm:text-sm leading-relaxed">
                      <li>
                        <b className="text-[#2D241C] dark:text-[#FAFAFA] flex items-center gap-1.5 mb-0.5"><Layout className="w-3.5 h-3.5 text-[#5C4A3D]/70 dark:text-[#c6a87c]" /> Dynamic Concept Map</b>
                        Concept searches generate a beautiful, non-overlapping orbital map of themes. The "Top Matches" node is highlighted, and you can switch to a traditional List View at any time.
                      </li>
                      <li>
                        <b className="text-[#2D241C] dark:text-[#FAFAFA] flex items-center gap-1.5 mb-0.5"><Sparkles className="w-3.5 h-3.5 text-[#5C4A3D]/70 dark:text-[#c6a87c]" /> Vector Hopping ("Find Similar")</b>
                        Click "Find Similar" on any hadith to use its mathematical signature to instantly discover related narrations. The original source is cleanly pinned to the top as an "Anchor" so you never lose your place.
                      </li>
                      <li>
                        <b className="text-[#2D241C] dark:text-[#FAFAFA] flex items-center gap-1.5 mb-0.5"><BookOpen className="w-3.5 h-3.5 text-amber-500" /> Reverse Quran Tafsir</b>
                        Read all 114 Surahs. If Kisa detects narrations referencing a specific Ayah, a "Related Hadiths" button appears. Click it to open a seamless popup of contextual narrations.
                      </li>
                    </ul>
                  </div>
                  <hr className="border-[#5C4A3D]/10 dark:border-[#c6a87c]/10" />

                  <div>
                    <h3 className="font-bold text-base sm:text-lg flex items-center gap-2 mb-3 text-[#2D241C] dark:text-[#FAFAFA]"><Clock className="w-4 h-4 text-[#5C4A3D]/70 dark:text-[#c6a87c]" /> Workflow & Study Tools</h3>
                    <ul className="flex flex-col gap-3 text-xs sm:text-sm leading-relaxed list-disc pl-4">
                      <li><b className="text-[#2D241C] dark:text-[#FAFAFA]">Study History & Quick Resume:</b> Click the empty search bar to instantly resume your 5 most recent searches/recitations, or click the Clock icon to open your full History drawer.</li>
                      <li><b className="text-[#2D241C] dark:text-[#FAFAFA]">Source Filtering:</b> Use the Source dropdown to isolate searches strictly to specific books like <i>al-Kafi</i>.</li>
                      <li><b className="text-[#2D241C] dark:text-[#FAFAFA]">Smart Copy:</b> Click "Copy Text" on any Hadith or Anchored Source to instantly copy the full reference, Arabic text, Chain of Narrators, English translation, and a Kisa link to your clipboard.</li>
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