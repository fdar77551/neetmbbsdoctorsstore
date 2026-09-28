import React from 'react';
import { X, Trophy, Medal, Clock, Target, CheckCircle2 } from 'lucide-react';
import { MockTest } from '../types';
import { getMockTestLeaderboard } from '../lib/mockTestData';

interface MockTestLeaderboardModalProps {
  test: MockTest;
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string | null;
}

export const MockTestLeaderboardModal: React.FC<MockTestLeaderboardModalProps> = ({
  test,
  isOpen,
  onClose,
  currentUserEmail
}) => {
  if (!isOpen) return null;

  const entries = getMockTestLeaderboard(test.id);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white p-4 sm:p-5 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-inner">
              <Trophy className="w-6 h-6 text-yellow-200" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider text-yellow-200 bg-white/10 px-2 py-0.5 rounded-full">
                All India Leaderboard
              </span>
              <h2 className="text-base sm:text-lg font-black tracking-tight font-['Outfit',sans-serif] mt-0.5 text-white line-clamp-1">
                {test.title}
              </h2>
              <p className="text-xs text-amber-100 font-medium">
                Max Marks: {test.maxMarks} • Total Questions: {test.totalQuestions}
              </p>
            </div>
          </div>
        </div>

        {/* Top 3 Podium Highlights */}
        {entries.length >= 3 && (
          <div className="bg-amber-50/70 border-b border-amber-100/80 p-3 sm:p-4 grid grid-cols-3 gap-2 text-center">
            {/* 2nd Place */}
            <div className="bg-white rounded-xl p-2.5 shadow-2xs border border-slate-200 flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-black mb-1 border border-slate-300">
                #2
              </div>
              <span className="text-xs font-bold text-slate-800 line-clamp-1">{entries[1]?.userName}</span>
              <span className="text-sm font-black text-blue-600 mt-0.5">{entries[1]?.score} <span className="text-[10px] text-slate-400">pts</span></span>
              <span className="text-[10px] text-slate-500">{entries[1]?.accuracy}% acc</span>
            </div>

            {/* 1st Place */}
            <div className="bg-gradient-to-b from-amber-100 to-amber-50 rounded-xl p-2.5 shadow-xs border border-amber-300 flex flex-col items-center -translate-y-1">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-black mb-1 shadow-xs ring-2 ring-yellow-300">
                👑
              </div>
              <span className="text-xs font-black text-amber-900 line-clamp-1">{entries[0]?.userName}</span>
              <span className="text-base font-black text-amber-600 mt-0.5">{entries[0]?.score} <span className="text-[10px] text-amber-700">pts</span></span>
              <span className="text-[10px] font-bold text-amber-700">{entries[0]?.accuracy}% acc</span>
            </div>

            {/* 3rd Place */}
            <div className="bg-white rounded-xl p-2.5 shadow-2xs border border-slate-200 flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-black mb-1 border border-orange-300">
                #3
              </div>
              <span className="text-xs font-bold text-slate-800 line-clamp-1">{entries[2]?.userName}</span>
              <span className="text-sm font-black text-blue-600 mt-0.5">{entries[2]?.score} <span className="text-[10px] text-slate-400">pts</span></span>
              <span className="text-[10px] text-slate-500">{entries[2]?.accuracy}% acc</span>
            </div>
          </div>
        )}

        {/* List of ranks */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-slate-100">
          {entries.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Trophy className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-600">No attempts logged yet</p>
              <p className="text-xs text-slate-400">Be the first aspirant to attempt this mock test and claim AIR #1!</p>
            </div>
          ) : (
            entries.map((entry) => {
              const isCurrentUser = currentUserEmail && entry.userId.toLowerCase() === currentUserEmail.toLowerCase();
              return (
                <div
                  key={entry.rank}
                  className={`py-2.5 px-2 sm:px-3 flex items-center justify-between gap-3 rounded-xl transition ${
                    isCurrentUser ? 'bg-blue-50/80 border border-blue-200' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                      entry.rank === 1 ? 'bg-amber-500 text-white shadow-2xs' :
                      entry.rank === 2 ? 'bg-slate-300 text-slate-800' :
                      entry.rank === 3 ? 'bg-amber-700 text-white' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      #{entry.rank}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {entry.userName}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[9px] bg-blue-600 text-white font-extrabold px-1.5 py-0.2 rounded-md uppercase">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span className="flex items-center gap-0.5">
                          <Target className="w-3 h-3 text-slate-400" />
                          {entry.accuracy}% Accuracy
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatTime(entry.timeSpentSeconds)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm sm:text-base font-black text-slate-900 font-['Outfit',sans-serif]">
                      {entry.score}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      / {entry.maxMarks}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Verified NEET CBT scoring (+4, -1)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
