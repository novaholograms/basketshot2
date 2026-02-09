import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subValue?: string;
  highlight?: boolean;
  fullWidth?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  label, 
  value, 
  unit, 
  subValue, 
  highlight = false,
  fullWidth = false
}) => {
  return (
    <div 
      className={`
        bg-surface rounded-3xl p-8 border border-white/5 flex flex-col items-center text-center justify-center
        ${fullWidth ? 'col-span-2' : 'col-span-1'}
      `}
    >
      <p className="text-xs text-muted font-extrabold uppercase tracking-[0.2em] mb-3">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className={`font-extrabold tracking-tighter ${highlight ? 'text-7xl sm:text-8xl' : 'text-5xl'}`}>
          {value}
        </span>
        {unit && (
          <span className={`text-primary font-bold ${highlight ? 'text-4xl' : 'text-xl'}`}>
            {unit}
          </span>
        )}
        {subValue && (
          <span className="text-primary text-xl font-bold ml-1">
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
};