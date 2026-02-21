import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&q=80";

export const Header: React.FC<{ onOpenCoachChat: () => void }> = ({ onOpenCoachChat }) => {
  const { profile } = useAuth();
  const name = (profile?.full_name ?? '').trim();
  const username =
    (profile?.onboarding_data?.username ?? '').toString().trim() ||
    (profile?.email ? String(profile.email).split('@')[0] : '') ||
    'Champ';

  const greetingName = name || username;

  return (
    <header className="flex items-center justify-between px-6 py-6 sticky top-0 bg-background/80 backdrop-blur-md z-40">
      <div className="flex items-center gap-4">
        <div className="relative w-12 h-12 rounded-full border-2 border-primary p-0.5">
          <img
            src={profile?.avatar_url || FALLBACK_AVATAR}
            alt="User Avatar"
            className="w-full h-full rounded-full object-cover"
          />
        </div>
        <div>
          <h1 className="text-xl font-extrabold leading-none tracking-tight">
            Hello, {greetingName}!
          </h1>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenCoachChat}
        className="h-11 w-11 rounded-2xl bg-white/5 border border-white/10 text-white/80 active:scale-[0.97] transition-transform flex items-center justify-center"
        aria-label="Open AI Coach"
      >
        <MessageCircle className="h-5 w-5" />
      </button>
    </header>
  );
};