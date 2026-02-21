import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useRevenueCat } from './contexts/RevenueCatContext';
import { AuthView } from './components/AuthView';
import { Header } from './components/Header';
import { StatCard } from './components/StatCard';
import { ActionBanner } from './components/ActionBanner';
import { SessionList } from './components/SessionList';
import { BottomNav } from './components/BottomNav';
import { DrillsView } from './components/DrillsView';
import { MyWorkoutsView } from './components/MyWorkoutsView';
import { FormView } from './components/FormView';
import { ProfileView } from './components/ProfileView';
import { AddView } from './components/AddView';
import { DiaryView } from './components/DiaryView';
import { OnboardingView } from './components/OnboardingView';
import OnboardingShotAnalysisView from './components/OnboardingShotAnalysisView';
import { TrendingCarousel } from './components/TrendingCarousel';
import { Session, ViewType } from './types';
import { ChevronDown } from 'lucide-react';

function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function readTodayMinutes(): number {
  try {
    const raw = localStorage.getItem("bs_today_minutes_v1");
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { date: string; minutes: number };
    if (parsed.date !== todayKey()) return 0;
    return typeof parsed.minutes === "number" ? parsed.minutes : 0;
  } catch {
    return 0;
  }
}

// Mock Data Initial State
const INITIAL_SESSIONS: Session[] = [
  {
    id: '1',
    title: '3-Point Shooting',
    timestamp: 'JUST NOW',
    score: '82%',
    accuracy: 82
  },
  {
    id: '2',
    title: 'Free Throw Routine',
    timestamp: '2H AGO',
    score: '94%',
    accuracy: 94
  },
  {
    id: '3',
    title: 'Mid-Range Pullups',
    timestamp: '5H AGO',
    score: '78%',
    accuracy: 78
  },
  {
    id: '4',
    title: 'Defensive Slides',
    timestamp: 'YESTERDAY',
    score: '100%',
    accuracy: 100
  },
  {
    id: '5',
    title: 'Ball Handling',
    timestamp: 'YESTERDAY',
    score: '65%',
    accuracy: 65
  },
  {
    id: '6',
    title: 'Post Moves',
    timestamp: '2 DAYS AGO',
    score: '88%',
    accuracy: 88
  },
  {
    id: '7',
    title: 'Layup Package',
    timestamp: '3 DAYS AGO',
    score: '92%',
    accuracy: 92
  },
  {
    id: '8',
    title: 'Cardio & Agility',
    timestamp: '4 DAYS AGO',
    score: 'Done',
    accuracy: 100
  }
];

const App: React.FC = () => {
  const { session, profile, loading } = useAuth();
  const { isPremium, loading: revenueCatLoading } = useRevenueCat();
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [sessions, setSessions] = useState<Session[]>(INITIAL_SESSIONS);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [todayMinutes, setTodayMinutes] = useState(() => readTodayMinutes());

  useEffect(() => {
    const refresh = () => setTodayMinutes(readTodayMinutes());
    window.addEventListener("storage", refresh);
    const t = setInterval(refresh, 500);
    return () => {
      window.removeEventListener("storage", refresh);
      clearInterval(t);
    };
  }, []);

  const handleNavigate = (view: ViewType) => {
    if (currentView === 'workout' && view !== 'workout') {
      setSelectedWorkout(null);
    }
    setCurrentView(view);
  };

  const navigateToHome = () => handleNavigate('home');

  // Calculate Stats based on Sessions and Time Range
  const stats = useMemo(() => {
    const baseSessions = sessions.length;

    // Calculate average accuracy (filter out 0 or undefined if needed, assuming simple average for mock)
    const validSessions = sessions.filter(s => typeof s.accuracy === 'number');
    const sumAccuracy = validSessions.reduce((acc, curr) => acc + curr.accuracy, 0);
    const baseAvgAccuracy = validSessions.length > 0 ? Math.round(sumAccuracy / validSessions.length) : 0;

    const baseTotalTime = sessions.reduce(
      (acc, s) => acc + (typeof s.duration === 'number' ? s.duration : 0),
      0
    );

    // Apply mock multipliers to simulate different time ranges
    let multiplier = 1;
    let accuracyModifier = 0;

    if (timeRange === 'week') {
        multiplier = 1; // Use actual mock data count for 'week' logic roughly
        accuracyModifier = -2;
    } else if (timeRange === 'month') {
        multiplier = 4;
        accuracyModifier = 3;
    }

    return {
      accuracy: Math.min(100, Math.max(0, baseAvgAccuracy + accuracyModifier)),
      sessionsCompleted: timeRange === 'today' ? 3 : baseSessions * multiplier,
      totalTime:
        timeRange === 'today'
          ? todayMinutes
          : Math.round(baseTotalTime * multiplier)
    };
  }, [sessions, timeRange, todayMinutes]);

  // DEBUG: Log app guard state
  console.log("[APP] state", {
    loading,
    hasSession: !!session,
    hasProfile: !!profile,
    onboarding_completed: profile?.onboarding_completed,
    isPremium,
    revenueCatLoading,
    currentView,
    ts: Date.now(),
  });

  if (loading || revenueCatLoading) {
    return (
      <div className="min-h-screen bg-background text-white max-w-md mx-auto flex items-center justify-center">
        <div className="text-sm text-muted font-bold">Loading...</div>
      </div>
    );
  }

  if (!session) return <AuthView />;
  if (!profile) {
    return (
      <div className="min-h-screen bg-background text-white max-w-md mx-auto flex items-center justify-center">
        <div className="text-sm text-muted font-bold">Loading profile...</div>
      </div>
    );
  }

  if (!profile.onboarding_completed && currentView !== 'onboarding-shot-analysis') {
    return <OnboardingView onNavigate={setCurrentView} />;
  }

  const handleWorkoutComplete = (data: { title: string; shotsMade?: number; shotsAttempted?: number; duration: number }) => {
    let accuracy = 100;
    let scoreDisplay = 'Done';

    if (data.shotsAttempted && data.shotsAttempted > 0) {
      accuracy = Math.round((data.shotsMade! / data.shotsAttempted) * 100);
      scoreDisplay = `${accuracy}%`;
    }

    const newSession: Session = {
      id: Date.now().toString(),
      title: data.title,
      timestamp: 'JUST NOW',
      score: scoreDisplay,
      accuracy: accuracy,
      duration: data.duration
    };

    setSessions(prev => [newSession, ...prev]);
    navigateToHome();
  };

  const handleTrendingSelect = (workout: any) => {
    setSelectedWorkout(workout);
    setCurrentView('workout');
  };

  const getTitle = () => {
    switch (timeRange) {
        case 'week': return "Week";
        case 'month': return "Month";
        default: return "Today";
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'onboarding':
        return <OnboardingView onNavigate={setCurrentView} />;
      case 'onboarding-shot-analysis':
        return (
          <OnboardingShotAnalysisView
            onBack={() => setCurrentView('onboarding')}
            onDone={navigateToHome}
          />
        );
      case 'add':
        return <AddView onNavigate={setCurrentView} />;
      case 'profile':
        return <ProfileView onNavigate={setCurrentView} />;
      case 'workout':
        return (
          <DrillsView
            onWorkoutComplete={handleWorkoutComplete}
            initialWorkout={selectedWorkout}
            onOpenMyWorkouts={() => setCurrentView('my-workouts')}
          />
        );
      case 'my-workouts':
        return (
          <MyWorkoutsView
            onBack={() => setCurrentView('workout')}
            onSelectWorkout={(workout) => {
              setSelectedWorkout(workout);
              setCurrentView('workout');
            }}
          />
        );
      case 'form':
        return <FormView />;
      case 'diary':
        return <DiaryView />;
      case 'home':
      default:
        return (
          <div className="animate-in fade-in duration-500">
            {/* Performance Header */}
            <div className="flex items-center justify-between mb-6 mt-2">
              <h3 className="text-2xl font-extrabold tracking-tight">{getTitle()} Performance</h3>
              
              <div className="relative">
                  <select 
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value as 'today' | 'week' | 'month')}
                    className="appearance-none bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest pl-3 pr-7 py-1.5 rounded-full border border-transparent hover:border-primary/30 focus:outline-none cursor-pointer transition-all"
                  >
                    <option value="today">Today</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-primary pointer-events-none" strokeWidth={3} />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard 
                label="Avg Accuracy" 
                value={stats.accuracy} 
                unit="%" 
                highlight={true} 
                fullWidth={true} 
              />
              <StatCard 
                label="Workouts" 
                value={stats.sessionsCompleted} 
                subValue={timeRange === 'today' ? "/ 5" : timeRange === 'week' ? "/ 20" : "/ 80"} 
              />
              <StatCard 
                label="Time" 
                value={stats.totalTime} 
                unit="M" 
              />
            </div>

            <TrendingCarousel onSelect={handleTrendingSelect} />

            <ActionBanner onClick={() => setCurrentView('form')} />

            <SessionList sessions={sessions} />
          </div>
        );
    }
  };

  const isFullScreen = currentView === 'onboarding' || currentView === 'onboarding-shot-analysis';

  return (
    <div className="flex flex-col min-h-screen bg-background text-white max-w-md mx-auto shadow-2xl overflow-hidden relative">
      
      {!isFullScreen && currentView === 'home' && <Header />}

      <main className={`flex-1 px-6 overflow-y-auto no-scrollbar ${!isFullScreen ? 'pb-24' : ''} ${currentView !== 'home' && !isFullScreen ? 'pt-8' : ''}`}>
        {renderContent()}
      </main>

      {!isFullScreen && <BottomNav currentView={currentView} onNavigate={handleNavigate} />}
      
    </div>
  );
};

export default App;