// src/components/RevisionModule.jsx

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, PencilLine, CheckCircle, XCircle, BrainCircuit, ChevronUp, ChevronDown, Activity, Award, AlertCircle, Compass, BookOpen, RotateCcw } from 'lucide-react';
import revisionData from '../revision_data.json';

const Flashcard = ({ term, definition }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    return (
        <div className="group relative h-56 w-full cursor-pointer" style={{ perspective: '1000px' }} onClick={() => setIsFlipped(!isFlipped)}>
            <motion.div className="absolute inset-0 h-full w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#1c1c1e] p-5 shadow-lg" style={{ transformStyle: 'preserve-3d' }} initial={false} animate={{ rotateY: isFlipped ? 180 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center" style={{ backfaceVisibility: 'hidden' }}>
                    <span className="font-sans text-[10px] uppercase font-bold tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">Concept</span>
                    <h4 className="font-serif text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white antialiased">{term}</h4>
                    <span className="mt-6 text-[11px] font-bold text-[#c6a87c] opacity-70 group-hover:opacity-100 transition-opacity">Click to Reveal</span>
                </div>
                <div className="absolute inset-0 h-full w-full flex flex-col items-center justify-center p-6 text-center bg-zinc-50 dark:bg-[#252528] rounded-xl border-l-4 border-[#c6a87c]" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                    <p className="font-sans text-sm sm:text-base text-zinc-800 dark:text-[#c6a87c] leading-relaxed antialiased font-medium">{definition}</p>
                </div>
            </motion.div>
        </div>
    );
};

const QuizQuestion = ({ question, idx, onReportAnswer }) => {
    const [selectedAnswers, setSelectedAnswers] = useState([]);
    const [showHint, setShowHint] = useState(false);
    const [confidence, setConfidence] = useState(null);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const isMulti = question.type === 'multi';

    const handleSelect = (oIdx) => {
        if (isSubmitted) return;
        if (isMulti) {
            setSelectedAnswers(prev => prev.includes(oIdx) ? prev.filter(i => i !== oIdx) : [...prev, oIdx]);
        } else {
            setSelectedAnswers([oIdx]);
        }
        setConfidence(null);
    };

    const handleSubmit = () => {
        setIsSubmitted(true);
        const isFullyCorrect = selectedAnswers.length === question.correct.length && selectedAnswers.every(val => question.correct.includes(val));
        onReportAnswer(question.id, isFullyCorrect, confidence);
    };

    const getOptionStyle = (oIdx) => {
        const isSelected = selectedAnswers.includes(oIdx);
        const isCorrectOption = question.correct.includes(oIdx);

        if (!isSubmitted) return isSelected ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-400 dark:border-zinc-500 text-zinc-900 dark:text-white shadow-inner" : "bg-white hover:bg-zinc-50 dark:bg-[#1c1c1e] dark:hover:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-pointer";
        if (isCorrectOption && isSelected) return "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400 dark:border-emerald-600 text-emerald-900 dark:text-emerald-300";
        if (isCorrectOption && !isSelected) return "bg-white dark:bg-[#1c1c1e] border-emerald-400 border-dashed border-2 dark:border-emerald-600 text-emerald-700 dark:text-emerald-500 opacity-80";
        if (!isCorrectOption && isSelected) return "bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-900 dark:text-red-300";

        return "bg-zinc-50 dark:bg-[#151518] border-zinc-100 dark:border-zinc-800 text-zinc-400 dark:text-zinc-600 opacity-40";
    };

    const isFullyCorrect = isSubmitted && selectedAnswers.length === question.correct.length && selectedAnswers.every(val => question.correct.includes(val));

    return (
        <div className="mb-10 p-6 sm:p-8 bg-white dark:bg-[#1c1c1e] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                    <span className="font-mono text-3xl font-black text-zinc-300 dark:text-zinc-700 leading-none">{String(idx + 1).padStart(2, '0')}</span>
                    <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold border ${question.difficulty === 'Easy' ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' : question.difficulty === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' : question.difficulty === 'Hard' ? 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'}`}>{question.difficulty}</span>
                    {isMulti && <span className="px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800">Select All That Apply</span>}
                </div>
                {!isSubmitted && question.hint && (
                    <button onClick={() => setShowHint(!showHint)} className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#c6a87c] hover:text-zinc-900 dark:hover:text-white transition-colors">
                        <Lightbulb className="w-4 h-4" /> {showHint ? "Hide Hint" : "Request Hint"}
                    </button>
                )}
            </div>

            <h4 className="font-serif text-xl md:text-2xl text-zinc-900 dark:text-white leading-relaxed antialiased mb-6">{question.question}</h4>

            <AnimatePresence>
                {showHint && !isSubmitted && (
                    <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -10, height: 0 }} className="overflow-hidden mb-6">
                        <div className="bg-amber-50 dark:bg-[#c6a87c]/10 border-l-4 border-[#c6a87c] p-4 rounded-r-lg">
                            <p className="text-sm font-serif italic text-amber-900 dark:text-[#c6a87c] antialiased"><span className="font-bold uppercase tracking-wider font-sans text-[10px] mr-2">Hint:</span>{question.hint}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex flex-col gap-3">
                {question.options.map((option, oIdx) => (
                    <button key={oIdx} onClick={() => handleSelect(oIdx)} disabled={isSubmitted} className={`w-full text-left p-4 sm:p-5 rounded-xl text-sm sm:text-base font-medium transition-all duration-200 border ${getOptionStyle(oIdx)}`}>
                        <div className="flex items-start sm:items-center gap-4">
                            <div className={`w-6 h-6 rounded border flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 sm:mt-0 ${isSubmitted && question.correct.includes(oIdx) ? 'bg-emerald-500 text-white border-emerald-600' : isSubmitted && selectedAnswers.includes(oIdx) && !question.correct.includes(oIdx) ? 'bg-red-500 text-white border-red-600' : selectedAnswers.includes(oIdx) && !isSubmitted ? 'bg-[#c6a87c] text-white border-[#c6a87c]' : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-500'} ${!isMulti ? 'rounded-full' : 'rounded-md'}`}>
                                {isSubmitted && question.correct.includes(oIdx) ? <CheckCircle className="w-4 h-4" /> : isSubmitted && selectedAnswers.includes(oIdx) ? <XCircle className="w-4 h-4" /> : String.fromCharCode(65 + oIdx)}
                            </div>
                            <span className="leading-relaxed">{option}</span>
                        </div>
                    </button>
                ))}
            </div>

            <AnimatePresence>
                {selectedAnswers.length > 0 && !isSubmitted && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden mt-8">
                        <div className="p-5 bg-zinc-50 dark:bg-[#252528] rounded-xl border border-zinc-200 dark:border-zinc-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-2 text-center sm:text-left"><Activity className="w-3.5 h-3.5 inline mr-1" />Confidence Score</p>
                                <div className="flex gap-2">
                                    {['Low', 'Medium', 'High'].map(level => (
                                        <button key={level} onClick={() => setConfidence(level)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${confidence === level ? 'bg-[#c6a87c] text-white border-[#c6a87c]' : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:border-[#c6a87c]'}`}>{level}</button>
                                    ))}
                                </div>
                            </div>
                            {confidence && (
                                <motion.button initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={handleSubmit} className="w-full sm:w-auto px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#c6a87c] dark:hover:bg-[#c6a87c] hover:text-white transition-colors shadow-md">Submit Answer</motion.button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isSubmitted && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                        <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-700">
                            <h5 className={`font-sans text-sm sm:text-base uppercase tracking-widest font-black mb-3 flex items-center gap-2 ${isFullyCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                <BrainCircuit className="w-5 h-5" /> {isFullyCorrect ? "Correct!" : "Incorrect"}
                            </h5>
                            <p className="text-base sm:text-lg text-zinc-800 dark:text-zinc-200 leading-relaxed font-serif antialiased font-medium">{question.explanation}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const MasteryReport = ({ results, totalQuestions, onReviewClick, onCompleteClick, onRetakeClick, onComplete }) => {
    const score = Object.values(results).filter(r => r.isCorrect).length;
    const confValues = { 'Low': 1, 'Medium': 2, 'High': 3 };
    const avgConf = Object.values(results).reduce((acc, r) => acc + confValues[r.confidence], 0) / totalQuestions;

    const isHighScore = (score / totalQuestions) >= 0.75;
    const isHighConf = avgConf >= 2.25;

    // --- THIS IS THE FIX ---
    // By leaving the dependency array empty [], we ensure this ONLY fires once 
    // when the report first appears on screen, preventing the infinite loop.
    useEffect(() => {
        if (onComplete) {
            onComplete(score, totalQuestions);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    let archetype = { title: "", icon: null, message: "", style: "", action: "", onClick: null };

    if (isHighScore && isHighConf) {
        archetype = { title: "The Master", icon: <Award className="w-8 h-8" />, message: "Perfect synchronization. You understand this material deeply and accurately. You are ready to move on.", style: "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10", action: "Complete Module", onClick: onCompleteClick };
    } else if (isHighScore && !isHighConf) {
        archetype = { title: "The Hesitant Scholar", icon: <Compass className="w-8 h-8" />, message: "You scored perfectly, but your confidence was low. Trust your intuition—you absorbed the material much better than you realize!", style: "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10", action: "Complete Module", onClick: onCompleteClick };
    } else if (!isHighScore && isHighConf) {
        archetype = { title: "The Blind Spot", icon: <AlertCircle className="w-8 h-8" />, message: "You felt highly confident, but missed the mark here. This is the most critical phase of learning—you have identified an 'illusion of competence.'", style: "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10", action: "Review Flashcards", onClick: onReviewClick };
    } else {
        archetype = { title: "The Builder", icon: <BookOpen className="w-8 h-8" />, message: "This is dense material, and your low confidence showed you knew it was tricky. Don't stress. Let's review the foundational flashcards one more time.", style: "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10", action: "Review Flashcards", onClick: onReviewClick };
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`mt-12 p-8 rounded-3xl border-2 flex flex-col items-center text-center ${archetype.style}`}>
            <div className="mb-4">{archetype.icon}</div>
            <p className="font-mono text-xs uppercase tracking-widest font-bold opacity-70 mb-2 text-zinc-600 dark:text-zinc-400">Personal Learning Profile</p>
            <h3 className="font-serif text-3xl font-bold mb-4 text-zinc-900 dark:text-white">{archetype.title}</h3>

            <div className="flex gap-8 mb-6 text-zinc-900 dark:text-white">
                <div className="flex flex-col"><span className="text-3xl font-black">{score}/{totalQuestions}</span><span className="text-[10px] uppercase font-bold opacity-70">Score</span></div>
                <div className="w-px bg-current opacity-20"></div>
                <div className="flex flex-col"><span className="text-3xl font-black">{avgConf.toFixed(1)}</span><span className="text-[10px] uppercase font-bold opacity-70">Avg Confidence</span></div>
            </div>

            <p className="text-lg font-serif italic mb-8 max-w-lg opacity-90 text-zinc-700 dark:text-zinc-300">{archetype.message}</p>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <button onClick={archetype.onClick} className="px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md hover:bg-[#c6a87c] dark:hover:bg-[#c6a87c] hover:text-white transition-colors">
                    {archetype.action}
                </button>
                <button onClick={onRetakeClick} className="px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs bg-transparent border-2 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-zinc-900 dark:hover:border-white transition-colors flex items-center justify-center gap-2">
                    <RotateCcw className="w-4 h-4" /> Retake Quiz
                </button>
            </div>
        </motion.div>
    );
};

const RevisionModule = ({ docId, onComplete }) => {
    // 1. Pull the data dynamically based on the current episode
    const data = revisionData[docId];

    const [activeTab, setActiveTab] = useState('quiz');
    const [isExpanded, setIsExpanded] = useState(true);
    const [results, setResults] = useState({});
    const [quizAttempt, setQuizAttempt] = useState(0);

    // 2. If this episode has no quiz in the JSON, render nothing!
    if (!data) return null;

    const handleReportAnswer = (id, isCorrect, confidence) => {
        setResults(prev => ({ ...prev, [id]: { isCorrect, confidence } }));
    };

    const handleRetake = () => {
        setResults({});
        setQuizAttempt(prev => prev + 1);
        window.scrollTo({ top: document.body.scrollHeight - 800, behavior: 'smooth' });
    };

    const isQuizComplete = Object.keys(results).length === data.quiz.length;

    return (
        <div className="mt-16 pt-10 border-t-[1.5px] border-zinc-200 dark:border-zinc-800 relative z-10 w-full max-w-4xl mx-auto">
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

            <div className="flex justify-center mb-10">
                <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800/50 text-xs sm:text-sm font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-700 shadow-sm">
                    {isExpanded ? 'Minimize Module' : 'Take the Quiz'} {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">

                        <div className="flex items-center justify-center mb-8 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-full p-1.5 max-w-sm mx-auto shadow-inner">
                            <button onClick={() => setActiveTab('quiz')} className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-widest transition-all cursor-pointer ${activeTab === 'quiz' ? 'bg-white dark:bg-[#1c1c1e] text-zinc-900 dark:text-white shadow-lg border border-zinc-200 dark:border-zinc-700' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white'}`}>
                                <PencilLine className={`w-4 h-4 ${activeTab === 'quiz' ? 'text-[#c6a87c]' : 'opacity-60'}`} /> Knowledge Check
                            </button>
                            <button onClick={() => setActiveTab('flashcards')} className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-widest transition-all cursor-pointer ${activeTab === 'flashcards' ? 'bg-white dark:bg-[#1c1c1e] text-zinc-900 dark:text-white shadow-lg border border-zinc-200 dark:border-zinc-700' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white'}`}>
                                <Lightbulb className={`w-4 h-4 ${activeTab === 'flashcards' ? 'text-[#c6a87c]' : 'opacity-60'}`} /> Concept Review
                            </button>
                        </div>

                        <AnimatePresence mode="wait">
                            {activeTab === 'flashcards' && (
                                <motion.div key="flashcards" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {data.flashcards.map((card, i) => <Flashcard key={i} term={card.term} definition={card.definition} />)}
                                </motion.div>
                            )}

                            {activeTab === 'quiz' && (
                                <motion.div key={`quiz-${quizAttempt}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} className="max-w-3xl mx-auto">
                                    {data.quiz.map((question, i) => <QuizQuestion key={question.id} question={question} idx={i} onReportAnswer={handleReportAnswer} />)}

                                    {isQuizComplete && (
                                        <MasteryReport
                                            results={results}
                                            totalQuestions={data.quiz.length}
                                            onReviewClick={() => setActiveTab('flashcards')}
                                            onCompleteClick={() => setIsExpanded(false)}
                                            onRetakeClick={handleRetake}
                                            onComplete={onComplete} // 3. Passing the save function down properly
                                        />
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="mt-12 text-center py-6 border-t border-zinc-100 dark:border-zinc-800/80">
                            <p className="text-xs font-mono text-zinc-400 dark:text-zinc-600">This module is powered by dynamic data analysis of the transcript text.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RevisionModule;