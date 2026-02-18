import React, { useState, useEffect, useMemo } from 'react';
import { Exercise } from '../types';
import { getMonday, getWeekId } from '../utils';
import { generateWeeklyAnalysis } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Sparkles, BrainCircuit, TrendingUp, CalendarDays, Loader2, Info } from 'lucide-react';
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

  // Chart Data Preparation
  const chartData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = days.map(day => ({ name: day, sets: 0, volume: 0 }));
    
    weeklyExercises.forEach(ex => {
      const d = new Date(ex.date);
      const dayIndex = d.getDay() === 0 ? 6 : d.getDay() - 1;
      if (data[dayIndex]) {
        data[dayIndex].sets += ex.sets;
        data[dayIndex].volume += (ex.sets * ex.reps * ex.weight);
      }
    });
    return data;
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
    setAiReport(null); // Reset report when changing weeks
  };

  // Auto-suggest checking last week if it's Monday and we are viewing current week
  const isMonday = new Date().getDay() === 1;
  const isViewingCurrentWeek = getWeekId(selectedWeekStart) === getWeekId(new Date());

  return (
    <div className="pb-24 pt-4 px-4 max-w-2xl mx-auto w-full">
      
      {/* Week Navigator */}
      <div className="flex items-center justify-between mb-8 bg-card p-2 rounded-xl border border-slate-700/50">
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

      {isMonday && isViewingCurrentWeek && (
        <div 
            onClick={() => shiftWeek('prev')}
            className="mb-6 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/50 p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors"
        >
            <div className="flex items-center gap-3">
                <BrainCircuit className="text-indigo-400" size={24} />
                <div>
                    <h3 className="text-indigo-200 font-semibold">It's Monday! 週一到了！</h3>
                    <p className="text-indigo-300/70 text-sm">Tap to view last week's summary. 點擊查看上週總結</p>
                </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-card p-5 rounded-2xl border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2 text-slate-400">
            <TrendingUp size={16} />
            <span className="text-xs font-bold uppercase">Volume 容量</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalVolume.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">Total KG lifted 總負重</p>
        </div>
        <div className="bg-card p-5 rounded-2xl border border-slate-700/50">
           <div className="flex items-center gap-2 mb-2 text-slate-400">
            <TrendingUp size={16} />
            <span className="text-xs font-bold uppercase">Sets 組數</span>
          </div>
          <p className="text-3xl font-bold text-primary">{totalSets}</p>
          <p className="text-xs text-slate-500 mt-1">Sets completed 完成組數</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-card p-6 rounded-2xl border border-slate-700/50 mb-8 h-64 shadow-lg">
        <h3 className="text-slate-300 text-sm font-semibold mb-6">Activity Distribution 訓練分佈</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
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
                itemStyle={{ color: '#10b981' }}
            />
            <Bar dataKey="sets" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.sets > 0 ? '#10b981' : '#334155'} />
              ))}
            </Bar>
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

        {/* Model Info Disclaimer */}
        {showInfo && (
           <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-600 mb-4 text-xs text-slate-300 relative z-20 animate-in fade-in slide-in-from-top-1">
             <p className="font-semibold mb-1 text-white">Model Info 模型資訊:</p>
             <p>Powered by <strong>Gemini 3 Flash Preview</strong>.</p>
             <p className="mt-1 opacity-80">
               Cost: Free tier usage for standard personal logging. High volume commercial use may incur fees.
               <br/>
               費用：個人標準使用量通常在免費額度內。
             </p>
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