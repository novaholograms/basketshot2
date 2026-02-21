import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&q=80";

export const Header: React.FC = () => {
  const { profile } = useAuth();
  const name = (profile?.full_name ?? '').trim();

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
            Hello, {name || 'Champ'}!
          </h1>
        </div>
      </div>
    </header>
  );
};