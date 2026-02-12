import React, { useState, useRef, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowUpCircle,
  Camera as CameraIcon,
  CheckCircle2,
  CircleDashed,
  Dumbbell,
  Image as ImageIcon,
  Info,
  Loader2,
  Play,
  Sparkles,
  Target,
  Upload,
  X,
} from 'lucide-react';
import type { AnalysisResult } from '../types';
import { analyzeVideo } from '../services/shotAnalyzer';
import { useAuth } from '../contexts/AuthContext';
import { saveShotAnalysis } from '../services/analysisStorage';
import { addToCache } from '../utils/analysisCache';

const SHOT_TYPES = [
  { id: '3pt', title: '3-Pointer', icon: CircleDashed, desc: 'Deep range mechanics' },
  { id: 'ft', title: 'Free Throw', icon: ArrowUpCircle, desc: 'Routine & consistency' },
  { id: 'layup', title: 'Layup', icon: Activity, desc: 'Finishing at the rim' },
  { id: 'mid', title: 'Mid-Range', icon: Target, desc: 'Pull-up jump shot' },
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
  "Creating your improvement plan…",
];

type Step = 'selection' | 'source' | 'preview' | 'analyzing' | 'results' | 'tips';

type Props = {
  onBack: () => void;
  onDone: () => void;
};

const isNative = Capacitor.isNativePlatform();

export default function OnboardingShotAnalysisView({ onBack, onDone }: Props) {
  const { user, updateProfile } = useAuth();
  const userId = user?.id ?? null;

  const [step, setStep] = useState<Step>('selection');
  const [selectedShot, setSelectedShot] = useState<typeof SHOT_TYPES[0] | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [showTips, setShowTips] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  useEffect(() => {
    if (step === 'analyzing') {
      const interval = setInterval(() => {
        setLoadingStepIndex(prev => (prev + 1) % LOADING_STEPS.length);
      }, 1200);
      return () => clearInterval(interval);
    }
  }, [step]);

  useEffect(() => {
    if (step === 'results' && analysisResult && !analysisResult.isInvalid) {
      let start = 0;
      const end = analysisResult.score;
      const duration = 2500;
      const increment = end / (duration / 16);
      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setDisplayScore(end);
          clearInterval(timer);
        } else {
          setDisplayScore(Math.floor(start));
        }
      }, 16);
      return () => clearInterval(timer);
    }
  }, [step, analysisResult]);

  const handleCardClick = (shot: typeof SHOT_TYPES[0]) => {
    setSelectedShot(shot);
    setStep('source');
  };

  const handleSourceSelect = async (source: 'camera' | 'gallery') => {
    if (isNative) {
      try {
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
        });

        if (image.webPath) {
          setVideoUrl(image.webPath);
          setStep('preview');
        }
      } catch (error) {
        console.error('Camera error:', error);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setStep('preview');
    }
  };

  const startAnalysis = async () => {
    console.log("[ONBOARDING] startAnalysis", { ts: Date.now(), videoUrl, shotType: selectedShot?.id });

    console.log("[ONBOARDING] setStep -> analyzing");
    setStep('analyzing');
    setLoadingStepIndex(0);
    setDisplayScore(0);

    if (!videoUrl) return;

    try {
      console.log("[ONBOARDING] analyzeVideo begin");
      const result = await analyzeVideo(videoUrl, () => {});
      console.log("[ONBOARDING] analyzeVideo success", { score: result?.score, isInvalid: result?.isInvalid });
      setAnalysisResult(result);

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
          addToCache(userId, row);
        } catch (saveError) {
          console.warn('[ONBOARDING ANALYSIS] save error:', saveError);
        }
      }

      setTimeout(() => {
        console.log("[ONBOARDING] setStep -> results");
        setStep('results');
      }, 800);
    } catch (error) {
      console.error('[ONBOARDING] Analysis error:', error);
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
        totalFrames: 0,
      });
      console.log("[ONBOARDING] setStep -> results (after error)");
      setStep('results');
    }
  };

  const handleDone = async () => {
    await updateProfile({ onboarding_completed: true });
    onDone();
  };

  const handleBackClick = () => {
    if (step === 'source') {
      setStep('selection');
      setSelectedShot(null);
    } else if (step === 'preview') {
      setStep('source');
      setVideoUrl(null);
    } else {
      onBack();
    }
  };

  const renderSelection = () => (
    <div className="h-full flex flex-col pt-6 pb-28 animate-in zoom-in-95 fade-in duration-300">
      <div className="mb-6 px-4">
        <button onClick={onBack} className="p-2 bg-white/5 rounded-full hover:bg-white/10">
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="text-center mb-8 px-4">
        <h2 className="text-3xl font-extrabold tracking-tight mb-2">Record Your First Shot</h2>
        <p className="text-muted text-sm font-medium">Choose your shot type to begin</p>
      </div>

      <div className="grid grid-cols-2 gap-4 px-4">
        {SHOT_TYPES.map((shot) => {
          const Icon = shot.icon;
          return (
            <button
              key={shot.id}
              onClick={() => handleCardClick(shot)}
              className="relative h-[180px] rounded-3xl bg-surface p-6 border border-white/5 hover:border-primary/30 active:scale-[0.98] transition-all flex flex-col items-center justify-center text-center group"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-all">
                <Icon size={32} className="text-primary" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{shot.title}</h3>
              <p className="text-xs text-muted">{shot.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderSource = () => (
    <div className="h-full flex flex-col justify-center pb-28 animate-in slide-in-from-right duration-300 px-4">
      <div className="mb-6">
        <button onClick={handleBackClick} className="p-2 bg-white/5 rounded-full hover:bg-white/10">
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="text-center mb-12">
        <h2 className="text-3xl font-extrabold tracking-tight mb-3">{selectedShot?.title}</h2>
        <p className="text-muted text-sm font-medium">Choose your video source</p>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => handleSourceSelect('camera')}
          className="w-full bg-primary text-black rounded-3xl p-6 flex items-center gap-4 hover:bg-primary/90 active:scale-[0.98] transition-all"
        >
          <div className="w-14 h-14 rounded-2xl bg-black/20 flex items-center justify-center">
            <CameraIcon size={28} />
          </div>
          <div className="flex-1 text-left">
            <h3 className="font-extrabold text-base">Record Video</h3>
            <p className="text-xs opacity-80 font-medium">Use your camera</p>
          </div>
        </button>

        <button
          onClick={() => handleSourceSelect('gallery')}
          className="w-full bg-surface text-white rounded-3xl p-6 flex items-center gap-4 border border-white/10 hover:bg-white/5 active:scale-[0.98] transition-all"
        >
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
            <ImageIcon size={28} />
          </div>
          <div className="flex-1 text-left">
            <h3 className="font-bold text-base">Choose from Gallery</h3>
            <p className="text-xs text-muted font-medium">Upload existing video</p>
          </div>
        </button>

        <button
          onClick={() => setShowTips(true)}
          className="w-full bg-white/5 text-white rounded-2xl p-4 flex items-center justify-center gap-2 border border-white/5 hover:bg-white/10 transition-all"
        >
          <Info size={18} className="text-primary" />
          <span className="text-sm font-bold">Recording Tips</span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );

  const renderPreview = () => (
    <div className="h-full flex flex-col justify-center pb-28 animate-in slide-in-from-right duration-300 px-4">
      <div className="mb-6">
        <button onClick={handleBackClick} className="p-2 bg-white/5 rounded-full hover:bg-white/10">
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-extrabold tracking-tight mb-2">Preview Your Shot</h2>
        <p className="text-muted text-sm font-medium">Ready to analyze?</p>
      </div>

      <div className="relative w-full aspect-[9/16] max-h-[60vh] rounded-3xl overflow-hidden border border-white/10 mb-8">
        {videoUrl && (
          <video
            src={videoUrl}
            className="w-full h-full object-cover"
            controls
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
      </div>

      <button
        onClick={startAnalysis}
        className="w-full bg-primary text-black font-extrabold text-sm py-4 rounded-2xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
      >
        <Sparkles size={18} />
        Start Analysis
      </button>
    </div>
  );

  const renderAnalyzing = () => (
    <div className="h-full flex flex-col justify-center animate-in fade-in duration-700 relative pb-20 px-4">
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

        <div className="absolute inset-0 bg-primary/5 z-10"></div>
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
          <div className="w-full absolute top-0 h-1 bg-primary/50 shadow-[0_0_15px_#f98006] animate-[scan_2s_ease-in-out_infinite]"></div>
        </div>

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
        <div className="pb-24 animate-in slide-in-from-bottom-8 duration-700 px-4">
          <div className="flex flex-col items-center justify-center py-12 mt-6">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
              <AlertCircle size={48} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight mb-3 text-center">Unable to Analyze</h2>
            <p className="text-muted text-sm font-medium text-center max-w-[280px] leading-relaxed mb-8">
              {analysisResult.messageIfInvalid}
            </p>
            <button
              onClick={() => {
                setStep('selection');
                setSelectedShot(null);
                setVideoUrl(null);
                setAnalysisResult(null);
              }}
              className="bg-primary text-black font-extrabold text-sm py-4 px-8 rounded-2xl hover:bg-primary/90 transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="pb-24 animate-in slide-in-from-bottom-8 duration-700 px-4">
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

        <div className={`space-y-6 transition-all duration-1000 delay-500 ${displayScore > 20 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
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
            onClick={handleDone}
            className="w-full bg-primary text-black font-extrabold text-sm py-4 rounded-2xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={18} />
            Done
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="min-h-screen bg-background text-white max-w-md mx-auto">
        {step === 'selection' && renderSelection()}
        {step === 'source' && renderSource()}
        {step === 'preview' && renderPreview()}
        {step === 'analyzing' && renderAnalyzing()}
        {step === 'results' && renderResults()}
      </div>

      {showTips && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowTips(false)}></div>
          <div className="relative bg-[#141414] w-full max-w-lg rounded-3xl border border-white/10 p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-300 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-extrabold text-lg tracking-tight flex items-center gap-2">
                <CameraIcon size={20} className="text-primary" />
                Recording Tips
              </h3>
              <button onClick={() => setShowTips(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10">
                <X size={20} />
              </button>
            </div>
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
}
