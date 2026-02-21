import React from 'react';
import { BookOpen, Dumbbell } from 'lucide-react';
import { ViewType } from '../types';

interface AddViewProps {
  onNavigate: (view: ViewType) => void;
}

export const AddView: React.FC<AddViewProps> = ({ onNavigate }) => {
  return (
    <div className="flex flex-col h-full pt-6 pb-28 animate-in zoom-in-95 fade-in duration-300 px-4">
      
      {/* Centered Header */}
      <div className="text-center mb-6">
         <h2 className="text-3xl font-extrabold tracking-tight mb-2">Start Session</h2>
         <p className="text-muted text-sm font-medium">Choose your training mode</p>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full">
        {/* Analyze Form Option */}
        <button
            onClick={() => onNavigate('form')}
            className="relative w-full h-[420px] rounded-[2rem] overflow-hidden group active:scale-[0.98] transition-all text-left border border-white/10 hover:border-primary/50 shadow-2xl"
        >
            <img
                src="https://images.unsplash.com/photo-1505666287802-931dc83948e9?auto=format&fit=crop&w=800&q=80"
                alt="Analyze Form"
                className="absolute inset-0 w-full h-full object-cover object-top opacity-80 group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 p-5 w-full z-10 flex flex-col items-center text-center pb-8">
                <h3 className="text-2xl font-extrabold leading-none mb-2 text-white drop-shadow-lg">Analyze<br/>Form</h3>
                <p className="text-xs text-primary font-black uppercase tracking-widest drop-shadow-md">AI Analysis</p>
            </div>
        </button>

        {/* Practice Workouts Option */}
        <button
            onClick={() => onNavigate('workout')}
            className="relative w-full h-[420px] rounded-[2rem] overflow-hidden group active:scale-[0.98] transition-all text-left border border-white/10 hover:border-primary/50 shadow-2xl"
        >
            <img
                src="https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?auto=format&fit=crop&w=800&q=80"
                alt="Practice Workouts"
                className="absolute inset-0 w-full h-full object-cover object-center opacity-80 group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 p-5 w-full z-10 flex flex-col items-center text-center pb-8">
                <h3 className="text-2xl font-extrabold leading-none mb-2 text-white drop-shadow-lg">Practice<br/>Workouts</h3>
                <p className="text-xs text-primary font-black uppercase tracking-widest drop-shadow-md">Training Plans</p>
            </div>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full mt-4">
     
      </div>
    </div>
  );
};