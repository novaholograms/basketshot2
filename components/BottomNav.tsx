import React from 'react';
import { LayoutGrid, Dumbbell, Plus, FileText, User } from 'lucide-react';
import { ViewType } from '../types';

interface BottomNavProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onNavigate }) => {
  const getIconColor = (viewName: ViewType) => {
    return currentView === viewName ? "text-primary" : "text-muted";
  };

  const getTextColor = (viewName: ViewType) => {
    return currentView === viewName ? "text-primary" : "text-muted";
  };

  const handleAddClick = () => {
    if (currentView === 'add') {
      onNavigate('home');
    } else {
      onNavigate('add');
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#141414]/90 backdrop-blur-xl border-t border-white/5 px-6 pb-8 pt-2 flex justify-between items-end z-50 h-24 max-w-md mx-auto">
      
      {/* Home */}
      <div 
        onClick={() => onNavigate('home')}
        className="flex flex-col items-center gap-1.5 flex-1 cursor-pointer group"
      >
        <LayoutGrid className={`${getIconColor('home')} group-hover:text-white transition-colors`} size={24} fill={currentView === 'home' ? "currentColor" : "none"} strokeWidth={currentView === 'home' ? 0 : 2} />
        <span className={`text-[10px] font-bold ${getTextColor('home')} group-hover:text-white uppercase tracking-wider transition-colors`}>Home</span>
      </div>

      {/* Form */}
      <div 
        onClick={() => onNavigate('form')}
        className="flex flex-col items-center gap-1.5 flex-1 cursor-pointer group"
      >
        <Dumbbell className={`${getIconColor('form')} group-hover:text-white transition-colors`} size={24} />
        <span className={`text-[10px] font-bold ${getTextColor('form')} group-hover:text-white uppercase tracking-wider transition-colors`}>Analyze</span>
      </div>

      {/* Floating Add Button */}
      <div className="relative -top-8 flex-1 flex justify-center">
        <button 
          onClick={handleAddClick}
          className={`w-16 h-16 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(249,128,6,0.4)] border-[6px] border-background active:scale-95 transition-all
            ${currentView === 'add' ? 'bg-white rotate-45' : 'bg-primary'}
          `}
        >
          <Plus className={currentView === 'add' ? 'text-black' : 'text-black'} size={32} strokeWidth={3} />
        </button>
      </div>

      {/* Workout */}
      <div 
        onClick={() => onNavigate('workout')}
        className="flex flex-col items-center gap-1.5 flex-1 cursor-pointer group"
      >
        <FileText className={`${getIconColor('workout')} group-hover:text-white transition-colors`} size={24} fill={currentView === 'workout' ? "currentColor" : "none"} strokeWidth={currentView === 'workout' ? 0 : 2} />
        <span className={`text-[10px] font-bold ${getTextColor('workout')} group-hover:text-white uppercase tracking-wider transition-colors`}>Workouts</span>
      </div>

      {/* Profile */}
      <div 
        onClick={() => onNavigate('profile')}
        className="flex flex-col items-center gap-1.5 flex-1 cursor-pointer group"
      >
        <User className={`${getIconColor('profile')} group-hover:text-white transition-colors`} size={24} fill={currentView === 'profile' ? "currentColor" : "none"} strokeWidth={currentView === 'profile' ? 0 : 2}/>
        <span className={`text-[10px] font-bold ${getTextColor('profile')} group-hover:text-white uppercase tracking-wider transition-colors`}>Profile</span>
      </div>

    </nav>
  );
};