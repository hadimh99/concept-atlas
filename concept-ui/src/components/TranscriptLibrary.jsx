// src/components/TranscriptLibrary.jsx

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Moon, Sun, Sparkles, X, ChevronRight, ChevronLeft, Home, Copy, ChevronDown, ChevronUp, List, Layout, BookOpen, History, HelpCircle, Share2, Check, Menu, Clock, Trash2, Library as LibraryIcon, ArrowDown, User, Bookmark, Youtube, Database, Download } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { jsPDF } from 'jspdf';
import RevisionModule from './RevisionModule';


const TranscriptBookmarkButton = ({ doc, vaultItems = [] }) => {
    const sourceRef = doc.title;
    const isSaved = vaultItems.some(v => v.source === sourceRef && v.type === 'transcript' && v.content === '[Full Transcript Bookmarked]');

    const handleSaveClick = async (e) => {
        e.stopPropagation();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
            alert("Please Sign In to save to your Vault.");
            return;
        }

        if (isSaved) {
            const savedItem = vaultItems.find(v => v.source === sourceRef && v.type === 'transcript' && v.content === '[Full Transcript Bookmarked]');
            if (savedItem) {
                await supabase.from('vault_items').delete().eq('id', savedItem.id);
                window.dispatchEvent(new Event('vault-updated'));
            }
            return;
        }

        const { error } = await supabase.from('vault_items').insert([{
            user_id: session.user.id,
            content: '[Full Transcript Bookmarked]',
            source: sourceRef,
            type: 'transcript',
            note: ''
        }]);

        if (error) console.error("Supabase Error:", error);
        else window.dispatchEvent(new Event('vault-updated'));
    };

    return (
        <motion.button
            onClick={handleSaveClick}
            whileTap={{ scale: 1.3, rotate: -15 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${isSaved ? 'text-[#c6a87c] hover:text-[#b09265]' : 'text-zinc-400 hover:text-[#c6a87c]'}`}
            title={isSaved ? "Remove from Vault" : "Save Full Transcript to Vault"}
        >
            <Bookmark className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} strokeWidth={isSaved ? 0 : 2} />
        </motion.button>
    );
};

const TranscriptLibrary = ({
    transcripts, vaultItems, externalDocTarget, externalHighlightTarget,
    theme, setTheme, activeTab, setActiveTab, handleHomeClick,
    showHistoryDrawer, setShowHistoryDrawer, appHistory, setAppHistory, handleHistoryClick,
    showUpdates, setShowUpdates, showInfo, setShowInfo,
    user, setShowAuthModal, setShowSignOutConfirm, setShowVault,
    setQuranTarget, setQuranVerseTarget, APP_UPDATES, timeAgo, KisaLogo
}) => {
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

    // --- NEW: Text Selection Highlight State ---
    const [selectionPopup, setSelectionPopup] = useState(null);
    const [highlightToast, setHighlightToast] = useState(false);

    // Component local UI state
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);

    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const transcriptContentRef = useRef(null); // We will attach this to the reading canvas

    useEffect(() => {
        if (currentView !== 'reader') return;

        const handleSelection = () => {
            const selection = window.getSelection();
            const text = selection.toString().trim();

            if (text.length > 0 && activeDoc) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                const isMobile = window.innerWidth < 768; // Detect if on a mobile device

                setSelectionPopup({
                    text,
                    x: rect.left + (rect.width / 2),
                    y: rect.top - 15,
                    isMobile
                });
            } else {
                setSelectionPopup(null);
            }
        };

        const handleScroll = () => {
            if (selectionPopup) setSelectionPopup(null);
        };

        document.addEventListener('mouseup', handleSelection);
        document.addEventListener('touchend', handleSelection);
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            document.removeEventListener('mouseup', handleSelection);
            document.removeEventListener('touchend', handleSelection);
            window.removeEventListener('scroll', handleScroll);
        };
    }, [currentView, activeDoc, selectionPopup]);

    const handleSaveHighlight = async () => {
        if (!selectionPopup) return;
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
            alert("Please Sign In from the top menu to save highlights.");
            return;
        }

        const { error } = await supabase.from('vault_items').insert([{
            user_id: session.user.id,
            content: selectionPopup.text,
            source: activeDoc.title,
            type: 'transcript',
            note: ''
        }]);

        if (!error) {
            window.dispatchEvent(new Event('vault-updated'));
            setSelectionPopup(null);
            window.getSelection().removeAllRanges(); // Deselect text
            setHighlightToast(true);
            setTimeout(() => setHighlightToast(false), 2500);
        } else {
            alert(`Supabase Error: ${error.message}`);
        }
    };

    const headerRef = useRef(null);

    // Global Header Hide-on-Scroll Logic
    useEffect(() => {
        let lastScrollY = window.scrollY;
        const handleScroll = () => {
            if (!headerRef.current) return;
            const currentScrollY = window.scrollY;

            // Hide header if scrolling down past 150px
            if (currentScrollY > lastScrollY && currentScrollY > 150) {
                headerRef.current.style.transform = 'translateY(-150%)';
                headerRef.current.style.opacity = '0';
            } else {
                // Show header if scrolling up
                headerRef.current.style.transform = 'translateY(0)';
                headerRef.current.style.opacity = '1';
            }
            lastScrollY = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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

        for (let i = 0; i <= 27; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

            if ((dailyTimeData[dateStr] || 0) >= 600) {
                successfulDays++;
            }
        }

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

        const timer = setInterval(() => {
            setAnalytics(prev => {
                const currentSecs = prev.totalSeconds !== undefined ? prev.totalSeconds : (prev.totalMinutes * 60 || 0);

                const dateObj = new Date();
                const todayStr = dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + String(dateObj.getDate()).padStart(2, '0');

                const dailyTimeData = prev.dailyTime || {};
                const todaySecs = (dailyTimeData[todayStr] || 0) + 10;

                const updated = {
                    ...prev,
                    totalSeconds: currentSecs + 10,
                    dailyTime: { ...dailyTimeData, [todayStr]: todaySecs }
                };
                localStorage.setItem('kisa_analytics', JSON.stringify(updated));
                return updated;
            });
        }, 10000);

        return () => clearInterval(timer);
    }, [currentView, activeDoc]);

    // Cinematic Navigation from Vault
    useEffect(() => {
        if (externalDocTarget && currentView !== 'reader') {
            const targetDoc = transcripts.find(t => t.id === externalDocTarget);
            if (targetDoc) openReader(targetDoc);
        }
    }, [externalDocTarget]);

    useEffect(() => {
        if (externalHighlightTarget && currentView === 'reader' && activeDoc) {
            let checks = 0;
            const targetSnippet = externalHighlightTarget.substring(0, 40).trim();

            const checkStabilization = setInterval(() => {
                const elements = Array.from(document.querySelectorAll('.transcript-block'));
                const targetEl = elements.find(el => el.textContent.includes(targetSnippet));

                if (targetEl) {
                    clearInterval(checkStabilization);
                    const currentY = targetEl.getBoundingClientRect().top + window.scrollY;
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
                            targetEl.classList.add('bg-amber-500/20', 'dark:bg-[#c6a87c]/30', 'transition-colors', 'duration-1000', 'rounded-lg');
                            setTimeout(() => targetEl.classList.remove('bg-amber-500/20', 'dark:bg-[#c6a87c]/30'), 2500);
                            setResumeToast(true);
                            setTimeout(() => setResumeToast(false), 3000);
                        }
                    };
                    window.requestAnimationFrame(cinematicScroll);
                } else if (checks > 15) {
                    clearInterval(checkStabilization);
                }
                checks++;
            }, 100);

            return () => clearInterval(checkStabilization);
        }
    }, [externalHighlightTarget, currentView, activeDoc]);

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
        }, 1200);
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

    const handleMarkdownExport = (doc) => {
        if (!doc) return;

        let mdContent = '';

        // 1. Inject Premium Frontmatter (Metadata)
        mdContent += `---\n`;
        mdContent += `title: "${doc.title}"\n`;
        if (doc.series) mdContent += `series: "${doc.series}"\n`;
        if (doc.speaker) mdContent += `speaker: "${doc.speaker}"\n`;
        if (doc.source_link) mdContent += `source_video: "${doc.source_link}"\n`;
        mdContent += `export_date: "${new Date().toISOString().split('T')[0]}"\n`;
        mdContent += `---\n\n`;

        // 2. Main Title
        mdContent += `# ${doc.title}\n\n`;

        // 3. Loop through content blocks and parse to Markdown
        (doc.content || []).forEach(block => {
            // Clean up bold tags to ensure standard Markdown spacing
            let text = block.text ? block.text.replace(/\*\*(.*?)\*\*/g, '**$1**') : '';

            if (block.type === 'h2') {
                mdContent += `## ${text}\n\n`;
            } else if (block.type === 'summary') {
                mdContent += `> **✨ Segment Summary:**\n> ${text}\n\n`;
            } else if (block.type === 'quote') {
                mdContent += `> "${text}"\n\n`;
            } else if (block.type === 'divider') {
                mdContent += `---\n\n`;
            } else {
                mdContent += `${text}\n\n`;
            }
        });

        // 4. Trigger Native File Download
        const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        // Create a clean filename
        const filename = (doc.title || 'transcript').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '.md';
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setShowExportMenu(false);
    };

    const handlePDFExport = (doc) => {
        if (!doc) return;
        setIsGeneratingPDF(true);

        try {
            // 1. Initialize a clean A4 Document
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const margin = 20;
            const maxLineWidth = pageWidth - margin * 2;
            let y = 20;

            // Helper function for page breaks
            const checkPageBreak = (spaceNeeded) => {
                if (y + spaceNeeded > 280) {
                    pdf.addPage();
                    y = 20;
                }
            };

            // 2. Write the Title
            pdf.setFont("times", "bold");
            pdf.setFontSize(22);
            const titleLines = pdf.splitTextToSize(doc.title, maxLineWidth);
            pdf.text(titleLines, margin, y);
            y += (titleLines.length * 10);

            // 3. Write the Metadata
            pdf.setFont("times", "italic");
            pdf.setFontSize(12);
            pdf.setTextColor(100, 100, 100); // Gray text
            pdf.text(`${doc.speaker} | ${doc.series || 'Al-Kisa Digital Archive'}`, margin, y);
            y += 15;

            pdf.setTextColor(0, 0, 0); // Back to black

            // 4. Loop through content and format it like a research paper
            (doc.content || []).forEach(block => {
                // Strip markdown bold tags for the PDF
                let text = block.text ? block.text.replace(/\*\*(.*?)\*\*/g, '$1') : '';

                if (block.type === 'h2') {
                    checkPageBreak(25);
                    y += 10;
                    pdf.setFont("times", "bold");
                    pdf.setFontSize(16);
                    const lines = pdf.splitTextToSize(text, maxLineWidth);
                    pdf.text(lines, margin, y);
                    y += (lines.length * 8) + 5;

                } else if (block.type === 'summary') {
                    checkPageBreak(30);

                    const startY = y - 4; // Start the vertical line slightly above the header

                    // 1. Print the Header distinctly (Bold and Uppercase)
                    pdf.setFont("times", "bold");
                    pdf.setFontSize(10);
                    pdf.text("SEGMENT SUMMARY", margin + 5, y);
                    y += 6; // Add a nice gap between the header and the text

                    // 2. Print the paragraph with better line spacing
                    pdf.setFont("times", "italic");
                    pdf.setFontSize(11);
                    const lines = pdf.splitTextToSize(text, maxLineWidth - 10);

                    lines.forEach(line => {
                        pdf.text(line, margin + 5, y);
                        y += 5.5; // Explicitly forces comfortable, readable line spacing
                    });

                    // 3. Draw the vertical line to match the EXACT height of the text
                    pdf.setLineWidth(0.4);
                    pdf.line(margin, startY, margin, y - 3);

                    y += 5; // Add bottom padding before the next section

                } else if (block.type === 'quote') {
                    checkPageBreak(20);
                    pdf.setFont("times", "italic");
                    pdf.setFontSize(12);
                    const lines = pdf.splitTextToSize(`"${text}"`, maxLineWidth - 15);
                    pdf.text(lines, margin + 10, y);
                    y += (lines.length * 7) + 5;

                } else if (block.type === 'divider') {
                    checkPageBreak(15);
                    pdf.setLineWidth(0.2);
                    pdf.line(margin + 40, y + 5, pageWidth - margin - 40, y + 5);
                    y += 15;

                } else {
                    checkPageBreak(15);
                    pdf.setFont("times", "normal");
                    pdf.setFontSize(12);
                    const lines = pdf.splitTextToSize(text, maxLineWidth);
                    pdf.text(lines, margin, y);
                    y += (lines.length * 6.5) + 4;
                }
            });

            // 5. Instantly trigger the native download
            const filename = `${doc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
            pdf.save(filename);

        } catch (error) {
            console.error("PDF generation error:", error);
            alert("Failed to generate PDF.");
        } finally {
            setIsGeneratingPDF(false);
            setShowExportMenu(false);
        }
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

    if (!activeDoc) return null;

    return (
        <div className="w-full min-h-screen pt-20 sm:pt-32 pb-32 flex flex-col items-center font-sans relative px-0 sm:px-6 lg:px-8">

            {/* GLOBAL HEADER PASSTHROUGH FOR READER VIEW */}
            <header ref={headerRef} className="fixed top-4 sm:top-4 w-full z-[75] p-4 sm:p-6 flex justify-between items-center pointer-events-none transition-all duration-500 ease-in-out">
                <div onClick={handleHomeClick} className="flex items-center gap-3 pointer-events-auto cursor-pointer group">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 group-hover:scale-105 border bg-[#c6a87c]/10 border-[#c6a87c]/20 backdrop-blur-md shadow-sm">
                        <KisaLogo className="w-5 h-5 text-[#c6a87c]" />
                    </div>
                    <div>
                        <h1 className="font-sans font-bold text-lg sm:text-xl tracking-tight hidden sm:block group-hover:opacity-80 transition-opacity text-[#2D241C] dark:text-[#FAFAFA]">Al-Kisa</h1>
                        <div className="flex items-center gap-2 sm:mt-0.5">
                            <p className="font-sans text-[10px] sm:text-xs opacity-60 hidden sm:block text-[#2D241C] dark:text-[#FAFAFA]">Digital Archive</p>
                            <span className="hidden sm:block w-1 h-1 rounded-full bg-[#5C4A3D]/30 dark:bg-[#c6a87c]/40"></span>
                            <button onClick={(e) => { e.stopPropagation(); setShowUpdates(true); }} className="hidden sm:flex pointer-events-auto text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer items-center gap-1 px-1.5 py-0.5 rounded-md text-[#c6a87c] bg-[#c6a87c]/10 hover:text-[#d4b78f]">
                                <Sparkles className="w-3 h-3" />What's New
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 relative z-[75] pointer-events-auto">
                    <div className="flex items-center rounded-full p-1 mr-1 sm:mr-2 border shadow-sm bg-white/40 dark:bg-[#252528]/80 border-slate-300/30 dark:border-zinc-700/50 backdrop-blur-md">
                        <button onClick={() => setActiveTab('search')} className="p-2 rounded-full transition-all duration-300 cursor-pointer text-[#5C4A3D]/70 hover:text-[#2D241C] dark:text-[#c6a87c]/50 dark:hover:text-[#c6a87c]" title="Search Engine"><Search className="w-4 h-4" /></button>
                        <button onClick={() => setActiveTab('quran')} className="p-2 rounded-full transition-all duration-300 cursor-pointer text-[#5C4A3D]/70 hover:text-[#2D241C] dark:text-[#c6a87c]/50 dark:hover:text-[#c6a87c]" title="Quran Reader"><BookOpen className="w-4 h-4" /></button>
                        <button onClick={() => setActiveTab('library')} className="p-2 rounded-full transition-all duration-300 cursor-pointer bg-[#c6a87c]/20 text-[#c6a87c] dark:text-[#d4b78f]" title="Transcript Library"><LibraryIcon className="w-4 h-4" /></button>
                    </div>

                    <div className="hidden md:flex items-center gap-2 sm:gap-4">
                        <button onClick={() => setShowHistoryDrawer(true)} className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center group transition-all duration-300 hover:scale-110 cursor-pointer"><Clock className="w-5 h-5 text-[#5C4A3D]/80 dark:text-[#c6a87c]/60 group-hover:text-[#c6a87c]" /></button>
                        <button onClick={() => setShowInfo(true)} className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center group transition-all duration-300 hover:scale-110 cursor-pointer"><HelpCircle className="w-5 h-5 text-[#5C4A3D]/80 dark:text-[#c6a87c]/60 group-hover:text-[#c6a87c]" /></button>
                        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center group transition-all duration-300 hover:scale-110 cursor-pointer">{theme === 'dark' ? <Sun className="w-5 h-5 text-[#c6a87c]/60 group-hover:text-yellow-400" /> : <Moon className="w-5 h-5 text-[#5C4A3D]/80 group-hover:text-[#2D241C]" />}</button>

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
                        {user ? (
                            <button onClick={() => setShowVault(true)} className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer border shadow-sm bg-[#c6a87c]/10 text-[#c6a87c] border-zinc-700/50">
                                <Bookmark className="w-5 h-5" />
                            </button>
                        ) : (
                            <button onClick={() => setShowAuthModal(true)} className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer border shadow-sm bg-[#c6a87c]/10 text-[#c6a87c] border-zinc-700/50">
                                <User className="w-5 h-5" />
                            </button>
                        )}
                        <button onClick={() => setShowHistoryDrawer(true)} className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer border shadow-sm bg-[#c6a87c]/10 text-[#c6a87c] border-zinc-700/50">
                            <Clock className="w-5 h-5" />
                        </button>
                        <div className="relative">
                            <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer border shadow-sm bg-[#c6a87c]/10 text-[#c6a87c] border-zinc-700/50">
                                <Menu className="w-5 h-5" />
                            </button>
                            <AnimatePresence>
                                {showMobileMenu && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute right-0 top-full mt-2 w-48 rounded-xl shadow-xl p-2 flex flex-col gap-1 z-[75] border bg-white dark:bg-[#1c1c1e] border-zinc-200 dark:border-zinc-800">
                                        <button onClick={() => { navigator.clipboard.writeText(window.location.href); setCopiedLink(true); setTimeout(() => { setCopiedLink(false); setShowMobileMenu(false); }, 1000); }} className={`w-full text-left flex items-center gap-3 p-3 rounded-lg text-sm cursor-pointer ${copiedLink ? 'text-emerald-500' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#2c2c2e]'}`}><Share2 className="w-4 h-4 shrink-0" /> Share Link</button>
                                        <button onClick={() => { setShowUpdates(true); setShowMobileMenu(false); }} className="w-full text-left flex items-center gap-3 p-3 rounded-lg text-sm cursor-pointer text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#2c2c2e]"><Sparkles className="w-4 h-4 shrink-0" /> What's New</button>
                                        <button onClick={() => { setShowInfo(true); setShowMobileMenu(false); }} className="w-full text-left flex items-center gap-3 p-3 rounded-lg text-sm cursor-pointer text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#2c2c2e]"><HelpCircle className="w-4 h-4 shrink-0" /> Help & Guide</button>
                                        {user && (
                                            <button onClick={() => { setShowSignOutConfirm(true); setShowMobileMenu(false); }} className="w-full text-left flex items-center gap-3 p-3 rounded-lg text-sm cursor-pointer text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                                                <User className="w-4 h-4 shrink-0" /> Sign Out
                                            </button>
                                        )}
                                        <button onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); setShowMobileMenu(false); }} className="w-full text-left flex items-center gap-3 p-3 rounded-lg text-sm cursor-pointer text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#2c2c2e]">{theme === 'dark' ? <Sun className="w-4 h-4 shrink-0 text-[#c6a87c]" /> : <Moon className="w-4 h-4 shrink-0 text-[#5C4A3D]" />} Toggle Theme</button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </header>

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
                    <div id="transcript-print-zone" ref={transcriptContentRef} className="w-full max-w-4xl mx-auto bg-white dark:bg-[#252528] sm:border border-zinc-200 dark:border-zinc-800/80 sm:rounded-2xl px-5 py-10 sm:p-12 sm:shadow-sm">
                        <header className="mb-8 sm:mb-10">
                            {seriesTitle && (
                                <span className="block font-mono text-[#c6a87c] dark:text-[#d4b78f] font-bold tracking-widest uppercase text-xs sm:text-sm mb-3">
                                    {seriesTitle}
                                </span>
                            )}
                            <div className="flex items-start justify-between gap-4 mb-6">
                                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white leading-[1.15] tracking-tight">
                                    {mainTitle}
                                </h1>
                                <div className="shrink-0 mt-2 sm:mt-1">
                                    <TranscriptBookmarkButton doc={activeDoc} vaultItems={vaultItems} />
                                </div>
                            </div>

                            <div className="print-hide flex flex-wrap items-center gap-3 sm:gap-4 text-[10px] sm:text-[11px] lg:text-xs font-bold uppercase tracking-widest pb-6">
                                <span className="text-zinc-700 dark:text-zinc-300">{activeDoc.speaker}</span>
                                <span className="text-zinc-300 dark:text-zinc-600 hidden sm:inline">|</span>
                                <span className="flex items-center gap-1.5 text-zinc-500"><Clock className="w-3.5 h-3.5" /> {readingTime} min read</span>

                                {/* 1. The YouTube Link (Properly closed) */}
                                {activeDoc.source_link && (
                                    <>
                                        <span className="text-zinc-300 dark:text-zinc-600 hidden sm:inline">|</span>
                                        <a href={activeDoc.source_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-zinc-500 hover:text-red-600 transition-colors group">
                                            <Youtube className="w-4 h-4 group-hover:scale-110 transition-transform" /> Watch Original
                                        </a>
                                    </>
                                )}

                                {/* 2. The Premium Export Menu */}
                                <span className="text-zinc-300 dark:text-zinc-600 hidden sm:inline">|</span>
                                <div className="relative">
                                    <button onClick={() => setShowExportMenu(!showExportMenu)} className="flex items-center gap-1.5 text-zinc-500 hover:text-[#c6a87c] transition-colors cursor-pointer group">
                                        <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                        <span className="hidden sm:inline">Export</span>
                                    </button>

                                    <AnimatePresence>
                                        {showExportMenu && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                                                <motion.div
                                                    initial={{ opacity: 0, y: 5, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                                    className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-48 bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col p-1"
                                                >
                                                    <button
                                                        onClick={() => handleMarkdownExport(activeDoc)}
                                                        disabled={isGeneratingPDF}
                                                        className="w-full text-left px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-[#ededf0] hover:bg-slate-100 dark:hover:bg-[#2c2c2e] rounded-md transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                                    >
                                                        <Database className="w-4 h-4 opacity-60" />
                                                        Markdown (.md)
                                                    </button>

                                                    <button
                                                        onClick={() => handlePDFExport(activeDoc)}
                                                        disabled={isGeneratingPDF}
                                                        className="w-full text-left px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-[#ededf0] hover:bg-slate-100 dark:hover:bg-[#2c2c2e] rounded-md transition-colors flex items-center justify-between mt-0.5 cursor-pointer disabled:opacity-50"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Layout className="w-4 h-4 opacity-60" />
                                                            Download PDF
                                                        </div>
                                                        {isGeneratingPDF && <Clock className="w-3 h-3 animate-spin text-[#c6a87c]" />}
                                                    </button>
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>

                            </div>

                            <hr className="w-full border-t-[2px] border-zinc-200 dark:border-zinc-700" />

                            <AnimatePresence>
                                {selectionPopup && (
                                    selectionPopup.isMobile ? (
                                        <motion.div
                                            initial={{ y: "100%" }}
                                            animate={{ y: 0 }}
                                            exit={{ y: "100%" }}
                                            transition={{ type: "spring", damping: 25, stiffness: 250 }}
                                            className="fixed bottom-0 left-0 w-full z-[5000] pointer-events-auto"
                                        >
                                            <div className="bg-[#FDFBF7]/95 dark:bg-[#030A06]/95 backdrop-blur-2xl border-t border-[#5C4A3D]/15 dark:border-[#c6a87c]/20 px-5 pt-4 pb-8 sm:pb-6 flex items-center justify-between shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                                                <div className="flex flex-col overflow-hidden pr-4 max-w-[60%]">
                                                    <span className="text-[9px] uppercase tracking-widest font-bold text-[#5C4A3D]/60 dark:text-[#c6a87c]/60 mb-1 flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Text Selected</span>
                                                    <span className="text-sm font-serif text-[#2D241C] dark:text-[#FAFAFA] truncate italic">"{selectionPopup.text}"</span>
                                                </div>
                                                <button
                                                    onClick={handleSaveHighlight}
                                                    className="shrink-0 flex items-center gap-2 bg-[#2D241C] dark:bg-[#c6a87c] text-[#FDFBF7] dark:text-[#0A120E] px-4 py-3 rounded-xl shadow-lg hover:scale-105 transition-transform text-[10px] font-bold uppercase tracking-widest cursor-pointer whitespace-nowrap"
                                                >
                                                    <Bookmark className="w-4 h-4" /> Save to Vault
                                                </button>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            style={{ position: 'fixed', left: selectionPopup.x, top: selectionPopup.y, transform: 'translate(-50%, -100%)' }}
                                            className="z-[5000] pointer-events-auto"
                                        >
                                            <button
                                                onClick={handleSaveHighlight}
                                                className="flex items-center gap-2 bg-[#2D241C] dark:bg-[#c6a87c] text-[#FDFBF7] dark:text-[#0A120E] px-4 py-2 rounded-lg shadow-2xl hover:scale-105 transition-transform text-xs font-bold uppercase tracking-widest cursor-pointer whitespace-nowrap"
                                            >
                                                <Bookmark className="w-4 h-4" /> Save to Vault
                                            </button>
                                        </motion.div>
                                    )
                                )}
                            </AnimatePresence>

                            <AnimatePresence>
                                {highlightToast && (
                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[5000] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-5 py-3 rounded-full shadow-2xl text-[10px] sm:text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                        <Check className="w-4 h-4 text-emerald-500" /> Saved to Vault
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </header>

                        {tocItems.length > 0 && (
                            <div className="print-hide mb-10 sm:mb-12 bg-zinc-50 dark:bg-[#1a1a1c] border border-zinc-200 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-sm">
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
                                if (block.type === 'h2') return <h2 id={`segment-${idx}`} key={idx} className="transcript-block segment-header font-bold text-zinc-900 dark:text-white mt-14 mb-6 tracking-tight scroll-mt-24 font-sans" style={{ fontSize: `${fontSize * 1.3}px`, lineHeight: 1.3 }}>{block.text}</h2>;
                                if (block.type === 'summary') return (
                                    <div key={idx} className="transcript-block bg-zinc-50 dark:bg-[#1c1c1e] border-l-4 border-[#c6a87c] p-6 sm:p-8 my-10 rounded-r-xl shadow-sm">
                                        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#c6a87c] mb-3"><Sparkles className="w-3.5 h-3.5" /> Segment Summary</span>
                                        <p className="text-zinc-700 dark:text-zinc-300 font-medium" style={{ fontSize: `${Math.max(15, fontSize - 2)}px`, lineHeight: 1.7 }}>{parseFormatting(block.text)}</p>
                                    </div>
                                );
                                if (block.type === 'quote') return (
                                    <blockquote key={idx} className="transcript-block pl-6 sm:pl-8 py-2 my-10 border-l-[3px] border-[#c6a87c] font-medium text-zinc-900 dark:text-zinc-100 italic font-serif" style={{ fontSize: `${fontSize * 1.15}px`, lineHeight: 1.6 }}>"{parseFormatting(block.text)}"</blockquote>
                                );
                                if (block.type === 'divider') return <div key={idx} className="flex justify-center py-10"><span className="w-12 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></span></div>;
                                return <p key={idx} className="transcript-block mb-6 text-left">{parseFormatting(block.text)}</p>;
                            })}
                        </div>

                        {/* --- THE REVISION & MASTERY MODULE --- */}
                        <div className="print-hide">
                            <RevisionModule />
                        </div>

                        <div className="print-hide mt-16 pt-12 border-t border-zinc-200 dark:border-zinc-800/80 flex flex-col items-center min-h-[140px] justify-center">
                            <AnimatePresence mode="wait">
                                {readingProgress[activeDoc.id]?.status === 'completed' ? (
                                    <motion.div
                                        key="completed-state"
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }}
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
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }}
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

export default TranscriptLibrary;