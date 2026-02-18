import React, { useState, useMemo } from 'react';
import { Exercise } from '../types';
import { getMonday, getWeekId } from '../utils';
import { generateWeeklyAnalysis } from '../services/geminiService';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { Sparkles, BrainCircuit, TrendingUp, CalendarDays, Loader2, Info, Sun, Dumbbell, Trophy, Table2 } from 'lucide-react';
import { Button } from './Button';

interface StatsReportProps {
  exercises: Exercise[];
}

export const StatsReport: React.FC<StatsReportProps> = ({ exercises }) => {
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(getMonday(new Date()));
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Filter exercises for the selected week
  const weeklyExercises = useMemo(() => {
    const weekStartMs = selectedWeekStart.getTime();
    const weekEndMs = weekStartMs + (7 * 24 * 60 * 60 * 1000);
    
    return exercises.filter(ex => {
      const exDate = new Date(ex.date).getTime();
      return exDate >= weekStartMs && exDate < weekEndMs;
    });
  }, [exercises, selectedWeekStart]);

  // Chart 1: Daily Activity
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

  // Statistics Grouped: Exercise -> Weight -> Total Reps
  const groupedStats = useMemo(() => {
    // Structure: { "Bench Press": { totalVolume: 1000, weights: { 100: 10, 80: 20 } } }
    const groups: Record<string, { totalVolume: number, weights: Record<number, number> }> = {};

    weeklyExercises.forEach(ex => {
        if (!groups[ex.name]) {
            groups[ex.name] = { totalVolume: 0, weights: {} };
        }
        
        // Calculate total reps for this specific entry
        const entryReps = ex.sets * ex.reps;
        
        // Add to weight bucket
        if (!groups[ex.name].weights[ex.weight]) {
            groups[ex.name].weights[ex.weight] = 0;
        }
        groups[ex.name].weights[ex.weight] += entryReps;

        // Track total volume for sorting importance
        groups[ex.name].totalVolume += (ex.weight * ex.sets * ex.reps);
    });

    // Convert to array and sort
    return Object.entries(groups)
        .map(([name, data]) => ({
            name,
            totalVolume: data.totalVolume,
            // Convert weights map to array and sort by weight DESC (heaviest first)
            weights: Object.entries(data.weights)
                .map(([w, r]) => ({ weight: Number(w), reps: r }))
                .sort((a, b) => b.weight - a.weight)
        }))
        // Sort exercises by total volume DESC (most trained first)
        .sort((a, b) => b.totalVolume - a.totalVolume);

  }, [weeklyExercises]);

  const totalSets = weeklyExercises.reduce((acc, curr) => acc + curr.sets, 0);
  const totalVolume = weeklyExercises.reduce((acc, curr) => acc + (curr.sets * curr.reps * curr.weight), 0);
  
  const handleGenerateReport = async () => {
    setLoading(true);
    const report = await generateWeeklyAnalysis(weeklyExercises, selectedWeekStart.toLocaleDateString());
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

  return (
    <div className="pb-24 pt-4 px-4 max-w-2xl mx-auto w-full">
      
      {/* Week Navigator */}
      <div className="flex items-center justify-between mb-8 bg-card p-2 rounded-xl border border-slate-700/50 sticky top-0 z-20 backdrop-blur-md bg-opacity-90 shadow-lg">
        <button onClick={() => shiftWeek('prev')} className="p-3 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
          <CalendarDays size={20} />
        </button>
        <div className="text-center">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Weekly Overview 本週概覽</p>
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

      {/* Monday Alert */}
      {isMonday && isViewingCurrentWeek && (
        <div className="mb-6 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/50 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
                {isAfterNoon ? <Sun className="text-yellow-400" size={24} /> : <BrainCircuit className="text-indigo-400" size={24} />}
                <div>
                    <h3 className="text-indigo-200 font-semibold">
                      {isAfterNoon ? "Monday Noon Check-in 週一午安" : "Monday Start 週一早安"}
                    </h3>
                    <p className="text-indigo-300/70 text-sm">
                      {isAfterNoon 
                        ? "Time to review your stats! 快來看看本週數據！" 
                        : "Ready to crush this week? 準備好開始了嗎？"}
                    </p>
                </div>
            </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-card p-5 rounded-2xl border border-slate-700/50 relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp size={64} />
          </div>
          <div className="flex items-center gap-2 mb-2 text-slate-400">
            <TrendingUp size={16} />
            <span className="text-xs font-bold uppercase">Total Volume 總容量</span>
          </div>
          <p className="text-3xl font-bold text-white tracking-tight">{totalVolume.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">kg lifted (Sum of all sets)</p>
        </div>
        <div className="bg-card p-5 rounded-2xl border border-slate-700/50 relative overflow-hidden group">
           <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Dumbbell size={64} />
          </div>
           <div className="flex items-center gap-2 mb-2 text-slate-400">
            <Dumbbell size={16} />
            <span className="text-xs font-bold uppercase">Total Sets 總組數</span>
          </div>
          <p className="text-3xl font-bold text-primary tracking-tight">{totalSets}</p>
          <p className="text-xs text-slate-500 mt-1">Sets completed</p>
        </div>
      </div>

      {/* NEW: Detailed Training Statistics (Grouped List) */}
      <div className="bg-card rounded-2xl border border-slate-700/50 mb-8 overflow-hidden shadow-lg">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
            <h3 className="text-white font-bold flex items-center gap-2">
                <Table2 size={18} className="text-primary"/>
                Training Statistics 訓練統計
            </h3>
            <span className="text-[10px] text-slate-500 font-mono bg-slate-900/50 px-2 py-1 rounded">
                WEIGHT • TOTAL REPS
            </span>
        </div>
        
        <div className="divide-y divide-slate-800">
            {groupedStats.length > 0 ? (
                groupedStats.map((exercise, idx) => (
                    <div key={idx} className="p-5 hover:bg-slate-800/20 transition-colors">
                        {/* Exercise Header */}
                        <div className="flex justify-between items-baseline mb-3">
                            <h4 className="text-lg font-bold text-slate-200">{exercise.name}</h4>
                            <span className="text-xs text-slate-500 font-mono">Vol: {exercise.totalVolume.toLocaleString()}kg</span>
                        </div>
                        
                        {/* Weight Breakdowns */}
                        <div className="space-y-2">
                            {exercise.weights.map((w, wIdx) => (
                                <div key={wIdx} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3 w-full">
                                        {/* Weight Pill */}
                                        <div className="bg-slate-800 border border-slate-700 text-primary font-bold px-3 py-1 rounded-md min-w-[80px] text-center text-sm shadow-sm">
                                            {w.weight} <span className="text-[10px] font-normal text-slate-500">kg</span>
                                        </div>
                                        {/* Visual Line Connector */}
                                        <div className="h-[1px] bg-slate-800 flex-1"></div>
                                        {/* Reps Count */}
                                        <div className="text-white font-mono font-medium flex items-center gap-1">
                                            <span className="text-lg">{w.reps}</span>
                                            <span className="text-xs text-slate-500">reps</span>
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
                    <br/>本週尚無訓練數據。
                </div>
            )}
        </div>
      </div>

      {/* Chart 2: Daily Sets Activity */}
      <div className="bg-card p-6 rounded-2xl border border-slate-700/50 mb-8 h-64 shadow-lg">
        <h3 className="text-slate-300 text-sm font-semibold mb-6">Daily Frequency 每日頻率</h3>
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

      {/* AI Coach Section */}
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[50px] rounded-full"></div>
        
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="text-yellow-400" size={20} />
            <h3 className="text-white font-bold text-lg">AI Coach Report 教練分析</h3>
            <button 
              onClick={() => setShowInfo(!showInfo)}
              className="text-slate-500 hover:text-slate-300 transition-colors ml-1"
            >
              <Info size={16} />
            </button>
          </div>
          {!aiReport && weeklyExercises.length > 0 && (
            <Button 
                size="sm" 
                onClick={handleGenerateReport} 
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-xs px-3 shadow-indigo-500/20"
            >
              {loading ? <Loader2 className="animate-spin" size={14} /> : 'Generate Analysis 生成分析'}
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
          ) : weeklyExercises.length === 0 ? (
            <p className="text-slate-500 text-sm italic">No data available. 本週尚無數據可分析</p>
          ) : (
            <p className="text-slate-400 text-sm">
              Tap "Generate Analysis" for insights. 點擊「生成分析」獲取本週表現詳情與建議。
            </p>
          )}
        </div>
      </div>
    </div>
  );
};