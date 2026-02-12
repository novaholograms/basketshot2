import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ViewType } from '../types';
import { ChevronLeft, ChevronRight, Check, Ruler, Weight, Activity, User, Target, Zap, Trophy, Briefcase, ArrowRight } from 'lucide-react';

interface OnboardingViewProps {
  onNavigate: (view: ViewType) => void;
}

const STEPS = [
  { id: 'name', title: 'Name' },
  { id: 'height', title: 'Height' },
  { id: 'weight', title: 'Weight' },
  { id: 'wingspan', title: 'Wingspan' },
  { id: 'position', title: 'Position' },
  { id: 'level', title: 'Level' },
  { id: 'attributes', title: 'Attributes' },
  { id: 'improvements', title: 'Focus Areas' },
  { id: 'usage', title: 'Goals' },
];

const ATTRIBUTES_LIST = [
  'Shooter', 
  'Slasher', 
  'Playmaker', 
  'Lockdown Defender', 
  'Rim Protector', 
  'Rebounder', 
  'High IQ', 
  'Athletic', 
  'Mid-range Specialist'
];

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onNavigate }) => {
  const { updateProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);

  // Unit State
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [wingspanUnit, setWingspanUnit] = useState<'cm' | 'ft'>('cm');

  // Form State (Internal storage is Metric)
  const [fullName, setFullName] = useState('');
  const [height, setHeight] = useState(180); // cm
  const [weight, setWeight] = useState(75); // kg
  const [wingspan, setWingspan] = useState(185); // cm

  const [position, setPosition] = useState<string>('');
  const [level, setLevel] = useState<string>('');

  const [attributes, setAttributes] = useState<string[]>([]);
  const [improvements, setImprovements] = useState<string[]>([]);
  const [usage, setUsage] = useState<string>('');

  // --- Converters ---
  const toLbs = (kg: number) => Math.round(kg * 2.20462);
  const fromLbs = (lbs: number) => Math.round(lbs / 2.20462);

  const formatLength = (valCm: number, unit: 'cm' | 'ft', colorClass: string) => {
    if (unit === 'cm') {
      return (
        <span className="text-6xl font-black text-white tracking-tighter">
          {valCm}
          <span className={`text-2xl ${colorClass} ml-1`}>cm</span>
        </span>
      );
    } else {
      const totalInches = Math.round(valCm / 2.54);
      const feet = Math.floor(totalInches / 12);
      const inches = totalInches % 12;
      return (
        <span className="text-6xl font-black text-white tracking-tighter">
          {feet}'{inches}"
          <span className={`text-2xl ${colorClass} ml-1`}>ft</span>
        </span>
      );
    }
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      const n = fullName.trim();
      if (n.length < 2 || n.length > 50) return;
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      const toNum = (v: any) => {
        const n = Number(String(v).replace(",", ".").trim());
        return Number.isFinite(n) ? n : null;
      };

      const onboarding_data = {
        name: fullName.trim(),
        height_cm: height,
        weight_kg: weight,
        wingspan_cm: wingspan,
        position,
        level,
        attributes,
        improvements,
        usage,
        units: { heightUnit, weightUnit, wingspanUnit },
        completed_at: new Date().toISOString(),
      };

      const res = await updateProfile({
        onboarding_data,
        full_name: fullName.trim() || null,
        height_cm: toNum(height),
        weight_kg: toNum(weight),
        wingspan_cm: toNum(wingspan),
      });

      if (res.ok === true) {
        onNavigate('onboarding-shot-analysis');
      } else {
        console.error('[ONBOARDING] updateProfile error:', res.error);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      onNavigate('profile');
    }
  };

  const toggleSelection = (item: string, currentList: string[], setter: (val: string[]) => void) => {
    if (currentList.includes(item)) {
      setter(currentList.filter(i => i !== item));
    } else {
      setter([...currentList, item]);
    }
  };

  // --- Render Steps ---

  const renderNameStep = () => {
    const value = fullName;
    const trimmed = value.trim();
    const isValid = trimmed.length >= 2 && trimmed.length <= 50;

    return (
      <div className="space-y-10 animate-in slide-in-from-right duration-500">
        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <User size={32} />
          </div>
          <h2 className="text-3xl font-extrabold mb-2">What&apos;s your name?</h2>
          <p className="text-muted text-sm">This will personalize your experience.</p>
        </div>

        <div className="space-y-4 px-4">
          <input
            type="text"
            value={value}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={50}
            placeholder="Your name"
            className="w-full rounded-2xl bg-surface border border-white/10 px-4 py-3 text-base font-semibold outline-none focus:border-primary transition-colors"
          />

          {!isValid && trimmed.length > 0 && (
            <p className="text-xs text-red-400 font-semibold">Name must be 2–50 characters.</p>
          )}
        </div>
      </div>
    );
  };

  const renderUnitToggle = (current: string, setUnit: (u: any) => void, opt1: string, opt2: string) => (
    <div className="flex bg-surface rounded-full p-1 border border-white/10 w-fit mx-auto mb-6">
      <button 
        onClick={() => setUnit(opt1)}
        className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-all ${current === opt1 ? 'bg-white text-black' : 'text-muted hover:text-white'}`}
      >
        {opt1}
      </button>
      <button 
        onClick={() => setUnit(opt2)}
        className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-all ${current === opt2 ? 'bg-white text-black' : 'text-muted hover:text-white'}`}
      >
        {opt2}
      </button>
    </div>
  );

  const renderHeightStep = () => {
    const min = 120;
    const max = 230;

    return (
      <div className="space-y-10 animate-in slide-in-from-right duration-500">
        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <Ruler size={32} />
          </div>
          <h2 className="text-3xl font-extrabold mb-2">How tall are you?</h2>
          <p className="text-muted text-sm">This helps analyze release height.</p>
        </div>

        {renderUnitToggle(heightUnit, setHeightUnit, 'cm', 'ft')}

        <div className="space-y-8 px-4">
           <div className="text-center">
              {formatLength(height, heightUnit, 'text-primary')}
           </div>

           <input 
            type="range" 
            min={min} 
            max={max} 
            value={height} 
            onChange={(e) => setHeight(parseInt(e.target.value))}
            className="w-full h-4 bg-surface rounded-full appearance-none cursor-pointer accent-primary hover:accent-primary/80"
          />
        </div>
      </div>
    );
  };

  const renderWeightStep = () => {
    const isKg = weightUnit === 'kg';
    const displayVal = isKg ? weight : toLbs(weight);
    const min = isKg ? 40 : 88;
    const max = isKg ? 200 : 440;

    return (
      <div className="space-y-10 animate-in slide-in-from-right duration-500">
        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Weight size={32} />
          </div>
          <h2 className="text-3xl font-extrabold mb-2">What's your weight?</h2>
          <p className="text-muted text-sm">Calibrating for physical intensity.</p>
        </div>

        {renderUnitToggle(weightUnit, setWeightUnit, 'kg', 'lb')}

        <div className="space-y-8 px-4">
           <div className="text-center">
              <span className="text-6xl font-black text-white tracking-tighter">
                {displayVal}
                <span className="text-2xl text-blue-500 ml-1">{weightUnit}</span>
              </span>
           </div>

           <input 
            type="range" 
            min={min} 
            max={max} 
            value={displayVal} 
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setWeight(isKg ? val : fromLbs(val));
            }}
            className="w-full h-4 bg-surface rounded-full appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
          />
        </div>
      </div>
    );
  };

  const renderWingspanStep = () => {
    const min = 120;
    const max = 250;

    return (
      <div className="space-y-10 animate-in slide-in-from-right duration-500">
        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-purple-500/20 text-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Activity size={32} />
          </div>
          <h2 className="text-3xl font-extrabold mb-2">Your Wingspan?</h2>
          <p className="text-muted text-sm">Crucial for defensive reach and shooting.</p>
        </div>

        {renderUnitToggle(wingspanUnit, setWingspanUnit, 'cm', 'ft')}

        <div className="space-y-8 px-4">
           <div className="text-center">
              {formatLength(wingspan, wingspanUnit, 'text-purple-500')}
           </div>

           <input 
            type="range" 
            min={min} 
            max={max} 
            value={wingspan} 
            onChange={(e) => setWingspan(parseInt(e.target.value))}
            className="w-full h-4 bg-surface rounded-full appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400"
          />
        </div>
      </div>
    );
  };

  const renderPositionStep = () => (
    <div className="space-y-4 animate-in slide-in-from-right duration-500 pt-2">
       <div className="text-center mb-4">
        <div className="w-14 h-14 bg-white/10 text-white rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={24} />
        </div>
        <h2 className="text-2xl font-extrabold mb-1">Your Position?</h2>
        <p className="text-muted text-xs">Where do you operate on the floor?</p>
      </div>

      {/* COMPACTED FOR NO SCROLL */}
      <div className="grid grid-cols-1 gap-2.5">
        {['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'].map((pos) => (
          <button
            key={pos}
            onClick={() => setPosition(pos)}
            className={`p-4 rounded-xl font-bold text-sm border transition-all flex items-center justify-between group ${
              position === pos 
                ? 'bg-white text-black border-white shadow-xl scale-[1.01]' 
                : 'bg-surface text-muted border-white/5 hover:bg-white/5'
            }`}
          >
            {pos}
            {position === pos && <Check size={18} className="text-black" strokeWidth={3} />}
          </button>
        ))}
      </div>
    </div>
  );

  const renderLevelStep = () => (
    <div className="space-y-8 animate-in slide-in-from-right duration-500">
       <div className="text-center mb-8">
        <div className="w-16 h-16 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy size={32} />
        </div>
        <h2 className="text-3xl font-extrabold mb-2">Competition Level</h2>
        <p className="text-muted text-sm">Helps us set the difficulty.</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {['Rookie', 'High School', 'College / Uni', 'Professional'].map((lvl) => (
          <button
            key={lvl}
            onClick={() => setLevel(lvl)}
            className={`p-5 rounded-2xl font-bold text-lg border transition-all flex items-center justify-between group ${
              level === lvl
                ? 'bg-yellow-500 text-black border-yellow-500 shadow-xl scale-[1.02]' 
                : 'bg-surface text-muted border-white/5 hover:bg-white/5'
            }`}
          >
            {lvl}
            {level === lvl && <Check size={20} className="text-black" strokeWidth={3} />}
          </button>
        ))}
      </div>
    </div>
  );

  const renderAttributesStep = () => (
    <div className="space-y-8 animate-in slide-in-from-right duration-500">
       <div className="text-center mb-6">
        <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Zap size={32} />
        </div>
        <h2 className="text-3xl font-extrabold mb-2">Top Attributes</h2>
        <p className="text-muted text-sm">Select your strengths (Multiple).</p>
      </div>

      {/* CHANGED TO GRID FOR BETTER PLACEMENT */}
      <div className="grid grid-cols-2 gap-3">
        {ATTRIBUTES_LIST.map((attr) => (
          <button
            key={attr}
            onClick={() => toggleSelection(attr, attributes, setAttributes)}
            className={`px-2 py-3.5 rounded-xl font-bold text-xs border-2 transition-all flex items-center justify-center text-center leading-tight ${
              attributes.includes(attr)
                ? 'bg-red-500 text-white border-red-500 shadow-md' 
                : 'bg-surface text-muted border-white/5 hover:border-white/20'
            }`}
          >
            {attr}
          </button>
        ))}
      </div>
    </div>
  );

  const renderImprovementsStep = () => (
    <div className="space-y-8 animate-in slide-in-from-right duration-500">
       <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Target size={32} />
        </div>
        <h2 className="text-3xl font-extrabold mb-2">Focus Areas</h2>
        <p className="text-muted text-sm">What do you want to improve?</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {['Shooting Consistency', 'Ball Handling', 'Defense', 'Speed & Agility', 'Vertical Jump', 'Court Vision'].map((imp) => (
          <button
            key={imp}
            onClick={() => toggleSelection(imp, improvements, setImprovements)}
            className={`p-4 rounded-2xl font-bold text-xs border transition-all flex flex-col items-center text-center justify-center gap-2 h-24 ${
              improvements.includes(imp)
                ? 'bg-green-500 text-black border-green-500' 
                : 'bg-surface text-muted border-white/5 hover:bg-white/5'
            }`}
          >
            {imp}
            {improvements.includes(imp) && <Check size={16} />}
          </button>
        ))}
      </div>
    </div>
  );

  const renderUsageStep = () => (
    <div className="space-y-4 animate-in slide-in-from-right duration-500 pt-2">
      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase size={24} />
        </div>
        <h2 className="text-2xl font-extrabold mb-1">Primary Goal</h2>
        <p className="text-muted text-xs">How can BasketShot help you?</p>
      </div>

      {/* COMPACTED FOR NO SCROLL */}
      <div className="space-y-3">
        {[
          { id: 'training', label: 'Structured Training', desc: 'Daily workout plans.' },
          { id: 'analysis', label: 'Shot Analysis', desc: 'Fix my shooting form.' },
          { id: 'coaching', label: 'Coaching Tool', desc: 'I train others.' },
          { id: 'casual', label: 'Just for Fun', desc: 'Casual play with friends.' }
        ].map((opt) => (
          <button
            key={opt.id}
            onClick={() => setUsage(opt.id)}
            className={`w-full p-4 rounded-2xl text-left border transition-all group ${
              usage === opt.id
                ? 'bg-surface border-primary ring-1 ring-primary' 
                : 'bg-surface border-white/5 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <h4 className={`font-bold text-base ${usage === opt.id ? 'text-primary' : 'text-white'}`}>{opt.label}</h4>
              {usage === opt.id && <div className="bg-primary text-black rounded-full p-0.5"><Check size={12} strokeWidth={4} /></div>}
            </div>
            <p className="text-xs text-muted font-medium">{opt.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-white flex flex-col p-6 max-w-md mx-auto">
      
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={handleBack}
          className="w-10 h-10 rounded-full bg-surface border border-white/10 flex items-center justify-center hover:bg-white/10"
        >
          <ChevronLeft size={20} />
        </button>
        
        {/* Step Counter */}
        <div className="text-xs font-bold text-muted uppercase tracking-widest bg-surface px-3 py-1 rounded-full border border-white/5">
            Step {currentStep + 1} / {STEPS.length}
        </div>
        
        <div className="w-10" /> 
      </div>

      {/* Progress Bar Line */}
      <div className="w-full h-1 bg-surface rounded-full mb-8 overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
      </div>

      {/* Content Area */}
      <div className="flex-1 pb-24">
        {currentStep === 0 && renderNameStep()}
        {currentStep === 1 && renderHeightStep()}
        {currentStep === 2 && renderWeightStep()}
        {currentStep === 3 && renderWingspanStep()}
        {currentStep === 4 && renderPositionStep()}
        {currentStep === 5 && renderLevelStep()}
        {currentStep === 6 && renderAttributesStep()}
        {currentStep === 7 && renderImprovementsStep()}
        {currentStep === 8 && renderUsageStep()}
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-8 left-0 right-0 px-6 max-w-md mx-auto z-10">
        <button
          onClick={handleNext}
          className="w-full bg-primary text-black font-extrabold text-lg py-5 rounded-3xl shadow-[0_0_20px_rgba(249,128,6,0.3)] hover:bg-primary/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {currentStep === STEPS.length - 1 ? 'Finish Profile' : 'Next Step'}
          <ArrowRight size={20} strokeWidth={3} />
        </button>
      </div>

    </div>
  );
};