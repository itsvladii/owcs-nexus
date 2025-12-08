import React, { useState, useEffect, useRef } from 'react';

interface SearchItem {
  type: 'Player' | 'Team';
  name: string;
  subtitle: string;
  slug: string;
  keywords: string;
}

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<SearchItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Handle Open/Close & Hotkey
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  // 2. Fetch Data on Open (Lazy Load)
  useEffect(() => {
    if (isOpen && items.length === 0) {
      fetch('/search.json')
        .then(res => res.json())
        .then(data => setItems(data));
    }
    if (isOpen) {
      // Focus input automatically
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // 3. Filter Logic
  const filteredItems = query === '' 
    ? [] 
    : items.filter(item => item.keywords.includes(query.toLowerCase())).slice(0, 8); // Limit to 8 results

  if (!isOpen) {
    // Render just the trigger button
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors bg-neutral-900/50 border border-neutral-800 px-15 py-1.5 rounded-lg text-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM2.25 10.5a8.25 8.25 0 1 1 14.59 5.28l4.69 4.69a.75.75 0 1 1-1.06 1.06l-4.69-4.69A8.25 8.25 0 0 1 2.25 10.5Z" clipRule="evenodd" />
        </svg>
        <span className="hidden md:inline">Search...</span>
        <span className="hidden md:inline text-xs border border-neutral-700 px-1.5 rounded bg-neutral-800 text-neutral-500">Ctrl+K</span>
      </button>
    );
  }

  return (
    // Backdrop
    <div 
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4"
      onClick={() => setIsOpen(false)}
    >
      {/* Modal Window */}
      <div 
        className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        onClick={e => e.stopPropagation()} // Don't close when clicking inside
      >
        {/* Input Header */}
        <div className="flex items-center border-b border-neutral-800 p-4 gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-neutral-500">
            <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM2.25 10.5a8.25 8.25 0 1 1 14.59 5.28l4.69 4.69a.75.75 0 1 1-1.06 1.06l-4.69-4.69A8.25 8.25 0 0 1 2.25 10.5Z" clipRule="evenodd" />
          </svg>
          <input 
            ref={inputRef}
            type="text" 
            className="w-full bg-transparent text-white text-lg outline-none placeholder:text-neutral-600"
            placeholder="Search players or teams..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={() => setIsOpen(false)} className="text-neutral-500 hover:text-white">
             ESC
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredItems.length > 0 ? (
             filteredItems.map(item => (
               <a 
                 key={item.slug} 
                 href={item.slug}
                 className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-800 group transition-colors"
               >
                 <div className="flex flex-col">
                   <span className="font-bold text-white group-hover:text-amber-500 transition-colors">{item.name}</span>
                   <span className="text-xs text-neutral-500">{item.subtitle}</span>
                 </div>
                 <span className="text-xs font-mono text-neutral-600 border border-neutral-800 px-2 py-0.5 rounded uppercase">
                   {item.type}
                 </span>
               </a>
             ))
          ) : query !== '' ? (
             <div className="p-8 text-center text-neutral-500">No results found.</div>
          ) : (
             <div className="p-8 text-center text-neutral-600 text-sm">Type to start searching...</div>
          )}
        </div>
      </div>
    </div>
  );
}