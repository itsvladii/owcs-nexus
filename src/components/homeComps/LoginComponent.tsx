// src/components/LoginButton.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/contentScripts/supabase';

export default function LoginButton() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // 1. Check active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // 2. Listen for login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'discord' });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // STATE A: User is Logged In -> Show Avatar + Name
  if (user) {
    return (
      <div className="flex items-center gap-3 bg-neutral-800/50 pr-4 rounded-full border border-neutral-700">
        {user.user_metadata.avatar_url && (
          <img 
            src={user.user_metadata.avatar_url} 
            alt="Avatar" 
            className="w-10 h-10 rounded-full border border-neutral-600"
          />
        )}
        <div className="flex flex-col">
          <span className="text-sm font-bold text-white leading-tight">
            {user.user_metadata.full_name}
          </span>
          <button 
            onClick={handleLogout}
            className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase tracking-wider text-left"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // STATE B: User is Logged Out -> Show Discord Button
  return (
    <button 
      onClick={handleLogin}
      className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 transition-all shadow-lg shadow-[#5865F2]/20"
    >

        
        <div className="flex items-center gap-3 relative z-10">
            <svg  className="w-5 h-5 text-white shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" // <--- The critical fix (Official Discord ViewBox) 
            fill="currentColor">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.11,77.11,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22c2.36-24.44-2-47.27-18.9-72.15ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
            </svg>
            <span className="font-title text-lg tracking-wider text-white pt-0.5">
                LOG IN
            </span>
        </div>
    </button>
  );
}