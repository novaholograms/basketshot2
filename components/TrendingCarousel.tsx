import React, { useState, useRef } from 'react';
import { ChevronRight, Play } from 'lucide-react';
import { PRESET_WORKOUTS } from './DrillsView';

interface TrendingCarouselProps {
  onSelect: (workout: any) => void;
}

export const TrendingCarousel: React.FC<TrendingCarouselProps> = ({ onSelect }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const length = PRESET_WORKOUTS.length;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    // Minimum distance to trigger a swipe
    const threshold = 20; 
    // Additional distance to swipe more cards (approx width of a swipe gesture for "next")
    const sensitivity = 80;

    if (Math.abs(diff) > threshold) {
      const direction = diff > 0 ? 1 : -1;
      const absDiff = Math.abs(diff);

      // Calculate how many cards to scroll
      // 1 card for passing threshold
      // +1 card for every 'sensitivity' pixels beyond threshold
      const steps = 1 + Math.floor((absDiff - threshold) / sensitivity);
      
      // Cap at 3 cards to prevent disorientation
      const clampedSteps = Math.min(steps, 3);

      setActiveIndex((prev) => {
        // Handle wrapping for positive and negative directions
        const newIndex = ((prev + clampedSteps * direction) % length + length) % length;
        return newIndex;
      });
    }
    touchStartX.current = null;
  };

  // Helper to determine position relative to active index for styling
  const getRelativePosition = (index: number) => {
    let diff = index - activeIndex;
    if (diff > length / 2) diff -= length;
    if (diff < -length / 2) diff += length;
    return diff;
  };

  return (
    <div className="mt-8 mb-4">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-lg font-bold">Trending Drills</h3>
        <span className="text-xs text-muted font-semibold cursor-pointer hover:text-white transition-colors">
            Swipe
        </span>
      </div>

      <div 
        className="relative h-[240px] w-full flex items-center justify-center overflow-hidden touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {PRESET_WORKOUTS.map((workout, index) => {
          const position = getRelativePosition(index);
          const isCenter = position === 0;
          const isLeft = position === -1;
          const isRight = position === 1;

          // Animations and positioning
          let styleClass = "opacity-0 scale-75 z-0 translate-x-0 pointer-events-none"; // Hidden default
          
          if (isCenter) {
            styleClass = "opacity-100 scale-100 z-30 translate-x-0 shadow-2xl border-primary/30";
          } else if (isLeft) {
            styleClass = "opacity-40 scale-90 z-20 -translate-x-[90%] blur-[1px]";
          } else if (isRight) {
            styleClass = "opacity-40 scale-90 z-20 translate-x-[90%] blur-[1px]";
          } 
          // Special case for infinite loop visual continuity
          else if (position === -2 || (activeIndex === 0 && index === length - 2) || (activeIndex === 1 && index === length - 1)) {
             styleClass = "opacity-0 scale-75 z-0 -translate-x-[180%]";
          }
          else if (position === 2 || (activeIndex === length - 1 && index === 1) || (activeIndex === length - 2 && index === 0)) {
             styleClass = "opacity-0 scale-75 z-0 translate-x-[180%]";
          }

          return (
            <div
              key={index}
              onClick={() => isCenter && onSelect(workout)}
              className={`absolute w-[80%] h-full rounded-3xl overflow-hidden border border-white/10 bg-[#1a1a1a] transition-all duration-500 ease-out cursor-pointer ${styleClass}`}
            >
              {/* Image Layer - z-0 */}
              <img 
                src={workout.image} 
                alt={workout.title}
                className="absolute inset-0 w-full h-full object-cover z-0"
              />
              
              {/* Gradient Overlay - z-10 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10"></div>
              
              {/* Content - z-20 */}
              <div className="absolute top-4 right-4 z-20">
                 <span className="bg-primary text-black text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                    Trending
                 </span>
              </div>

              <div className="absolute bottom-0 left-0 p-6 w-full z-20">
                <div className="flex gap-2 mb-2">
                    <span className="text-[10px] bg-white/20 backdrop-blur-md text-white font-bold px-2 py-0.5 rounded-full inline-block">
                    {workout.duration}
                    </span>
                    <span className="text-[10px] bg-white/20 backdrop-blur-md text-white font-bold px-2 py-0.5 rounded-full inline-block">
                    {workout.intensity}
                    </span>
                </div>
                <h4 className="text-2xl font-extrabold leading-tight mb-2 drop-shadow-md">{workout.title}</h4>
                
                {isCenter && (
                    <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wide mt-1 animate-pulse">
                        <span>Start Now</span>
                        <ChevronRight size={16} strokeWidth={3} />
                    </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};