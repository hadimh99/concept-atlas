import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Moon, Sun, Sparkles, X, ChevronRight, ChevronLeft, Home, Copy, ChevronDown, ChevronUp, List, Layout, Info, BookOpen, History, HelpCircle, Database, Filter, Share2, Check, Settings2, Menu, Clock, Trash2, LibraryBig, Youtube, Library as LibraryIcon, ArrowDown, User, Bookmark, Coins, HeartPulse, ShieldAlert, MoreHorizontal, PenLine, FolderPlus, FolderMinus, Book } from 'lucide-react';
import quranData from './quran.json';
import verseMap from './verse_map.json';
import transcriptData from './transcripts.json';
import { supabase } from './supabaseClient';
import { quranBenefits, spiritualPrescriptions } from './quranBenefits';
import QuranReader from './components/QuranReader';
import HadithCard from './components/HadithCard';
import TranscriptLibrary from './components/TranscriptLibrary';
import HadithLibrary from './components/HadithLibrary';
import alKafiData from './thaqalayn_complete.json';


const APP_UPDATES = [
  { version: "v4.0.0", date: "March 8, 2026", changes: ["Introduced the Digital Archive (Transcript Library): A premium reading environment for translated scholarly series, starting with 'The File of Fatima'.", "UI Polish: Added custom text parser for bold highlights, unified mobile drawer, and high-performance native scrolling for transcripts."] },
  { version: "v3.5.3", date: "March 5, 2026", changes: ["Documentation: Completely overhauled the 'Help & Guide' section to detail the comprehensive suite of tools now available in Al-Kisa, including Vector Hopping, Dynamic Map Views, and Reverse Quran Tafsir."] },
  { version: "v3.5.2", date: "March 5, 2026", changes: ["Feature Polish: Added a 'Copy Text' button to all 'Anchored Source' views (both List View accordion and Map View modal) allowing you to copy the full reference, Arabic, and translation instantly.", "Map UX Overhaul: Nodes are uniformly sized and mathematically bounded to never overlap the center box or go off-screen."] }
];
const CLUSTER_COLORS = ['#10b981', '#8b5cf6', '#f59e0b', '#f43f5e', '#3b82f6'];
const SOURCES = ["All Twelver Sources", "al-Kafi", "Bihar al-Anwar", "Basa'ir al-Darajat"];



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
  const [selectedVaultItem, setSelectedVaultItem] = useState(null);
  const [vaultViewMode, setVaultViewMode] = useState('grid');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [activeFolder, setActiveFolder] = useState('All');
  const [expandedVaultItems, setExpandedVaultItems] = useState({});
  const [newFolderInput, setNewFolderInput] = useState('');
  const [movingItemId, setMovingItemId] = useState(null);
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(true);

  // NEW STATES FOR UI UPGRADES
  const [activeCardMenu, setActiveCardMenu] = useState(null);
  const [cardMenuMode, setCardMenuMode] = useState('main'); // 'main', 'move', 'add'
  const [noteSaveStatus, setNoteSaveStatus] = useState('');
  const [showEditorArabic, setShowEditorArabic] = useState(false);
  const [showEditorChain, setShowEditorChain] = useState(false);
  const [localEmptyFolders, setLocalEmptyFolders] = useState([]);

  // Extract unique folders handling comma-separated multi-folders
  const customFolders = useMemo(() => {
    const folders = new Set(localEmptyFolders);
    vaultItems.forEach(item => {
      if (item.folder_name) {
        item.folder_name.split(',').forEach(f => {
          if (f.trim()) folders.add(f.trim());
        });
      }
    });
    return Array.from(folders).sort();
  }, [vaultItems, localEmptyFolders]);

  // FIXED FILTERING LOGIC
  const filteredVaultItems = useMemo(() => {
    let filtered = vaultItems;
    if (activeFolder === 'Uncategorized') filtered = filtered.filter(item => !item.folder_name);
    else if (activeFolder === 'Quran') filtered = filtered.filter(item => item.type === 'quran');
    else if (activeFolder === 'Hadiths') filtered = filtered.filter(item => item.type === 'hadith' || !item.type);
    else if (activeFolder === 'Transcripts') filtered = filtered.filter(item => item.type === 'transcript');
    else if (activeFolder !== 'All') {
      filtered = filtered.filter(item => {
        if (!item.folder_name) return false;
        const folders = item.folder_name.split(',').map(f => f.trim());
        return folders.includes(activeFolder);
      });
    }

    if (vaultSearch.trim()) {
      const q = vaultSearch.toLowerCase();
      filtered = filtered.filter(item =>
        (item.content && item.content.toLowerCase().includes(q)) ||
        (item.source && item.source.toLowerCase().includes(q)) ||
        (item.note && item.note.toLowerCase().includes(q))
      );
    }

    return filtered;
  }, [vaultItems, activeFolder, vaultSearch]);

  const toggleVaultExpand = (id) => setExpandedVaultItems(prev => ({ ...prev, [id]: !prev[id] }));

  // ADVANCED MULTI-FOLDER SUPPORT LOGIC
  const assignToFolder = async (itemId, folderName, mode = 'move') => {
    const item = vaultItems.find(i => i.id === itemId);
    let newFolderName = folderName;

    if (mode === 'add' && folderName) {
      let current = item.folder_name ? item.folder_name.split(',').map(f => f.trim()).filter(Boolean) : [];
      if (!current.includes(folderName)) current.push(folderName);
      newFolderName = current.join(', ');
    } else if (mode === 'remove' && folderName) {
      // Strips ONLY the specific folder from the comma-separated list
      let current = item.folder_name ? item.folder_name.split(',').map(f => f.trim()).filter(Boolean) : [];
      current = current.filter(f => f !== folderName);
      newFolderName = current.length > 0 ? current.join(', ') : null;
    }

    // 1. Optimistic Update
    setVaultItems(prev => prev.map(i => i.id === itemId ? { ...i, folder_name: newFolderName } : i));
    setMovingItemId(null);
    setActiveCardMenu(null);
    setCardMenuMode('main'); // Reset the menu mode for next time

    // 2. Cloud Sync
    const { error } = await supabase.from('vault_items').update({ folder_name: newFolderName }).eq('id', itemId);
    if (error) {
      alert(`Supabase Error: ${error.message}`);
      fetchVaultItems(); // Reverts the UI if cloud fails
    }
  };

  // FOLDER DELETION LOGIC
  const deleteFolder = async (e, folderToDelete) => {
    e.stopPropagation();

    // Quick confirmation to prevent accidental clicks
    if (!window.confirm(`Delete the collection "${folderToDelete}"?\n\nYour saved bookmarks will NOT be deleted, only the folder tag will be removed.`)) return;

    // 1. Remove from local empty folders state
    setLocalEmptyFolders(prev => prev.filter(f => f !== folderToDelete));

    // 2. Find all items that have this folder tag
    const affectedItems = vaultItems.filter(item =>
      item.folder_name && item.folder_name.split(',').map(f => f.trim()).includes(folderToDelete)
    );

    // 3. Update state and database if items exist
    if (affectedItems.length > 0) {
      // Optimistic UI update
      setVaultItems(prev => prev.map(item => {
        if (!item.folder_name) return item;
        const folders = item.folder_name.split(',').map(f => f.trim()).filter(Boolean);
        if (folders.includes(folderToDelete)) {
          const newFolders = folders.filter(f => f !== folderToDelete);
          return { ...item, folder_name: newFolders.length > 0 ? newFolders.join(', ') : null };
        }
        return item;
      }));

      // Fire off database updates in parallel
      await Promise.all(affectedItems.map(item => {
        const folders = item.folder_name.split(',').map(f => f.trim()).filter(Boolean);
        const newFolders = folders.filter(f => f !== folderToDelete);
        const newFolderName = newFolders.length > 0 ? newFolders.join(', ') : null;
        return supabase.from('vault_items').update({ folder_name: newFolderName }).eq('id', item.id);
      }));
    }

    // 4. Redirect user if they were inside the deleted folder
    if (activeFolder === folderToDelete) {
      setActiveFolder('All');
      setSelectedVaultItem(null);
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
    if (sourceFilter === 'My Vault') setSourceFilter('All Twelver Sources');
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
  const [quranVerseTarget, setQuranVerseTarget] = useState(null);
  const [transcriptTarget, setTranscriptTarget] = useState(null);
  const [transcriptHighlight, setTranscriptHighlight] = useState(null);
  const [anchorHadith, setAnchorHadith] = useState(null);
  const [showAnchor, setShowAnchor] = useState(false);
  const [showAnchorModal, setShowAnchorModal] = useState(false);
  const [anchorCopied, setAnchorCopied] = useState(false);

  const [fontStyle, setFontStyle] = useState('scheherazade');

  const searchIdRef = useRef(0);

  // --- NEW: Parse Quran Details for Vault Action Bar ---
  let quranDetails = null;
  let vaultRelatedCount = 0;
  if (selectedVaultItem?.type === 'quran' && selectedVaultItem.source?.includes('Verse')) {
    const match = selectedVaultItem.source.match(/Surah (.+), Verse (\d+)/);
    if (match) {
      const vNum = parseInt(match[2]);
      let sId = null;
      for (let i = 1; i <= 114; i++) {
        if (quranData[`${i}:1`]?.surahName === match[1]) { sId = i; break; }
      }
      if (sId) {
        quranDetails = { surahId: sId, verseNum: vNum };
        vaultRelatedCount = verseMap[`${sId}:${vNum}`] || 0;
      }
    }
  }

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
    document.title = "Al-Kisa";
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

    // --- NEW: VAULT-GROUNDED SEARCH INTERCEPT ---
    if (currentSource === 'My Vault') {
      setTimeout(() => {
        if (searchIdRef.current !== currentSearchId) return;

        const q = searchQuery.toLowerCase();

        // Scan text, source headers, AND user's personal notes
        const matches = vaultItems.filter(item =>
          (item.content && item.content.toLowerCase().includes(q)) ||
          (item.note && item.note.toLowerCase().includes(q)) ||
          (item.source && item.source.toLowerCase().includes(q))
        );

        // Map local items to fit perfectly inside HadithCard UI
        const formattedItems = matches.map(v => {
          let hNum = "";
          const numMatch = v.source?.match(/Hadith\s+(\d+)/i) || v.source?.match(/Verse\s+(\d+)/i);
          if (numMatch) hNum = numMatch[1];

          return {
            id: v.id,
            book: "My Vault",
            volume: v.type ? v.type.charAt(0).toUpperCase() + v.type.slice(1) : "Saved",
            sub_book: "Bookmark",
            chapter: v.source.replace(/ (Hadith|Verse) \d+$/, ''),
            hadith_number: hNum,
            // Surface the user's personal note right inside the search results!
            english_text: v.note ? `**[Your Note: ${v.note}]**\n\n${v.content}` : v.content,
            arabic_text: v.arabic_text || "",
            chain: v.chain || "",
            vector: []
          };
        });

        const result = {
          clusters: [{ theme_label: `Vault Matches for "${searchQuery}"`, items: formattedItems }],
          total_results: formattedItems.length
        };

        setData(result);
        setViewMode('list'); // Force list view for vault searches
        setLoading(false);
      }, 400); // 400ms delay for a smooth UI loading transition
      return;
    }
    // --------------------------------------------

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
    formattedText = formattedText.trim() + `\n\n— Via Al-Kisa\n${window.location.href}`;
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

      {/* --- THE SCHOLAR'S VAULT (PRO-DISPLAY WORKSPACE) --- */}
      <AnimatePresence>
        {showVault && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setActiveCardMenu(null); setCardMenuMode('main'); }} className="fixed inset-0 z-[6000] flex items-center justify-center p-0 sm:p-4 md:p-6 bg-black/40 dark:bg-black/60 backdrop-blur-sm pointer-events-auto">

            {/* MOBILE SCROLL FIX: h-[100dvh] ensures it fits exact mobile screen size */}
            <motion.div initial={{ scale: 0.98, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: 10 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} onClick={(e) => e.stopPropagation()} className="relative w-full h-[100dvh] sm:h-full sm:max-w-[1400px] flex flex-col md:flex-row bg-white dark:bg-[#0e0e11] sm:border border-slate-200 dark:border-[#2d2d33] sm:rounded-2xl shadow-2xl overflow-hidden">

              {/* PANE 1: THE NAVIGATOR (SIDEBAR) */}
              <div className="w-full md:w-[260px] bg-[#f7f7f9] dark:bg-[#151518] border-b md:border-b-0 md:border-r border-slate-200 dark:border-[#2d2d33] flex flex-col shrink-0 z-20">

                <div className="p-4 flex justify-between items-center shrink-0">
                  <h2 className="font-serif text-lg font-bold text-slate-800 dark:text-[#ededf0] flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-[#c6a87c]" /> Vault
                  </h2>
                  <button onClick={() => setShowVault(false)} className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors bg-black/5 dark:bg-white/5 rounded-md"><X className="w-4 h-4" /></button>
                </div>

                <div className="px-4 pb-4 shrink-0">
                  <div className="relative group">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                    <input type="text" value={vaultSearch} onChange={(e) => setVaultSearch(e.target.value)} placeholder="Search Vault..." className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#1c1c20] border border-slate-200 dark:border-[#2d2d33] rounded-md text-xs font-sans text-slate-800 dark:text-[#ededf0] placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-sm" />
                  </div>
                </div>

                <div className="hidden md:flex flex-col gap-5 overflow-y-auto smart-scrollbar flex-grow px-2 pb-4 min-h-0">

                  <div>
                    <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 px-3">Library</div>
                    <button onClick={() => { setActiveFolder('All'); setSelectedVaultItem(null); }} className={`w-full text-left px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center justify-between group ${activeFolder === 'All' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-[#9a9a9f] hover:bg-slate-200/50 dark:hover:bg-[#1c1c20]'}`}>
                      <div className="flex items-center gap-2"><Layout className={`w-4 h-4 ${activeFolder === 'All' ? 'opacity-100' : 'opacity-70'}`} /> All Bookmarks</div>
                      <span className="text-[10px] font-mono opacity-50">{vaultItems.length}</span>
                    </button>
                    <button onClick={() => { setActiveFolder('Uncategorized'); setSelectedVaultItem(null); }} className={`w-full text-left px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center justify-between group ${activeFolder === 'Uncategorized' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-[#9a9a9f] hover:bg-slate-200/50 dark:hover:bg-[#1c1c20]'}`}>
                      <div className="flex items-center gap-2"><Database className={`w-4 h-4 ${activeFolder === 'Uncategorized' ? 'opacity-100' : 'opacity-70'}`} /> Uncategorized</div>
                    </button>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 px-3">Sources</div>
                    <button onClick={() => { setActiveFolder('Hadiths'); setSelectedVaultItem(null); }} className={`w-full text-left px-3 py-1.5 rounded-md text-sm font-medium transition-colors mb-1 flex items-center justify-between group ${activeFolder === 'Hadiths' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 shadow-sm' : 'text-slate-600 dark:text-[#9a9a9f] hover:bg-slate-200/50 dark:hover:bg-[#1c1c20]'}`}>
                      <div className="flex items-center gap-2"><Sparkles className={`w-4 h-4 ${activeFolder === 'Hadiths' ? 'text-emerald-500' : 'opacity-70'}`} /> Hadiths</div>
                      <span className="text-[10px] font-mono opacity-50">{vaultItems.filter(i => i.type === 'hadith' || !i.type).length}</span>
                    </button>
                    <button onClick={() => { setActiveFolder('Quran'); setSelectedVaultItem(null); }} className={`w-full text-left px-3 py-1.5 rounded-md text-sm font-medium transition-colors mb-1 flex items-center justify-between group ${activeFolder === 'Quran' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 shadow-sm' : 'text-slate-600 dark:text-[#9a9a9f] hover:bg-slate-200/50 dark:hover:bg-[#1c1c20]'}`}>
                      <div className="flex items-center gap-2"><BookOpen className={`w-4 h-4 ${activeFolder === 'Quran' ? 'text-amber-500' : 'opacity-70'}`} /> Quran</div>
                      <span className="text-[10px] font-mono opacity-50">{vaultItems.filter(i => i.type === 'quran').length}</span>
                    </button>
                    <button onClick={() => { setActiveFolder('Transcripts'); setSelectedVaultItem(null); }} className={`w-full text-left px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center justify-between group ${activeFolder === 'Transcripts' ? 'bg-[#c6a87c]/10 text-[#c6a87c] dark:text-[#d4b78f] shadow-sm' : 'text-slate-600 dark:text-[#9a9a9f] hover:bg-slate-200/50 dark:hover:bg-[#1c1c20]'}`}>
                      <div className="flex items-center gap-2"><LibraryIcon className={`w-4 h-4 ${activeFolder === 'Transcripts' ? 'text-[#c6a87c]' : 'opacity-70'}`} /> Library</div>
                      <span className="text-[10px] font-mono opacity-50">{vaultItems.filter(i => i.type === 'transcript').length}</span>
                    </button>
                  </div>

                  <div>
                    <button onClick={() => setIsCollectionsOpen(!isCollectionsOpen)} className="w-full flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-[#ededf0] uppercase tracking-widest mb-1 px-3 transition-colors cursor-pointer group">
                      <span>Collections</span>
                      {isCollectionsOpen ? <ChevronUp className="w-3 h-3 opacity-50 group-hover:opacity-100" /> : <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-100" />}
                    </button>
                    <AnimatePresence>
                      {isCollectionsOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden flex flex-col">
                          {customFolders.length === 0 ? (
                            <span className="px-3 py-1 text-xs text-slate-400 dark:text-slate-600 italic">No custom folders.</span>
                          ) : (
                            customFolders.map(folder => (
                              <button key={folder} onClick={() => { setActiveFolder(folder); setSelectedVaultItem(null); }} className={`w-full text-left px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center justify-between group ${activeFolder === folder ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-[#9a9a9f] hover:bg-slate-200/50 dark:hover:bg-[#1c1c20]'}`}>
                                <div className="flex items-center gap-2 truncate"><Layout className={`w-3.5 h-3.5 ${activeFolder === folder ? 'opacity-100' : 'opacity-70'} shrink-0`} /> <span className="truncate">{folder}</span></div>
                                {/* Removed the X button from here */}
                                <span className="text-[10px] font-mono opacity-50 pl-2">{vaultItems.filter(i => i.folder_name && i.folder_name.split(',').map(f => f.trim()).includes(folder)).length}</span>
                              </button>
                            ))
                          )}

                          <div className="px-3 py-2 mt-1 relative group">
                            <input
                              type="text"
                              value={newFolderInput}
                              onChange={(e) => setNewFolderInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newFolderInput.trim()) {
                                  setLocalEmptyFolders(prev => [...prev, newFolderInput.trim()]);
                                  setActiveFolder(newFolderInput.trim());
                                  setNewFolderInput('');
                                }
                              }}
                              placeholder="+ New Folder..."
                              className="w-full bg-transparent border-b border-transparent focus:border-blue-500 text-sm text-slate-700 dark:text-[#ededf0] placeholder-slate-400 dark:placeholder-slate-600 outline-none transition-all py-1"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Mobile Horizontal Sidebar */}
                <div className="md:hidden flex items-center overflow-x-auto hide-scroll px-4 pb-3 gap-2 shrink-0 border-b border-slate-200 dark:border-[#2d2d33]">
                  {['All', 'Hadiths', 'Quran', 'Transcripts', ...customFolders].map(f => (
                    <button key={f} onClick={() => { setActiveFolder(f); setSelectedVaultItem(null); }} className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-all border ${activeFolder === f ? 'bg-white dark:bg-[#2d2d33] text-blue-600 dark:text-blue-500 border-slate-300 dark:border-[#424248] shadow-sm' : 'bg-transparent text-slate-500 dark:text-[#9a9a9f] border-transparent hover:bg-slate-200/50 dark:hover:bg-[#1c1c20]'}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* PANE 2 & 3: MAIN CONTENT AREA (min-h-0 prevents flexbox blowouts on mobile) */}
              <div className="flex-grow flex flex-col min-h-0 bg-white dark:bg-[#0e0e11] relative">

                {/* Header Container */}
                <div className="px-6 py-4 flex items-center justify-between shrink-0 z-10">
                  <h1 className="text-xl md:text-2xl font-serif font-medium text-slate-800 dark:text-[#ededf0]">
                    {selectedVaultItem ? 'Reading Focus' : (activeFolder === 'All' ? 'All Bookmarks' : activeFolder)}
                  </h1>

                  {!selectedVaultItem && (
                    <div className="flex items-center gap-3">
                      {/* Contextual Delete Folder Button */}
                      {customFolders.includes(activeFolder) && (
                        <button onClick={(e) => deleteFolder(e, activeFolder)} className="flex items-center justify-center p-2 rounded-full text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title={`Delete "${activeFolder}" Folder`}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Grid/List Toggles */}
                      <div className="flex items-center bg-slate-100 dark:bg-[#1c1c20] rounded-full p-1 border border-slate-200 dark:border-[#2d2d33] shadow-sm">
                        <button onClick={() => setVaultViewMode('grid')} className={`p-1.5 rounded-full transition-all duration-300 cursor-pointer ${vaultViewMode === 'grid' ? 'bg-white dark:bg-[#2d2d33] text-blue-600 dark:text-blue-500 shadow-sm' : 'text-slate-500 dark:text-[#9a9a9f] hover:text-slate-800 dark:hover:text-[#ededf0]'}`} title="Grid View"><Layout className="w-4 h-4" /></button>
                        <button onClick={() => setVaultViewMode('list')} className={`p-1.5 rounded-full transition-all duration-300 cursor-pointer ${vaultViewMode === 'list' ? 'bg-white dark:bg-[#2d2d33] text-blue-600 dark:text-blue-500 shadow-sm' : 'text-slate-500 dark:text-[#9a9a9f] hover:text-slate-800 dark:hover:text-[#ededf0]'}`} title="List View"><List className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )}
                </div>

                {/* CONTENT ROUTER (min-h-0 strictly binds scrolling to this container) */}
                <div className="flex-grow overflow-y-auto smart-scrollbar relative z-10 px-4 sm:px-6 pb-24 md:pb-12 min-h-0">

                  <AnimatePresence mode="wait">
                    {selectedVaultItem ? (
                      /* --- PANE 3: THE FULL ANATOMY FOCUS CANVAS --- */
                      <motion.div key="editor" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="max-w-3xl mx-auto h-full flex flex-col">

                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-[#2d2d33]">
                          <button onClick={() => { setSelectedVaultItem(null); }} className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 dark:text-[#9a9a9f] dark:hover:text-blue-500 transition-colors cursor-pointer">
                            <ChevronLeft className="w-4 h-4" /> Back
                          </button>
                        </div>

                        {/* Immutable Document Body */}
                        <div className="mb-10 p-6 rounded-xl bg-slate-50 dark:bg-[#151518] border border-slate-200 dark:border-[#2d2d33] shadow-sm">
                          <div className="mb-5 border-b border-slate-200 dark:border-[#2d2d33] pb-3 flex items-center justify-between">
                            <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-[#9a9a9f] leading-relaxed block">{selectedVaultItem.source}</span>

                            {/* Explicit Badges on Focus Canvas */}
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-widest font-bold ${selectedVaultItem.type === 'quran' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500' : selectedVaultItem.type === 'transcript' ? 'bg-[#c6a87c]/10 text-[#c6a87c] dark:text-[#d4b78f]' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500'}`}>
                              {selectedVaultItem.type === 'quran' ? <BookOpen className="w-3 h-3 inline mr-1" /> : selectedVaultItem.type === 'transcript' ? <LibraryIcon className="w-3 h-3 inline mr-1" /> : <Sparkles className="w-3 h-3 inline mr-1" />}
                              {selectedVaultItem.type || 'hadith'}
                            </span>
                          </div>

                          {/* Arabic Display (Persistent for Quran, Dropdown for others) */}
                          {selectedVaultItem.arabic_text && (
                            selectedVaultItem.type === 'quran' ? (
                              <div className="mb-8">
                                <p className="font-arabic text-3xl sm:text-4xl text-right leading-[2.4] sm:leading-[2.5] text-[#2D241C] dark:text-slate-100" dir="rtl" lang="ar" style={{ fontFamily: activeFontFamily }}>
                                  {selectedVaultItem.arabic_text}
                                </p>
                              </div>
                            ) : (
                              <div className="mb-4">
                                <button onClick={() => setShowEditorArabic(!showEditorArabic)} className="flex items-center gap-1 text-sm font-medium transition-colors cursor-pointer text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400">
                                  {showEditorArabic ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />} {showEditorArabic ? "Hide Original Arabic" : "View Original Arabic"}
                                </button>
                                <AnimatePresence>
                                  {showEditorArabic && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                      <div className="p-4 sm:p-5 rounded-lg mt-2 mb-4 bg-white dark:bg-[#0e0e11] border border-slate-200 dark:border-[#2d2d33]">
                                        <p className="font-arabic text-xl md:text-2xl text-right leading-[2.2] text-slate-700 dark:text-slate-300" dir="rtl" lang="ar">
                                          {selectedVaultItem.arabic_text}
                                        </p>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )
                          )}

                          {/* Chain Dropdown */}
                          {selectedVaultItem.chain && (
                            <div className="mb-5">
                              <button onClick={() => setShowEditorChain(!showEditorChain)} className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer text-slate-400 hover:text-blue-500 dark:text-[#5d5d62] dark:hover:text-blue-400">
                                {showEditorChain ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} {showEditorChain ? "Hide Chain of Narrators" : "View Chain of Narrators"}
                              </button>
                              <AnimatePresence>
                                {showEditorChain && (
                                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                    <p className="mt-2 p-3 rounded-lg text-sm italic font-sans bg-white dark:bg-[#0e0e11] border border-slate-200 dark:border-[#2d2d33] text-slate-600 dark:text-[#9a9a9f]">
                                      {selectedVaultItem.chain}
                                    </p>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}

                          {/* Primary English Content (Smart Formatting) */}
                          {selectedVaultItem.type === 'transcript' ? (
                            selectedVaultItem.content === '[Full Transcript Bookmarked]' ? (
                              <div className="flex flex-col items-center justify-center py-10 opacity-70">
                                <LibraryIcon className="w-12 h-12 mb-3 text-[#c6a87c]" />
                                <p className="font-serif text-lg text-slate-600 dark:text-[#9a9a9f]">Full Transcript Bookmarked</p>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-5">
                                {selectedVaultItem.content.split(/\n+/).map((para, i) => {
                                  const pTrimmed = para.trim();
                                  if (!pTrimmed) return null;

                                  // Cross-reference original transcript to rebuild formatting
                                  const sourceDoc = transcriptData.find(t => t.title === selectedVaultItem.source);
                                  let matchedBlockType = 'p';

                                  if (sourceDoc?.content) {
                                    const match = sourceDoc.content.find(b => b.text && (b.text.includes(pTrimmed) || pTrimmed.includes(b.text)));
                                    if (match) matchedBlockType = match.type;
                                  }

                                  // Bold parser mirroring the transcript view
                                  const parseBold = (text) => text.split(/(\*\*.*?\*\*)/g).map((part, index) => {
                                    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index} className="font-bold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
                                    return part;
                                  });

                                  if (matchedBlockType === 'quote') {
                                    return <blockquote key={i} className="pl-5 py-2 my-2 border-l-[3px] border-[#c6a87c] font-medium text-slate-800 dark:text-[#ededf0] italic font-serif text-base sm:text-lg leading-[1.9]">"{parseBold(pTrimmed.replace(/^"|"$/g, ''))}"</blockquote>;
                                  }
                                  if (matchedBlockType === 'summary') {
                                    return <div key={i} className="bg-slate-100 dark:bg-[#1c1c20] border-l-4 border-[#c6a87c] p-5 my-2 rounded-r-lg shadow-sm"><p className="font-serif text-base sm:text-lg">{parseBold(pTrimmed)}</p></div>;
                                  }
                                  return <p key={i} className="font-serif text-base sm:text-lg leading-[1.9] text-slate-800 dark:text-[#ededf0]">{parseBold(pTrimmed)}</p>;
                                })}
                              </div>
                            )
                          ) : (
                            <p className={`font-serif leading-[1.9] text-slate-800 dark:text-[#ededf0] whitespace-pre-wrap antialiased ${selectedVaultItem.type === 'quran' ? 'text-xl sm:text-2xl text-center' : 'text-base sm:text-lg'}`}>
                              {selectedVaultItem.content}
                            </p>
                          )}

                          {/* Unified Navigation & Action Bar */}
                          <div className="mt-10 flex justify-end items-center gap-4 pt-5 border-t border-slate-200 dark:border-[#2d2d33]">

                            {/* Transcript Navigation */}
                            {selectedVaultItem.type === 'transcript' && (
                              <button
                                onClick={() => {
                                  const doc = transcriptData.find(t => t.title === selectedVaultItem.source);
                                  if (doc) {
                                    setShowVault(false);
                                    setActiveTab('library');
                                    setTranscriptTarget(doc.id);
                                    setTranscriptHighlight(selectedVaultItem.content === '[Full Transcript Bookmarked]' ? null : selectedVaultItem.content);
                                  }
                                }}
                                className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors bg-blue-100/50 dark:bg-blue-900/20 px-3 py-1.5 rounded-md cursor-pointer shadow-sm"
                              >
                                <LibraryIcon className="w-4 h-4" /> {selectedVaultItem.content === '[Full Transcript Bookmarked]' ? 'Read Transcript' : 'Go to Highlight'}
                              </button>
                            )}

                            {/* Quran Navigation */}
                            {selectedVaultItem.type === 'quran' && quranDetails && (
                              <button
                                onClick={() => {
                                  setShowVault(false);
                                  setActiveTab('quran');
                                  setQuranTarget(quranDetails.surahId);
                                  setQuranVerseTarget(quranDetails.verseNum);
                                }}
                                className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors bg-blue-100/50 dark:bg-blue-900/20 px-3 py-1.5 rounded-md cursor-pointer shadow-sm"
                              >
                                <BookOpen className="w-4 h-4" /> Go to Verse
                              </button>
                            )}

                            {/* Quran Related Hadiths */}
                            {selectedVaultItem.type === 'quran' && vaultRelatedCount > 0 && quranDetails && (
                              <button
                                onClick={() => handleTafsirClick(quranDetails.surahId, quranDetails.verseNum)}
                                className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold text-amber-700 hover:text-amber-900 dark:text-amber-500 dark:hover:text-amber-400 transition-colors bg-amber-100/50 dark:bg-amber-900/20 px-3 py-1.5 rounded-md cursor-pointer shadow-sm"
                              >
                                <LibraryBig className="w-4 h-4" /> Related Hadiths
                                <span className="bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 px-1.5 py-0.5 rounded text-[10px] ml-1">{vaultRelatedCount}</span>
                              </button>
                            )}

                            {/* Universal Remove Button */}
                            <button
                              onClick={async () => {
                                await supabase.from('vault_items').delete().eq('id', selectedVaultItem.id);
                                fetchVaultItems();
                                setSelectedVaultItem(null);
                              }}
                              className={`p-1.5 rounded-full transition-colors cursor-pointer ${selectedVaultItem.type === 'transcript' ? 'text-[#c6a87c] hover:text-[#b09265]' : selectedVaultItem.type === 'quran' ? 'text-orange-500 hover:text-orange-600' : 'text-emerald-500 hover:text-emerald-600'}`}
                              title="Remove from Vault"
                            >
                              <Bookmark className="w-5 h-5" fill="currentColor" strokeWidth={0} />
                            </button>
                          </div>
                        </div>

                        {/* Editor Your Notes (Note Taking) */}
                        <div className="flex-grow flex flex-col pl-4 border-l-2 border-blue-500 relative mb-12">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <PenLine className="w-4 h-4 text-blue-500" />
                              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-[#9a9a9f]">Your Notes</h3>
                            </div>

                            <div className="flex items-center gap-3">
                              <AnimatePresence>
                                {noteSaveStatus && (
                                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                                    <Check className="w-3.5 h-3.5" /> {noteSaveStatus}
                                  </motion.span>
                                )}
                              </AnimatePresence>

                              <AnimatePresence>
                                {/* Reliable Save Button Logic */}
                                {noteText !== (selectedVaultItem.note || "") && (
                                  <motion.button
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setVaultItems(prev => prev.map(i => i.id === selectedVaultItem.id ? { ...i, note: noteText } : i));
                                      setSelectedVaultItem(prev => ({ ...prev, note: noteText }));
                                      supabase.from('vault_items').update({ note: noteText }).eq('id', selectedVaultItem.id);

                                      setNoteSaveStatus('Saved!');
                                      setTimeout(() => { setNoteSaveStatus(''); }, 1500);
                                    }}
                                    className="px-3 py-1.5 bg-blue-500 text-white rounded-md text-[10px] font-bold uppercase tracking-widest shadow-sm hover:bg-blue-600 transition-colors cursor-pointer"
                                  >
                                    Save Note
                                  </motion.button>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>

                          <textarea
                            value={noteText}
                            onChange={(e) => {
                              const val = e.target.value;
                              // Advanced Regex to capitalize first letters after periods, exclamation marks, question marks, and new lines.
                              const formatted = val.replace(/(^\s*|[.!?]\s+|\n\s*)([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase());
                              setNoteText(formatted);
                            }}
                            onBlur={() => {
                              if (noteText !== (selectedVaultItem.note || "")) {
                                setVaultItems(prev => prev.map(i => i.id === selectedVaultItem.id ? { ...i, note: noteText } : i));
                                setSelectedVaultItem(prev => ({ ...prev, note: noteText }));
                                supabase.from('vault_items').update({ note: noteText }).eq('id', selectedVaultItem.id);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (noteText !== (selectedVaultItem.note || "")) {
                                  setVaultItems(prev => prev.map(i => i.id === selectedVaultItem.id ? { ...i, note: noteText } : i));
                                  setSelectedVaultItem(prev => ({ ...prev, note: noteText }));
                                  supabase.from('vault_items').update({ note: noteText }).eq('id', selectedVaultItem.id);
                                }
                                setNoteSaveStatus('Saved!');
                                setTimeout(() => { setNoteSaveStatus(''); }, 1500);
                              }
                            }}
                            placeholder="Type your reflections here... (Press Enter to save)"
                            className="flex-grow w-full bg-transparent border-none outline-none text-base sm:text-lg font-serif text-slate-700 dark:text-[#ededf0] placeholder-slate-300 dark:placeholder-[#2d2d33] resize-none"
                            style={{ minHeight: '150px' }}
                          />
                        </div>

                      </motion.div>

                    ) : (
                      /* --- PANE 2: THE INDEX GRID --- */
                      <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                        {filteredVaultItems.length === 0 ? (
                          <div className="flex flex-col items-center justify-center text-center px-4 py-20 opacity-60">
                            <Bookmark className="w-12 h-12 mb-4 text-slate-300 dark:text-[#2d2d33]" />
                            <p className="text-lg font-serif text-slate-600 dark:text-[#9a9a9f]">No items found.</p>
                          </div>
                        ) : (
                          <div className={vaultViewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" : "flex flex-col gap-3 max-w-4xl mx-auto"}>
                            {filteredVaultItems.map((item) => {
                              const itemType = item.type || 'hadith';
                              const isQuran = itemType === 'quran';
                              const isTranscript = itemType === 'transcript';

                              // Simplified, explicit badging
                              const getBadgeStyles = () => {
                                if (isQuran) return "bg-amber-500/10 text-amber-600 dark:text-amber-500";
                                if (isTranscript) return "bg-[#c6a87c]/10 text-[#c6a87c] dark:text-[#d4b78f]";
                                return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500";
                              };

                              if (vaultViewMode === 'grid') {
                                return (
                                  <div key={item.id} onClick={() => { setSelectedVaultItem(item); setNoteText(item.note || ""); setShowEditorArabic(false); setShowEditorChain(false); }} className="h-[240px] flex flex-col bg-white dark:bg-[#151518] border border-slate-200 dark:border-[#2d2d33] rounded-xl shadow-sm hover:shadow-[0_10px_40px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_10px_40px_rgba(0,0,0,0.4)] hover:border-slate-300 dark:hover:border-[#424248] transition-all cursor-pointer overflow-hidden relative group">

                                    <div className={`h-1 w-full ${isQuran ? 'bg-amber-500/50' : isTranscript ? 'bg-[#c6a87c]/50' : 'bg-emerald-500/50'}`} />

                                    <div className="p-5 flex-grow overflow-hidden relative">
                                      <div className="flex flex-wrap items-center gap-2 mb-3">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-widest font-bold ${getBadgeStyles()}`}>
                                          {isQuran ? <BookOpen className="w-3 h-3 inline mr-1" /> : isTranscript ? <LibraryIcon className="w-3 h-3 inline mr-1" /> : <Sparkles className="w-3 h-3 inline mr-1" />}
                                          {itemType}
                                        </span>
                                        {/* Multi-Folder Badges */}
                                        {item.folder_name && item.folder_name.split(',').map((folderName, index) => {
                                          const f = folderName.trim();
                                          if (!f) return null;
                                          return (
                                            <span key={`badge-${item.id}-${index}`} className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-widest font-bold ${getBadgeStyles()}`}>
                                              <Layout className="w-3 h-3 inline mr-1" /> {f}
                                            </span>
                                          );
                                        })}
                                      </div>
                                      <p className="text-xs font-mono text-slate-400 dark:text-[#9a9a9f] font-bold mb-2 truncate">{item.source}</p>
                                      {isQuran ? (
                                        <div className="flex flex-col gap-1.5">
                                          {item.arabic_text && (
                                            <p className="font-arabic text-sm sm:text-base text-right leading-snug text-slate-800 dark:text-slate-100" dir="rtl" lang="ar" style={{ fontFamily: activeFontFamily }}>
                                              {item.arabic_text}
                                            </p>
                                          )}
                                          <p className="font-serif text-xs sm:text-sm text-slate-600 dark:text-[#9a9a9f] leading-relaxed antialiased text-center italic">
                                            {item.content}
                                          </p>
                                        </div>
                                      ) : (
                                        <p className="font-serif text-sm text-slate-700 dark:text-[#ededf0] leading-relaxed antialiased">
                                          {item.content}
                                        </p>
                                      )}
                                      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white dark:from-[#151518] to-transparent pointer-events-none" />
                                    </div>

                                    {/* Footer with Click-Driven Kebab Menu */}
                                    <div className="px-5 py-3 border-t border-slate-100 dark:border-[#2d2d33] flex justify-between items-center bg-slate-50/50 dark:bg-[#1c1c20]/50 relative">
                                      <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-mono text-slate-400 dark:text-[#5d5d62]">{new Date(item.created_at).toLocaleDateString()}</span>
                                        {item.note && <PenLine className="w-3.5 h-3.5 text-blue-500" title="Has Note" />}
                                      </div>

                                      <div className="relative">
                                        <button onClick={(e) => { e.stopPropagation(); setActiveCardMenu(activeCardMenu === item.id ? null : item.id); setCardMenuMode('main'); }} className="p-1.5 text-slate-400 hover:text-slate-800 dark:text-[#5d5d62] dark:hover:text-white transition-colors rounded-md hover:bg-slate-200/50 dark:hover:bg-[#2d2d33]">
                                          <MoreHorizontal className="w-5 h-5" />
                                        </button>

                                        <AnimatePresence>
                                          {activeCardMenu === item.id && (
                                            <>
                                              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActiveCardMenu(null); }} />
                                              <motion.div initial={{ opacity: 0, scale: 0.95, y: 5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 5 }} onClick={(e) => e.stopPropagation()} className="absolute bottom-full right-0 mb-2 w-52 bg-white dark:bg-[#1c1c20] border border-slate-200 dark:border-[#2d2d33] rounded-xl shadow-xl z-50 overflow-hidden flex flex-col p-1">

                                                {cardMenuMode === 'main' ? (
                                                  <>
                                                    <button onClick={(e) => { e.stopPropagation(); setCardMenuMode('add'); }} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-[#ededf0] hover:bg-slate-100 dark:hover:bg-[#2d2d33] rounded-md transition-colors flex items-center justify-between">
                                                      <span className="flex items-center gap-2"><FolderPlus className="w-3.5 h-3.5 opacity-60" /> Add to Folder...</span>
                                                      <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); setCardMenuMode('move'); }} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-[#ededf0] hover:bg-slate-100 dark:hover:bg-[#2d2d33] rounded-md transition-colors flex items-center justify-between mt-1">
                                                      <span className="flex items-center gap-2"><Layout className="w-3.5 h-3.5 opacity-60" /> Move to Folder...</span>
                                                      <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                                                    </button>

                                                    {/* Contextual: Remove from Current Custom Folder */}
                                                    {!['All', 'Uncategorized', 'Quran', 'Hadiths', 'Transcripts'].includes(activeFolder) && (
                                                      <button onClick={(e) => { e.stopPropagation(); assignToFolder(item.id, activeFolder, 'remove'); }} className="w-full text-left px-3 py-2 text-xs font-semibold text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-md transition-colors flex items-center gap-2 mt-1">
                                                        <FolderMinus className="w-3.5 h-3.5 opacity-80" /> Remove from "{activeFolder}"
                                                      </button>
                                                    )}

                                                    <div className="my-1 border-t border-slate-100 dark:border-[#2d2d33]" />

                                                    <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${item.source}\n\n${item.content}`); setActiveCardMenu(null); }} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-[#ededf0] hover:bg-slate-100 dark:hover:bg-[#2d2d33] rounded-md transition-colors flex items-center gap-2">
                                                      <Copy className="w-3.5 h-3.5 opacity-60" /> Copy Text
                                                    </button>
                                                    <button onClick={async (e) => { e.stopPropagation(); await supabase.from('vault_items').delete().eq('id', item.id); fetchVaultItems(); setActiveCardMenu(null); }} className="w-full text-left px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors flex items-center gap-2 mt-1">
                                                      <Trash2 className="w-3.5 h-3.5 opacity-60" /> Delete Bookmark
                                                    </button>
                                                  </>
                                                ) : (
                                                  <>
                                                    <button onClick={(e) => { e.stopPropagation(); setCardMenuMode('main'); }} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-[#9a9a9f] dark:hover:text-[#ededf0] hover:bg-slate-100 dark:hover:bg-[#2d2d33] rounded-md transition-colors flex items-center gap-2">
                                                      <ChevronLeft className="w-3.5 h-3.5" /> Back
                                                    </button>
                                                    <div className="my-1 border-t border-slate-100 dark:border-[#2d2d33]" />
                                                    <div className="max-h-40 overflow-y-auto smart-scrollbar">
                                                      {customFolders.length === 0 ? (
                                                        <span className="px-3 py-2 text-xs text-slate-400 italic block">No folders available.</span>
                                                      ) : (
                                                        customFolders.map(f => (
                                                          <button key={`action-${f}`} onClick={(e) => { e.stopPropagation(); assignToFolder(item.id, f, cardMenuMode); }} className="w-full text-left px-3 py-2 text-xs text-slate-600 dark:text-[#9a9a9f] hover:bg-slate-100 dark:hover:bg-[#2d2d33] rounded-md transition-colors truncate">
                                                            {f}
                                                          </button>
                                                        ))
                                                      )}
                                                    </div>
                                                    {cardMenuMode === 'move' && item.folder_name && (
                                                      <button onClick={(e) => { e.stopPropagation(); assignToFolder(item.id, null, 'move'); }} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-[#2d2d33] rounded-md transition-colors flex items-center gap-2 mt-1 border-t border-slate-100 dark:border-[#2d2d33]">
                                                        Clear Folders
                                                      </button>
                                                    )}
                                                  </>
                                                )}
                                              </motion.div>
                                            </>
                                          )}
                                        </AnimatePresence>

                                      </div>
                                    </div>
                                  </div>
                                );
                              } else {
                                return (
                                  <div key={item.id} onClick={() => { setSelectedVaultItem(item); setNoteText(item.note || ""); setShowEditorArabic(false); setShowEditorChain(false); }} className="flex items-center justify-between p-4 bg-white dark:bg-[#151518] border border-slate-200 dark:border-[#2d2d33] rounded-lg hover:border-slate-300 dark:hover:border-[#424248] transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-4 overflow-hidden">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isQuran ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500' : isTranscript ? 'bg-[#c6a87c]/10 text-[#c6a87c] dark:text-[#d4b78f]' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500'}`}>
                                        {isQuran ? <BookOpen className="w-4 h-4" /> : isTranscript ? <LibraryIcon className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                      </div>
                                      <div className="flex flex-col min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 dark:text-[#ededf0] truncate">{item.source}</p>
                                        <p className="text-xs text-slate-500 dark:text-[#9a9a9f] truncate">{item.content.substring(0, 100)}...</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0 ml-4">
                                      {item.note && <PenLine className="w-4 h-4 text-blue-500 opacity-50 group-hover:opacity-100 transition-opacity" />}
                                      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-[#5d5d62] group-hover:text-slate-500 dark:group-hover:text-[#9a9a9f] transition-colors" />
                                    </div>
                                  </div>
                                );
                              }
                            })}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

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
            <h1 className="font-sans font-bold text-lg sm:text-xl tracking-tight hidden sm:block group-hover:opacity-80 transition-opacity text-[#2D241C] dark:text-[#FAFAFA]">Al-Kisa</h1>
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

            <button onClick={() => setActiveTab('search')} className={`p-2 rounded-full transition-all duration-300 cursor-pointer ${activeTab === 'search' ? 'bg-[#FDFBF7] dark:bg-[#c6a87c]/15 text-[#2D241C] dark:text-[#c6a87c] shadow-sm' : 'text-[#5C4A3D]/70 hover:text-[#2D241C] dark:text-[#c6a87c]/50 dark:hover:text-[#c6a87c]'}`} title="Search Engine">
              <Search className="w-4 h-4" />
            </button>

            <button onClick={() => setActiveTab('quran')} className={`p-2 rounded-full transition-all duration-300 cursor-pointer ${activeTab === 'quran' ? 'bg-amber-600/20 text-amber-800 dark:text-amber-500' : 'text-[#5C4A3D]/70 hover:text-[#2D241C] dark:text-[#c6a87c]/50 dark:hover:text-[#c6a87c]'}`} title="Quran Reader">
              <BookOpen className="w-4 h-4" />
            </button>

            <button onClick={() => setActiveTab('library')} className={`p-2 rounded-full transition-all duration-300 cursor-pointer ${activeTab === 'library' ? 'bg-[#c6a87c]/20 text-[#c6a87c] dark:text-[#d4b78f]' : 'text-[#5C4A3D]/70 hover:text-[#2D241C] dark:text-[#c6a87c]/50 dark:hover:text-[#c6a87c]'}`} title="Transcript Library">
              <LibraryIcon className="w-4 h-4" />
            </button>

            {/* --- THE NEW TRADITIONAL HADITH BUTTON --- */}
            <button onClick={() => setActiveTab('hadith')} className={`p-2 rounded-full transition-all duration-300 cursor-pointer ${activeTab === 'hadith' ? 'bg-[#c6a87c]/20 text-[#c6a87c] dark:text-[#d4b78f]' : 'text-[#5C4A3D]/70 hover:text-[#2D241C] dark:text-[#c6a87c]/50 dark:hover:text-[#c6a87c]'}`} title="Traditional Hadiths">
              <Book className="w-4 h-4" />
            </button>

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
        {activeTab === 'quran' && <QuranReader activeFontFamily={activeFontFamily} fontStyle={fontStyle} setFontStyle={setFontStyle} handleSurahSelectHook={(id, name) => saveToHistory({ type: 'quran', surahId: id, surahName: name, timestamp: Date.now() })} externalSurahTarget={quranTarget} externalVerseTarget={quranVerseTarget} onTafsirClick={handleTafsirClick} vaultItems={vaultItems} handleCopyHadith={handleCopyHadith} handleFindSimilar={handleFindSimilar} HadithCard={HadithCard} KisaLogo={KisaLogo} />}
        {activeTab === 'library' && (
          <TranscriptLibrary
            transcripts={transcriptData}
            vaultItems={vaultItems}
            externalDocTarget={transcriptTarget}
            externalHighlightTarget={transcriptHighlight}
            theme={theme}
            setTheme={setTheme}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            handleHomeClick={handleHomeClick}
            showHistoryDrawer={showHistoryDrawer}
            setShowHistoryDrawer={setShowHistoryDrawer}
            appHistory={appHistory}
            setAppHistory={setAppHistory}
            handleHistoryClick={handleHistoryClick}
            showUpdates={showUpdates}
            setShowUpdates={setShowUpdates}
            showInfo={showInfo}
            setShowInfo={setShowInfo}
            user={user}
            setShowAuthModal={setShowAuthModal}
            setShowSignOutConfirm={setShowSignOutConfirm}
            setShowVault={setShowVault}
            setQuranTarget={setQuranTarget}
            setQuranVerseTarget={setQuranVerseTarget}
            APP_UPDATES={APP_UPDATES}
            timeAgo={timeAgo}
            KisaLogo={KisaLogo}
          />
        )}

        {activeTab === 'hadith' && <HadithLibrary hadithData={alKafiData} />}

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
                            {(user ? ["All Twelver Sources", "My Vault", "al-Kafi", "Bihar al-Anwar", "Basa'ir al-Darajat"] : SOURCES).map((source) => (
                              <div key={source} onClick={() => { setSourceFilter(source); setShowDropdown(false); }} className={`px-4 py-3 text-sm cursor-pointer transition-colors flex items-center gap-2 ${sourceFilter === source ? 'bg-[#EAE4D3]/60 dark:bg-[#c6a87c]/15 text-[#2D241C] dark:text-[#FAFAFA] font-bold' : 'text-[#5C4A3D] dark:text-[#c6a87c]/80 hover:bg-[#F8F5EE] dark:hover:bg-[#c6a87c]/10 dark:hover:text-[#c6a87c]'}`}>
                                {source === "My Vault" && <Bookmark className="w-3.5 h-3.5" />}
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
                    {filteredItems.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-[#5C4A3D]/50 dark:text-[#c6a87c]/50 italic mt-10"><p>No {lengthFilter.toLowerCase()} hadiths found.</p></div> : paginatedItems.map((item, idx) => (<HadithCard key={idx} item={item} onVerseClick={handleVerseClick} handleCopyHadith={handleCopyHadith} searchMode={searchMode} onFindSimilar={handleFindSimilar} vaultItems={vaultItems} />))}
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
            <div className="fixed inset-0 z-[7000] flex items-center justify-center pointer-events-auto p-4 sm:p-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setTafsirData(null); setTafsirLoading(false); setTafsirTarget(null); }} className="absolute inset-0 bg-[#2D241C]/60 dark:bg-[#020604]/80 backdrop-blur-md cursor-pointer" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-[#EAE4D3] dark:bg-[#030A06] border border-[#5C4A3D]/20 dark:border-[#c6a87c]/20 w-full sm:w-[90vw] max-w-[700px] h-[80vh] flex flex-col shadow-2xl rounded-2xl z-[7001] overflow-hidden">
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
                      {(tafsirData.clusters || []).flatMap(c => c.items || []).map((item, idx) => (<HadithCard key={idx} item={item} searchMode="keyword" handleCopyHadith={handleCopyHadith} onFindSimilar={handleFindSimilar} vaultItems={vaultItems} />))}
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
                <div className="flex justify-between items-center bg-[#FDFBF7]/60 dark:bg-[#c6a87c]/5 backdrop-blur-xl pt-5 pb-4 px-5 z-10 border-b border-[#5C4A3D]/15 dark:border-[#c6a87c]/20 rounded-t-2xl shrink-0"><h2 className="text-lg sm:text-xl font-mono font-bold tracking-tight text-[#2D241C] dark:text-[#FAFAFA] flex items-center gap-2"><KisaLogo className="w-5 h-5 text-[#5C4A3D] dark:text-[#c6a87c]" />How to Use Al-Kisa</h2><button onClick={() => setShowInfo(false)} className="p-2 hover:bg-[#FDFBF7] dark:hover:bg-[#c6a87c]/10 rounded-full transition-colors cursor-pointer shrink-0"><X className="w-5 h-5 text-[#5C4A3D] dark:text-[#c6a87c]" /></button></div>

                <div className="p-5 sm:p-6 overflow-y-auto flex-grow smart-scrollbar flex flex-col gap-6 text-[#5C4A3D] dark:text-[#c6a87c]">
                  <div>
                    <h3 className="font-bold text-base sm:text-lg mb-2 text-[#2D241C] dark:text-[#FAFAFA]">Welcome to Al-Kisa</h3>
                    <p className="leading-relaxed text-xs sm:text-sm">Al-Kisa is a semantic search engine designed specifically to explore authentic Twelver Shia literature, prioritizing core texts like <i>al-Kafi</i>, <i>Bihar al-Anwar</i>, and <i>Basa'ir al-Darajat</i>. It maps verified texts mathematically so you can explore concepts without AI hallucinations.</p>
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
                        Read all 114 Surahs. If Al-Kisa detects narrations referencing a specific Ayah, a "Related Hadiths" button appears. Click it to open a seamless popup of contextual narrations.
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