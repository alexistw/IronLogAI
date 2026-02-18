import React from 'react';
import { Exercise } from '../types';
import { Trash2, Dumbbell, Repeat, Layers } from 'lucide-react';

interface ExerciseCardProps {
  exercise: Exercise;
  onDelete: (id: string) => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise, onDelete }) => {
  return (
    <div className="bg-card rounded-2xl p-4 mb-3 border border-slate-700/50 shadow-sm flex items-center justify-between group">
      <div className="flex-1">
        <h3 className="text-white font-semibold text-lg mb-1">{exercise.name}</h3>
        <div className="flex items-center gap-4 text-slate-400 text-sm">
          <div className="flex items-center gap-1">
            <Layers size={14} className="text-primary" />
            <span>{exercise.sets} Sets 組</span>
          </div>
          <div className="flex items-center gap-1">
            <Repeat size={14} className="text-secondary" />
            <span>{exercise.reps} Reps 次</span>
          </div>
          <div className="flex items-center gap-1">
            <Dumbbell size={14} className="text-accent" />
            <span>{exercise.weight} kg</span>
          </div>
        </div>
      </div>
      <button 
        onClick={() => onDelete(exercise.id)}
        className="p-2 text-slate-600 hover:text-red-500 hover:bg-slate-700/50 rounded-full transition-colors"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
};