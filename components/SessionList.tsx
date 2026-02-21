import React, { useMemo, useState } from 'react';
import { Dribbble } from 'lucide-react';
import { Session } from '../types';

interface SessionListProps {
  sessions: Session[];
}

export const SessionList: React.FC<SessionListProps> = ({ sessions }) => {
  const MAX_VISIBLE = 5;
  const [showAll, setShowAll] = useState(false);

  const hasMoreThanMax = sessions.length > MAX_VISIBLE;

  const visibleSessions = useMemo(() => {
    if (showAll) return sessions;
    return sessions.slice(0, MAX_VISIBLE);
  }, [sessions, showAll]);

  return (
    <section className="mt-10 mb-28">
      <h3 className="text-xl font-extrabold mb-6 tracking-tight">Recent Sessions</h3>
      <div className="flex flex-col gap-5">
        {visibleSessions.map((session) => (
          <div key={session.id} className="flex items-center justify-between group cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="bg-surface p-3 rounded-2xl border border-white/5 group-hover:border-primary/50 transition-colors">
                 <Dribbble className="text-primary" size={24} />
              </div>
              <div className="flex flex-col">
                <h4 className="text-sm font-bold tracking-tight">{session.title}</h4>
                <span className="text-[10px] text-muted font-bold uppercase tracking-wider mt-0.5">{session.timestamp}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-sm font-extrabold ${session.accuracy >= 80 ? 'text-primary' : 'text-white'}`}>
                {session.score}
              </span>
            </div>
          </div>
        ))}
      </div>

      {hasMoreThanMax && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-extrabold tracking-tight hover:border-primary/40 hover:bg-white/10 transition-colors"
          >
            {showAll ? "Show less" : `Show all (${sessions.length})`}
          </button>
        </div>
      )}
    </section>
  );
};