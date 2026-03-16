import React, { useState, useMemo, useRef } from 'react';
import { Exercise, UserProfile } from '../types';
import { getMonday, getWeekId, getExerciseEffectiveWeightKg, getExerciseVolumeKg } from '../utils';
import { generateWeeklyAnalysis } from '../services/geminiService';
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { Sparkles, TrendingUp, CalendarDays, Loader2, Info, Sun, Dumbbell, Table2 } from 'lucide-react';
import { Button } from './Button';

interface StatsReportProps {
  exercises: Exercise[];
  userProfile: UserProfile;
}

type ReportPage = 'weekly' | 'ai';

export const StatsReport: React.FC<StatsReportProps> = ({ exercises, userProfile }) => {
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(getMonday(new Date()));
  const [reportPage, setReportPage] = useState<ReportPage>('weekly');
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchDeltaRef = useRef({ x: 0, y: 0 });
  const SWIPE_THRESHOLD_PX = 50;
  const HORIZONTAL_SWIPE_RATIO = 1.2;

  const analysisWindow = useMemo(() => {
    const start = new Date(selectedWeekStart);
    start.setDate(start.getDate() - (11 * 7));
    start.setHours(0, 0, 0, 0);

    const end = new Date(selectedWeekStart);
    end.setDate(end.getDate() + 7);
    end.setHours(0, 0, 0, 0);

    return {
      start,
      end,
      exercises: exercises.filter(ex => {
        const exDate = new Date(ex.date).getTime();
        return exDate >= start.getTime() && exDate < end.getTime();
      }),
    };
  }, [exercises, selectedWeekStart]);

  const analysisEndDate = useMemo(
    () => new Date(analysisWindow.end.getTime() - 86400000),
    [analysisWindow.end]
  );

  const weeklyExercises = useMemo(() => {
    const weekStartMs = selectedWeekStart.getTime();
    const weekEndMs = weekStartMs + (7 * 24 * 60 * 60 * 1000);

    return exercises.filter(ex => {
      const exDate = new Date(ex.date).getTime();
      return exDate >= weekStartMs && exDate < weekEndMs;
    });
  }, [exercises, selectedWeekStart]);

  const dailyChartData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = days.map(day => ({ name: day, sets: 0 }));

    weeklyExercises.forEach(ex => {
      const d = new Date(ex.date);
      const dayIndex = d.getDay() === 0 ? 6 : d.getDay() - 1;
      if (data[dayIndex]) {
        data[dayIndex].sets += ex.sets;
      }
    });

    return data;
  }, [weeklyExercises]);

  const groupedStats = useMemo(() => {
    const groups: Record<string, {
      totalVolumeKg: number,
      weights: Record<string, { weightKg: number; reps: number }>
    }> = {};

    weeklyExercises.forEach(ex => {
      if (!groups[ex.name]) {
        groups[ex.name] = { totalVolumeKg: 0, weights: {} };
      }

      const entryReps = ex.sets * ex.reps;
      const effectiveWeightKg = Math.round(getExerciseEffectiveWeightKg(ex) * 100) / 100;
      const weightKey = String(effectiveWeightKg);

      if (!groups[ex.name].weights[weightKey]) {
        groups[ex.name].weights[weightKey] = {
          weightKg: effectiveWeightKg,
          reps: 0,
        };
      }

      groups[ex.name].weights[weightKey].reps += entryReps;
      groups[ex.name].totalVolumeKg += getExerciseVolumeKg(ex);
    });

    return Object.entries(groups)
      .map(([name, data]) => ({
        name,
        totalVolumeKg: data.totalVolumeKg,
        weights: Object.values(data.weights).sort((a, b) => b.weightKg - a.weightKg)
      }))
      .sort((a, b) => b.totalVolumeKg - a.totalVolumeKg);
  }, [weeklyExercises]);

  const totalSets = weeklyExercises.reduce((acc, curr) => acc + curr.sets, 0);
  const totalVolume = weeklyExercises.reduce((acc, curr) => acc + getExerciseVolumeKg(curr), 0);

  const handleGenerateReport = async () => {
    setLoading(true);
    const report = await generateWeeklyAnalysis(
      analysisWindow.exercises,
      selectedWeekStart.toLocaleDateString(),
      analysisWindow.start.toLocaleDateString(),
      analysisEndDate.toLocaleDateString(),
      userProfile
    );
    setAiReport(report);
    setLoading(false);
  };

  const shiftWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedWeekStart);
    newDate.setDate(selectedWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedWeekStart(newDate);
    setAiReport(null);
  };

  const now = new Date();
  const isMonday = now.getDay() === 1;
  const isAfterNoon = now.getHours() >= 12;
  const isViewingCurrentWeek = getWeekId(selectedWeekStart) === getWeekId(now);
  const previousWeekDate = new Date(now);
  previousWeekDate.setDate(previousWeekDate.getDate() - 7);
  const isViewingPreviousWeek = getWeekId(selectedWeekStart) === getWeekId(getMonday(previousWeekDate));

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    touchDeltaRef.current = { x: 0, y: 0 };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchDeltaRef.current = {
      x: touch.clientX - touchStartRef.current.x,
      y: touch.clientY - touchStartRef.current.y,
    };
  };

  const resetTouch = () => {
    touchStartRef.current = null;
    touchDeltaRef.current = { x: 0, y: 0 };
  };

  const handleTouchEnd = () => {
    const { x, y } = touchDeltaRef.current;
    resetTouch();

    if (Math.abs(x) < SWIPE_THRESHOLD_PX) return;
    if (Math.abs(x) <= Math.abs(y) * HORIZONTAL_SWIPE_RATIO) return;

    if (x < 0) {
      if (!isViewingCurrentWeek) {
        shiftWeek('next');
      }
      return;
    }

    shiftWeek('prev');
  };

  return (
    <div
      className="pb-24 pt-4 px-4 max-w-2xl mx-auto w-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={resetTouch}
      style={{ touchAction: 'pan-y' }}
    >
      <div className="flex items-center justify-between mb-6 bg-card p-2 rounded-xl border border-slate-700/50 sticky top-0 z-20 backdrop-blur-md bg-opacity-90 shadow-lg">
        <button onClick={() => shiftWeek('prev')} className="p-3 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
          <CalendarDays size={20} />
        </button>
        <div className="text-center">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Weekly Overview</p>
          <p className="text-white font-semibold">
            {selectedWeekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {' '}
            {new Date(selectedWeekStart.getTime() + 6 * 86400000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => shiftWeek('next')}
          className="p-3 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors disabled:opacity-30"
          disabled={isViewingCurrentWeek}
        >
          <CalendarDays size={20} />
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-slate-700/50 bg-card p-1">
        <button
          onClick={() => setReportPage('weekly')}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            reportPage === 'weekly' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Weekly Summary
        </button>
        <button
          onClick={() => setReportPage('ai')}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            reportPage === 'ai' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          AI Coach Report
        </button>
      </div>

      {reportPage === 'weekly' ? (
        <>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-card p-5 rounded-2xl border border-slate-700/50 relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <TrendingUp size={64} />
              </div>
              <div className="flex items-center gap-2 mb-2 text-slate-400">
                <TrendingUp size={16} />
                <span className="text-xs font-bold uppercase">Total Volume</span>
              </div>
              <p className="text-3xl font-bold text-white tracking-tight">{Math.round(totalVolume).toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">kg total</p>
            </div>
            <div className="bg-card p-5 rounded-2xl border border-slate-700/50 relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Dumbbell size={64} />
              </div>
              <div className="flex items-center gap-2 mb-2 text-slate-400">
                <Dumbbell size={16} />
                <span className="text-xs font-bold uppercase">Total Sets</span>
              </div>
              <p className="text-3xl font-bold text-primary tracking-tight">{totalSets}</p>
              <p className="text-xs text-slate-500 mt-1">Sets completed</p>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-slate-700/50 mb-8 overflow-hidden shadow-lg">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Table2 size={18} className="text-primary" />
                Training Statistics
              </h3>
            </div>

            <div className="divide-y divide-slate-800">
              {groupedStats.length > 0 ? (
                groupedStats.map((exercise, idx) => (
                  <div key={idx} className="p-5 hover:bg-slate-800/20 transition-colors">
                    <div className="flex justify-between items-baseline mb-3">
                      <h4 className="text-lg font-bold text-slate-200">{exercise.name}</h4>
                      <span className="text-xs text-slate-500 font-mono">Vol: {Math.round(exercise.totalVolumeKg).toLocaleString()} kg</span>
                    </div>

                    <div className="space-y-2">
                      {exercise.weights.map((w, wIdx) => (
                        <div key={wIdx} className="flex items-center justify-between group">
                          <div className="flex items-center gap-3 w-full">
                            <div className="bg-slate-800 border border-slate-700 text-primary font-bold px-3 py-1 rounded-md min-w-[80px] text-center text-sm shadow-sm">
                              {w.weightKg} <span className="text-[10px] font-normal text-slate-500">kg total</span>
                            </div>
                            <div className="h-[1px] bg-slate-800 flex-1"></div>
                            <div className="text-white font-mono font-medium flex items-center gap-1">
                              <span className="text-lg">{w.reps}</span>
                              <span className="text-xs text-slate-500">total reps</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No workout data for this week.
                </div>
              )}
            </div>
          </div>

          <div className="bg-card p-6 rounded-2xl border border-slate-700/50 mb-8 h-64 shadow-lg">
            <h3 className="text-slate-300 text-sm font-semibold mb-6">Daily Frequency</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.5} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                />
                <Bar dataKey="sets" radius={[4, 4, 0, 0]} barSize={30} fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <>
          {isMonday && isAfterNoon && isViewingPreviousWeek && (
            <div className="mb-6 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/50 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sun className="text-yellow-400" size={24} />
                <div>
                  <h3 className="text-indigo-200 font-semibold">
                    Monday Noon Check-in
                  </h3>
                  <p className="text-indigo-300/70 text-sm">
                    Time to review last week&apos;s complete stats.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 relative overflow-hidden transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[50px] rounded-full"></div>

            <div className="mb-4 text-xs text-slate-400 relative z-10">
              Analysis range: {analysisWindow.start.toLocaleDateString()} - {analysisEndDate.toLocaleDateString()}
            </div>

            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-2">
                <Sparkles className="text-yellow-400" size={20} />
                <h3 className="text-white font-bold text-lg">AI Coach Report</h3>
                <button
                  onClick={() => setShowInfo(!showInfo)}
                  className="text-slate-500 hover:text-slate-300 transition-colors ml-1"
                >
                  <Info size={16} />
                </button>
              </div>
              {!aiReport && analysisWindow.exercises.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleGenerateReport}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-xs px-3 shadow-indigo-500/20"
                >
                  {loading ? <Loader2 className="animate-spin" size={14} /> : 'Generate Analysis'}
                </Button>
              )}
            </div>

            {showInfo && (
              <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-600 mb-4 text-xs text-slate-300 relative z-20 animate-in fade-in slide-in-from-top-1">
                <p className="font-semibold mb-1 text-white">Model Info:</p>
                <p>Powered by <strong>Gemini 3 Flash Preview</strong>.</p>
              </div>
            )}

            <div className="relative z-10 min-h-[100px]">
              {loading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-700 rounded w-full"></div>
                  <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                </div>
              ) : aiReport ? (
                <div className="prose prose-invert prose-sm">
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{aiReport}</p>
                </div>
              ) : analysisWindow.exercises.length === 0 ? (
                <p className="text-slate-500 text-sm italic">
                  No data available for the selected analysis range.
                </p>
              ) : (
                <p className="text-slate-400 text-sm">
                  Tap &quot;Generate Analysis&quot; to get your coach insights for this selected week context.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
