import React, { useState } from 'react';
import { Button } from './Button';
import { Plus, X } from 'lucide-react';

interface AddExerciseFormProps {
  onAdd: (name: string, sets: number, reps: number, weight: number) => void;
  onClose: () => void;
}

export const AddExerciseForm: React.FC<AddExerciseFormProps> = ({ onAdd, onClose }) => {
  const [name, setName] = useState('');
  const [sets, setSets] = useState<string>('3');
  const [reps, setReps] = useState<string>('10');
  const [weight, setWeight] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onAdd(name, Number(sets), Number(reps), Number(weight));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-md rounded-3xl p-6 border border-slate-700 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Log Workout <span className="text-base font-normal text-slate-400 ml-2">紀錄健身</span></h2>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-sm mb-1 ml-1">Exercise Name 動作名稱</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bench Press (例如：臥推)"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1 ml-1">Sets 組數</label>
              <input
                type="number"
                value={sets}
                onChange={(e) => setSets(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary text-center font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1 ml-1">Reps 次數</label>
              <input
                type="number"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary text-center font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1 ml-1">Weight 重量 (kg)</label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary text-center font-mono"
              />
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full mt-4">
            <Plus size={20} />
            Save Log 儲存紀錄
          </Button>
        </form>
      </div>
    </div>
  );
};