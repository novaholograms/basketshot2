import React, { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Settings, Shield, HelpCircle, LogOut, Trash2, ChevronRight, Star, Mail, Edit2, UserPlus, Sparkles } from 'lucide-react';
import { ViewType } from '../types';

interface ProfileViewProps {
  onNavigate?: (view: ViewType) => void;
}

const FAVORITE_WORKOUTS = [
  {
    id: 1,
    title: "3-Point Shooting",
    duration: "20 min",
    intensity: "High"
  },
  {
    id: 3,
    title: "Handles",
    duration: "30 min",
    intensity: "Med"
  }
];

export const ProfileView: React.FC<ProfileViewProps> = ({ onNavigate }) => {
  const { user, profile, signOut, updateProfile } = useAuth();
  const currentName = useMemo(() => (profile?.full_name ?? '').trim(), [profile?.full_name]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  const trimmedDraft = nameDraft.trim();
  const isValidName = trimmedDraft.length >= 2 && trimmedDraft.length <= 50;
  const isDirty = currentName !== trimmedDraft;

  const toggleEditName = () => {
    if (isEditingName) {
      setIsEditingName(false);
      setNameDraft('');
      return;
    }
    setNameDraft(currentName);
    setIsEditingName(true);
  };

  const saveName = async () => {
    const n = trimmedDraft;
    if (!isValidName) return;
    setIsSavingName(true);
    try {
      await updateProfile({ full_name: n || null });
      setIsEditingName(false);
      setNameDraft('');
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <div className="pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="mt-2 px-1 flex justify-between items-end mb-6">
         <div>
            <h3 className="text-2xl font-extrabold tracking-tight mb-2">My Profile</h3>
            <p className="text-muted text-sm font-medium">Manage your account & stats</p>
         </div>
         <button className="w-10 h-10 rounded-full bg-surface border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors">
            <Settings size={20} className="text-white" />
         </button>
      </div>

      {/* Profile Card */}
      <section className="mb-6">
        <div className="bg-surface rounded-3xl p-6 border border-white/5 relative overflow-hidden">
          
          {/* Edit Button - Top Right */}
          <button
            type="button"
            onClick={toggleEditName}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-primary hover:text-black transition-colors z-20"
            aria-label="Edit name"
          >
            <Edit2 size={16} />
          </button>

          <div className="flex flex-col items-center text-center relative z-10">
            <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full p-1 border-2 border-primary/50">
                    <img
                        src="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80"
                        alt="Profile"
                        className="w-full h-full rounded-full object-cover"
                    />
                </div>
            </div>

            {!isEditingName ? (
              <h2 className="text-2xl font-extrabold tracking-tight mb-1">
                {currentName || 'User'}
              </h2>
            ) : (
              <div className="w-full max-w-xs">
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={50}
                  autoFocus
                  className="w-full rounded-2xl bg-background border border-white/10 px-4 py-2.5 text-center text-lg font-extrabold outline-none focus:border-primary"
                  placeholder="Your name"
                />
                {!isValidName && trimmedDraft.length > 0 && (
                  <p className="mt-2 text-xs text-red-400 font-semibold">
                    Name must be 2–50 characters.
                  </p>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 text-muted text-sm font-medium mb-4">
                <Mail size={14} />
                <span>{user?.email ?? ''}</span>
            </div>

            <div className="flex gap-2">
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    {profile?.is_premium ? 'Premium' : 'Free'}
                </span>
            </div>

            {isEditingName && (
              <div className="w-full mt-4">
                <button
                  type="button"
                  onClick={saveName}
                  disabled={!isDirty || !isValidName || isSavingName}
                  className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-extrabold text-black disabled:opacity-60"
                >
                  {isSavingName ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Onboarding Trigger */}
      <section className="mb-8">
        <div 
            onClick={() => onNavigate && onNavigate('onboarding')}
            className="bg-gradient-to-r from-surface to-[#1a1a1a] p-1 rounded-3xl cursor-pointer group hover:scale-[1.01] transition-transform"
        >
            <div className="bg-[#141414] rounded-[1.3rem] p-5 border border-white/5 flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <UserPlus size={80} />
                </div>
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-black shadow-lg shadow-primary/20">
                        <Sparkles size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h4 className="font-extrabold text-white text-lg leading-none mb-1">Setup Player Profile</h4>
                        <p className="text-xs text-muted font-bold uppercase tracking-wide">Calibrate AI for your body type</p>
                    </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-colors relative z-10">
                    <ChevronRight size={16} strokeWidth={3} />
                </div>
            </div>
        </div>
      </section>

      {/* Favorite Workouts */}
      <section className="mb-8">
        <h4 className="text-lg font-bold mb-4 px-1 flex items-center gap-2">
            <Star size={18} className="text-primary" fill="currentColor" />
            Favorite Workouts
        </h4>
        <div className="space-y-3">
            {FAVORITE_WORKOUTS.map((workout) => (
                <div key={workout.id} className="bg-surface p-4 rounded-2xl border border-white/5 flex items-center justify-between group cursor-pointer hover:border-primary/30 transition-colors">
                    <div>
                        <h5 className="font-bold text-sm mb-1">{workout.title}</h5>
                        <div className="flex items-center gap-2 text-[10px] text-muted font-bold uppercase tracking-wider">
                            <span>{workout.duration}</span>
                            <span className="w-1 h-1 rounded-full bg-white/20"></span>
                            <span>{workout.intensity} Intensity</span>
                        </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-colors">
                        <ChevronRight size={16} />
                    </div>
                </div>
            ))}
        </div>
      </section>

      {/* Settings & Support */}
      <section className="mb-8">
        <h4 className="text-lg font-bold mb-4 px-1">Privacy & Support</h4>
        <div className="bg-surface rounded-3xl overflow-hidden border border-white/5">
            <button className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5 text-left">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                        <Shield size={20} />
                    </div>
                    <span className="font-bold text-sm">Privacy Policy</span>
                </div>
                <ChevronRight size={16} className="text-muted" />
            </button>
            <button className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors text-left">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center">
                        <HelpCircle size={20} />
                    </div>
                    <span className="font-bold text-sm">Help & Support</span>
                </div>
                <ChevronRight size={16} className="text-muted" />
            </button>
        </div>
      </section>

      {/* Account Actions */}
      <section>
        <div className="space-y-3">
            <button type="button" onClick={() => void signOut()} className="w-full p-4 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-white/5 transition-colors group text-left">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 text-white flex items-center justify-center group-hover:text-red-400 transition-colors">
                        <LogOut size={20} />
                    </div>
                    <span className="font-bold text-sm group-hover:text-red-400 transition-colors">Log Out</span>
                </div>
            </button>

            <button className="w-full p-4 rounded-2xl border border-red-500/10 flex items-center justify-between hover:bg-red-500/10 transition-colors group text-left">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                        <Trash2 size={20} />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-sm text-red-500">Delete Account</span>
                        <span className="text-[10px] text-muted font-medium">This action cannot be undone</span>
                    </div>
                </div>
            </button>
        </div>
      </section>

    </div>
  );
};