import { useEffect, useState } from 'react';
import { supabase } from '../../lib/contentScripts/supabase';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = '/'; // 👈 Standard browser redirect
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profile?.is_admin) {
      setIsAdmin(true);
    } else {
      console.warn("⛔ Unauthorized access attempt to /admin");
      window.location.href = '/'; // 👈 Kick them out
    }
  };

  if (isAdmin === null) return <div className="p-10 text-center text-white">Verifying Clearance...</div>;

  return <>{children}</>;
}