import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Moon, Sun, Sparkles, X, ChevronRight, ChevronLeft, Home, Copy, ChevronDown, ChevronUp, List, Layout, Info, BookOpen, Fingerprint } from 'lucide-react';

const CLUSTER_COLORS = ['#10b981', '#8b5cf6', '#f59e0b', '#f43f5e', '#3b82f6'];
const SOURCES = ["All Twelver Sources", "al-Kafi", "Bihar al-Anwar", "Basa'ir al-Darajat"];

const HadithCard = ({ item, handleCopyHadith }) => {
  const [showArabic, setShowArabic] = useState(false);
  const [showChain, setShowChain] = useState(false);

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

    if (engText.length > 0) {
      engText = engText.charAt(0).toUpperCase() + engText.slice(1);
    }

    return { displayNum, engText, araText };
  };

  const { displayNum, engText, araText } = getCleanData();

  const splitText = (text) => {
    const markers = [
      "in a marfu‘ manner who has narrated the following:",
      "in a marfu' manner who has narrated the following:",
      "in a marfu‘ manner the following:",
      "in a marfu' manner the following:",
      "who has narrated the following:",
      "said the following:",
      "who said:",
      "who has said:",
      "is narrated from",
      "narrated that:",
      "following Hadith:",
      "the following is narrated:",
      "said:"
    ];

    for (let marker of markers) {
      if (text.includes(marker)) {
        const parts = text.split(marker);
        let rawChain = parts[0] + marker;
        let bodyPart = parts.slice(1).join(marker).trim();

        const connectorRegex = /(\s+(?:from|narrated that|narrated from|who heard|who has said that|who said that|has said that|said that)\s+)/i;
        const segments = rawChain.split(connectorRegex);

        let chainSegments = [];
        let bodySegments = [];
        let foundNonImam = false;

        const blessingRegex = /\(\s*(as|a\.s\.?|s\.a\.?|sawa|s\.a\.w\.w\.?|r\.a\.?)\s*\)/i;

        for (let i = segments.length - 1; i >= 0; i -= 2) {
          let chunk = segments[i];
          let delimiter = i > 0 ? segments[i - 1] : "";
          let hasBlessing = blessingRegex.test(chunk);

          if (hasBlessing && !foundNonImam) {
            bodySegments.unshift(chunk);
            let prevChunk = i >= 2 ? segments[i - 2] : null;
            let prevHasBlessing = prevChunk ? blessingRegex.test(prevChunk) : false;

            if (prevHasBlessing) {
              if (delimiter) bodySegments.unshift(delimiter);
            } else {
              if (delimiter) chainSegments.unshift(delimiter);
            }
          } else {
            foundNonImam = true;
            chainSegments.unshift(chunk);
            if (delimiter) chainSegments.unshift(delimiter);
          }
        }

        let finalChain = chainSegments.join("").trim();
        let finalBodyPrefix = bodySegments.join("").trim();

        finalChain = finalChain.replace(/(?:(?:from|narrated that|narrated from|who heard|who has said that|who said that|has said that|said that)\s*|,\s*)+$/i, "").trim();
        let finalBody = finalBodyPrefix ? (finalBodyPrefix + " " + bodyPart) : bodyPart;

        finalBody = finalBody.replace(/^[:\s,‘'"]+/, "");
        if (finalBody.length > 0) {
          finalBody = finalBody.charAt(0).toUpperCase() + finalBody.slice(1);
        }

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

    let paragraphs = [];
    let currentPara = "";

    sentences.forEach(sentence => {
      currentPara += sentence;

      const endsWithAcronym = /(a\.s\.\s*|s\.a\.\s*|a\.j\.\s*|r\.a\.\s*|sawa\s*)$/i.test(sentence);

      const openSmart = (currentPara.match(/[“‘]/g) || []).length;
      const closeSmart = (currentPara.match(/[”’]/g) || []).length;
      const straightDouble = (currentPara.match(/"/g) || []).length;

      const insideQuote = (openSmart > closeSmart) || (straightDouble % 2 !== 0);

      const isSoftBreak = currentPara.length > 600 && !insideQuote;
      const isHardBreak = currentPara.length > 1200;

      if ((isSoftBreak || isHardBreak) && !endsWithAcronym) {
        paragraphs.push(currentPara.trim());
        currentPara = "";
      }
    });

    if (currentPara.trim()) {
      paragraphs.push(currentPara.trim());
    }

    return paragraphs;
  };

  const paragraphs = formatParagraphs(body);

  const textToCopy = chain
    ? `${chain}\n\n${paragraphs.join('\n\n')}`
    : paragraphs.join('\n\n');

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 relative shadow-sm border border-slate-100 dark:border-slate-700">

      <div className="mb-5 border-b border-slate-100 dark:border-slate-700 pb-3">
        <span className="text-sm md:text-base font-medium text-slate-500 dark:text-slate-400 leading-relaxed block">
          Book: {item.book}, Vol: {item.volume}, {item.sub_book}, Chapter: {item.chapter}
          {(displayNum && displayNum !== "Unknown") && `, Hadith: ${displayNum}`}
        </span>
      </div>

      <div className="mb-3">
        <button
          onClick={() => setShowArabic(!showArabic)}
          className="flex items-center gap-1 text-sm font-medium text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors cursor-pointer"
        >
          {showArabic ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showArabic ? "Hide Original Arabic" : "View Original Arabic"}
        </button>

        <AnimatePresence>
          {showArabic && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-lg mt-2 mb-4 border border-slate-100 dark:border-slate-800">
                <p className="font-arabic text-xl md:text-2xl text-right leading-[2.2] text-slate-700 dark:text-slate-300" dir="rtl">
                  {(displayNum && displayNum !== "Unknown") && `${displayNum}. `}{araText}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mb-4">
        <button
          onClick={() => setShowChain(!showChain)}
          className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors cursor-pointer"
        >
          {showChain ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {showChain ? "Hide Chain of Narrators" : "View Chain of Narrators"}
        </button>

        <AnimatePresence>
          {showChain && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <p className="mt-2 p-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-lg text-sm italic text-slate-500 dark:text-slate-400 font-sans border border-slate-100 dark:border-slate-800">
                {chain ? chain : "Chain information not explicitly found in English text."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mb-6">
        {paragraphs.map((para, idx) => (
          <p
            key={idx}
            className={`text-lg md:text-xl leading-[1.8] text-slate-900 dark:text-slate-50 ${idx !== paragraphs.length - 1 ? 'mb-5' : ''}`}
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            {(idx === 0 && displayNum && displayNum !== "Unknown") && (
              <span className="font-bold mr-2 text-indigo-600 dark:text-indigo-400">{displayNum}.</span>
            )}
            {para}
          </p>
        ))}
      </div>

      <div className="mt-2 flex justify-end pt-4 border-t border-slate-50 dark:border-slate-700/50">
        <button
          onClick={() => handleCopyHadith({ ...item, hadith_number: displayNum, english_text: textToCopy })}
          className="flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors px-3 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer"
        >
          <Copy className="w-4 h-4" />
          <span>Copy Text</span>
        </button>
      </div>
    </div>
  );
};

const getTopKeywords = (items) => {
  if (!items || items.length === 0) return [];
  const stopWords = new Set([
    "the", "and", "to", "of", "a", "in", "that", "is", "for", "it", "with", "as",
    "he", "was", "on", "from", "who", "has", "said", "this", "they", "but", "are",
    "not", "have", "be", "upon", "him", "peace", "narrated", "which", "what", "their",
    "all", "your", "them", "those", "these", "would", "were", "had", "been", "also",
    "allah", "messenger", "imam", "ibn", "abu", "ali", "muhammad", "abdillah", "abdullah",
    "ja'far", "hasan", "husayn", "baqir", "sadiq", "prophet", "lord", "holy", "people",
    "man", "men", "woman", "women", "asked", "told", "heard", "came", "went", "saying",
    "some", "we", "you", "by", "or", "if", "when", "an", "at", "about", "then", "there",
    "his", "do", "did", "does", "can", "could", "should", "shall", "will"
  ]);

  const wordCounts = {};
  items.forEach(item => {
    const words = item.english_text.toLowerCase().replace(/[^\w\s-]/g, '').split(/\s+/);
    words.forEach(word => {
      if (word.length > 4 && !stopWords.has(word)) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });
  });

  return Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(e => e[0]);
};

export default function App() {
  const [query, setQuery] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [viewMode, setViewMode] = useState(window.innerWidth < 768 ? 'list' : 'map');
  const [activeCluster, setActiveCluster] = useState(null);
  const [hoveredCluster, setHoveredCluster] = useState(null);

  const [sourceFilter, setSourceFilter] = useState(SOURCES[0]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchMode, setSearchMode] = useState('concept');

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const containerRef = useRef(null);
  const modalScrollRef = useRef(null);
  const [centerPos, setCenterPos] = useState({ x: 0, y: 0 });
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // --- SMART PIPELINE UI STATE ---
  const [loadingMessage, setLoadingMessage] = useState('Deep Search');

  const modalScrollTimeoutRef = useRef(null);

  const handleModalScroll = (e) => {
    const el = e.currentTarget;
    const isDark = document.documentElement.classList.contains('dark');

    el.style.setProperty('--thumb-bg', isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(15, 23, 42, 0.4)');

    if (modalScrollTimeoutRef.current) {
      clearTimeout(modalScrollTimeoutRef.current);
    }

    modalScrollTimeoutRef.current = setTimeout(() => {
      el.style.setProperty('--thumb-bg', 'transparent');
    }, 800);
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // --- CHATGPT PIPELINE TIMER LOGIC ---
  useEffect(() => {
    if (!loading) return;

    let timeouts = [];

    if (searchMode === 'concept') {
      // Step 1: Default fast start
      setLoadingMessage('Embedding query...');

      // Step 2: If it takes longer than 3s, the cloud AI is cold-starting
      timeouts.push(setTimeout(() => {
        setLoadingMessage('Waking up Cloud AI & Embedding query... ⏳');
      }, 3000));

      // Step 3: Moving to the database
      timeouts.push(setTimeout(() => {
        setLoadingMessage('Retrieving narrations...');
      }, 16000));

      // Step 4: The Gemini labeling phase
      timeouts.push(setTimeout(() => {
        setLoadingMessage('Generating conceptual themes...');
      }, 23000));

      // Step 5: Finalizing
      timeouts.push(setTimeout(() => {
        setLoadingMessage('Finalizing UI...');
      }, 29000));

    } else {
      setLoadingMessage('Scanning Records...');
      timeouts.push(setTimeout(() => setLoadingMessage('Retrieving matches...'), 2000));
      timeouts.push(setTimeout(() => setLoadingMessage('Formatting results...'), 5000));
    }

    // Cleanup timers if the search finishes early
    return () => timeouts.forEach(clearTimeout);
  }, [loading, searchMode]);

  useEffect(() => {
    setCurrentPage(1);
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
    }
  }, [activeCluster]);

  useEffect(() => {
    const updateDimensions = () => {
      setWindowWidth(window.innerWidth);
      if (containerRef.current) {
        setCenterPos({
          x: containerRef.current.clientWidth / 2,
          y: containerRef.current.clientHeight / 2,
        });
      }
      if (window.innerWidth < 768 && viewMode === 'map') {
        setViewMode('list');
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [data, viewMode]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);

    try {
      const response = await fetch('https://concept-atlas-backend.onrender.com/api/explore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          query: query,
          source: sourceFilter,
          searchMode: searchMode
        })
      });

      const result = await response.json();
      if (result.clusters && result.clusters.length > 0) {
        setData(result);
        if (searchMode === 'keyword') {
          setViewMode('list');
        }
      } else {
        setData(null);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyHadith = (item) => {
    const formattedText = `Book ${item.book}, Volume ${item.volume}, ${item.sub_book}, Chapter: ${item.chapter}, Hadith ${item.hadith_number}\n\n${item.arabic_text}\n\n${item.english_text}\n\n— Via Concept Atlas`;

    navigator.clipboard.writeText(formattedText).then(() => {
      console.log("Hadith copied to clipboard!");
    }).catch(err => {
      console.error("Failed to copy: ", err);
    });
  };

  const getRadialPosition = (index, total, rx, ry) => {
    const angle = (index * (360 / total) - 90) * (Math.PI / 180);
    return {
      x: Math.cos(angle) * rx,
      y: Math.sin(angle) * ry,
    };
  };

  const uniqueBooks = data ? Array.from(new Set(
    data.clusters.flatMap(cluster => cluster.items.map(item => item.book))
  )) : [];

  return (
    <div className={`min-h-screen w-full overflow-hidden transition-colors duration-700 flex flex-col ${theme === 'dark' ? 'aurora-bg text-slate-100' : 'light-aurora-bg text-slate-900'}`}>

      <style>{`
        .hide-scroll::-webkit-scrollbar {
          display: none;
        }
        .hide-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .smart-scrollbar {
          --thumb-bg: transparent;
          scrollbar-width: thin;
          scrollbar-color: var(--thumb-bg) transparent;
        }
        .smart-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .smart-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .smart-scrollbar::-webkit-scrollbar-thumb {
          background-color: var(--thumb-bg);
          border-radius: 10px;
        }
        
        .smart-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(100, 116, 139, 0.8) !important;
        }
        .dark .smart-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(203, 213, 225, 0.8) !important;
        }
      `}</style>

      <header className="fixed top-0 w-full z-50 p-6 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full glass-panel flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[var(--color-cluster-emerald)]" />
          </div>
          <div>
            <h1 className="font-sans font-bold text-xl tracking-tight hidden sm:block">Concept Atlas</h1>
            <p className="font-sans text-xs opacity-60 hidden sm:block">Semantic Explorer</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 relative z-50 pointer-events-auto">
          {data && searchMode !== 'keyword' && (
            <div className="flex items-center glass-panel rounded-full p-1 border-white/20">
              <button
                onClick={() => setViewMode('map')}
                className={`p-2 rounded-full transition-all duration-300 ${viewMode === 'map' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                title="Map View"
              >
                <Layout className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-full transition-all duration-300 ${viewMode === 'list' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          )}

          <AnimatePresence>
            {data && (
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onClick={() => {
                  setData(null);
                  setQuery('');
                  setActiveCluster(null);
                  setHoveredCluster(null);
                }}
                className="w-11 h-11 rounded-full appearance-none outline-none bg-white/0 flex items-center justify-center group transition-all duration-300 hover:scale-110 cursor-pointer"
                title="Return Home"
              >
                <Home className="w-5 h-5 transition-all duration-300 text-slate-400 group-hover:text-slate-900 dark:text-slate-500 dark:group-hover:text-white" />
              </motion.button>
            )}
          </AnimatePresence>

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-11 h-11 rounded-full appearance-none outline-none bg-white/0 flex items-center justify-center group transition-all duration-300 hover:scale-110 cursor-pointer"
            title="Toggle Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-slate-500 group-hover:text-yellow-400 transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
            ) : (
              <Moon className="w-5 h-5 text-slate-400 transition-all duration-300 group-hover:text-slate-900 group-hover:fill-slate-900" />
            )}
          </button>
        </div>
      </header>

      <main ref={containerRef} className="relative w-full flex-grow flex items-center justify-center h-screen">
        <AnimatePresence>
          {!data && !loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
              className="z-10 flex flex-col items-center w-full max-w-2xl px-6"
            >
              <h2 className="font-serif text-4xl md:text-5xl font-medium mb-8 text-center leading-tight">
                Explore the Depths of <br />
                <span className="italic">Twelver Literature</span>
              </h2>

              <div className="w-full relative group pointer-events-auto">
                <div
                  className="absolute inset-0 w-full h-full rounded-2xl border border-white/60 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-xl pointer-events-none z-0 transition-colors duration-700"
                  style={{
                    backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.3)',
                    backdropFilter: 'blur(24px)'
                  }}
                ></div>

                <form onSubmit={handleSearch} className="relative z-10 flex flex-col p-2">
                  <div className="flex items-center border-b border-slate-200/50 dark:border-slate-700/50 relative">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={searchMode === 'concept' ? "Enter a phrase or concept (e.g. intellect)..." : "Enter an exact word or phrase..."}
                      className="w-full bg-transparent appearance-none outline-none py-4 pl-4 pr-16 text-lg font-sans placeholder:text-slate-500 cursor-text"
                      style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}
                    />
                    <button
                      type="submit"
                      className="absolute right-2 p-2.5 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-500 hover:text-white dark:bg-indigo-500/20 dark:hover:bg-indigo-500 dark:text-indigo-400 dark:hover:text-white rounded-xl transition-colors shadow-sm cursor-pointer"
                    >
                      <Search className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="relative py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center bg-white/30 dark:bg-slate-800/60 rounded-lg p-1 border border-white/40 dark:border-slate-700/50">
                      <button
                        type="button"
                        onClick={() => setSearchMode('concept')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all duration-300 ${searchMode === 'concept' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Concept
                      </button>
                      <button
                        type="button"
                        onClick={() => setSearchMode('keyword')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all duration-300 ${searchMode === 'keyword' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                      >
                        <Fingerprint className="w-3.5 h-3.5" /> Keyword
                      </button>
                    </div>

                    <div className="flex items-center">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mr-3 hidden sm:flex">
                        <BookOpen className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-wider font-semibold">Source:</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="flex items-center justify-between w-full sm:w-[220px] px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                      >
                        <span className="truncate">{sourceFilter}</span>
                        <ChevronDown className="w-4 h-4 opacity-50 shrink-0 ml-2" />
                      </button>

                      <AnimatePresence>
                        {showDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute top-14 right-0 w-full sm:w-[220px] glass-panel rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl"
                          >
                            {SOURCES.map((source) => (
                              <div
                                key={source}
                                onClick={() => {
                                  setSourceFilter(source);
                                  setShowDropdown(false);
                                }}
                                className={`px-4 py-3 text-sm cursor-pointer transition-colors ${sourceFilter === source ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
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
          {loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 2, filter: "blur(20px)" }}
              className="absolute z-20 flex flex-col items-center justify-center"
            >
              <div className="relative flex items-center justify-center">
                <motion.div className="w-32 h-32 rounded-full absolute bg-[var(--color-cluster-emerald)]/30 blur-2xl" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
                <motion.div className="w-24 h-24 rounded-full absolute bg-[var(--color-cluster-amethyst)]/30 blur-xl" animate={{ scale: [1.2, 0.8, 1.2], rotate: 180 }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
                <div className="w-16 h-16 rounded-full glass-panel flex items-center justify-center border-white/40 shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                  <Sparkles className="w-6 h-6 animate-pulse text-white" />
                </div>
              </div>
              <motion.p className="mt-8 font-sans tracking-widest uppercase text-sm font-semibold opacity-70 transition-opacity duration-300">
                {loadingMessage}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {data && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 w-full h-full flex flex-col items-center justify-center"
            >

              {/* --- MAP VIEW RENDER --- */}
              {viewMode === 'map' && searchMode === 'concept' && (
                <>
                  <motion.div
                    layoutId="search-node"
                    className="absolute z-30 flex flex-col items-center justify-center pointer-events-auto cursor-pointer"
                    onClick={() => setActiveCluster(null)}
                  >
                    <div className="glass-panel px-8 py-4 flex items-center gap-3 backdrop-blur-xl border-white/30 shadow-[0_0_50px_rgba(16,185,129,0.15)] group hover:scale-105 transition-transform">
                      <span className="font-serif text-2xl font-medium">{query}</span>
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                        <span className="text-xs font-bold">{data.total_results}</span>
                      </div>
                    </div>
                  </motion.div>

                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                    {data.clusters.map((cluster, i) => {
                      const rx = Math.min(Math.max(120, centerPos.x - 200), 450);
                      const ry = Math.min(Math.max(120, centerPos.y - 180), 300);
                      const pos = getRadialPosition(i, data.clusters.length, rx, ry);

                      const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
                      const isHovered = hoveredCluster === i;
                      const isActive = activeCluster === i;
                      const strokeOpacity = isActive ? 0.8 : isHovered ? 0.6 : 0.15;
                      const strokeWidth = isActive ? 2 : isHovered ? 1.5 : 1;

                      return (
                        <motion.line
                          key={`line-${i}`}
                          x1={centerPos.x}
                          y1={centerPos.y}
                          x2={centerPos.x + pos.x}
                          y2={centerPos.y + pos.y}
                          stroke={color}
                          strokeWidth={strokeWidth}
                          strokeOpacity={strokeOpacity}
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 1, delay: i * 0.2 }}
                          className="transition-all duration-300"
                        />
                      );
                    })}
                  </svg>

                  {data.clusters.map((cluster, i) => {
                    const rx = Math.min(Math.max(120, centerPos.x - 200), 450);
                    const ry = Math.min(Math.max(120, centerPos.y - 180), 300);
                    const pos = getRadialPosition(i, data.clusters.length, rx, ry);

                    const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
                    const isActive = activeCluster === i;
                    const isHovered = hoveredCluster === i;
                    const isFaded = activeCluster !== null && !isActive;

                    const maxClusterSize = Math.max(...data.clusters.map(c => c.items.length));
                    const relativeWeight = cluster.items.length / maxClusterSize;
                    const screenScaleFactor = Math.min(1, windowWidth / 1200);
                    const baseScale = (0.85 + (relativeWeight * 0.45)) * screenScaleFactor;
                    const finalBaseScale = Math.max(0.65, baseScale);
                    const targetScale = isActive ? finalBaseScale * 1.05 : finalBaseScale;

                    const topKeywords = getTopKeywords(cluster.items);

                    return (
                      <motion.div
                        key={`cluster-${i}`}
                        initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                        animate={{
                          opacity: isFaded ? 0.2 : 1,
                          x: pos.x,
                          y: pos.y,
                          scale: targetScale
                        }}
                        transition={{ type: "spring", stiffness: 60, delay: i * 0.1 }}
                        className={`absolute pointer-events-auto transition-all duration-300 z-20 ${isFaded ? 'pointer-events-none grayscale' : ''}`}
                        onMouseEnter={() => setHoveredCluster(i)}
                        onMouseLeave={() => setHoveredCluster(null)}
                      >
                        <div
                          className="glass-panel flex flex-col cursor-pointer transition-all duration-300 shadow-lg relative group min-w-[240px] max-w-[300px]"
                          style={{
                            borderColor: isActive || isHovered ? color : (theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.6)'),
                            boxShadow: isActive || isHovered ? `0 0 24px ${color}60, inset 0 0 12px ${color}20` : '0 8px 32px rgba(0,0,0,0.05)',
                            backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.3)'
                          }}
                        >
                          <div onClick={() => setActiveCluster(isActive ? null : i)} className="px-5 py-4 flex items-center justify-between gap-4">
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300 group-hover:w-2" style={{ backgroundColor: color }} />
                            <div className="pl-2">
                              <h3 className="font-mono font-medium text-sm lg:text-base leading-tight">
                                {cluster.theme_label}
                              </h3>
                              <p className="text-xs opacity-60 mt-0.5">{cluster.items.length} Hadiths</p>
                            </div>
                            <div className="opacity-50 group-hover:opacity-100 transition-opacity">
                              {isActive ? <X className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </div>
                          </div>

                          <div className="h-0 overflow-hidden group-hover:h-auto transition-all duration-300 bg-black/5 dark:bg-white/5 border-t border-white/10">
                            <div className="px-5 py-2 flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                              <Info className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate tracking-tight">Roots: {topKeywords.join(' • ')}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </>
              )}

              {/* --- LIST VIEW RENDER --- */}
              {viewMode === 'list' && (
                <div className="z-30 w-full max-w-4xl px-4 pt-28 pb-12 h-full overflow-y-auto pointer-events-auto hide-scroll">

                  {/* Compact Header Card */}
                  <div className="glass-panel p-5 sm:p-6 rounded-xl mb-8 border border-white/20 dark:border-slate-700/50 shadow-sm bg-white/40 dark:bg-slate-900/40">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="font-serif text-2xl sm:text-3xl font-medium text-slate-900 dark:text-white tracking-tight">
                          {searchMode === 'keyword' ? 'Exact Matches:' : 'Search:'} <span className="italic">"{query}"</span>
                        </h2>
                        {/* Dynamic Book Tags */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {uniqueBooks.map((bookName, idx) => (
                            <span key={idx} className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 bg-slate-500/10 px-2.5 py-1 rounded-md border border-slate-500/20">
                              {bookName}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-6 sm:border-l border-slate-200 dark:border-slate-700/60 sm:pl-6">
                        {searchMode === 'concept' && (
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-semibold mb-1">Themes</p>
                            <p className="font-mono text-xl text-indigo-500 dark:text-indigo-400">{data.clusters.length}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-semibold mb-1">Hadiths</p>
                          <p className="font-mono text-xl text-emerald-500 dark:text-emerald-400">{data.total_results}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Clean Monospaced Index Rows */}
                  <div className="flex flex-col border-t border-slate-200 dark:border-slate-800">
                    {data.clusters.map((cluster, i) => {
                      const topKeywords = getTopKeywords(cluster.items);

                      return (
                        <motion.div
                          key={`list-item-${i}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          onClick={() => setActiveCluster(i)}
                          className="group relative flex items-center justify-between p-5 sm:p-6 cursor-pointer border-b border-slate-200 dark:border-slate-800 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-all duration-300"
                        >
                          <div className="flex items-start sm:items-center gap-5 sm:gap-6 flex-grow">
                            <span className="font-mono text-sm sm:text-base font-medium text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors pt-1 sm:pt-0">
                              0{i + 1}
                            </span>

                            <div>
                              <h3 className="font-mono text-lg sm:text-xl font-medium tracking-tight text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {cluster.theme_label}
                              </h3>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="font-mono text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                  [{cluster.items.length} narrations]
                                </span>

                                {searchMode === 'concept' && (
                                  <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <Info className="w-3.5 h-3.5" />
                                    <span>{topKeywords.join(' • ')}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300 pl-4">
                            <ChevronRight className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* --- THE PAGINATED MODAL --- */}
              <AnimatePresence>
                {activeCluster !== null && data.clusters[activeCluster] && (() => {

                  const clusterItems = data.clusters[activeCluster].items;
                  const totalPages = Math.ceil(clusterItems.length / ITEMS_PER_PAGE);
                  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                  const paginatedItems = clusterItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

                  return (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-auto">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setActiveCluster(null)}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
                      />

                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-[90vw] max-w-[700px] h-[85vh] flex flex-col shadow-2xl rounded-2xl z-[1001]"
                      >
                        <div className="flex justify-between items-center bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md pt-6 pb-4 px-6 z-10 border-b border-slate-200 dark:border-slate-800 rounded-t-2xl shrink-0">
                          <h2 className="text-2xl font-mono font-bold tracking-tight text-indigo-600 dark:text-indigo-400 truncate pr-4">
                            {data.clusters[activeCluster].theme_label}
                          </h2>
                          <button onClick={() => setActiveCluster(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer shrink-0">
                            <X className="w-6 h-6" />
                          </button>
                        </div>

                        <div
                          ref={modalScrollRef}
                          onScroll={handleModalScroll}
                          className="p-6 flex flex-col gap-6 overflow-y-auto flex-grow smart-scrollbar"
                        >
                          {paginatedItems.map((item, idx) => (
                            <HadithCard key={idx} item={item} handleCopyHadith={handleCopyHadith} />
                          ))}

                          {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-700/50 mt-4">
                              <button
                                onClick={() => {
                                  setCurrentPage(prev => Math.max(prev - 1, 1));
                                  modalScrollRef.current.scrollTop = 0;
                                }}
                                disabled={currentPage === 1}
                                className={`flex items-center gap-1 px-4 py-2 rounded-lg font-medium transition-colors ${currentPage === 1 ? 'opacity-30 cursor-not-allowed text-slate-500' : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 cursor-pointer'}`}
                              >
                                <ChevronLeft className="w-5 h-5" /> Previous
                              </button>

                              <span className="font-mono text-sm text-slate-500 dark:text-slate-400">
                                Page {currentPage} of {totalPages}
                              </span>

                              <button
                                onClick={() => {
                                  setCurrentPage(prev => Math.min(prev + 1, totalPages));
                                  modalScrollRef.current.scrollTop = 0;
                                }}
                                disabled={currentPage === totalPages}
                                className={`flex items-center gap-1 px-4 py-2 rounded-lg font-medium transition-colors ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed text-slate-500' : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 cursor-pointer'}`}
                              >
                                Next <ChevronRight className="w-5 h-5" />
                              </button>
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
      </main>
    </div>
  );
}