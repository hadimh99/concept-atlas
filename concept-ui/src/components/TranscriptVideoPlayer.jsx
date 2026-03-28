// src/components/TranscriptVideoPlayer.jsx

import React from 'react';
import { motion } from 'framer-motion';
import { PlayCircle } from 'lucide-react';

const TranscriptVideoPlayer = ({ youtubeId }) => {
    // If there is no video ID in the JSON for this episode, render nothing!
    if (!youtubeId || youtubeId === "") return null;

    return (
        <div className="w-full max-w-4xl mx-auto mt-16 pt-10 border-t-[1.5px] border-zinc-200 dark:border-zinc-800 relative z-10 print-hide">

            {/* Premium Section Header */}
            <div className="flex flex-col items-center mb-8 text-center px-4">
                <div className="w-16 h-16 rounded-full bg-[#c6a87c]/10 flex items-center justify-center border border-[#c6a87c]/20 shadow-inner mb-4">
                    <PlayCircle className="w-8 h-8 text-[#c6a87c] ml-1" />
                </div>
                <h2 className="font-serif text-3xl sm:text-4xl font-normal leading-tight text-zinc-900 dark:text-white drop-shadow-md">
                    Cinematic <span className="italic text-[#c6a87c]">Overview</span>
                </h2>
                <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 mt-3 max-w-md antialiased">
                    A high-level visual whiteboard summary of the theological arguments presented in this file.
                </p>
            </div>

            {/* The Native YouTube Canvas */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-700 bg-[#151518]"
            >
                <iframe
                    className="absolute top-0 left-0 w-full h-full"
                    // rel=0 ensures that if YouTube shows related videos at the end, they are from YOUR channel, not random ones
                    src={`https://www.youtube.com/embed/${youtubeId}?rel=0`}
                    title="Transcript Video Overview"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                ></iframe>
            </motion.div>
        </div>
    );
};

export default TranscriptVideoPlayer;