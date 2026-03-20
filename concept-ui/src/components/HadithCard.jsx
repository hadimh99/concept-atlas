// src/components/HadithCard.jsx

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Sparkles, Check, Bookmark, Copy, PenLine } from 'lucide-react';
import { supabase } from '../supabaseClient';
import quranData from '../quran.json';

const HadithCard = ({ item, handleCopyHadith, searchMode, onVerseClick, onFindSimilar, vaultItems = [] }) => {
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

    // --- PERSISTENT SAVE STATE LOGIC ---
    const sourceRef = `Book: ${item.book}, Vol: ${item.volume}, ${item.sub_book}, Chapter: ${item.chapter} ${displayNum !== "Unknown" ? `Hadith ${displayNum}` : ''}`;
    const [isSaved, setIsSaved] = useState(false);
    const [savedNote, setSavedNote] = useState("");

    useEffect(() => {
        const vItem = vaultItems.find(v => v.source === sourceRef);
        setIsSaved(!!vItem);
        setSavedNote(vItem?.note || "");
    }, [vaultItems, sourceRef]);

    const handleSaveClick = async (e) => {
        e.stopPropagation();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
            alert("Please Sign In from the top menu to save to your Vault.");
            return;
        }

        if (isSaved) {
            const savedItem = vaultItems.find(v => v.source === sourceRef);
            if (savedItem) {
                await supabase.from('vault_items').delete().eq('id', savedItem.id);
                setIsSaved(false);
                window.dispatchEvent(new Event('vault-updated'));
            }
            return;
        }

        const { error } = await supabase.from('vault_items').insert([{
            user_id: session.user.id,
            content: textToCopy,
            arabic_text: araText || null,
            chain: chain || null,
            source: sourceRef,
            type: 'hadith',
            note: ''
        }]);

        if (error) {
            console.error("Supabase Save Error:", error);
            alert(`Supabase blocked the save: ${error.message}`);
        } else {
            setIsSaved(true);
            window.dispatchEvent(new Event('vault-updated'));
        }
    };

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

            <AnimatePresence>
                {savedNote && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className={`mb-5 p-4 rounded-lg border-l-4 shadow-sm ${isKeyword ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <PenLine className={`w-4 h-4 ${isKeyword ? 'text-blue-500' : 'text-indigo-500'}`} />
                                <span className={`text-xs font-bold uppercase tracking-widest ${isKeyword ? 'text-blue-600 dark:text-blue-400' : 'text-indigo-600 dark:text-indigo-400'}`}>Your Vault Note</span>
                            </div>
                            <p className="font-serif text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{savedNote}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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

                <div className="flex items-center gap-4">
                    <button onClick={handleCopyClick} className={`flex items-center gap-2 text-xs font-mono transition-colors px-3 py-1.5 rounded-md cursor-pointer ${copied ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : (isKeyword ? 'text-slate-500 hover:text-blue-500 hover:bg-slate-200/50 dark:hover:bg-slate-700/50' : 'text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700/50')}`}>
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}<span>{copied ? 'Copied!' : 'Copy Text'}</span>
                    </button>

                    <motion.button
                        onClick={handleSaveClick}
                        whileTap={{ scale: 1.3, rotate: -15 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        className={`p-1 rounded-full transition-colors cursor-pointer ${isSaved ? 'text-amber-500 hover:text-amber-600 dark:hover:text-amber-400' : 'text-slate-400 hover:text-amber-500 dark:text-slate-500 dark:hover:text-amber-400'}`}
                        title={isSaved ? "Remove from Vault" : "Save Bookmark"}
                    >
                        <Bookmark className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} strokeWidth={isSaved ? 0 : 2} />
                    </motion.button>
                </div>
            </div>
        </div>
    );
};

export default HadithCard;