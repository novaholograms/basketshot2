import React, { useState, useRef, useEffect } from 'react';
import { Target, ArrowUpCircle, Activity, CircleDashed, Camera, Image as ImageIcon, ChevronLeft, Info, X, Play, CheckCircle2, Smartphone, Loader2, Sparkles, AlertCircle, Dumbbell, ChevronRight, Calendar, Clock, Filter } from 'lucide-react';
import type { AnalysisResult, ShotAnalysisRow } from '../types';
import { analyzeVideo } from '../services/shotAnalyzer';
import { useAuth } from '../contexts/AuthContext';
import { saveShotAnalysis, fetchRecentShotAnalyses } from '../services/analysisStorage';
import { addToCache, getCachedAnalyses, setCachedAnalyses } from '../utils/analysisCache';
import { fetchGeminiExplanation } from '../services/geminiExplainer';

const SHOT_TYPES = [
  {
    id: '3pt',
    title: '3-Pointer',
    icon: CircleDashed,
    desc: 'Deep range mechanics'
  },
  {
    id: 'ft',
    title: 'Free Throw',
    icon: ArrowUpCircle,
    desc: 'Routine & consistency'
  },
  {
    id: 'layup',
    title: 'Layup',
    icon: Activity,
    desc: 'Finishing at the rim'
  },
  {
    id: 'mid',
    title: 'Mid-Range',
    icon: Target,
    desc: 'Pull-up jump shot'
  },
];

const LOADING_STEPS = [
  "Detecting your posture…",
  "Tracking your movement…",
  "Measuring your balance…",
  "Measuring your alignment…",
  "Measuring your release point…",
  "Measuring your rhythm…",
  "Calculating your metrics…",
  "Building your feedback…",
  "Creating your improvement plan…"
];

type ViewState = 'selection' | 'upload' | 'preview' | 'analyzing' | 'results';

export const FormView: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [viewState, setViewState] = useState<ViewState>('selection');
  const [selectedShot, setSelectedShot] = useState<typeof SHOT_TYPES[0] | null>(null);
  const [showTips, setShowTips] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // Animation State
  const [displayScore, setDisplayScore] = useState(0);

  // History State
  const [history, setHistory] = useState<ShotAnalysisRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<string>('all');
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiEnhanced, setGeminiEnhanced] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // -- Handlers --

  const handleCardClick = (shot: typeof SHOT_TYPES[0]) => {
    setSelectedShot(shot);
    setViewState('upload');
  };

  const handleSourceSelect = (source: 'camera' | 'gallery') => {
    if (source === 'camera') {
      cameraInputRef.current?.click();
    } else {
      galleryInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setViewState('preview');
    }
  };

  const startAnalysis = async () => {
    console.log("[FORM] startAnalysis", { ts: Date.now(), videoUrl, shotType: selectedShot?.id });

    console.log("[FORM] setViewState -> analyzing");
    setViewState('analyzing');
    setLoadingStepIndex(0);
    setDisplayScore(0);

    if (!videoUrl) return;

    try {
      console.log("[FORM] analyzeVideo begin");
      const result = await analyzeVideo(videoUrl, (percent) => {
        // Optional: could update UI with progress
      });
      console.log("[FORM] analyzeVideo success", { score: result?.score, isInvalid: result?.isInvalid });

      setAnalysisResult(result);
      setGeminiEnhanced(false);

      (async () => {
        try {
          setGeminiLoading(true);
          const enhanced = await fetchGeminiExplanation({
            shotType: selectedShot?.id ?? 'unknown',
            score: result.score,
            metrics: result.metrics as unknown as Record<string, number>,
            context: { framesProcessed: result.processedFrames },
          }, 5000);
          if (!enhanced) return;
          setAnalysisResult((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              strengths: enhanced.strengths?.length ? enhanced.strengths : prev.strengths,
              improvements: enhanced.improvements?.length ? enhanced.improvements : prev.improvements,
              aiCoachTip: enhanced.aiCoachTip ?? prev.aiCoachTip,
            };
          });
          setGeminiEnhanced(true);
        } finally {
          setGeminiLoading(false);
        }
      })();

      if (userId && !result.isInvalid) {
        try {
          const row = await saveShotAnalysis({
            user_id: userId,
            shot_type: selectedShot?.id ?? null,
            score: result.score,
            metrics: result.metrics,
            strengths: result.strengths,
            improvements: result.improvements,
            ai_coach_tip: result.aiCoachTip ?? null,
            engine_version: null,
            source: 'client',
            video_meta: {
              processedFrames: result.processedFrames,
              totalFrames: result.totalFrames,
            },
          });
          const updatedHistory = addToCache(userId, row);
          setHistory(updatedHistory);
        } catch (saveError) {
          console.warn('[ANALYSIS] save error:', saveError);
        }
      }

      setTimeout(() => {
        console.log("[FORM] setViewState -> results");
        setViewState('results');
      }, 800);
    } catch (error) {
      console.error('[FORM] Analysis error:', error);
      setAnalysisResult({
        score: 0,
        metrics: {
          stanceWidth: 0,
          lateralSway: 0,
          kneeDip: 0,
          verticalDrive: 0,
          elbowAlignment: 0,
          elbowUnderBall: 0,
          releaseHeight: 0,
          wristFlick: 0,
          followThroughHold: 0,
          landingBalance: 0,
        },
        strengths: [],
        improvements: [],
        isInvalid: true,
        messageIfInvalid: 'An error occurred during analysis. Please try again.',
        processedFrames: 0,
        totalFrames: 0
      });
      console.log("[FORM] setViewState -> results (after error)");
      setViewState('results');
    }
  };

  const handleBack = () => {
    if (viewState === 'upload') {
      setViewState('selection');
      setSelectedShot(null);
    } else if (viewState === 'preview') {
      setViewState('upload');
      setVideoUrl(null);
    } else if (viewState === 'results') {
      setViewState('selection');
      setSelectedShot(null);
      setVideoUrl(null);
      setDisplayScore(0);
      setAnalysisResult(null);
    }
  };

  // -- Effects --

  // Load history from cache and Supabase
  useEffect(() => {
    if (!userId) return;

    const cached = getCachedAnalyses(userId);
    if (cached.length > 0) {
      setHistory(cached);
    }

    let cancelled = false;

    (async () => {
      setHistoryLoading(true);
      try {
        const fresh = await fetchRecentShotAnalyses(userId, 20);
        if (cancelled) return;
        setHistory(fresh);
        setCachedAnalyses(userId, fresh);
      } catch (error) {
        console.warn('[HISTORY] fetch error:', error);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Cycle through loading text
  useEffect(() => {
    if (viewState === 'analyzing') {
      const interval = setInterval(() => {
        setLoadingStepIndex((prev) => {
          if (prev < LOADING_STEPS.length - 1) return prev + 1;
          return prev; // Stay on last message until analysis completes
        });
      }, 800); // Speed of text change

      return () => clearInterval(interval);
    }
  }, [viewState]);

  // Animate Score
  useEffect(() => {
    if (viewState === 'results' && analysisResult) {
        const targetScore = analysisResult.score;
        const duration = 2500;
        const steps = 60;
        const incrementTime = duration / steps;

        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep++;
            const progress = currentStep / steps;
            const easeOut = 1 - Math.pow(1 - progress, 3);

            const nextScore = Math.min(Math.round(easeOut * targetScore), targetScore);
            setDisplayScore(nextScore);

            if (currentStep >= steps) {
                clearInterval(timer);
            }
        }, incrementTime);

        return () => clearInterval(timer);
    }
  }, [viewState, analysisResult]);

  // -- Filtered History Logic --
  const filteredHistory = historyFilter === 'all'
    ? history
    : history.filter(item => item.shot_type === historyFilter);

  // -- Sub-Components --

  const renderSelection = () => (
    <div className="pb-24 animate-in fade-in duration-500 min-h-[80vh]">
      <div className="mt-2 px-1">
         <h3 className="text-2xl font-extrabold tracking-tight mb-2">Analyze Form</h3>
         <p className="text-muted text-sm font-medium mb-6">Select a shot type to begin analysis</p>
         
         {/* Shot Type Selector */}
         <div className="flex overflow-x-auto gap-4 pb-8 -mx-6 px-6 no-scrollbar snap-x snap-mandatory">
            {SHOT_TYPES.map((type) => (
                <div 
                  key={type.id}
                  onClick={() => handleCardClick(type)}
                  className={`
                    relative min-w-[200px] h-[280px] rounded-3xl p-6 flex flex-col justify-between snap-center cursor-pointer transition-all duration-300 border
                    bg-surface border-white/10 hover:border-primary/50 hover:bg-white/5 active:scale-95
                  `}
                >
                  <div className="w-14 h-14 rounded-full flex items-center justify-center bg-white/5 text-white">
                     <type.icon size={28} />
                  </div>
                  <div>
                    <h4 className="text-3xl font-extrabold leading-none mb-3 text-white">
                      {type.title}
                    </h4>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">
                      {type.desc}
                    </p>
                  </div>
                </div>
            ))}
         </div>

         {/* Recording Tips Button */}
         <div className="mt-4 px-1 mb-10">
            <button 
              onClick={() => setShowTips(true)}
              className="w-full bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:bg-white/5 hover:border-primary/30 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Info size={20} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-white">Recording Tips</h4>
                  <p className="text-[10px] text-muted font-bold uppercase tracking-wide">How to get accurate results</p>
                </div>
              </div>
              <ChevronLeft size={16} className="rotate-180 text-muted group-hover:text-white transition-colors" />
            </button>
         </div>

         {/* History Section */}
         <div className="px-1">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Analysis History</h3>
                <Filter size={16} className="text-muted" />
            </div>

            {/* Filter Chips */}
            <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2">
                <button 
                    onClick={() => setHistoryFilter('all')}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                        historyFilter === 'all' ? 'bg-white text-black' : 'bg-surface text-muted border border-white/5'
                    }`}
                >
                    All Shots
                </button>
                {SHOT_TYPES.map(type => (
                    <button 
                        key={type.id}
                        onClick={() => setHistoryFilter(type.id)}
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                            historyFilter === type.id ? 'bg-white text-black' : 'bg-surface text-muted border border-white/5'
                        }`}
                    >
                        {type.title}
                    </button>
                ))}
            </div>

            {/* History List */}
            <div className="space-y-3">
                {historyLoading && history.length === 0 ? (
                    <div className="text-center py-10 text-muted">
                        <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                        <p className="text-sm font-medium">Loading history...</p>
                    </div>
                ) : filteredHistory.length > 0 ? (
                    filteredHistory.map((item) => {
                        const shotInfo = SHOT_TYPES.find(s => s.id === item.shot_type);
                        const date = new Date(item.created_at);
                        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                        return (
                            <div
                                key={item.id}
                                className="bg-surface p-4 rounded-2xl border border-white/5 flex items-center gap-4 hover:border-primary/20 transition-colors cursor-pointer group"
                                onClick={() => {
                                    console.log('[HISTORY] clicked analysis:', item.id);
                                }}
                            >
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm text-white mb-1">
                                        {shotInfo?.title || 'Shot'} Analysis
                                    </h4>
                                    <div className="flex items-center gap-1 text-[10px] text-muted font-bold uppercase tracking-wide">
                                        <Calendar size={10} />
                                        {formattedDate}
                                    </div>
                                </div>
                                <div className="pr-2">
                                    <div className={`text-2xl font-black ${(item.score ?? 0) >= 80 ? 'text-primary' : 'text-white'}`}>
                                        {item.score ?? '-'}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-10 text-muted">
                        <p className="text-sm font-medium">No analyses found.</p>
                    </div>
                )}
            </div>
         </div>
      </div>
    </div>
  );

  const renderUpload = () => (
    <div className="pb-24 animate-in slide-in-from-right duration-300">
        <input type="file" ref={cameraInputRef} accept="video/*" capture="environment" className="hidden" onChange={handleFileChange} />
        <input type="file" ref={galleryInputRef} accept="video/*" className="hidden" onChange={handleFileChange} />

        <div className="flex items-center gap-4 mb-8 mt-2">
          <button onClick={handleBack} className="w-10 h-10 rounded-full bg-surface border border-white/10 flex items-center justify-center hover:bg-white/5 active:scale-95 transition-all">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h3 className="text-xl font-extrabold tracking-tight">Upload Gameplay</h3>
            <p className="text-xs text-muted font-bold uppercase tracking-wider">{selectedShot?.title}</p>
          </div>
        </div>

        <div className="space-y-4">
          <button onClick={() => handleSourceSelect('camera')} className="w-full bg-surface border border-white/10 rounded-3xl p-8 flex items-center justify-between group active:scale-[0.98] transition-all hover:border-primary/50">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-colors">
                <Camera size={32} />
              </div>
              <div className="text-left">
                <h4 className="text-xl font-bold mb-1">Record Video</h4>
                <p className="text-xs text-muted font-medium">Use camera to record shot</p>
              </div>
            </div>
          </button>

          <button onClick={() => handleSourceSelect('gallery')} className="w-full bg-surface border border-white/10 rounded-3xl p-8 flex items-center justify-between group active:scale-[0.98] transition-all hover:border-primary/50">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-colors">
                <ImageIcon size={32} />
              </div>
              <div className="text-left">
                <h4 className="text-xl font-bold mb-1">Choose from Gallery</h4>
                <p className="text-xs text-muted font-medium">Upload existing footage</p>
              </div>
            </div>
          </button>
        </div>

        <div className="mt-8 p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10">
          <h5 className="text-sm font-bold text-blue-400 mb-2">Pro Tip</h5>
          <p className="text-xs text-muted leading-relaxed">
            For the best analysis, ensure your full body is visible in the frame and record from a side or front angle.
          </p>
        </div>
    </div>
  );

  const renderPreview = () => (
    <div className="flex flex-col animate-in zoom-in-95 duration-300 relative">
      <div className="absolute top-4 left-4 z-20">
        <button onClick={handleBack} className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-black/70 text-white">
            <X size={20} />
        </button>
      </div>

      <div className="h-[55vh] bg-black rounded-3xl overflow-hidden relative border border-white/10 shadow-2xl shrink-0">
         {videoUrl && (
            <video
                src={videoUrl}
                className="w-full h-full object-cover"
                controls={false}
                autoPlay
                loop
                muted
                playsInline
                onError={(e) => console.error("[VIDEO] onError", { e, ts: Date.now(), src: videoUrl })}
                onStalled={() => console.warn("[VIDEO] stalled", { ts: Date.now() })}
                onWaiting={() => console.warn("[VIDEO] waiting", { ts: Date.now() })}
                onAbort={() => console.warn("[VIDEO] abort", { ts: Date.now() })}
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  console.log("[VIDEO] metadata", { duration: v.duration, w: v.videoWidth, h: v.videoHeight, readyState: v.readyState });
                }}
            />
         )}
         <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none"></div>
      </div>

      <div className="mt-6 space-y-3">
        <button 
            onClick={startAnalysis}
            className="w-full bg-primary text-black font-extrabold text-lg py-4 rounded-2xl shadow-[0_0_20px_rgba(249,128,6,0.3)] hover:bg-primary/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
            <Sparkles size={20} fill="currentColor" className="text-black" />
            Analyze Shot
        </button>
        <button 
            onClick={handleBack}
            className="w-full bg-surface text-muted font-bold text-sm py-4 rounded-2xl border border-white/5 hover:bg-white/5 transition-colors"
        >
            Retake Video
        </button>
      </div>
    </div>
  );

  const renderAnalyzing = () => (
    <div className="h-full flex flex-col justify-center animate-in fade-in duration-700 relative pb-20">
        <div className="relative w-full aspect-[9/16] max-h-[70vh] rounded-3xl overflow-hidden border border-primary/30 shadow-[0_0_30px_rgba(249,128,6,0.1)]">
            {videoUrl && (
                <video
                    src={videoUrl}
                    className="w-full h-full object-cover opacity-60"
                    autoPlay
                    loop
                    muted
                    playsInline
                    onError={(e) => console.error("[VIDEO] onError", { e, ts: Date.now(), src: videoUrl })}
                    onStalled={() => console.warn("[VIDEO] stalled", { ts: Date.now() })}
                    onWaiting={() => console.warn("[VIDEO] waiting", { ts: Date.now() })}
                    onAbort={() => console.warn("[VIDEO] abort", { ts: Date.now() })}
                />
            )}

            {/* Scanning Overlay */}
            <div className="absolute inset-0 bg-primary/5 z-10"></div>
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
                <div className="w-full absolute top-0 h-1 bg-primary/50 shadow-[0_0_15px_#f98006] animate-[scan_2s_ease-in-out_infinite]"></div>
            </div>

            {/* Status Text Overlay */}
            <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black via-black/80 to-transparent z-30 flex flex-col items-center text-center">
                 <Loader2 className="animate-spin text-primary mb-4" size={32} />
                 <p className="text-lg font-bold text-white tracking-tight animate-pulse min-h-[3rem]">
                    {LOADING_STEPS[loadingStepIndex]}
                 </p>
            </div>
        </div>
        <style>{`
            @keyframes scan {
                0% { top: 0%; opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { top: 100%; opacity: 0; }
            }
        `}</style>
    </div>
  );

  const renderResults = () => {
    if (analysisResult?.isInvalid) {
      return (
        <div className="pb-24 animate-in slide-in-from-bottom-8 duration-700">
          <div className="flex flex-col items-center justify-center py-12 mt-6">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
              <AlertCircle size={48} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight mb-3 text-center">Unable to Analyze</h2>
            <p className="text-muted text-sm font-medium text-center max-w-[280px] leading-relaxed mb-8">
              {analysisResult.messageIfInvalid}
            </p>
            <button
              onClick={handleBack}
              className="bg-primary text-black font-extrabold text-sm py-4 px-8 rounded-2xl hover:bg-primary/90 transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="pb-24 animate-in slide-in-from-bottom-8 duration-700">
        {/* Score Header */}
        <div className="flex flex-col items-center justify-center mb-8 mt-6">
          <div className="relative w-40 h-40 mb-6">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="#f98006"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={352}
                strokeDashoffset={352 - (352 * displayScore) / 100}
                className="transition-all duration-[2500ms] ease-out"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
              <span className="text-5xl font-black tracking-tighter text-white leading-none">
                {displayScore}
              </span>
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mt-1">Score</span>
            </div>
          </div>
          <div className={`transition-opacity duration-1000 ${displayScore > 50 ? 'opacity-100' : 'opacity-0'}`}>
            <h2 className="text-3xl font-extrabold tracking-tight mb-2 text-center">
              {displayScore >= 80 ? 'Excellent!' : displayScore >= 60 ? 'Good Shot!' : 'Keep Practicing!'}
            </h2>
            <p className="text-muted text-sm font-medium text-center max-w-[200px] leading-relaxed mx-auto">
              {displayScore >= 80 ? 'Your form is excellent!' : displayScore >= 60 ? 'Your form is looking solid.' : 'There is room for improvement.'}
            </p>
          </div>
        </div>

        {/* Metrics */}
        {analysisResult?.metrics && (
          <div className={`mb-6 transition-all duration-1000 delay-300 ${displayScore > 10 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface rounded-2xl p-4 border border-white/5 text-center">
                <div className="text-2xl font-black text-primary mb-1">
                  {Math.round(analysisResult.metrics.elbowAlignment * 100)}%
                </div>
                <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Alignment</div>
              </div>
              <div className="bg-surface rounded-2xl p-4 border border-white/5 text-center">
                <div className="text-2xl font-black text-primary mb-1">
                  {Math.round(analysisResult.metrics.releaseHeight * 100)}%
                </div>
                <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Release</div>
              </div>
              <div className="bg-surface rounded-2xl p-4 border border-white/5 text-center">
                <div className="text-2xl font-black text-primary mb-1">
                  {Math.round(analysisResult.metrics.wristFlick * 100)}%
                </div>
                <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Flick</div>
              </div>
              <div className="bg-surface rounded-2xl p-4 border border-white/5 text-center">
                <div className="text-2xl font-black text-primary mb-1">
                  {Math.round(analysisResult.metrics.lateralSway * 100)}%
                </div>
                <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Stability</div>
              </div>
            </div>
          </div>
        )}

        {/* Breakdown */}
        <div className={`space-y-6 transition-all duration-1000 delay-500 ${displayScore > 20 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {geminiLoading && (
            <div className="text-xs text-white/40 text-center">Enhancing analysis with AI...</div>
          )}
          {geminiEnhanced && !geminiLoading && (
            <div className="text-xs text-white/40 text-center flex items-center justify-center gap-1">
              <Sparkles size={11} /> AI-enhanced analysis
            </div>
          )}
          {/* Strengths */}
          {analysisResult?.strengths && analysisResult.strengths.length > 0 && (
            <div className="bg-surface rounded-3xl p-6 border border-white/5">
              <h4 className="font-bold text-sm text-green-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <CheckCircle2 size={16} /> Strengths
              </h4>
              <ul className="space-y-3">
                {analysisResult.strengths.map((strength, idx) => (
                  <li key={idx} className="flex gap-3 text-sm font-medium text-white/90">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2"></span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {analysisResult?.improvements && analysisResult.improvements.length > 0 && (
            <div className="bg-surface rounded-3xl p-6 border border-white/5">
              <h4 className="font-bold text-sm text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                <AlertCircle size={16} /> Areas to Improve
              </h4>
              <div className="space-y-4">
                {analysisResult.improvements.map((improvement, idx) => (
                  <div key={idx} className="bg-black/20 rounded-2xl p-4 border border-white/5">
                    <p className="text-sm font-medium text-white/90 leading-relaxed whitespace-pre-line">
                      {improvement}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Coach Tip */}
          {analysisResult?.aiCoachTip && (
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl p-6 border-2 border-primary/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
              <div className="relative">
                <h4 className="font-bold text-base text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Sparkles size={18} /> {analysisResult.aiCoachTip.title}
                </h4>
                <p className="text-sm font-semibold text-white mb-3 leading-relaxed">
                  {analysisResult.aiCoachTip.mainIssueTitle}
                </p>
                <div className="bg-black/30 rounded-xl p-4 mb-3">
                  <p className="text-sm font-medium text-white/90 leading-relaxed whitespace-pre-line">
                    {analysisResult.aiCoachTip.body}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Target size={16} className="text-primary" />
                  <p className="text-xs font-bold text-white">
                    With focused practice, you can reach <span className="text-primary text-base">{analysisResult.aiCoachTip.targetScore}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Suggested Drills */}
          <div className="bg-surface rounded-3xl p-6 border border-white/5">
            <h4 className="font-bold text-sm text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <Dumbbell size={16} className="text-primary" /> Suggested Drills (10 min)
            </h4>
            <div className="space-y-4">
              <div>
                <p className="font-bold text-sm text-white mb-1">Form shooting (1 hand) — 3×10 reps</p>
                <p className="text-xs text-muted">Focus on shoulder-elbow-wrist alignment with a soft release.</p>
              </div>
              <div>
                <p className="font-bold text-sm text-white mb-1">Follow-through hold — 3×8 shots</p>
                <p className="text-xs text-muted">Hold your wrist "down" for 1 second after release.</p>
              </div>
              <div>
                <p className="font-bold text-sm text-white mb-1">Stick landing — 3×6 shots</p>
                <p className="text-xs text-muted">Finish balanced and still when you land.</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setViewState('selection');
              setSelectedShot(null);
              setVideoUrl(null);
              setAnalysisResult(null);
            }}
            className="w-full bg-primary text-black font-extrabold text-sm py-4 rounded-2xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles size={18} />
            Analyze Another Shot
          </button>
        </div>
      </div>
    );
  };


  // -- Main Render Switch --
  return (
    <>
      {viewState === 'selection' && renderSelection()}
      {viewState === 'upload' && renderUpload()}
      {viewState === 'preview' && renderPreview()}
      {viewState === 'analyzing' && renderAnalyzing()}
      {viewState === 'results' && renderResults()}

      {/* Reused Tips Modal */}
      {showTips && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowTips(false)}></div>
          <div className="relative bg-[#141414] w-full max-w-lg rounded-3xl border border-white/10 p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-300 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-extrabold text-lg tracking-tight flex items-center gap-2">
                <Camera size={20} className="text-primary" />
                Recording Tips
              </h3>
              <button onClick={() => setShowTips(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10">
                <X size={20} />
              </button>
            </div>
             {/* ... existing tip content ... */}
             <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden mb-6 border border-white/10 group cursor-pointer">
               <img 
                 src="https://images.unsplash.com/photo-1505666287802-931dc83948e9?auto=format&fit=crop&w=600&q=80" 
                 alt="Basketball Form Example" 
                 className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
               />
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-primary/90 text-black flex items-center justify-center shadow-[0_0_30px_rgba(249,128,6,0.4)] transition-transform group-hover:scale-110">
                    <Play size={24} fill="currentColor" />
                  </div>
               </div>
               <div className="absolute bottom-3 right-3 bg-black/80 px-2 py-1 rounded text-[10px] font-bold">0:15 Example</div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="mt-1">
                  <CheckCircle2 size={20} className="text-green-500" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Full Body Visibility</h4>
                  <p className="text-xs text-muted mt-1 leading-relaxed">Ensure the camera captures you from head to toe, including the jump and landing.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="mt-1">
                  <CheckCircle2 size={20} className="text-green-500" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Side Profile Angle</h4>
                  <p className="text-xs text-muted mt-1 leading-relaxed">Record from a 90-degree side angle for the best analysis of your release point and elbow alignment.</p>
                </div>
              </div>
            </div>
            <button onClick={() => setShowTips(false)} className="w-full mt-8 bg-surface border border-white/10 hover:bg-white/5 text-white font-bold py-3.5 rounded-xl transition-colors text-sm">Got it</button>
          </div>
        </div>
      )}
    </>
  );
};