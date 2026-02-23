import React, { useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRevenueCat } from '../contexts/RevenueCatContext';
import { RevenueCatUI } from '@revenuecat/purchases-capacitor-ui';
import { Settings, Shield, HelpCircle, LogOut, Trash2, ChevronRight, Star, Mail, Edit2, UserPlus, Sparkles, CreditCard, FileText, Camera as CameraIcon, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ViewType } from '../types';
import { deleteUserAccount } from '../services/deleteAccountService';
import { openExternalUrl } from '../lib/openExternalUrl';
import { uploadAvatar } from '../utils/avatarUpload';

const LEGAL_BASE_URL = import.meta.env.VITE_LEGAL_BASE_URL || 'https://basketshotai.com';
const openLegal = (hash: 'privacy' | 'terms' | 'support') =>
  openExternalUrl(`${LEGAL_BASE_URL}/#${hash}`);

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

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80";

export const ProfileView: React.FC<ProfileViewProps> = ({ onNavigate }) => {
  const { user, profile, signOut, updateProfile } = useAuth();
  const { isPremium, customerInfo } = useRevenueCat();
  const currentName = useMemo(() => (profile?.full_name ?? '').trim(), [profile?.full_name]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const userId = user?.id ?? null;
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const avatarSrc = localAvatarUrl || profile?.avatar_url || FALLBACK_AVATAR;

  async function setAvatarFromDataUrl(dataUrl: string) {
    if (!user?.id) return;
    setIsUploadingAvatar(true);
    try {
      const publicUrl = await uploadAvatar(user.id, dataUrl);
      setLocalAvatarUrl(`${publicUrl}?t=${Date.now()}`);
      await updateProfile({ avatar_url: publicUrl });
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handlePickAvatar() {
    if (!user?.id || isUploadingAvatar) return;

    if (Capacitor.isNativePlatform()) {
      try {
        const photo = await CapCamera.getPhoto({
          source: CameraSource.Prompt,
          resultType: CameraResultType.DataUrl,
          quality: 80,
        });
        if (photo?.dataUrl) await setAvatarFromDataUrl(photo.dataUrl);
      } catch {
        // user cancelled
      }
      return;
    }

    fileInputRef.current?.click();
  }

  async function handleWebFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result ?? "");
      if (dataUrl.startsWith("data:")) await setAvatarFromDataUrl(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const canConfirmDelete = deleteText === 'DELETE';

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

  const handleManageSubscription = async () => {
    try {
      await RevenueCatUI.presentCustomerCenter();
    } catch (err: any) {
      console.error('Failed to open Customer Center:', err);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (!userId) return;
    if (!canConfirmDelete) return;

    try {
      setIsDeleting(true);

      await deleteUserAccount(userId);

      try {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) keys.push(k);
        }
        keys.forEach((k) => {
          if (k.includes(userId)) localStorage.removeItem(k);
        });
      } catch {}

      await signOut();

      window.location.reload();
    } catch (e) {
      console.error('[profile] delete account failed:', e);
      alert('Could not delete account. Please try again.');
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
      setDeleteText('');
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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleWebFileChange}
              />
              <button
                type="button"
                onClick={() => void handlePickAvatar()}
                disabled={!user?.id || isUploadingAvatar}
                className="relative w-24 h-24 rounded-full p-1 border-2 border-primary/50 focus:outline-none disabled:opacity-60"
                aria-label="Change profile photo"
              >
                <img
                  src={avatarSrc}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
                />
                <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center shadow-lg shadow-primary/20 border border-black/10">
                  {isUploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CameraIcon className="h-4 w-4" />
                  )}
                </span>
              </button>
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
                    {isPremium ? 'BasketShot Pro' : 'Free'}
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

      {/* Subscription Management */}
      {isPremium && (
        <section className="mb-8">
          <h4 className="text-lg font-bold mb-4 px-1 flex items-center gap-2">
            <CreditCard size={18} className="text-primary" />
            Subscription
          </h4>
          <div className="bg-surface rounded-3xl overflow-hidden border border-white/5">
            <button
              onClick={handleManageSubscription}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <CreditCard size={20} />
                </div>
                <div>
                  <span className="font-bold text-sm block">Manage Subscription</span>
                  <span className="text-xs text-muted font-medium">View plans, billing & more</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted" />
            </button>
          </div>
        </section>
      )}

      {/* Settings & Support */}
      <section className="mb-8">
        <h4 className="text-lg font-bold mb-4 px-1">Privacy & Support</h4>
        <div className="bg-surface rounded-3xl overflow-hidden border border-white/5">
            <button
              onClick={() => openLegal('privacy')}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5 text-left"
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <Shield size={20} />
                    </div>
                    <span className="font-bold text-sm">Privacy Policy</span>
                </div>
                <ChevronRight size={16} className="text-muted" />
            </button>
            <button
              onClick={() => openLegal('terms')}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5 text-left"
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <FileText size={20} />
                    </div>
                    <span className="font-bold text-sm">Terms of Service</span>
                </div>
                <ChevronRight size={16} className="text-muted" />
            </button>
            <button
              onClick={() => openLegal('support')}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors text-left"
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
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

            <button
              type="button"
              onClick={() => setIsDeleteOpen(true)}
              disabled={!userId}
              className="w-full p-4 rounded-2xl border border-red-500/10 flex items-center justify-between hover:bg-red-500/10 transition-colors group text-left disabled:opacity-60 disabled:cursor-not-allowed"
            >
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


      {isDeleteOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-black/90 p-5">
            <div className="text-lg font-bold">Delete account?</div>
            <div className="mt-2 text-sm text-white/70">
              This cannot be undone. All your data will be permanently deleted.
            </div>

            <div className="mt-4 text-xs font-semibold text-white/80">Type DELETE to confirm</div>
            <input
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="DELETE"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none"
              autoFocus
              disabled={isDeleting}
            />

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isDeleting) return;
                  setIsDeleteOpen(false);
                  setDeleteText('');
                }}
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold disabled:opacity-60"
                disabled={isDeleting}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleConfirmDeleteAccount()}
                disabled={!canConfirmDelete || isDeleting}
                className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
                style={{ background: '#ef4444' }}
              >
                {isDeleting ? 'Deleting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};