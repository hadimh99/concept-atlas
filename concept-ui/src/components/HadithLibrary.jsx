// src/components/HadithLibrary.jsx

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Menu, X, Copy, Check, PenTool, History, Clock, Search, List, MapPin, Sparkles } from 'lucide-react';

const HadithLibrary = ({ hadithData = [] }) => {
    // --- CORE ROUTING STATE ---
    const [currentView, setCurrentView] = useState('home');
    const [searchQuery, setSearchQuery] = useState('');
    const [dashExpanded, setDashExpanded] = useState({});

    // --- READER STATE ---
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
    const [activeLocation, setActiveLocation] = useState({ book: null, volume: null, category: null, chapter: null });
    const [expandedBooks, setExpandedBooks] = useState({});
    const [expandedVolumes, setExpandedVolumes] = useState({});
    const [expandedCategories, setExpandedCategories] = useState({});
    const [copiedId, setCopiedId] = useState(null);
    const topRef = useRef(null);

    // --- PROGRESS & PHYSICS STATE ---
    const [readingProgress, setReadingProgress] = useState(() => {
        const saved = localStorage.getItem('kisa_hadith_progress');
        return saved ? JSON.parse(saved) : {};
    });

    const [isExploding, setIsExploding] = useState(false);
    const [resumeToast, setResumeToast] = useState(false);
    const lastSaveTimeRef = useRef(0);

    const getChapterKey = (loc) => `${loc.book}|${loc.volume}|${loc.category}|${loc.chapter}`;

    // --- BULLETPROOF DATA ENGINE ---
    const { hierarchy, flatChapters, dashboardData } = useMemo(() => {
        const tree = {};
        const chaptersList = [];
        const dashboard = {};

        const safeData = Array.isArray(hadithData) ? hadithData : [];

        safeData.forEach(h => {
            const b = String(h.book || h.book_number || 'Unknown Book');
            const vStr = h.volume_number ? `Volume ${h.volume_number}` : (h.volume ? `Volume ${h.volume}` : h.bookId || 'Unknown Volume');
            const v = String(vStr);
            const cat = String(h.category || 'Unknown Category');
            const chap = String(h.chapter || h.chapter_number || 'Unknown Chapter');
            const chapKey = `${b}|${v}|${cat}|${chap}`;

            // Build Sidebar Hierarchy
            if (!tree[b]) tree[b] = {};
            if (!tree[b][v]) tree[b][v] = {};
            if (!tree[b][v][cat]) tree[b][v][cat] = {};
            if (!tree[b][v][cat][chap]) {
                tree[b][v][cat][chap] = [];
                chaptersList.push({ book: b, volume: v, category: cat, chapter: chap, key: chapKey });
            }
            tree[b][v][cat][chap].push(h);

            // Build High-Performance Dashboard Data
            if (!dashboard[b]) dashboard[b] = { volumes: {} };
            if (!dashboard[b].volumes[v]) {
                dashboard[b].volumes[v] = {
                    id: `${b}-${v}`,
                    book: b,
                    volume: v,
                    chapterKeys: new Set(),
                    firstLocation: { book: b, volume: v, category: cat, chapter: chap }
                };
            }
            dashboard[b].volumes[v].chapterKeys.add(chapKey);
        });

        // Convert Sets to Arrays for fast React rendering and calculate chapter totals
        Object.values(dashboard).forEach(bData => {
            Object.values(bData.volumes).forEach(vData => {
                vData.chapterKeys = Array.from(vData.chapterKeys);
                vData.totalChapters = vData.chapterKeys.length;
            });
        });

        return { hierarchy: tree, flatChapters: chaptersList, dashboardData: dashboard };
    }, [hadithData]);

    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const query = searchQuery.toLowerCase();
        const safeData = Array.isArray(hadithData) ? hadithData : [];
        return safeData.filter(h =>
            (h.englishText && String(h.englishText).toLowerCase().includes(query)) ||
            (h.arabicText && String(h.arabicText).includes(query)) ||
            (h.chapter && String(h.chapter).toLowerCase().includes(query))
        ).slice(0, 50);
    }, [searchQuery, hadithData]);

    // --- AUTO-RESUME MEMOIZATION ---
    const resumeLocation = useMemo(() => {
        const progressEntries = Object.entries(readingProgress);
        if (progressEntries.length === 0) return null;

        // Sort by most recently accessed
        progressEntries.sort((a, b) => (b[1].lastAccessed || 0) - (a[1].lastAccessed || 0));
        const lastId = progressEntries[0][0];
        const lastStatus = progressEntries[0][1].status;

        if (lastStatus === 'in-progress') {
            const [book, volume, category, chapter] = lastId.split('|');
            return { book, volume, category, chapter };
        }
        return null;
    }, [readingProgress]);

    // --- NAVIGATION LOGIC ---
    const openReader = (loc) => {
        if (!loc || !loc.book) return;
        setActiveLocation(loc);
        setCurrentView('reader');

        // Force reset the expanded state so ONLY the newly selected route is open.
        setExpandedBooks({ [loc.book]: true });
        setExpandedVolumes({ [`${loc.book}-${loc.volume}`]: true });
        setExpandedCategories({ [`${loc.book}-${loc.volume}-${loc.category}`]: true });
    };

    const closeReader = () => {
        // 1. Instantly capture the final scroll position the millisecond they click back
        if (activeLocation && activeLocation.chapter) {
            const chapterKey = getChapterKey(activeLocation);
            const currentSavedData = JSON.parse(localStorage.getItem('kisa_hadith_progress') || '{}');

            const y = window.scrollY;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = height > 0 ? (y / height) * 100 : 0;

            const currentStatus = currentSavedData[chapterKey]?.status || 'unread';
            // Ensure they actually scrolled past 2% to trigger the "Continue" banner
            const newStatus = currentStatus === 'completed' ? 'completed' : (scrolled > 2 ? 'in-progress' : 'unread');

            currentSavedData[chapterKey] = {
                ...currentSavedData[chapterKey],
                position: y,
                percentage: scrolled,
                status: newStatus,
                lastAccessed: Date.now()
            };

            // 2. Force save to database AND force React state to update immediately
            localStorage.setItem('kisa_hadith_progress', JSON.stringify(currentSavedData));
            setReadingProgress(currentSavedData);
        }

        // 3. Now return to the dashboard
        setCurrentView('home');
        setSearchQuery('');
    };

    // --- CINEMATIC AUTO-RESUME & SCROLL PHYSICS ENGINE ---
    useEffect(() => {
        if (currentView !== 'reader' || !activeLocation.chapter) return;

        const chapterKey = getChapterKey(activeLocation);
        const savedData = JSON.parse(localStorage.getItem('kisa_hadith_progress') || '{}');
        const docData = savedData[chapterKey];

        // 1. Layout Stabilization & Cinematic Warp
        if (docData && docData.position > 300) {
            // Force the view to the top first so the user actually sees the descent
            window.scrollTo(0, 0);

            // Wait 300ms for the DOM and heavy Arabic fonts to paint completely
            setTimeout(() => {
                const startY = 0;
                const targetY = docData.position;
                const distance = targetY - startY;

                // Calculate dynamic duration: minimum 800ms, maximum 1800ms depending on scroll depth
                const duration = Math.min(1800, Math.max(800, Math.abs(distance) * 0.15));
                let start = null;

                const cinematicScroll = (timestamp) => {
                    if (!start) start = timestamp;
                    const progress = timestamp - start;
                    const t = Math.min(progress / duration, 1);

                    // The magic Ease-Out-Quart formula for buttery smooth deceleration
                    const easeOut = 1 - Math.pow(1 - t, 4);
                    window.scrollTo(0, startY + (distance * easeOut));

                    if (progress < duration) {
                        window.requestAnimationFrame(cinematicScroll);
                    } else {
                        // We arrived! Find the exact Hadith card currently sitting in the viewport
                        const elements = Array.from(document.querySelectorAll('.hadith-block'));
                        const targetEl = elements.find(el => {
                            const rect = el.getBoundingClientRect();
                            return rect.top >= 0 && rect.top < window.innerHeight / 2;
                        }) || elements[0];

                        // Trigger the illuminating highlight flash
                        if (targetEl) {
                            targetEl.classList.add('bg-[#c6a87c]/20', 'dark:bg-[#c6a87c]/20', 'transition-colors', 'duration-1000');
                            setTimeout(() => targetEl.classList.remove('bg-[#c6a87c]/20', 'dark:bg-[#c6a87c]/20'), 2500);
                        }

                        setResumeToast(true);
                        setTimeout(() => setResumeToast(false), 3000);
                    }
                };
                window.requestAnimationFrame(cinematicScroll);
            }, 300);
        } else {
            window.scrollTo(0, 0);
        }

        // 2. Scroll Tracking Telemetry
        let ticking = false;
        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const y = window.scrollY;
                    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
                    const scrolled = height > 0 ? (y / height) * 100 : 0;

                    const now = Date.now();
                    if (now - lastSaveTimeRef.current > 1000) {
                        const currentSavedData = JSON.parse(localStorage.getItem('kisa_hadith_progress') || '{}');
                        const currentStatus = currentSavedData[chapterKey]?.status;

                        const newStatus = currentStatus === 'completed' ? 'completed' : (scrolled > 2 ? 'in-progress' : 'unread');

                        currentSavedData[chapterKey] = {
                            ...currentSavedData[chapterKey],
                            position: y,
                            percentage: scrolled,
                            status: newStatus,
                            lastAccessed: now
                        };

                        localStorage.setItem('kisa_hadith_progress', JSON.stringify(currentSavedData));
                        setReadingProgress(currentSavedData); // Always keep React in perfect sync
                        lastSaveTimeRef.current = now;
                    }
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [currentView, activeLocation]);

    // --- SEAMLESS PREV / NEXT LOGIC ---
    const currentIndex = flatChapters.findIndex(c =>
        c.book === activeLocation.book && c.volume === activeLocation.volume &&
        c.category === activeLocation.category && c.chapter === activeLocation.chapter
    );
    const prevChapterInfo = currentIndex > 0 ? flatChapters[currentIndex - 1] : null;
    const nextChapterInfo = currentIndex !== -1 && currentIndex + 1 < flatChapters.length ? flatChapters[currentIndex + 1] : null;

    const handleNext = () => {
        if (!nextChapterInfo) return;
        // Silently mark current chapter as complete
        const chapterKey = getChapterKey(activeLocation);
        const newProg = {
            ...readingProgress,
            [chapterKey]: { status: 'completed', lastAccessed: Date.now(), position: 0, percentage: 100 }
        };
        setReadingProgress(newProg);
        localStorage.setItem('kisa_hadith_progress', JSON.stringify(newProg));
        openReader(nextChapterInfo);
    };

    const handlePrev = () => {
        if (!prevChapterInfo) return;
        openReader(prevChapterInfo);
    };

    const handleCopyId = (id) => {
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const formatHadithText = (text) => {
        if (!text) return "";
        const safeText = String(text);
        const match = safeText.match(/^(\s*\d+\.\s*)(.*)/);
        if (match) {
            return (
                <span className="block">
                    <span className="font-bold text-[#c6a87c] dark:text-[#d4b78f] text-lg sm:text-xl mr-2 select-none">
                        {match[1].trim()}
                    </span>
                    {match[2]}
                </span>
            );
        }
        return safeText;
    };

    const toggleBook = (bookName) => setExpandedBooks(prev => ({ ...prev, [bookName]: !prev[bookName] }));
    const toggleVolume = (volumeKey) => setExpandedVolumes(prev => ({ ...prev, [volumeKey]: !prev[volumeKey] }));
    const toggleCategory = (categoryKey) => setExpandedCategories(prev => ({ ...prev, [categoryKey]: !prev[categoryKey] }));

    const renderSidebarContent = (isMobile) => (
        <div className="flex flex-col h-full bg-[#f7f7f9] dark:bg-[#151518]">
            <div className="p-5 border-b border-slate-200 dark:border-[#2d2d33] flex justify-between items-center bg-white dark:bg-[#252528] shrink-0">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Book className="w-4 h-4 text-[#c6a87c]" /> Collection Index
                </h2>
                {isMobile ? (
                    <button onClick={() => setIsMobileDrawerOpen(false)} className="p-1"><X className="w-5 h-5 text-slate-500" /></button>
                ) : (
                    <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"><X className="w-4 h-4 text-slate-500" /></button>
                )}
            </div>

            <div className="p-4 overflow-y-auto flex-1 smart-scrollbar">
                {Object.entries(hierarchy).map(([bookName, volumes]) => {
                    const isBookExpanded = expandedBooks[bookName];
                    const isActiveBook = activeLocation.book === bookName;

                    return (
                        <div key={bookName} className="mb-4">
                            <button
                                onClick={() => toggleBook(bookName)}
                                className={`w-full text-left font-serif font-bold text-xl mb-2 pl-2 border-l-2 flex items-center justify-between group cursor-pointer transition-colors text-slate-800 dark:text-[#ededf0] ${isActiveBook ? 'border-[#c6a87c]' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700'}`}
                            >
                                <span className="leading-tight pr-2">{bookName}</span>
                                <div className="flex items-center gap-2 shrink-0 pr-1">
                                    {isActiveBook && <div className="w-1.5 h-1.5 rounded-full bg-[#c6a87c] shadow-[0_0_6px_rgba(198,168,124,0.8)]" />}
                                    {isBookExpanded ? <ChevronUp className="w-4 h-4 opacity-50 group-hover:opacity-100" /> : <ChevronDown className="w-4 h-4 opacity-50 group-hover:opacity-100" />}
                                </div>
                            </button>

                            <AnimatePresence initial={false}>
                                {isBookExpanded && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden ml-2">
                                        {Object.entries(volumes).map(([volumeName, categories]) => {
                                            const volumeKey = `${bookName}-${volumeName}`;
                                            const isVolumeExpanded = expandedVolumes[volumeKey];
                                            const isActiveVolume = isActiveBook && activeLocation.volume === volumeName;

                                            return (
                                                <div key={volumeName} className="mb-3 mt-3">
                                                    <button
                                                        onClick={() => toggleVolume(volumeKey)}
                                                        className="w-full text-left text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center justify-between group cursor-pointer transition-colors py-1.5 px-2 rounded-md bg-black/5 dark:bg-white/5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-[#ededf0]"
                                                    >
                                                        <span>{volumeName}</span>
                                                        <div className="flex items-center gap-2 shrink-0 pr-1">
                                                            {isActiveVolume && <div className="w-1.5 h-1.5 rounded-full bg-[#c6a87c] shadow-[0_0_6px_rgba(198,168,124,0.8)]" />}
                                                            {isVolumeExpanded ? <ChevronUp className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" /> : <ChevronDown className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />}
                                                        </div>
                                                    </button>

                                                    <AnimatePresence initial={false}>
                                                        {isVolumeExpanded && (
                                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden ml-1">
                                                                {Object.entries(categories).map(([categoryName, chapters]) => {
                                                                    const categoryKey = `${bookName}-${volumeName}-${categoryName}`;
                                                                    const isCategoryExpanded = expandedCategories[categoryKey];
                                                                    const isActiveCategory = isActiveVolume && activeLocation.category === categoryName;

                                                                    return (
                                                                        <div key={categoryName} className="mb-1.5">
                                                                            <button
                                                                                onClick={() => toggleCategory(categoryKey)}
                                                                                className="w-full text-left text-xs font-bold py-2 px-2 rounded-md transition-colors flex items-center justify-between group cursor-pointer text-slate-700 dark:text-[#ededf0] hover:bg-slate-200/50 dark:hover:bg-[#1c1c20]"
                                                                            >
                                                                                <span className="pr-2 leading-snug flex-1">{categoryName}</span>
                                                                                <div className="flex items-center gap-2 shrink-0 pr-1">
                                                                                    {isActiveCategory && <div className="w-1.5 h-1.5 rounded-full bg-[#c6a87c] shadow-[0_0_6px_rgba(198,168,124,0.8)]" />}
                                                                                    {isCategoryExpanded ? <ChevronUp className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" /> : <ChevronDown className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />}
                                                                                </div>
                                                                            </button>

                                                                            <AnimatePresence initial={false}>
                                                                                {isCategoryExpanded && (
                                                                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden flex flex-col gap-0.5 border-l-2 border-slate-200 dark:border-[#2d2d33] ml-2 pl-2 mt-1">
                                                                                        {Object.keys(chapters).map(chapterName => {
                                                                                            const isActiveChapter = isActiveCategory && activeLocation.chapter === chapterName;
                                                                                            return (
                                                                                                <button
                                                                                                    key={chapterName}
                                                                                                    onClick={() => {
                                                                                                        openReader({ book: bookName, volume: volumeName, category: categoryName, chapter: chapterName });
                                                                                                        if (isMobile) setIsMobileDrawerOpen(false);
                                                                                                    }}
                                                                                                    className={`text-left text-xs py-2.5 px-3 rounded-lg transition-colors cursor-pointer ${isActiveChapter ? 'bg-[#c6a87c]/10 text-[#c6a87c] font-bold border border-[#c6a87c]/20' : 'text-slate-500 hover:text-slate-800 dark:text-[#9a9a9f] dark:hover:text-[#ededf0] hover:bg-slate-100 dark:hover:bg-[#1c1c20]'}`}
                                                                                                >
                                                                                                    {chapterName}
                                                                                                </button>
                                                                                            )
                                                                                        })}
                                                                                    </motion.div>
                                                                                )}
                                                                            </AnimatePresence>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            );
                                        })}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    // ============================================================================
    // VIEW 1: THE DASHBOARD
    // ============================================================================
    if (currentView === 'home') {
        return (
            <div className="w-full min-h-screen pt-24 sm:pt-32 pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col pointer-events-auto relative z-10">

                <div className="mb-10 text-center sm:text-left">
                    <h1 className="text-4xl sm:text-5xl font-serif font-bold text-zinc-900 dark:text-white mb-3">Hadith Library</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 text-lg">Explore foundational Twelver Shia collections.</p>
                </div>

                {/* --- NEW: CINEMATIC AUTO-RESUME BANNER --- */}
                {resumeLocation && !searchQuery.trim() && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => openReader(resumeLocation)}
                        className="w-full bg-gradient-to-r from-[#c6a87c]/10 to-transparent border border-[#c6a87c]/30 hover:bg-[#c6a87c]/20 rounded-2xl p-6 sm:p-8 mb-12 cursor-pointer transition-all duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-sm group"
                    >
                        <div className="flex-1 w-full pr-4">
                            <div className="flex items-center flex-wrap gap-2 mb-3">
                                <div className="flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-[#c6a87c]" />
                                    <span className="text-[#c6a87c] font-bold text-[10px] sm:text-xs uppercase tracking-widest">
                                        Continue Reading
                                    </span>
                                </div>
                                <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">•</span>
                                <span className="text-zinc-500 dark:text-zinc-400 font-bold text-[10px] sm:text-xs uppercase tracking-widest bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-md border border-zinc-200/50 dark:border-zinc-700/50">
                                    {resumeLocation.book}
                                </span>
                            </div>

                            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white transition-colors group-hover:text-[#c6a87c] mb-2 leading-snug line-clamp-2">
                                {resumeLocation.chapter}
                            </h2>
                            <p className="text-xs sm:text-sm font-serif text-zinc-500 dark:text-zinc-400">
                                {resumeLocation.volume} • {resumeLocation.category}
                            </p>

                            <div className="w-full max-w-[200px] h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mt-5 overflow-hidden">
                                <div className="h-full bg-[#c6a87c] transition-all duration-500" style={{ width: `${readingProgress[getChapterKey(resumeLocation)]?.percentage || 0}%` }} />
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-white dark:bg-[#1c1c1e] shadow-md border border-[#c6a87c]/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <ChevronRight className="w-6 h-6 text-[#c6a87c]" />
                        </div>
                    </motion.div>
                )}

                <form onSubmit={(e) => { e.preventDefault(); document.activeElement?.blur(); }} className="relative mb-12">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-zinc-400" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-12 pr-4 py-4 sm:py-5 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-[#1c1c1e] shadow-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#c6a87c] focus:border-transparent transition-all"
                        placeholder="Search all collections by specific words or chapters..."
                    />
                    {searchQuery.trim() && (
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                                {searchResults.length} matches
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
                            searchResults.map((hadith, idx) => {
                                const b = String(hadith.book || hadith.book_number || 'Unknown Book');
                                const v = String(hadith.volume_number ? `Volume ${hadith.volume_number}` : (hadith.volume ? `Volume ${hadith.volume}` : hadith.bookId));
                                const cat = String(hadith.category || 'Unknown Category');
                                const chap = String(hadith.chapter || hadith.chapter_number || 'Unknown Chapter');

                                return (
                                    <div key={idx} onClick={() => openReader({ book: b, volume: v, category: cat, chapter: chap })} className="bg-white dark:bg-[#1c1c1e] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 cursor-pointer hover:shadow-lg hover:border-[#c6a87c]/50 transition-all duration-300 group">
                                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 flex-wrap">
                                            <span>{b}</span> <ChevronRight className="w-3 h-3" />
                                            <span>{v}</span> <ChevronRight className="w-3 h-3" />
                                            <span className="text-[#c6a87c]">{chap}</span>
                                        </div>
                                        <p className="text-lg text-zinc-700 dark:text-zinc-300 font-serif leading-relaxed line-clamp-3">
                                            {formatHadithText(hadith.englishText)}
                                        </p>
                                    </div>
                                );
                            })
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-8">
                        {Object.entries(dashboardData).map(([bookName, bookData]) => {
                            const volumesArray = Object.values(bookData.volumes).sort((a, b) => a.volume.localeCompare(b.volume));
                            const isExpanded = dashExpanded[bookName] !== false;

                            return (
                                <div key={bookName} className="bg-white dark:bg-[#1c1c1e] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden transition-all">
                                    <button onClick={() => setDashExpanded(prev => ({ ...prev, [bookName]: !isExpanded }))} className="flex items-center justify-between w-full p-5 sm:p-6 cursor-pointer hover:bg-zinc-50 dark:hover:bg-[#252528] transition-colors group">
                                        <h2 className="text-xl sm:text-2xl font-serif font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-3">
                                            <Book className="w-6 h-6 text-[#c6a87c]" /> {bookName}
                                        </h2>
                                        <div className={`p-2 rounded-full transition-colors ${isExpanded ? 'bg-[#c6a87c]/10 text-[#c6a87c]' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:text-[#c6a87c]'}`}>
                                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                        </div>
                                    </button>

                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-zinc-200 dark:border-zinc-800">
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 p-5 sm:p-6 bg-zinc-50/50 dark:bg-[#161618]">
                                                    {volumesArray.map(vol => {
                                                        let completedChapters = 0;
                                                        vol.chapterKeys.forEach(key => {
                                                            if (readingProgress[key]?.status === 'completed') completedChapters++;
                                                        });
                                                        const progress = vol.totalChapters > 0 ? (completedChapters / vol.totalChapters) * 100 : 0;
                                                        const isCompleted = progress === 100 && vol.totalChapters > 0;

                                                        return (
                                                            <div key={vol.id} onClick={() => openReader(vol.firstLocation)} className="bg-white dark:bg-[#1c1c1e] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 cursor-pointer hover:shadow-lg hover:border-[#c6a87c]/50 transition-all duration-300 flex flex-col justify-between group h-full relative overflow-hidden">
                                                                {progress > 0 && !isCompleted && (
                                                                    <div className="absolute top-0 left-0 w-full h-1 bg-zinc-100 dark:bg-zinc-800">
                                                                        <div className="h-full bg-[#c6a87c]" style={{ width: `${progress}%` }} />
                                                                    </div>
                                                                )}
                                                                {isCompleted && <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />}

                                                                <div>
                                                                    <div className="mb-4">
                                                                        <span className="inline-block text-[10px] font-bold uppercase tracking-widest bg-zinc-100 dark:bg-[#252528] text-zinc-500 dark:text-zinc-400 px-2.5 py-1 rounded-md shadow-sm border border-zinc-200 dark:border-[#2d2d33]">
                                                                            {vol.totalChapters} Chapters
                                                                        </span>
                                                                    </div>
                                                                    <h3 className="text-2xl sm:text-3xl font-serif font-bold text-zinc-900 dark:text-white leading-snug group-hover:text-[#c6a87c] transition-colors">
                                                                        {vol.volume}
                                                                    </h3>
                                                                </div>

                                                                <div className="mt-8 flex items-center justify-between text-zinc-400 dark:text-zinc-500">
                                                                    <span className="text-xs font-semibold uppercase tracking-wider">{progress > 0 ? 'Continue Reading' : 'Start Reading'}</span>
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
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    // ============================================================================
    // VIEW 2: THE READER
    // ============================================================================

    if (!activeLocation.chapter) {
        return (
            <div className="w-full min-h-screen flex items-center justify-center pt-24 px-4 text-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">Content could not be loaded.</h2>
                    <button onClick={closeReader} className="px-6 py-2.5 bg-[#c6a87c] text-white font-bold rounded-lg uppercase tracking-wider text-xs cursor-pointer">Return to Dashboard</button>
                </div>
            </div>
        );
    }

    const rawHadiths = hierarchy[activeLocation.book]?.[activeLocation.volume]?.[activeLocation.category]?.[activeLocation.chapter];
    const currentHadiths = Array.isArray(rawHadiths) ? rawHadiths : [];
    const currentAuthor = currentHadiths.length > 0 ? String(currentHadiths[0].author || 'Shaykh Muḥammad b. Yaʿqūb al-Kulaynī') : 'Shaykh Muḥammad b. Yaʿqūb al-Kulaynī';

    return (
        <div className="w-full min-h-screen pt-20 sm:pt-32 pb-32 flex flex-col items-center font-sans relative px-0 sm:px-6 lg:px-8" ref={topRef}>

            {/* THE RESUMED TOAST */}
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

            <div className="md:hidden w-full max-w-[1400px] mx-auto mb-6 px-4 sm:px-0 flex justify-start pointer-events-auto">
                <button onClick={closeReader} className="flex items-center gap-2 text-zinc-500 hover:text-[#c6a87c] transition-colors text-xs sm:text-sm font-bold uppercase tracking-widest cursor-pointer">
                    <ChevronLeft className="w-4 h-4" /> Dashboard
                </button>
            </div>

            <div className="hidden md:block fixed top-32 left-8 z-50 transition-all duration-300 pointer-events-auto">
                <AnimatePresence>
                    {!sidebarOpen && (
                        <motion.button initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onClick={() => setSidebarOpen(true)} className="p-3 bg-white dark:bg-[#252528] border border-slate-200 dark:border-[#2d2d33] shadow-xl rounded-full text-slate-500 hover:text-[#c6a87c] transition-colors cursor-pointer group">
                            <List className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            <button onClick={() => setIsMobileDrawerOpen(true)} className="md:hidden fixed bottom-6 right-3 z-[210] w-12 h-12 bg-white dark:bg-[#252528] text-[#c6a87c] border border-slate-200 dark:border-[#2d2d33] rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition-all">
                <Menu className="w-5 h-5" />
            </button>

            <AnimatePresence>
                {isMobileDrawerOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileDrawerOpen(false)} className="md:hidden fixed inset-0 bg-black/40 z-[190] cursor-pointer backdrop-blur-sm" />
                        <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="md:hidden fixed top-0 bottom-0 left-0 w-[85vw] max-w-[340px] bg-white dark:bg-[#0e0e11] z-[200] shadow-2xl border-r border-slate-200 dark:border-[#2d2d33] flex flex-col overflow-hidden">
                            {renderSidebarContent(true)}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <div className="w-full max-w-[1400px] mx-auto flex items-start gap-0 md:gap-8 lg:gap-12">

                <motion.div
                    animate={{ width: sidebarOpen ? 340 : 0, opacity: sidebarOpen ? 1 : 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="hidden md:flex shrink-0 overflow-hidden sticky top-28 self-start h-[calc(100vh-120px)] flex-col gap-4"
                >
                    <button onClick={closeReader} className="flex items-center gap-2 text-zinc-500 hover:text-[#c6a87c] transition-colors text-xs sm:text-sm font-bold uppercase tracking-widest cursor-pointer pl-1 w-max">
                        <ChevronLeft className="w-4 h-4" /> Dashboard
                    </button>
                    <div className="w-[340px] flex-1 border border-slate-200 dark:border-[#2d2d33] rounded-2xl flex flex-col shadow-sm min-h-0 overflow-hidden">
                        {renderSidebarContent(false)}
                    </div>
                </motion.div>

                <div className="flex-1 min-w-0 w-full flex justify-center transition-all duration-500">
                    <div className="w-full max-w-4xl mx-auto">

                        {/* --- TOP SEAMLESS NAVIGATION --- */}
                        <div className="flex items-center justify-between w-full mb-8 px-4 sm:px-0">
                            {prevChapterInfo ? (
                                <button onClick={handlePrev} className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-[#c6a87c] transition-colors cursor-pointer">
                                    <ChevronLeft className="w-4 h-4" /> Previous
                                </button>
                            ) : <div />}
                            {nextChapterInfo ? (
                                <button onClick={handleNext} className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-[#c6a87c] transition-colors cursor-pointer">
                                    Next <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : <div />}
                        </div>

                        <div className="mb-12 px-4 sm:px-0">
                            <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400 mb-6 flex-wrap">
                                <span>{String(activeLocation.book)}</span>
                                <ChevronRight className="w-3 h-3" />
                                <span>{String(activeLocation.volume)}</span>
                                <ChevronRight className="w-3 h-3 text-[#c6a87c]" />
                                <span className="text-[#c6a87c]">{String(activeLocation.category)}</span>
                            </div>

                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-slate-800 dark:text-[#ededf0] leading-[1.15] tracking-tight mb-8">
                                {String(activeLocation.chapter)}
                            </h1>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 bg-slate-50 dark:bg-[#151518] border border-slate-200 dark:border-[#2d2d33] rounded-2xl shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-[#c6a87c]/10 flex items-center justify-center border border-[#c6a87c]/20 shrink-0">
                                        <PenTool className="w-6 h-6 text-[#c6a87c]" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Compiler & Collection</p>
                                        <p className="text-sm sm:text-base font-serif font-medium text-slate-800 dark:text-[#ededf0]">
                                            {currentAuthor} • <span className="italic text-[#c6a87c]">{String(activeLocation.book)}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="hidden sm:block w-px h-10 bg-slate-200 dark:bg-[#2d2d33] shrink-0" />
                                <div className="flex items-center">
                                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-white dark:bg-[#1c1c20] px-4 py-2 rounded-lg border border-slate-200 dark:border-[#2d2d33] shadow-sm flex items-center gap-2">
                                        <Book className="w-4 h-4 text-[#c6a87c]" /> {currentHadiths.length} Narrations
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-6 sm:gap-8 px-4 sm:px-0">
                            {currentHadiths.map((hadith, index) => {
                                const arabicText = hadith.arabicText || hadith.ar || "";
                                const englishText = hadith.englishText || hadith.en || "";
                                const grading = hadith.majlisiGrading || (hadith.gradingsFull && Array.isArray(hadith.gradingsFull) && hadith.gradingsFull.length > 0 ? hadith.gradingsFull[0].grade_ar : null);

                                return (
                                    <div key={hadith.id || index} className="hadith-block group bg-white dark:bg-[#151518] sm:border border-slate-200 dark:border-[#2d2d33] sm:rounded-2xl p-6 sm:p-8 sm:shadow-sm relative transition-all hover:border-[#c6a87c]/30">

                                        <div className="flex justify-between items-start mb-6">
                                            {grading ? (
                                                <div className="px-3 py-1.5 rounded-md bg-slate-50 dark:bg-[#1c1c20] border border-slate-200 dark:border-[#2d2d33] inline-flex flex-col text-left">
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Al-Majlisi</p>
                                                    <p className="text-xs font-bold text-[#c6a87c]">{String(grading).replace(/['"]/g, '')}</p>
                                                </div>
                                            ) : <div />}

                                            <button
                                                onClick={() => handleCopyId(hadith.id)}
                                                className="p-1.5 sm:p-2 bg-slate-50 dark:bg-[#1c1c20] rounded-md sm:rounded-lg border border-slate-200 dark:border-[#2d2d33] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-[#c6a87c] cursor-pointer"
                                                title="Copy Hadith ID for Admin Fixes"
                                            >
                                                {copiedId === hadith.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                                <span className="hidden sm:inline">{copiedId === hadith.id ? 'Copied' : `ID: ${hadith.id}`}</span>
                                            </button>
                                        </div>

                                        {arabicText && (
                                            <p
                                                className="text-xl sm:text-2xl text-right text-slate-900 dark:text-[#f8f8f8] leading-[2.2] sm:leading-[2.2] mb-6"
                                                dir="rtl"
                                                lang="ar"
                                                style={{ fontFamily: '"Amiri Quran", "Amiri", "Noto Naskh Arabic", serif' }}
                                            >
                                                {String(arabicText)}
                                            </p>
                                        )}

                                        <p className="text-lg sm:text-xl text-slate-900 dark:text-[#f8f8f8] leading-relaxed font-serif antialiased border-t border-slate-100 dark:border-[#2d2d33] pt-6">
                                            {formatHadithText(englishText)}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* --- BOTTOM SEAMLESS NAVIGATION CARDS --- */}
                        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-[#2d2d33] grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-24 px-4 sm:px-0">
                            {prevChapterInfo ? (
                                <div onClick={handlePrev} className="group flex flex-col justify-center p-6 bg-white dark:bg-[#151518] border border-slate-200 dark:border-[#2d2d33] rounded-2xl cursor-pointer hover:border-[#c6a87c]/50 hover:shadow-sm transition-all text-left">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                                        <ChevronLeft className="w-4 h-4 text-[#c6a87c]" /> Previous
                                    </span>
                                    <h3 className="font-serif font-bold text-lg text-slate-800 dark:text-[#ededf0] group-hover:text-[#c6a87c] transition-colors line-clamp-2">
                                        {prevChapterInfo.chapter}
                                    </h3>
                                    <span className="text-xs text-slate-500 mt-2 truncate">
                                        {prevChapterInfo.book} • {prevChapterInfo.volume}
                                    </span>
                                </div>
                            ) : <div />}

                            {nextChapterInfo ? (
                                <div onClick={handleNext} className="group flex flex-col justify-center p-6 bg-white dark:bg-[#151518] border border-slate-200 dark:border-[#2d2d33] rounded-2xl cursor-pointer hover:border-[#c6a87c]/50 hover:shadow-sm transition-all text-right items-end">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                                        Next <ChevronRight className="w-4 h-4 text-[#c6a87c]" />
                                    </span>
                                    <h3 className="font-serif font-bold text-lg text-slate-800 dark:text-[#ededf0] group-hover:text-[#c6a87c] transition-colors line-clamp-2">
                                        {nextChapterInfo.chapter}
                                    </h3>
                                    <span className="text-xs text-slate-500 mt-2 truncate">
                                        {nextChapterInfo.book} • {nextChapterInfo.volume}
                                    </span>
                                </div>
                            ) : <div />}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default HadithLibrary;