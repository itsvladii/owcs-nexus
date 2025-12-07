import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  src: string;
  thumbnail?: string; // Now optional!
  title?: string;
}

// --- HELPER: Extract YouTube Thumbnail ---
const getYouTubeThumbnail = (url: string) => {
  // Regex to find the 11-character Video ID from any YouTube URL (embed, watch, or youtu.be)
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);

  if (match && match[2].length === 11) {
    const videoId = match[2];
    // 'maxresdefault' is the HD thumbnail. 
    // If a video is old/low-res, you might need 'hqdefault.jpg' instead.
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }
  return null;
};

export default function CinematicVideo({ src, thumbnail, title }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // LOGIC: Use provided thumbnail -> OR try to get YouTube thumb -> OR use gradient fallback
  const finalThumbnail = thumbnail || getYouTubeThumbnail(src);

  // The Modal Content (unchanged)
  const modalContent = (
    <div 
        className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200"
        onClick={() => setIsOpen(false)}
    >
        <button 
            className="absolute top-6 right-6 text-neutral-400 hover:text-white transition-colors bg-black/50 rounded-full p-2"
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div 
            className="relative w-full max-w-7xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
        >
            {src.includes('youtube') || src.includes('twitch') ? (
                <iframe 
                    src={src} 
                    className="w-full h-full" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                ></iframe>
            ) : (
                <video controls autoPlay className="w-full h-full">
                    <source src={src} type="video/mp4" />
                </video>
            )}
        </div>
    </div>
  );

  return (
    <>
      <div 
        onClick={() => setIsOpen(true)}
        className="group relative w-full aspect-video rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 cursor-pointer hover:border-amber-500/50 transition-all shadow-lg hover:shadow-amber-500/10"
      >
        {/* THUMBNAIL LOGIC */}
        {finalThumbnail ? (
            <img 
              src={finalThumbnail} 
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity transform group-hover:scale-105 duration-700" 
              alt={title || "Video"} 
            />
        ) : (
            // Fallback if not YouTube and no thumb provided
            <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center">
               <span className="text-neutral-700 font-bold uppercase tracking-widest text-xs">No Signal</span>
            </div>
        )}

        {/* Play Button */}
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-500 group-hover:border-amber-400 transition-all duration-300 shadow-xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white fill-current ml-1" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
        </div>

        {/* Title Label */}
        {title && (
            <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                <span className="text-xs font-bold text-white uppercase tracking-wider truncate block">{title}</span>
            </div>
        )}
      </div>

      {isMounted && isOpen && createPortal(modalContent, document.body)}
    </>
  );
}