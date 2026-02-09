import React from 'react';
import { Video, ArrowRight } from 'lucide-react';

interface ActionBannerProps {
  onClick?: () => void;
}

export const ActionBanner: React.FC<ActionBannerProps> = ({ onClick }) => {
  return (
    <section className="mt-8">
      <div 
        onClick={onClick}
        className="relative bg-surface rounded-3xl p-6 flex items-center justify-between min-h-[100px] overflow-hidden border border-white/5 group cursor-pointer hover:border-primary/30 transition-colors"
      >
        {/* Background Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none" 
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1546519638-68e109498ee3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'grayscale(100%)'
          }}
        ></div>
        
        {/* Content */}
        <div className="z-10 flex items-center gap-4">
          <div className="bg-primary/20 w-12 h-12 flex items-center justify-center rounded-full">
            <Video className="text-primary" size={24} fill="currentColor" />
          </div>
          <h2 className="text-lg font-extrabold tracking-tight">Analyze Your Shot</h2>
        </div>

        {/* Action Button */}
        <button className="z-10 bg-primary text-black w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-105 active:scale-95 shadow-lg shadow-primary/20">
          <ArrowRight size={24} strokeWidth={3} />
        </button>
      </div>
    </section>
  );
};