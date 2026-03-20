// src/components/QuranReader.jsx

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Moon, Sparkles, X, ChevronRight, ChevronLeft, Settings2, Clock, BookOpen, LibraryBig, Bookmark, Coins, HeartPulse, ShieldAlert, ChevronDown, ChevronUp, History, Library as LibraryIcon } from 'lucide-react';
import quranData from '../quran.json';
import verseMap from '../verse_map.json';
import { quranBenefits, spiritualPrescriptions } from '../quranBenefits';
import { supabase } from '../supabaseClient';

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

const QuranBookmarkButton = ({ surahId, surahName, verseNum, arText, enText, vaultItems = [], isSurah = false }) => {
    const sourceRef = isSurah ? `Surah ${surahName}` : `Surah ${surahName}, Verse ${verseNum}`;
    const isSaved = vaultItems.some(v => v.source === sourceRef && v.type === 'quran');

    const handleSaveClick = async (e) => {
        e.stopPropagation();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
            alert("Please Sign In from the top menu to save to your Vault.");
            return;
        }

        if (isSaved) {
            const savedItem = vaultItems.find(v => v.source === sourceRef && v.type === 'quran');
            if (savedItem) {
                await supabase.from('vault_items').delete().eq('id', savedItem.id);
                window.dispatchEvent(new Event('vault-updated'));
            }
            return;
        }

        const { error } = await supabase.from('vault_items').insert([{
            user_id: session.user.id,
            content: isSurah ? `Complete chapter of Surah ${surahName}` : enText,
            arabic_text: isSurah ? null : arText,
            chain: null,
            source: sourceRef,
            type: 'quran',
            note: ''
        }]);

        if (error) {
            console.error("Supabase Save Error:", error);
            alert(`Supabase blocked the save: ${error.message}`);
        } else {
            window.dispatchEvent(new Event('vault-updated'));
        }
    };

    return (
        <motion.button
            onClick={handleSaveClick}
            whileTap={{ scale: 1.3, rotate: -15 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${isSaved ? 'text-orange-500 hover:text-orange-600 dark:text-orange-500 dark:hover:text-orange-400' : 'text-slate-400 hover:text-orange-500 dark:text-slate-500 dark:hover:text-orange-400'}`}
            title={isSaved ? "Remove from Vault" : "Save to Vault"}
        >
            <Bookmark className={isSurah ? "w-5 h-5" : "w-4 h-4 sm:w-5 sm:h-5"} fill={isSaved ? "currentColor" : "none"} strokeWidth={isSaved ? 0 : 2} />
        </motion.button>
    );
};

const QuranReader = ({ activeFontFamily, fontStyle, setFontStyle, handleSurahSelectHook, externalSurahTarget, externalVerseTarget, onTafsirClick, vaultItems, handleCopyHadith, handleFindSimilar, HadithCard, KisaLogo }) => {
    const [currentView, setCurrentView] = useState('dashboard');
    const [selectedSurah, setSelectedSurah] = useState(1);
    const [showTranslation, setShowTranslation] = useState(true);
    const [readingMode, setReadingMode] = useState('verse');
    const [showSurahMenu, setShowSurahMenu] = useState(false);
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [showVirtues, setShowVirtues] = useState(false);
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
        return saved ? JSON.parse(saved) : { lastSurah: null, lastVerse: 1 };
    });

    useEffect(() => {
        if (externalSurahTarget) {
            setSelectedSurah(externalSurahTarget);
            setCurrentView('reader');
            if (externalVerseTarget) {
                setTimeout(() => setTargetVerse(externalVerseTarget), 100);
            }
        }
    }, [externalSurahTarget, externalVerseTarget]);

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

    useEffect(() => {
        if (currentView !== 'reader') return;
        let ticking = false;
        let lastSaveTime = Date.now();

        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const now = Date.now();
                    if (now - lastSaveTime > 1000) {
                        const verses = document.querySelectorAll(`[id^="verse-${selectedSurah}-"]`);
                        let currentVerse = null;
                        for (let i = 0; i < verses.length; i++) {
                            const rect = verses[i].getBoundingClientRect();
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

    const surahTafsirCounts = useMemo(() => {
        const counts = {};
        for (let i = 1; i <= 114; i++) counts[i] = 0;
        Object.entries(verseMap).forEach(([key, count]) => {
            const surahId = parseInt(key.split(':')[0]);
            if (counts[surahId] !== undefined) counts[surahId] += count;
        });
        return counts;
    }, []);

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
        } else {
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
            window.scrollTo(0, 0);
            const checkStabilization = setInterval(() => {
                const el = document.getElementById(`verse-${selectedSurah}-${targetVerse}`);
                if (el) {
                    const currentY = el.getBoundingClientRect().top + window.scrollY;
                    if (Math.abs(currentY - previousY) < 5 || checks > 15) {
                        clearInterval(checkStabilization);
                        const targetY = currentY - 120;
                        const startY = window.scrollY;
                        const distance = targetY - startY;
                        const duration = Math.min(1800, Math.max(800, Math.abs(distance) * 0.15));
                        let start = null;
                        const cinematicScroll = (timestamp) => {
                            if (!start) start = timestamp;
                            const progress = timestamp - start;
                            const t = Math.min(progress / duration, 1);
                            const easeOut = 1 - Math.pow(1 - t, 4);
                            window.scrollTo(0, startY + (distance * easeOut));
                            if (progress < duration) {
                                window.requestAnimationFrame(cinematicScroll);
                            } else {
                                el.classList.add('bg-amber-500/20', 'dark:bg-amber-500/30', 'transition-colors', 'duration-1000');
                                setTimeout(() => el.classList.remove('bg-amber-500/20', 'dark:bg-amber-500/30'), 2000);
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
                {!quranSearchQuery.trim() && (
                    <div className="mb-12">
                        <h3 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 mb-6 flex items-center gap-3"><Sparkles className="w-6 h-6 text-amber-500" /> Divine Prescriptions</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {spiritualPrescriptions.map((prescription, idx) => {
                                const IconComponent = prescription.icon === 'Coins' ? Coins : (prescription.icon === 'HeartPulse' ? HeartPulse : ShieldAlert);
                                return (
                                    <div key={idx} className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col h-full hover:border-amber-500/30 transition-colors group">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 group-hover:scale-110 transition-transform"><IconComponent className="w-5 h-5" /></div>
                                            <h4 className="font-bold text-lg text-slate-900 dark:text-slate-50">{prescription.title}</h4>
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 flex-grow leading-relaxed">{prescription.description}</p>
                                        <div className="flex flex-wrap gap-2 mt-auto">
                                            {prescription.surahs.map(sId => (
                                                <button key={sId} onClick={() => openSurah(sId)} className="text-[10px] font-bold uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-400 transition-colors px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-amber-500/30 cursor-pointer">{surahs.find(s => s.id === sId)?.enName}</button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
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
                {!quranSearchQuery.trim() && (
                    <div className="mb-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pt-8 border-t border-slate-200 dark:border-slate-800/80">
                            <div>
                                <h3 className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-3"><LibraryIcon className="w-6 h-6 text-amber-500" /> The Tafsir Map</h3>
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
                                const heatPercentage = count > 0 ? (Math.log(count + 1) / Math.log(maxTafsirCount + 1)) * 100 : 0;
                                return (
                                    <button key={s.id} onClick={() => openSurah(s.id)} className="relative bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 hover:border-amber-500/50 hover:shadow-lg transition-all duration-300 group overflow-hidden cursor-pointer flex flex-col text-left h-full">
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-500/10 dark:from-amber-500/20 to-transparent transition-all duration-500 group-hover:opacity-100" style={{ height: `${Math.max(0, heatPercentage)}%`, opacity: count > 0 ? 0.6 : 0 }} />
                                        {heatPercentage > 60 && (<div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />)}
                                        <div className="relative z-10 flex justify-between items-start mb-3">
                                            <span className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded">{s.id}</span>
                                            <span className="font-arabic text-lg sm:text-xl text-slate-800 dark:text-slate-200 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors drop-shadow-sm">{s.arName}</span>
                                        </div>
                                        <div className="relative z-10 flex flex-col mt-auto">
                                            <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-50 group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors truncate mb-0.5">{s.enName}</span>
                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                                                <span className="text-[9px] text-slate-500 uppercase tracking-widest">{s.ayahCount} Ayahs</span>
                                                {count > 0 ? (<div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded text-[9px] font-bold text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/50 shadow-sm"><LibraryBig className="w-2.5 h-2.5" /> {count}</div>) : (<span className="text-[9px] text-slate-400 opacity-40">-</span>)}
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

    return (
        <div className="w-full max-w-4xl px-4 sm:px-6 pt-24 sm:pt-28 pb-12 mx-auto min-h-screen flex flex-col items-center pointer-events-auto">
            {(showSurahMenu || showSettingsMenu || showVirtues) && (<div className="fixed inset-0 z-[60] pointer-events-auto" onClick={() => { setShowSurahMenu(false); setShowSettingsMenu(false); setShowVirtues(false); }} />)}

            <AnimatePresence>
                {resumeToast && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-24 left-1/2 -translate-x-1/2 z-[400] bg-slate-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2.5 rounded-full shadow-2xl text-[10px] sm:text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Resumed where you left off
                    </motion.div>
                )}
            </AnimatePresence>

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
                    <div className="flex items-center bg-white/60 dark:bg-slate-900/60 p-1 rounded-lg border border-slate-300 dark:border-slate-700 shadow-sm shrink-0">
                        <button onClick={() => setReadingMode('verse')} className={`px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${readingMode === 'verse' ? 'bg-amber-700 dark:bg-amber-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}>Verse</button>
                        <button onClick={() => setReadingMode('flow')} className={`px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${readingMode === 'flow' ? 'bg-amber-700 dark:bg-amber-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}>Flow</button>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <button onClick={() => setShowVirtues(true)} className="px-3 sm:px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-500/20">
                            <Sparkles className="w-4 h-4" /> <span className="hidden sm:inline">Virtues</span>
                        </button>

                        <div className="relative">
                            <button onClick={() => { setShowSettingsMenu(!showSettingsMenu); setShowSurahMenu(false); }} className={`px-3 sm:px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border shadow-sm flex items-center gap-2 cursor-pointer ${showSettingsMenu ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 border-transparent' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
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
            </div>

            <AnimatePresence>
                {showVirtues && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowVirtues(false)} className="fixed inset-0 bg-black/40 z-[80] backdrop-blur-sm" />
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white dark:bg-[#1a1a1a] z-[90] shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col pointer-events-auto">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-amber-50/50 dark:bg-amber-900/10">
                                <div>
                                    <h3 className="font-bold text-xl text-slate-900 dark:text-slate-50 flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-500" /> Fadhaa'il</h3>
                                    <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mt-1">Surah {surahs.find(s => s.id === selectedSurah)?.enName}</p>
                                </div>
                                <button onClick={() => setShowVirtues(false)} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors cursor-pointer"><X className="w-5 h-5 text-slate-500" /></button>
                            </div>
                            <div className="p-6 overflow-y-auto flex-grow smart-scrollbar">
                                {quranBenefits[selectedSurah] ? (
                                    <>
                                        <div className="inline-block px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 text-[10px] font-bold uppercase tracking-widest rounded-md mb-6 border border-amber-200 dark:border-amber-800/50">{quranBenefits[selectedSurah].tagline}</div>
                                        <div className="flex flex-col gap-6">
                                            {quranBenefits[selectedSurah].benefits.map((benefit, i) => (
                                                <p key={i} className="text-base sm:text-[17px] leading-[1.8] text-slate-800 dark:text-slate-200 font-serif">{benefit}</p>
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

            <div className="text-center mb-12 flex flex-col items-center relative">
                <div className="flex items-center justify-center gap-3 mb-3 sm:mb-4">
                    <p className="text-amber-800 dark:text-amber-500 font-mono text-[10px] sm:text-xs tracking-[0.2em] uppercase font-bold m-0">Surah {surahs.find(s => s.id === selectedSurah)?.enName}</p>
                    <QuranBookmarkButton surahId={selectedSurah} surahName={surahs.find(s => s.id === selectedSurah)?.enName} isSurah={true} vaultItems={vaultItems} />
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-arabic text-slate-900 dark:text-slate-50 mb-4 sm:mb-5 leading-[1.5] drop-shadow-sm" style={{ fontFamily: activeFontFamily }} dir="rtl" lang="ar">{surahs.find(s => s.id === selectedSurah)?.arName}</h1>
                {surahBismillah && (<h2 className="font-arabic text-4xl sm:text-5xl md:text-6xl text-slate-700 dark:text-slate-300 leading-[1.5] mt-2 opacity-90" style={{ fontFamily: activeFontFamily }} dir="rtl" lang="ar">{surahBismillah}</h2>)}
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
                                                    <sup className={`text-xs font-bold mr-1 opacity-80 transition-colors ${relatedCount > 0 ? 'text-amber-600 dark:text-amber-400 cursor-pointer hover:underline' : 'text-slate-400'}`} onClick={() => relatedCount > 0 && onTafsirClick(selectedSurah, idx + 1)} title={relatedCount > 0 ? `Read ${relatedCount} Related Hadiths` : ''}>{idx + 1}</sup>
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
                                <div className="mb-4 sm:mb-0 sm:absolute sm:top-12 sm:left-4"><span className="text-[10px] sm:text-xs font-mono font-bold text-amber-900 dark:text-amber-500 bg-[#eaddc6] dark:bg-[#1a1a1a] border border-[#d4c5b0] dark:border-[#333] px-2 py-1 rounded shadow-sm inline-block">{selectedSurah}:{idx + 1}</span></div>
                                <div className="sm:pl-20">
                                    <p className="font-arabic text-3xl sm:text-4xl lg:text-[40px] text-right leading-[2.4] sm:leading-[2.5] text-slate-900 dark:text-slate-100 mb-6" dir="rtl" lang="ar" style={{ fontFamily: activeFontFamily }}>{ayah.ar} <span className="text-amber-700 dark:text-amber-500 opacity-80 ml-2 text-xl font-sans">﴾{toArabicNum(idx + 1)}﴿</span></p>
                                    <AnimatePresence>{showTranslation && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><div className="border-t border-[#d4c5b0]/50 dark:border-[#2a2a2a]/50 pt-5 mt-3"><p className="text-lg sm:text-xl text-slate-800 dark:text-slate-300 leading-relaxed font-serif">{ayah.en}</p></div></motion.div>)}</AnimatePresence>
                                    <div className="mt-4 flex justify-end items-center gap-3">
                                        {relatedCount > 0 && (<button onClick={() => onTafsirClick(selectedSurah, idx + 1)} className="flex items-center gap-1.5 text-[10px] sm:text-xs uppercase tracking-wider font-bold text-amber-700 hover:text-amber-900 dark:text-amber-500 dark:hover:text-amber-400 transition-colors bg-amber-100/50 dark:bg-amber-900/20 px-3 py-1.5 rounded-md cursor-pointer shadow-sm"><LibraryBig className="w-3.5 h-3.5" /> Related Hadiths <span className="bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 px-1.5 py-0.5 rounded text-[10px] ml-1">{relatedCount}</span></button>)}
                                        <QuranBookmarkButton surahId={selectedSurah} surahName={surahs.find(s => s.id === selectedSurah)?.enName} verseNum={idx + 1} arText={ayah.ar} enText={ayah.en} vaultItems={vaultItems} />
                                    </div>  </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>


    );
};

export default QuranReader;