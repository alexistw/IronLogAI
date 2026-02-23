import React, { useMemo } from 'react';
import { Exercise } from '../types';
import { ExerciseCard } from './ExerciseCard';
import { isSameDay, DAYS_OF_WEEK, getExerciseVolumeKg } from '../utils';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DailyLogProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  exercises: Exercise[];
  onDeleteExercise: (id: string) => void;
}

export const DailyLog: React.FC<DailyLogProps> = ({ 
  currentDate, 
  onDateChange, 
  exercises, 
  onDeleteExercise 
}) => {
  
  const dailyExercises = useMemo(() => 
    exercises.filter(ex => isSameDay(new Date(ex.date), currentDate)),
  [exercises, currentDate]);
  const dailyVolumeKg = useMemo(
    () => dailyExercises.reduce((acc, curr) => acc + getExerciseVolumeKg(curr), 0),
    [dailyExercises]
  );

  const handlePrevDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 1);
    onDateChange(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 1);
    onDateChange(newDate);
  };

  const isToday = isSameDay(currentDate, new Date());

  return (
    <div className="pb-24 pt-4 px-4 max-w-2xl mx-auto w-full">
      {/* Date Header */}
      <div className="flex items-center justify-between mb-6 bg-card p-4 rounded-2xl border border-slate-700/50 shadow-sm sticky top-2 z-10 backdrop-blur-md bg-opacity-90">
        <button onClick={handlePrevDay} className="p-2 text-slate-400 hover:text-white transition-colors">
          <ChevronLeft />
        </button>
        <div className="text-center">
          <h2 className="text-white font-bold text-lg flex items-center justify-center gap-2">
            {DAYS_OF_WEEK[currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1]} 
            <span className="text-primary font-normal text-sm bg-primary/10 px-2 py-0.5 rounded-full">
              {currentDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
            {isToday ? "Today's Grind 今日訓練" : "Past Log 過去紀錄"}
          </p>
        </div>
        <button onClick={handleNextDay} className="p-2 text-slate-400 hover:text-white transition-colors">
          <ChevronRight />
        </button>
      </div>

      {/* Stats Mini Header */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
          <p className="text-slate-400 text-xs">Workouts 動作數</p>
          <p className="text-2xl font-bold text-white">{dailyExercises.length}</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
          <p className="text-slate-400 text-xs">Total Volume 總容量</p>
          <p className="text-2xl font-bold text-secondary">
            {Math.round(dailyVolumeKg).toLocaleString()} <span className="text-xs text-slate-500 font-normal">kg-eq</span>
          </p>
        </div>
      </div>

      {/* Exercises List */}
      <div className="space-y-1">
        {dailyExercises.length > 0 ? (
          dailyExercises.map(ex => (
            <ExerciseCard key={ex.id} exercise={ex} onDelete={onDeleteExercise} />
          ))
        ) : (
          <div className="text-center py-12 flex flex-col items-center justify-center opacity-50">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-600">
              <Calendar size={32} />
            </div>
            <p className="text-slate-400 text-lg">No logs today 本日無紀錄</p>
            <p className="text-slate-600 text-sm">Tap '+' to add a workout 點擊 '+' 新增訓練</p>
          </div>
        )}
      </div>
    </div>
  );
};
