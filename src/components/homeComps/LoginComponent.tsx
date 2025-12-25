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
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 3.9 3.9 0 0 0-.332.677 18.298 18.298 0 0 0-5.845 0 3.91 3.91 0 0 0-.332-.677.074.074 0 0 0-.079-.037 19.755 19.755 0 0 0-4.885 1.515.072.072 0 0 0-.03.026C1.31 8.82 1.487 13.167 2.87 17.382a.072.072 0 0 0 .028.026 19.863 19.863 0 0 0 6.002 3.018.077.077 0 0 0 .083-.027c.438-.596.82-1.233 1.138-1.905a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.076.076 0 0 0-.04.106c.36.672.74 1.31 1.138 1.905a.077.077 0 0 0 .083.027 19.9 19.9 0 0 0 6.002-3.018.077.077 0 0 0 .028-.026c1.55-4.66 1.05-8.995-1.076-13.013a.072.072 0 0 0-.029-.026zM8.02 15.331c-1.18 0-2.156-1.085-2.156-2.419 0-1.333.955-2.418 2.156-2.418 1.21 0 2.175 1.095 2.156 2.418 0 1.334-.956 2.419-2.156 2.419zm7.975 0c-1.18 0-2.156-1.085-2.156-2.419 0-1.333.955-2.418 2.156-2.418 1.21 0 2.175 1.095 2.156 2.418 0 1.334-.946 2.419-2.156 2.419z"/>
      </svg>
      Login with Discord
    </button>
  );
}