// src/components/MasteryRing.jsx

import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Check } from 'lucide-react';

const MasteryRing = ({ score, total }) => {
    // STATE 1: Uncharted (No quiz taken or data missing)
    if (score === undefined || score === null || total === 0) {
        return (
            <div className="w-8 h-8 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-zinc-400 dark:text-zinc-600 transition-colors group-hover:text-zinc-600 dark:group-hover:text-zinc-400" />
            </div>
        );
    }

    // STATE 3: The Master (Perfect Score)
    if (score === total) {
        return (
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="w-8 h-8 rounded-full bg-[#c6a87c] flex items-center justify-center shadow-md border-2 border-[#c6a87c] dark:border-[#1c1c1e]"
            >
                <Check className="w-4 h-4 text-white dark:text-zinc-900" strokeWidth={3} />
            </motion.div>
        );
    }

    // STATE 2: The Builder (Partial Score)
    const radius = 14;
    const circumference = 2 * Math.PI * radius;
    // Calculate how much of the ring should be empty
    const strokeDashoffset = circumference - (score / total) * circumference;

    return (
        <div className="relative w-8 h-8 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                {/* Background Track */}
                <circle
                    cx="18" cy="18" r={radius}
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="text-zinc-200 dark:text-zinc-800"
                />
                {/* Animated Gold Fill */}
                <motion.circle
                    cx="18" cy="18" r={radius}
                    fill="transparent"
                    stroke="#c6a87c"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                />
            </svg>
            {/* Micro Text in the center */}
            <span className="absolute text-[10px] font-black font-mono text-zinc-700 dark:text-[#c6a87c] tracking-tighter">
                {score}
            </span>
        </div>
    );
};

export default MasteryRing;