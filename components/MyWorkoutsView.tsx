import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bookmark } from "lucide-react";
import { PRESET_WORKOUTS } from "./DrillsView";
import { useAuth } from "../contexts/AuthContext";
import { getSavedWorkoutIds, unsaveWorkout } from "../services/savedWorkoutsService";

interface MyWorkoutsViewProps {
  onBack: () => void;
  onSelectWorkout: (workout: any) => void;
}

export const MyWorkoutsView: React.FC<MyWorkoutsViewProps> = ({
  onBack,
  onSelectWorkout,
}) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!userId) {
        setSavedIds([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const ids = await getSavedWorkoutIds(userId);
      if (!mounted) return;
      setSavedIds(ids);
      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const savedWorkouts = useMemo(() => {
    return savedIds.map((id) => {
      const preset = PRESET_WORKOUTS.find((w) => w.title === id);
      return (
        preset ?? {
          title: id,
          image: "",
          duration: "",
          intensity: "",
          category: "Saved",
        }
      );
    });
  }, [savedIds]);

  const handleRemove = async (workoutId: string) => {
    if (!userId) return;
    const ok = await unsaveWorkout(userId, workoutId);
    if (!ok) return;
    setSavedIds((prev) => prev.filter((x) => x !== workoutId));
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-6 mt-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl p-2 hover:bg-white/5 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>

        <h3 className="text-2xl font-extrabold tracking-tight">My Workouts</h3>

        <div className="w-10" />
      </div>

      {!userId ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
          Sign in to save workouts.
        </div>
      ) : loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
          Loading...
        </div>
      ) : savedWorkouts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
          No saved workouts yet.
        </div>
      ) : (
        <div className="space-y-3">
          {savedWorkouts.map((w) => (
            <div
              key={w.title}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
            >
              <button
                type="button"
                className="flex-1 text-left"
                onClick={() => onSelectWorkout(w)}
              >
                <div className="text-sm font-bold">{w.title}</div>
                <div className="text-[11px] text-white/70">
                  {w.duration ? `${w.duration} • ` : ""}
                  {w.intensity ? `${w.intensity} • ` : ""}
                  {w.category}
                </div>
              </button>

              <button
                type="button"
                onClick={() => void handleRemove(w.title)}
                className="rounded-xl p-2 hover:bg-white/5 transition-colors"
                aria-label="Remove saved workout"
                title="Remove"
              >
                <Bookmark size={18} fill="currentColor" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
