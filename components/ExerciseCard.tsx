import React from 'react';
import { Exercise } from '../types';
import { Trash2, Dumbbell, Repeat, Layers, Pencil } from 'lucide-react';
import { getExerciseEffectiveWeightKg } from '../utils';

interface ExerciseCardProps {
  exercise: Exercise;
  onDelete: (id: string) => void;
  onEdit: (exercise: Exercise) => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise, onDelete, onEdit }) => {
  const totalWeightKg = Math.round(getExerciseEffectiveWeightKg(exercise) * 100) / 100;

  return (
    <div className="bg-card rounded-2xl p-4 mb-3 border border-slate-700/50 shadow-sm group">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className="text-white font-semibold text-lg leading-tight">{exercise.name}</h3>
        <div className="flex items-center gap-1 shrink-0 -mr-1">
          <button
            onClick={() => onEdit(exercise)}
            className="p-2 text-slate-600 hover:text-emerald-400 hover:bg-slate-700/50 rounded-full transition-colors"
            aria-label="Edit exercise"
          >
            <Pencil size={18} />
          </button>
          <button
            onClick={() => onDelete(exercise.id)}
            className="p-2 text-slate-600 hover:text-red-500 hover:bg-slate-700/50 rounded-full transition-colors"
            aria-label="Delete exercise"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-4 text-slate-400 text-sm">
          <div className="flex items-center gap-1">
            <Layers size={14} className="text-primary" />
            <span>{exercise.sets} Sets</span>
          </div>
          <div className="flex items-center gap-1">
            <Repeat size={14} className="text-secondary" />
            <span>{exercise.reps} Reps</span>
          </div>
          <div className="flex items-center gap-1">
            <Dumbbell size={14} className="text-accent" />
            <span>{totalWeightKg} kg (total 總重)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
