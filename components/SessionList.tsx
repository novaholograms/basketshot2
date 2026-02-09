import React from 'react';
import { Dribbble } from 'lucide-react';
import { Session } from '../types';

interface SessionListProps {
  sessions: Session[];
}

export const SessionList: React.FC<SessionListProps> = ({ sessions }) => {
  return (
    <section className="mt-10 mb-28">
      <h3 className="text-xl font-extrabold mb-6 tracking-tight">Recent Sessions</h3>
      <div className="flex flex-col gap-5">
        {sessions.map((session) => (
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
    </section>
  );
};