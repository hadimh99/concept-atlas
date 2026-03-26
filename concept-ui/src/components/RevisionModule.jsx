// src/components/RevisionModule.jsx

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, PencilLine, CheckCircle, XCircle, BrainCircuit, ChevronUp, ChevronDown } from 'lucide-react';

// --- DYNAMIC NOTEBOOK LM DATA ---
const data = {
    "flashcards": [
        {
            "term": "Qara'in",
            "definition": "Historical contexts or circumstantial evidence used in forensic investigation to uncover buried truths, prioritized by the Sheikh over manipulated chains of narration."
        },
        {
            "term": "Asanid",
            "definition": "Chains of narration, which Sheikh al-Ghizzi critiques as a manipulated 'game' fabricated by historians to hide or distort facts about the oppression of the Ahlulbayt."
        },
        {
            "term": "Tadlis",
            "definition": "Deception or the hiding of facts, specifically referenced by the Sheikh regarding al-Bukhari intentionally deleting Ali and al-Abbas's explicit condemnation of Abu Bakr and Umar."
        },
        {
            "term": "Murji'ah",
            "definition": "A group cursed by Imam al-Sadiq because they validate the killers of the Ahlulbayt by calling them believers, thus making their clothes smeared with the blood of the Ahlulbayt."
        },
        {
            "term": "Al-Tashayyu'",
            "definition": "Shiism, which according to the Sheikh, solely represents the complete, absolute authoritative proof of the Infallible Ahlulbayt and cannot be fully represented by any fallible scholar."
        }
    ],
    "quiz": [
        {
            "id": 1,
            "question": "According to the Quranic principle of complicity discussed by Sheikh al-Ghizzi, how does an individual in the present day become a partner in the crimes committed against the Ahlulbayt?",
            "options": [
                "By physically committing acts of violence against the descendants of the Prophet.",
                "By defending, loving, or approving of the oppressors and killers of the Ahlulbayt.",
                "By refusing to evaluate the authenticity of historical chains of narration (Asanid).",
                "By remaining completely neutral and silent regarding historical theological disputes."
            ],
            "correct": 1,
            "explanation": "Drawing from Surah Al-Baqarah, Surah Al Imran, and Imam al-Sadiq's exegesis, the Sheikh proves that anyone who defends or is pleased with the actions of past oppressors is considered an active, direct partner in their crimes."
        },
        {
            "id": 2,
            "question": "What explicit proof of deception (Tadlis) does the Sheikh present when comparing Sahih Muslim and Sahih al-Bukhari?",
            "options": [
                "Sahih al-Bukhari fabricated a completely new chain of narration for the confrontation at Fatima's door.",
                "Sahih al-Bukhari removed the entire dialogue between Umar, Ali, and al-Abbas to protect the reputation of the caliphs.",
                "Sahih al-Bukhari maintained the same chain and text but explicitly censored the specific words where Imam Ali and al-Abbas called Abu Bakr and Umar 'liars, sinful, treacherous, and dishonest.'",
                "Sahih al-Bukhari changed the narrator of the hadith from Umar ibn al-Khattab to a weak transmitter to cast doubt on the event."
            ],
            "correct": 2,
            "explanation": "The Sheikh demonstrates the 'game of chains of narration' by showing that al-Bukhari transmitted the exact same hadith as Muslim, but deliberately deleted the specific words highlighting Ali and al-Abbas viewing Abu Bakr and Umar as liars, sinful, and treacherous."
        },
        {
            "id": 3,
            "question": "To silence critics who denied the explicit cause of Fatima's martyrdom, which text and definitive conclusion does Sheikh al-Ghizzi present at the end of the episode?",
            "options": [
                "He uses Ibn Qutaybah's Al-Imamah wa al-Siyasah to prove she died of profound grief after her inheritance was denied.",
                "He relies on the manifesto of the Mahdi to show she passed away peacefully despite the usurpation of her divine rights.",
                "He quotes a suppressed letter in Bihar al-Anwar showing Umar admitting she died from a sudden illness during the raid.",
                "He cites the foundational Shia text Kamil al-Ziyarat, containing a hadith from Imam al-Sadiq explicitly stating she died from being beaten."
            ],
            "correct": 3,
            "explanation": "The Sheikh conclusively answers critics by quoting a hadith from Imam al-Sadiq in Kamil al-Ziyarat which explicitly states that Fatima's home was invaded, she miscarried due to the strikes, and definitively 'died from that beating.'"
        }
    ]
};
// ---------------------------------------------------

const Flashcard = ({ term, definition }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    return (
        <div
            className="group relative h-56 w-full cursor-pointer"
            style={{ perspective: '1000px' }}
            onClick={() => setIsFlipped(!isFlipped)}
        >
            <motion.div
                className="absolute inset-0 h-full w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#1c1c1e] p-5 shadow-lg"
                style={{ transformStyle: 'preserve-3d' }}
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
                {/* Front Side */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center" style={{ backfaceVisibility: 'hidden' }}>
                    <span className="font-sans text-[10px] uppercase font-bold tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">Concept</span>
                    <h4 className="font-serif text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white antialiased">{term}</h4>
                    <span className="mt-6 text-[11px] font-bold text-[#c6a87c] opacity-70 group-hover:opacity-100 transition-opacity">Click to Reveal</span>
                </div>

                {/* Back Side */}
                <div className="absolute inset-0 h-full w-full flex flex-col items-center justify-center p-6 text-center bg-zinc-50 dark:bg-[#252528] rounded-xl border-l-4 border-[#c6a87c]" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                    <p className="font-sans text-sm sm:text-base text-zinc-800 dark:text-[#c6a87c] leading-relaxed antialiased font-medium">{definition}</p>
                </div>
            </motion.div>
        </div>
    );
};

const QuizQuestion = ({ question, idx }) => {
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [showExplanation, setShowExplanation] = useState(false);

    const isAnswered = selectedAnswer !== null;

    const getOptionStyle = (optionIdx) => {
        if (!isAnswered) {
            return "bg-zinc-50 hover:bg-zinc-100 dark:bg-[#252528] dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-[#E2E2E2] cursor-pointer";
        }
        if (optionIdx === question.correct) {
            return "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-300";
        }
        if (optionIdx === selectedAnswer) {
            return "bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-900 dark:text-red-300";
        }
        return "bg-zinc-100 dark:bg-[#1c1c1e] border-zinc-100 dark:border-zinc-800 text-zinc-400 dark:text-zinc-600 opacity-60";
    };

    return (
        <div className="mb-8 p-6 bg-white dark:bg-[#1c1c1e] border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm">
            {/* Flexbox Layout for Question Header prevents out-of-bounds bleeding */}
            <div className="flex items-start gap-4 sm:gap-5 mb-6">
                <span className="font-mono text-4xl sm:text-5xl font-black text-zinc-200 dark:text-zinc-800 shrink-0 leading-none pt-1 tracking-tighter">
                    {String(idx + 1).padStart(2, '0')}
                </span>
                <h4 className="font-serif text-lg sm:text-xl md:text-2xl text-zinc-900 dark:text-white leading-snug antialiased pt-0.5">
                    {question.question}
                </h4>
            </div>

            <div className="flex flex-col gap-3">
                {question.options.map((option, oIdx) => (
                    <button
                        key={oIdx}
                        onClick={() => {
                            if (!isAnswered) {
                                setSelectedAnswer(oIdx);
                                setTimeout(() => setShowExplanation(true), 400);
                            }
                        }}
                        disabled={isAnswered}
                        className={`w-full text-left p-4 rounded-xl text-sm sm:text-base font-medium transition-all duration-300 border ${getOptionStyle(oIdx)}`}
                    >
                        <div className="flex items-center gap-4">
                            <span className={`w-7 h-7 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 ${isAnswered && oIdx === question.correct ? 'bg-emerald-500 text-white border-emerald-600' : isAnswered && oIdx === selectedAnswer ? 'bg-red-500 text-white border-red-600' : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400'}`}>
                                {isAnswered && oIdx === question.correct ? <CheckCircle className="w-4 h-4" /> : isAnswered && oIdx === selectedAnswer ? <XCircle className="w-4 h-4" /> : String.fromCharCode(65 + oIdx)}
                            </span>
                            <span className="leading-snug">{option}</span>
                        </div>
                    </button>
                ))}
            </div>

            <AnimatePresence>
                {showExplanation && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                            <h5 className={`font-sans text-sm sm:text-base uppercase tracking-widest font-black mb-3 flex items-center gap-2 ${selectedAnswer === question.correct ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                <BrainCircuit className="w-5 h-5" />
                                {selectedAnswer === question.correct ? "Correct!" : "Correct Answer: " + String.fromCharCode(65 + question.correct)}
                            </h5>
                            <p className="text-base sm:text-lg text-zinc-800 dark:text-zinc-200 leading-relaxed font-serif antialiased font-medium">
                                {question.explanation}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const RevisionModule = () => {
    const [activeTab, setActiveTab] = useState('quiz'); // 'quiz' or 'flashcards'
    const [isExpanded, setIsExpanded] = useState(true); // Default to open

    return (
        <div className="mt-16 pt-10 border-t-[1.5px] border-zinc-200 dark:border-zinc-800 relative z-10 w-full max-w-4xl mx-auto">

            {/* Premium Section Header */}
            <div className="flex flex-col items-center mb-6 text-center px-4">
                <div className="w-16 h-16 rounded-full bg-[#c6a87c]/10 flex items-center justify-center border border-[#c6a87c]/20 shadow-inner mb-4">
                    <BrainCircuit className="w-8 h-8 text-[#c6a87c]" />
                </div>
                <h2 className="font-serif text-3xl sm:text-4xl font-normal leading-tight text-zinc-900 dark:text-white drop-shadow-md">
                    Revision & <span className="italic text-[#c6a87c]">Theological Mastery</span>
                </h2>
                <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 mt-3 max-w-md antialiased">
                    Active Recall designed specifically to reinforce the dense materials in this transcript.
                </p>
            </div >

            {/* Expand / Collapse Accordion Toggle */}
            <div className="flex justify-center mb-10">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800/50 text-xs sm:text-sm font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-700 shadow-sm"
                >
                    {isExpanded ? 'Minimize Module' : 'Take the Quiz'}
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
            </div>

            {/* Interactive Zone (Collapsible) */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        {/* Custom Tab Navigation */}
                        <div className="flex items-center justify-center mb-8 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-full p-1.5 max-w-sm mx-auto shadow-inner">
                            <button
                                onClick={() => setActiveTab('quiz')}
                                className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-widest transition-all cursor-pointer ${activeTab === 'quiz' ? 'bg-white dark:bg-[#1c1c1e] text-zinc-900 dark:text-white shadow-lg border border-zinc-200 dark:border-zinc-700' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white'}`}
                            >
                                <PencilLine className={`w-4 h-4 ${activeTab === 'quiz' ? 'text-[#c6a87c]' : 'opacity-60'}`} /> Knowledge Check
                            </button>
                            <button
                                onClick={() => setActiveTab('flashcards')}
                                className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-widest transition-all cursor-pointer ${activeTab === 'flashcards' ? 'bg-white dark:bg-[#1c1c1e] text-zinc-900 dark:text-white shadow-lg border border-zinc-200 dark:border-zinc-700' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white'}`}
                            >
                                <Lightbulb className={`w-4 h-4 ${activeTab === 'flashcards' ? 'text-[#c6a87c]' : 'opacity-60'}`} /> Concept Review
                            </button>
                        </div>

                        {/* Content Area */}
                        <AnimatePresence mode="wait">
                            {activeTab === 'flashcards' && (
                                <motion.div
                                    key="flashcards"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                                >
                                    {data.flashcards.map((card, i) => (
                                        <Flashcard key={i} term={card.term} definition={card.definition} />
                                    ))}
                                </motion.div>
                            )}

                            {activeTab === 'quiz' && (
                                <motion.div
                                    key="quiz"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2 }}
                                    className="max-w-3xl mx-auto"
                                >
                                    {data.quiz.map((question, i) => (
                                        <QuizQuestion key={question.id} question={question} idx={i} />
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Footer */}
                        <div className="mt-12 text-center py-6 border-t border-zinc-100 dark:border-zinc-800/80">
                            <p className="text-xs font-mono text-zinc-400 dark:text-zinc-600">This module is powered by dynamic data analysis of the transcript text.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div >
    );
};

export default RevisionModule;