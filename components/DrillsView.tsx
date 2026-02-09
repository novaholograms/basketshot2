import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Play, ChevronRight, Loader2, Bot, Timer, Zap, X, ArrowLeft, Clock, Activity, CheckCircle2, Pause, SkipBack, SkipForward, Info, MoreHorizontal, Edit2, Trash2, Plus, Save, AlertTriangle, Filter, Trophy, Target, BarChart3 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

export const PRESET_WORKOUTS = [
  {
    title: "3-Point Shooting",
    image: "https://images.unsplash.com/photo-1546519638-68e109498ee3?auto=format&fit=crop&w=600&q=80",
    duration: "20 min",
    intensity: "High",
    category: "Shooting"
  },
  {
    title: "Weak Hand",
    image: "https://images.unsplash.com/photo-1533596773223-9366ebf0945a?auto=format&fit=crop&w=600&q=80",
    duration: "15 min",
    intensity: "Med",
    category: "Dribbling"
  },
  {
    title: "Handles",
    image: "https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?auto=format&fit=crop&w=600&q=80",
    duration: "30 min",
    intensity: "High",
    category: "Dribbling"
  },
  {
    title: "Dunking",
    image: "https://images.unsplash.com/photo-1509027572446-af8401acfdc3?auto=format&fit=crop&w=600&q=80",
    duration: "45 min",
    intensity: "High",
    category: "Finishing"
  },
  {
    title: "Layups",
    image: "https://images.unsplash.com/photo-1505666287802-931dc83948e9?auto=format&fit=crop&w=600&q=80",
    duration: "10 min",
    intensity: "Low",
    category: "Finishing"
  },
  {
    title: "Mid-Range",
    image: "https://images.unsplash.com/photo-1519861531473-92002639313a?auto=format&fit=crop&w=600&q=80",
    duration: "25 min",
    intensity: "Med",
    category: "Shooting"
  }
];

const INTENSITIES = ['Low', 'Med', 'High'];
const CATEGORIES = ['All', 'Shooting', 'Dribbling', 'Finishing', 'Defense'];
const DURATION_FILTERS = ['All', '< 15m', '15-30m', '> 30m'];

interface DrillStep {
  name: string;
  duration: number; // in minutes
  type: 'warmup' | 'drill' | 'cooldown';
  description: string;
}

interface WorkoutDetail {
  title: string;
  image: string;
  totalDuration: number; // in minutes
  intensity: string;
  category: string;
  steps: DrillStep[];
  targetShots?: number;
}

interface DrillsViewProps {
  onWorkoutComplete?: (data: { title: string; shotsMade?: number; shotsAttempted?: number; duration: number }) => void;
  initialWorkout?: any | null;
}

export const DrillsView: React.FC<DrillsViewProps> = ({ onWorkoutComplete, initialWorkout }) => {
  // Navigation States
  const [showGenerator, setShowGenerator] = useState(false);
  const [activeWorkout, setActiveWorkout] = useState<WorkoutDetail | null>(null);
  const [showAllWorkouts, setShowAllWorkouts] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Filter States
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterDuration, setFilterDuration] = useState('All');
  const [filterIntensity, setFilterIntensity] = useState('All');

  // Drill Session States
  const [activeDrillIndex, setActiveDrillIndex] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showDrillInfo, setShowDrillInfo] = useState(false);
  const [isWorkoutComplete, setIsWorkoutComplete] = useState(false);

  // Workout Stats Input
  const [shotsMade, setShotsMade] = useState<string>('');
  const [shotsAttempted, setShotsAttempted] = useState<string>('');

  // Edit Mode States
  const [newDrillName, setNewDrillName] = useState('');
  const [newDrillDuration, setNewDrillDuration] = useState('5');

  // AI Generator States
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(30); 
  const [intensity, setIntensity] = useState('Med');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedWorkout, setGeneratedWorkout] = useState<string | null>(null);

  // Chart State
  const [chartVisible, setChartVisible] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(5); // Default to Saturday (high score)

  // Mock Progress Data
  const WEEKLY_STATS = [
    { day: 'M', score: 68, fullDay: 'Monday' },
    { day: 'T', score: 74, fullDay: 'Tuesday' },
    { day: 'W', score: 55, fullDay: 'Wednesday' },
    { day: 'T', score: 82, fullDay: 'Thursday' },
    { day: 'F', score: 65, fullDay: 'Friday' },
    { day: 'S', score: 91, fullDay: 'Saturday' },
    { day: 'S', score: 78, fullDay: 'Sunday' },
  ];

  // --- Helpers for Workout Logic ---

  const generateWorkoutPlan = (title: string, durationStr: string, image: string, intensity: string, category: string = 'General'): WorkoutDetail => {
    const totalMin = parseInt(durationStr);
    
    // Logic to distribute time: 15% Warmup, 70% Drills, 15% Cooldown
    const warmupTime = Math.max(2, Math.round(totalMin * 0.15));
    const cooldownTime = Math.max(2, Math.round(totalMin * 0.15));
    const mainTime = totalMin - warmupTime - cooldownTime;
    
    // Split main time into 2 or 3 drills depending on length
    const drillCount = mainTime >= 15 ? 3 : 2;
    const drillTime = Math.floor(mainTime / drillCount);

    const steps: DrillStep[] = [];

    // 1. Warmup
    steps.push({
      name: "Dynamic Warm-up",
      duration: warmupTime,
      type: 'warmup',
      description: "Light jogging, high knees, and dynamic stretching to activate muscles."
    });

    // 2. Main Drills
    for (let i = 1; i <= drillCount; i++) {
      let drillName = `${title} Phase ${i}`;
      let desc = "Focus on form and consistency.";
      
      if (title.includes("Shooting")) {
        drillName = i === 1 ? "Form Shooting" : i === 2 ? "Spot Up Shooting" : "Game Speed Shots";
        desc = i === 1 ? "One hand form shots near rim." : "Catch and shoot from 5 spots.";
      } else if (title.includes("Handles") || title.includes("Dribbling") || title.includes("Weak Hand")) {
        drillName = i === 1 ? "Stationary Dribbling" : i === 2 ? "Moving Crossovers" : "Cone Weave";
        desc = "Keep eyes up and pound the ball hard.";
      } else if (category === "Finishing") {
        drillName = i === 1 ? "Mikan Drill" : i === 2 ? "Euro Steps" : "Contact Finishes";
        desc = "Focus on footwork and protecting the ball.";
      }

      steps.push({
        name: drillName,
        duration: drillTime,
        type: 'drill',
        description: desc
      });
    }

    // 3. Cooldown
    steps.push({
      name: "Free Throws & Stretch",
      duration: cooldownTime,
      type: 'cooldown',
      description: "10 made free throws followed by static stretching."
    });

    // Calculate Target Shots if Shooting Category
    let targetShots: number | undefined;
    if (category === 'Shooting' || category === 'Finishing' || title.toLowerCase().includes('shoot')) {
        targetShots = Math.round(totalMin * 5); // Example: 20 min -> 100 shots
    }

    return {
      title,
      image,
      totalDuration: totalMin,
      intensity,
      category,
      steps,
      targetShots
    };
  };

  const getDrillDetails = (drillName: string) => {
    const nameLower = drillName.toLowerCase();
    
    if (nameLower.includes("shooting") || nameLower.includes("shot") || nameLower.includes("free throw")) {
        return {
            instructions: [
                "Position yourself at the line with your feet shoulder-width apart.",
                "Keep your elbow tucked in and align it with the basket.",
                "Focus on the rim, not the ball or backboard.",
                "Follow through with a flick of your wrist, hand in the cookie jar."
            ],
            tips: [
                "Ensure your knees are slightly bent for power generation.",
                "Maintain a consistent rhythm for every shot."
            ],
            caution: "Do not tense your shoulders; keep them relaxed to avoid strain."
        };
    } else if (nameLower.includes("dribble") || nameLower.includes("handles") || nameLower.includes("crossover")) {
        return {
            instructions: [
                "Keep your knees bent and chest up, eyes looking forward.",
                "Pound the ball hard into the floor to maintain control.",
                "Use your fingertips, not your palm, to control the ball.",
                "Protect the ball with your off-hand (arm bar)."
            ],
            tips: [
                "Change speeds to catch defenders off guard.",
                "Practice with your weak hand just as much as your strong hand."
            ],
            caution: "Don't look down at the ball; learn to feel the dribble."
        };
    } else if (nameLower.includes("warm") || nameLower.includes("stretch")) {
        return {
            instructions: [
                "Start with slow movements and gradually increase intensity.",
                "Focus on dynamic stretching rather than static holding.",
                "Engage your core and maintain proper breathing."
            ],
            tips: [
                "Listen to your body; if it hurts, stop.",
                "Use this time to mentally prepare for the session."
            ],
            caution: "Avoid bouncing while stretching cold muscles."
        };
    } else {
         return {
            instructions: [
                "Maintain an athletic stance with knees bent.",
                "Execute the movement with high intensity.",
                "Focus on quality repetitions over quantity."
            ],
            tips: [
                "Visualize the game situation for this drill.",
                "Stay balanced throughout the movement."
            ],
            caution: "Stop if you feel sharp pain."
        };
    }
  };

  const handlePresetClick = (workout: typeof PRESET_WORKOUTS[0]) => {
    const details = generateWorkoutPlan(workout.title, workout.duration, workout.image, workout.intensity, workout.category);
    setActiveWorkout(details);
    setIsEditing(false);
    setIsWorkoutComplete(false);
    setShotsMade('');
    
    // Auto-fill attempts if there is a target
    if (details.targetShots) {
        setShotsAttempted(details.targetShots.toString());
    } else {
        setShotsAttempted('');
    }
  };

  // Effect to handle deep linking from Home
  useEffect(() => {
    if (initialWorkout) {
      handlePresetClick(initialWorkout);
    }
  }, [initialWorkout]);
  
  // Effect for Chart Animation
  useEffect(() => {
    const timer = setTimeout(() => {
        setChartVisible(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleCreateCustom = () => {
    setActiveWorkout({
        title: "My Custom Plan",
        image: "https://images.unsplash.com/photo-1518407613690-d9fc996e526e?auto=format&fit=crop&w=800&q=80",
        totalDuration: 0,
        intensity: "Med",
        category: "Custom",
        steps: [],
        targetShots: undefined
    });
    setIsEditing(true);
    setIsWorkoutComplete(false);
    setShotsMade('');
    setShotsAttempted('');
  };

  const getFilteredWorkouts = () => {
    return PRESET_WORKOUTS.filter(w => {
      // Category Filter
      if (filterCategory !== 'All' && w.category !== filterCategory) return false;
      
      // Intensity Filter
      if (filterIntensity !== 'All' && w.intensity !== filterIntensity) return false;

      // Duration Filter
      const mins = parseInt(w.duration);
      if (filterDuration === '< 15m' && mins >= 15) return false;
      if (filterDuration === '15-30m' && (mins < 15 || mins > 30)) return false;
      if (filterDuration === '> 30m' && mins <= 30) return false;

      return true;
    });
  };

  // --- Edit Mode Logic ---

  const handleDeleteDrill = (indexToDelete: number) => {
    if (!activeWorkout) return;
    const updatedSteps = activeWorkout.steps.filter((_, idx) => idx !== indexToDelete);
    const newTotalDuration = updatedSteps.reduce((acc, step) => acc + step.duration, 0);
    
    setActiveWorkout({
        ...activeWorkout,
        steps: updatedSteps,
        totalDuration: newTotalDuration
    });
  };

  const handleAddDrill = () => {
    if (!activeWorkout || !newDrillName.trim()) return;
    const durationVal = parseInt(newDrillDuration) || 5;

    const newStep: DrillStep = {
        name: newDrillName,
        duration: durationVal,
        type: 'drill',
        description: "Custom added drill."
    };

    const updatedSteps = [...activeWorkout.steps];
    // Insert before cooldown if possible, otherwise at end
    const cooldownIndex = updatedSteps.findIndex(s => s.type === 'cooldown');
    if (cooldownIndex !== -1) {
        updatedSteps.splice(cooldownIndex, 0, newStep);
    } else {
        updatedSteps.push(newStep);
    }

    const newTotalDuration = updatedSteps.reduce((acc, step) => acc + step.duration, 0);

    setActiveWorkout({
        ...activeWorkout,
        steps: updatedSteps,
        totalDuration: newTotalDuration
    });

    setNewDrillName('');
    setNewDrillDuration('5');
  };

  // --- Drill Session Logic ---

  const startDrill = (index: number) => {
    if (!activeWorkout) return;
    setActiveDrillIndex(index);
    // Convert minutes to seconds for the timer
    setTimeLeft(activeWorkout.steps[index].duration * 60);
    setIsTimerRunning(true);
    setShowDrillInfo(false);
  };

  const handleNextDrill = () => {
    if (activeWorkout && activeDrillIndex !== null) {
      if (activeDrillIndex < activeWorkout.steps.length - 1) {
        startDrill(activeDrillIndex + 1);
      } else {
        // Workout Finished
        setActiveDrillIndex(null);
        setIsTimerRunning(false);
        setIsWorkoutComplete(true);
      }
    }
  };

  const handlePrevDrill = () => {
    if (activeWorkout && activeDrillIndex !== null && activeDrillIndex > 0) {
        startDrill(activeDrillIndex - 1);
    }
  };

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const finishWorkout = () => {
    if (!activeWorkout) return;

    const made = parseInt(shotsMade);
    const attempts = parseInt(shotsAttempted);

    const data = {
      title: activeWorkout.title,
      duration: activeWorkout.totalDuration,
      shotsMade: !isNaN(made) ? made : undefined,
      shotsAttempted: !isNaN(attempts) ? attempts : undefined
    };

    if (onWorkoutComplete) {
      onWorkoutComplete(data);
    }
  };

  // --- Effects ---

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);


  // --- AI Handlers ---

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setGeneratedWorkout(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Create a ${intensity} intensity basketball workout plan for exactly ${duration} minutes focusing on: ${prompt}. 
        Format as a structured markdown list:
        - **Objective**
        - **Warm-up** (Time)
        - **Workout Phase 1** (Time & Details)
        - **Workout Phase 2** (Time & Details)
        - **Cool Down**
        Keep it concise and actionable.`,
      });
      setGeneratedWorkout(response.text);
    } catch (error) {
      console.error("Error generating workout", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const closeGenerator = () => {
    setShowGenerator(false);
    setGeneratedWorkout(null);
    setPrompt('');
  };

  // --- Sub-Renderers ---

  const renderDrillInfoModal = () => {
    if (!showDrillInfo || !activeWorkout || activeDrillIndex === null) return null;
    const step = activeWorkout.steps[activeDrillIndex];
    const details = getDrillDetails(step.name);

    return (
      <div className="fixed inset-0 z-[110] bg-background animate-in slide-in-from-bottom duration-300 overflow-y-auto">
         {/* Modal Header/Animation */}
         <div className="relative w-full aspect-[16/10] bg-[#0a0a0a] flex items-center justify-center overflow-hidden border-b border-white/5">
            {/* ... Stick figure animation same as before ... */}
             <div className="w-full h-full flex items-center justify-center relative">
                <svg viewBox="0 0 400 300" className="w-64 h-64 opacity-90" style={{ overflow: 'visible' }}>
                    <ellipse cx="230" cy="240" rx="30" ry="5" fill="black" opacity="0.3" className="animate-shadow" />
                    <g stroke="#f98006" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none">
                        <path d="M180,180 L160,240" /> 
                        <path d="M220,180 L240,240" />
                        <path d="M200,180 L200,100" />
                        <circle cx="200" cy="80" r="20" strokeWidth="6" />
                        <path d="M200,110 L160,140" />
                        <g className="animate-dribble-arm" style={{ transformBox: 'fill-box', transformOrigin: 'center top' }}>
                             <path d="M200,110 L240,140 L240,170" />
                        </g>
                    </g>
                    <circle cx="240" cy="200" r="18" fill="#f98006" className="animate-bounce" />
                </svg>
            </div>
            
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none"></div>
            
            <button 
                onClick={() => setShowDrillInfo(false)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/60 z-20"
            >
                <X size={20} />
            </button>
         </div>

         {/* Content */}
         <div className="px-6 pt-4 pb-12">
            <h2 className="text-3xl font-extrabold text-primary mb-6 leading-tight">{step.name}</h2>
            {/* Instructions */}
            <div className="mb-8">
                <h3 className="text-primary font-bold text-sm uppercase tracking-widest mb-4">Instructions</h3>
                <div className="relative border-l-2 border-primary/20 ml-2.5 space-y-6 pb-2">
                    {details.instructions.map((inst, i) => (
                        <div key={i} className="relative pl-8">
                            <span className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-primary shadow-[0_0_10px_rgba(249,128,6,0.5)]"></span>
                            <p className="text-white text-base font-medium leading-relaxed">{inst}</p>
                        </div>
                    ))}
                </div>
            </div>
            {/* Tips */}
            <div className="mb-8">
                <h3 className="text-primary font-bold text-sm uppercase tracking-widest mb-4">Tips</h3>
                <div className="relative border-l-2 border-primary/20 ml-2.5 space-y-6 pb-2">
                    {details.tips.map((tip, i) => (
                        <div key={i} className="relative pl-8">
                             <span className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-primary"></span>
                             <p className="text-gray-300 text-sm font-medium leading-relaxed">{tip}</p>
                        </div>
                    ))}
                </div>
            </div>
            {/* Caution */}
            <div className="mb-8">
                <h3 className="text-primary font-bold text-sm uppercase tracking-widest mb-4">Caution</h3>
                 <div className="relative pl-10">
                     <span className="absolute left-0 top-0.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-black">
                         <AlertTriangle size={12} fill="currentColor" />
                     </span>
                     <p className="text-white text-sm font-medium leading-relaxed">{details.caution}</p>
                 </div>
            </div>
         </div>
      </div>
    );
  };

  const renderProgressChart = () => (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4 px-1">
         <h3 className="text-lg font-bold flex items-center gap-2">
            <BarChart3 size={18} className="text-primary" />
            Weekly Progress
         </h3>
         {selectedDayIndex !== null && (
            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-in fade-in">
                {WEEKLY_STATS[selectedDayIndex].fullDay}: {WEEKLY_STATS[selectedDayIndex].score > 0 ? WEEKLY_STATS[selectedDayIndex].score + '%' : 'Rest'}
            </span>
         )}
      </div>

      <div className="bg-surface rounded-3xl p-6 border border-white/5 shadow-lg pb-8">
         <div className="h-32 flex items-end justify-between gap-2">
            {WEEKLY_STATS.map((stat, index) => {
               const height = chartVisible ? Math.max(10, stat.score) : 0; // Use minimum height for interaction
               const isSelected = selectedDayIndex === index;
               
               return (
                  <div 
                    key={index} 
                    className="flex-1 flex flex-col items-center gap-2 group cursor-pointer"
                    onClick={() => setSelectedDayIndex(index)}
                  >
                     {/* Bar */}
                     <div className="relative w-full h-full flex items-end justify-center">
                         <div 
                           className={`w-full rounded-t-lg transition-all duration-700 ease-out relative ${
                               isSelected ? 'bg-primary' : 'bg-white/10 group-hover:bg-white/20'
                           }`}
                           style={{ 
                               height: `${height}%`,
                               transitionDelay: `${index * 50}ms`
                           }}
                         >
                            {/* Glow Effect for Selected */}
                            {isSelected && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-4 bg-white/30 blur-sm rounded-t-lg"></div>
                            )}
                         </div>
                     </div>
                     {/* Label */}
                     <span className={`text-[10px] font-bold uppercase transition-colors ${isSelected ? 'text-primary' : 'text-muted'}`}>
                        {stat.day}
                     </span>
                  </div>
               );
            })}
         </div>
      </div>
    </section>
  );

  const renderWorkoutList = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mt-2 px-1">
         <h3 className="text-2xl font-extrabold tracking-tight mb-2">Workouts</h3>
         <p className="text-muted text-sm font-medium">What do you want to work on today?</p>
      </div>

      <section>
        <div 
          onClick={() => setShowGenerator(true)}
          className="bg-gradient-to-r from-surface to-[#1a1a1a] rounded-3xl p-6 border border-primary/20 relative overflow-hidden group cursor-pointer hover:border-primary/50 transition-all shadow-lg hover:shadow-primary/5"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Sparkles size={100} />
          </div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(249,128,6,0.3)]">
                <Bot size={24} />
              </div>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight">Generate Workout with AI</h2>
                <p className="text-xs text-muted font-medium">Customized plans based on your needs</p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-colors">
              <Play size={18} fill="currentColor" />
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-lg font-bold">Trending Workouts</h3>
          <span 
            onClick={() => setShowAllWorkouts(true)}
            className="text-xs text-muted font-semibold cursor-pointer hover:text-white transition-colors"
          >
            View All
          </span>
        </div>
        
        <div className="flex overflow-x-auto gap-4 pb-4 -mx-6 px-6 no-scrollbar snap-x snap-mandatory">
          {PRESET_WORKOUTS.map((workout, index) => (
            <div 
              key={index}
              onClick={() => handlePresetClick(workout)}
              className="relative min-w-[160px] h-[220px] rounded-3xl overflow-hidden snap-start border border-white/5 group cursor-pointer"
            >
              <img 
                src={workout.image} 
                alt={workout.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
              
              <div className="absolute bottom-0 left-0 p-4 w-full">
                <div className="flex gap-2 mb-2">
                    <span className="text-[10px] bg-primary/90 text-black font-bold px-2 py-0.5 rounded-full inline-block">
                    {workout.duration}
                    </span>
                </div>
                <h4 className="text-sm font-extrabold leading-tight mb-1">{workout.title}</h4>
                
                <div className="flex items-center gap-1 text-muted group-hover:text-primary transition-colors mt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide">Start</span>
                  <ChevronRight size={12} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="!mt-2">
           <div
             onClick={handleCreateCustom}
             className="bg-surface border border-dashed border-white/20 rounded-3xl p-6 flex items-center gap-4 cursor-pointer hover:bg-white/5 hover:border-primary/50 transition-all group mb-8"
           >
             <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white group-hover:bg-primary group-hover:text-black transition-colors">
               <Plus size={24} />
             </div>
             <div>
               <h3 className="text-lg font-bold">Create Custom Plan</h3>
               <p className="text-xs text-muted font-medium">Build your routine from scratch</p>
             </div>
           </div>
      </section>

      <section className="pb-8">
        <h3 className="text-lg font-bold mb-4 px-1">Categories</h3>
        <div className="grid grid-cols-2 gap-3">
            {['Shooting', 'Defense', 'Dribbling', 'Finishing'].map((cat) => (
                <div 
                  key={cat} 
                  onClick={() => {
                    setFilterCategory(cat);
                    setShowAllWorkouts(true);
                  }}
                  className="bg-surface p-4 rounded-2xl border border-white/5 flex items-center justify-between cursor-pointer hover:border-primary/30 transition-colors active:scale-95"
                >
                    <span className="text-sm font-bold">{cat}</span>
                    <ChevronRight size={16} className="text-muted" />
                </div>
            ))}
        </div>
      </section>

      {/* Progress Chart Section Added Here */}
      {renderProgressChart()}
    </div>
  );

  const renderAllWorkouts = () => (
    <div className="animate-in slide-in-from-right duration-300 min-h-full pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 mt-2 px-1">
        <button 
          onClick={() => {
            setShowAllWorkouts(false);
            setFilterCategory('All');
            setFilterDuration('All');
            setFilterIntensity('All');
          }} 
          className="w-10 h-10 rounded-full bg-surface border border-white/10 flex items-center justify-center hover:bg-white/5 active:scale-95 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <h3 className="text-2xl font-extrabold tracking-tight">All Workouts</h3>
      </div>

      {/* Filters */}
      <div className="mb-6 overflow-x-auto no-scrollbar pb-2 -mx-6 px-6">
        <div className="flex items-center gap-2">
           <div className="flex items-center gap-2 pr-4 border-r border-white/10 mr-2">
             <Filter size={16} className="text-primary" />
             <span className="text-xs font-bold text-muted">Filters</span>
           </div>
           
           {/* Category Filters */}
           {CATEGORIES.map(cat => (
             <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                    filterCategory === cat ? 'bg-primary text-black' : 'bg-surface text-muted border border-white/5'
                }`}
             >
                {cat}
             </button>
           ))}

           {/* Divider */}
           <div className="w-[1px] h-6 bg-white/10 mx-2"></div>

           {/* Duration Filters */}
           {DURATION_FILTERS.map(dur => (
             <button
                key={dur}
                onClick={() => setFilterDuration(dur)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                    filterDuration === dur ? 'bg-white text-black' : 'bg-surface text-muted border border-white/5'
                }`}
             >
                {dur}
             </button>
           ))}
        </div>
        
        {/* Secondary Row for Intensity */}
        <div className="flex items-center gap-2 mt-3">
           <span className="text-[10px] font-bold text-muted uppercase tracking-wider mr-2">Intensity:</span>
           {INTENSITIES.concat('All').reverse().map(int => (
             <button
                key={int}
                onClick={() => setFilterIntensity(int)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors border ${
                    filterIntensity === int 
                    ? 'border-primary text-primary bg-primary/10' 
                    : 'border-white/5 text-muted hover:bg-white/5'
                }`}
             >
                {int}
             </button>
           ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4">
        {getFilteredWorkouts().length > 0 ? (
          getFilteredWorkouts().map((workout, index) => (
            <div 
              key={index}
              onClick={() => handlePresetClick(workout)}
              className="relative aspect-square rounded-3xl overflow-hidden border border-white/5 group cursor-pointer"
            >
              <img 
                src={workout.image} 
                alt={workout.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
              
              <div className="absolute top-3 right-3">
                 <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                    {workout.intensity}
                 </span>
              </div>

              <div className="absolute bottom-0 left-0 p-4 w-full">
                <span className="text-[10px] text-primary font-bold uppercase tracking-wider mb-1 block">
                    {workout.duration}
                </span>
                <h4 className="text-sm font-extrabold leading-tight">{workout.title}</h4>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 py-12 text-center">
             <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
                <Filter size={24} className="text-muted" />
             </div>
             <p className="text-muted font-medium text-sm">No workouts match your filters.</p>
             <button 
                onClick={() => {
                    setFilterCategory('All');
                    setFilterDuration('All');
                    setFilterIntensity('All');
                }}
                className="mt-4 text-primary text-xs font-bold uppercase tracking-wider hover:underline"
             >
                Clear Filters
             </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderWorkoutDetail = () => {
    if (!activeWorkout) return null;

    const isCustom = activeWorkout.category === 'Custom';

    return (
        <div className="animate-in slide-in-from-right duration-300 relative bg-background min-h-full pb-44">
            {/* Header Image */}
            <div className={`relative w-full -mt-2 -mx-6 w-[calc(100%+3rem)] ${isCustom ? 'pt-24 pb-2 bg-background' : 'h-[40vh]'}`}>
                {!isCustom && (
                    <>
                        <img src={activeWorkout.image} className="w-full h-full object-cover" alt="Hero" />
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"></div>
                    </>
                )}
                
                <button 
                    onClick={() => setActiveWorkout(null)}
                    className="absolute top-4 left-6 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/60 z-20"
                >
                    <ArrowLeft size={20} />
                </button>

                 <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className={`absolute top-4 right-6 w-10 h-10 rounded-full backdrop-blur-md border border-white/10 flex items-center justify-center z-20 transition-colors ${isEditing ? 'bg-primary text-black' : 'bg-black/40 text-white hover:bg-black/60'}`}
                >
                    {isEditing ? <Save size={18} /> : <Edit2 size={18} />}
                </button>

                <div className={`${isCustom ? 'px-6' : 'absolute bottom-0 left-0 p-6 w-full'}`}>
                    <div className="flex gap-2 mb-3">
                        <span className="bg-primary text-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                            {activeWorkout.intensity} Intensity
                        </span>
                        <span className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                            <Clock size={12} /> {activeWorkout.totalDuration} Min
                        </span>
                    </div>
                    {isEditing ? (
                         <input
                             type="text"
                             value={activeWorkout.title}
                             onChange={(e) => setActiveWorkout({...activeWorkout, title: e.target.value})}
                             className="bg-transparent text-3xl font-extrabold tracking-tight leading-none mb-2 w-full border-b border-white/20 focus:border-primary focus:outline-none pb-1"
                             autoFocus
                         />
                    ) : (
                         <h1 className="text-3xl font-extrabold tracking-tight leading-none mb-2">{activeWorkout.title}</h1>
                    )}
                    <p className="text-sm text-gray-300 font-medium line-clamp-2">
                        {isEditing ? 'Add or remove drills to customize your session.' : `Master your ${activeWorkout.title.toLowerCase()} skills with this structured session.`}
                    </p>
                </div>
            </div>

            {/* Drill List */}
            <div className="mt-6 space-y-6 px-1">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">Workout Plan</h3>
                    <span className="text-xs text-muted font-bold">{activeWorkout.steps.length} Steps</span>
                </div>

                <div className="space-y-0 relative">
                    {!isEditing && <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-white/10"></div>}

                    {activeWorkout.steps.map((step, idx) => (
                        <div key={idx} className={`relative ${!isEditing ? 'pl-10' : ''} pb-6 last:pb-0`}>
                            {!isEditing && (
                                <div className={`absolute left-0 top-1 w-10 h-10 rounded-full border-4 border-background flex items-center justify-center z-10 
                                    ${step.type === 'warmup' ? 'bg-blue-500 text-white' : 
                                    step.type === 'cooldown' ? 'bg-purple-500 text-white' : 'bg-primary text-black'}`}>
                                    {step.type === 'warmup' ? <Activity size={16} /> : 
                                    step.type === 'cooldown' ? <CheckCircle2 size={16} /> : <Zap size={16} fill="currentColor" />}
                                </div>
                            )}

                            <div 
                                onClick={() => !isEditing && startDrill(idx)}
                                className={`bg-surface p-4 rounded-2xl border border-white/5 transition-all group flex items-center justify-between 
                                    ${!isEditing ? 'cursor-pointer hover:border-primary/50 active:scale-[0.99]' : ''}`}
                            >
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={`font-bold text-sm ${!isEditing ? 'group-hover:text-primary' : ''} transition-colors`}>{step.name}</h4>
                                        <span className="text-xs font-bold text-muted bg-white/5 px-2 py-1 rounded ml-2 whitespace-nowrap">{step.duration} min</span>
                                    </div>
                                    <p className="text-xs text-muted leading-relaxed line-clamp-1">{step.description}</p>
                                </div>

                                {isEditing && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteDrill(idx);
                                        }}
                                        className="ml-4 w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {isEditing && (
                        <div className="mt-6 pt-6 border-t border-white/5 animate-in fade-in">
                            <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                                <Plus size={16} className="text-primary" />
                                Add New Drill
                            </h4>
                            <div className="flex gap-2 mb-2">
                                <input 
                                    type="text" 
                                    value={newDrillName}
                                    onChange={(e) => setNewDrillName(e.target.value)}
                                    placeholder="Drill Name"
                                    className="flex-1 bg-surface border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none"
                                />
                                <input 
                                    type="number" 
                                    value={newDrillDuration}
                                    onChange={(e) => setNewDrillDuration(e.target.value)}
                                    placeholder="Min"
                                    className="w-20 bg-surface border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary focus:outline-none text-center"
                                />
                            </div>
                            <button 
                                onClick={handleAddDrill}
                                disabled={!newDrillName.trim()}
                                className="w-full py-3 bg-white/5 border border-dashed border-white/20 rounded-xl text-xs font-bold uppercase tracking-wider text-muted hover:text-primary hover:border-primary/50 transition-colors disabled:opacity-50"
                            >
                                Add to Plan
                            </button>
                        </div>
                    )}
                </div>

                 {/* IN-LINE STATS INPUT FOR QUICK LOGGING - Moved into flow */}
                 {activeWorkout.targetShots && !isEditing && (
                    <div className="mt-8 mb-4 bg-[#141414] border border-white/10 rounded-2xl p-4 animate-in slide-in-from-bottom-2 fade-in shadow-2xl">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-white flex items-center gap-2">
                                <Target size={14} className="text-primary"/>
                                Register your Stats
                            </span>
                            <span className="text-[10px] text-muted font-bold uppercase tracking-wider">OPTIONAL</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex-1">
                                <label className="text-[9px] font-bold text-muted uppercase tracking-wider mb-1 block">Made</label>
                                <input 
                                    type="number" 
                                    value={shotsMade}
                                    onChange={(e) => setShotsMade(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 text-center text-lg font-black text-white focus:border-primary focus:outline-none"
                                />
                            </div>
                            <span className="text-lg font-black text-muted mt-5">/</span>
                            <div className="flex-1">
                                <label className="text-[9px] font-bold text-muted uppercase tracking-wider mb-1 block">Target</label>
                                <div className="w-full bg-white/5 border border-white/5 rounded-xl py-3 text-center text-lg font-black text-white/50 cursor-not-allowed">
                                    {shotsAttempted}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* FIXED ACTION BUTTON */}
            <div className="fixed bottom-[90px] left-0 right-0 px-6 pt-6 pb-2 bg-gradient-to-t from-background via-background to-transparent z-30 max-w-md mx-auto pointer-events-none">
                <div className="pointer-events-auto">
                    {isEditing ? (
                        <button 
                            onClick={() => setIsEditing(false)}
                            className="w-full bg-surface text-white border border-white/10 font-extrabold text-lg py-5 rounded-3xl hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                        >
                            <Save size={20} />
                            Save Changes
                        </button>
                    ) : (
                        shotsMade ? (
                            <button 
                                onClick={finishWorkout}
                                className="w-full bg-white text-black font-extrabold text-lg py-5 rounded-3xl hover:bg-gray-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg"
                            >
                                <Save size={20} className="text-black" />
                                Finish & Save
                            </button>
                        ) : (
                            <button 
                                onClick={() => startDrill(0)}
                                className="w-full bg-primary text-black font-extrabold text-lg py-5 rounded-3xl shadow-[0_0_20px_rgba(249,128,6,0.3)] hover:bg-primary/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <Play size={20} fill="currentColor" />
                                Start Workout
                            </button>
                        )
                    )}
                </div>
            </div>
        </div>
    );
  };

  return (
    <>
      {renderDrillInfoModal()}

      {showGenerator && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-[#141414] w-full max-w-lg rounded-3xl border border-white/10 p-6 relative shadow-2xl">
              <button 
                onClick={closeGenerator} 
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-full text-muted hover:text-white transition-colors"
              >
                <X size={20}/>
              </button>
              
              <h3 className="text-xl font-extrabold mb-6 flex items-center gap-2">
                <Sparkles className="text-primary" size={24} fill="currentColor" /> 
                AI Workout Generator
              </h3>
              
              {!generatedWorkout ? (
                  <div className="space-y-5">
                      <div>
                          <label className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2 block">Focus Area</label>
                          <input 
                              value={prompt}
                              onChange={e => setPrompt(e.target.value)}
                              placeholder="e.g. Ball handling in traffic..."
                              className="w-full bg-surface border border-white/10 rounded-xl p-4 text-sm font-medium focus:border-primary focus:outline-none placeholder:text-muted/50"
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2 block">Duration (min)</label>
                              <input 
                                  type="number"
                                  value={duration}
                                  onChange={e => setDuration(parseInt(e.target.value))}
                                  className="w-full bg-surface border border-white/10 rounded-xl p-4 text-sm font-medium focus:border-primary focus:outline-none"
                              />
                          </div>
                          <div>
                              <label className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2 block">Intensity</label>
                              <select 
                                  value={intensity}
                                  onChange={e => setIntensity(e.target.value)}
                                  className="w-full bg-surface border border-white/10 rounded-xl p-4 text-sm font-medium focus:border-primary focus:outline-none appearance-none"
                              >
                                  {INTENSITIES.map(i => <option key={i} value={i}>{i}</option>)}
                              </select>
                          </div>
                      </div>
                      <button 
                          onClick={handleGenerate}
                          disabled={isGenerating || !prompt}
                          className="w-full bg-primary text-black font-extrabold py-4 rounded-2xl mt-2 flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-primary/90 transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(249,128,6,0.2)]"
                      >
                          {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles size={18} fill="currentColor" />}
                          Generate Plan
                      </button>
                  </div>
              ) : (
                  <div className="space-y-4">
                      <div className="bg-surface p-4 rounded-xl max-h-[50vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed border border-white/5 font-medium text-gray-300">
                          {generatedWorkout}
                      </div>
                      <div className="flex gap-3">
                          <button 
                            onClick={() => setGeneratedWorkout(null)} 
                            className="flex-1 py-3 bg-surface border border-white/10 rounded-xl font-bold text-sm hover:bg-white/5 transition-colors"
                          >
                            Back
                          </button>
                          <button 
                            onClick={closeGenerator} 
                            className="flex-1 py-3 bg-primary text-black rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                          >
                            Use This Plan
                          </button>
                      </div>
                  </div>
              )}
           </div>
        </div>
      )}

      {activeWorkout ? renderWorkoutDetail() : showAllWorkouts ? renderAllWorkouts() : renderWorkoutList()}
    </>
  );
};