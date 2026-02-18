import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Plus, X, Trash2, Layers, Repeat, Dumbbell, ChevronDown } from 'lucide-react';
import { cn } from '../utils';

interface AddExerciseFormProps {
  onAdd: (exercises: { name: string, sets: number, reps: number, weight: number }[]) => void;
  onClose: () => void;
}

interface SetRow {
  id: string;
  sets: string;
  reps: string;
  weight: string;
}

export const AddExerciseForm: React.FC<AddExerciseFormProps> = ({ onAdd, onClose }) => {
  const [name, setName] = useState('');
  
  // Initialize with one empty row
  const [rows, setRows] = useState<SetRow[]>([
    { id: '1', sets: '1', reps: '10', weight: '' }
  ]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleAddRow = () => {
    const lastRow = rows[rows.length - 1];
    const newRow: SetRow = {
      id: Math.random().toString(36).substr(2, 9),
      sets: '1', 
      reps: lastRow ? lastRow.reps : '10',
      weight: lastRow ? lastRow.weight : '',
    };
    setRows([...rows, newRow]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(r => r.id !== id));
    }
  };

  const handleRowChange = (id: string, field: keyof SetRow, value: string) => {
    setRows(rows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const dataToAdd = rows.map(row => ({
      name: name,
      sets: Number(row.sets) || 1,
      reps: Number(row.reps) || 0,
      weight: Number(row.weight) || 0
    }));

    onAdd(dataToAdd);
    onClose();
  };

  return (
    // Full screen layout with z-index high enough to cover everything
    <div className="fixed inset-0 z-[100] bg-dark flex flex-col pt-safe pb-safe animate-in slide-in-from-bottom-5 duration-300">
      
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <button 
          onClick={onClose} 
          className="p-2 -ml-2 text-slate-400 hover:text-white rounded-full transition-colors"
        >
          <ChevronDown size={28} />
        </button>
        <h2 className="text-lg font-bold text-white">Log Workout 紀錄</h2>
        <div className="w-8"></div> {/* Spacer to center the title */}
      </div>

      {/* Main Scrollable Content */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          
          {/* Exercise Name Input */}
          <div className="mb-6">
            <label className="block text-primary text-xs font-bold uppercase tracking-wider mb-2 ml-1">
              Exercise Name 動作名稱
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bench Press"
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-xl font-medium"
              autoFocus
            />
          </div>

          {/* Sets Container */}
          <div className="space-y-4 mb-20"> {/* Bottom padding for potential keyboard overlap buffering */}
            <div className="flex items-center justify-between px-1">
              <label className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                Sets Detail 組數詳情
              </label>
            </div>

            {/* Column Headers (Restored Chinese) */}
            <div className="grid grid-cols-12 gap-3 px-2 mb-2">
              <div className="col-span-3 text-center text-[10px] text-slate-500 font-semibold uppercase">Sets 組數</div>
              <div className="col-span-3 text-center text-[10px] text-slate-500 font-semibold uppercase">Reps 次數</div>
              <div className="col-span-4 text-center text-[10px] text-slate-500 font-semibold uppercase">Weight 重量</div>
              <div className="col-span-2"></div>
            </div>

            {rows.map((row, index) => (
              <div key={row.id} className="grid grid-cols-12 gap-3 items-center bg-slate-800/40 p-3 rounded-2xl border border-slate-700/30">
                <div className="col-span-3 relative">
                   <div className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none">
                     <Layers size={14} />
                   </div>
                   <input
                    type="number" // tel or number ensures numeric keyboard on mobile
                    inputMode="numeric"
                    value={row.sets}
                    onChange={(e) => handleRowChange(row.id, 'sets', e.target.value)}
                    className="w-full bg-slate-900 border-none rounded-xl py-3 pl-7 pr-2 text-white text-center font-bold text-lg focus:ring-2 focus:ring-primary/50"
                    placeholder="1"
                  />
                </div>
                <div className="col-span-3 relative">
                   <div className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none">
                     <Repeat size={14} />
                   </div>
                   <input
                    type="number"
                    inputMode="numeric"
                    value={row.reps}
                    onChange={(e) => handleRowChange(row.id, 'reps', e.target.value)}
                    className="w-full bg-slate-900 border-none rounded-xl py-3 pl-7 pr-2 text-white text-center font-bold text-lg focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="col-span-4 relative">
                   <div className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none">
                     <Dumbbell size={14} />
                   </div>
                   <input
                    type="number"
                    inputMode="decimal"
                    value={row.weight}
                    onChange={(e) => handleRowChange(row.id, 'weight', e.target.value)}
                    className="w-full bg-slate-900 border-none rounded-xl py-3 pl-7 pr-2 text-white text-center font-bold text-lg focus:ring-2 focus:ring-primary/50"
                    placeholder="0"
                  />
                </div>
                <div className="col-span-2 flex justify-end">
                  {rows.length > 1 ? (
                    <button 
                      type="button" 
                      onClick={() => handleRemoveRow(row.id)}
                      className="p-3 text-slate-500 hover:text-red-400 bg-slate-800 hover:bg-red-400/10 rounded-xl transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  ) : (
                    <div className="w-full"></div>
                  )}
                </div>
              </div>
            ))}

            <button 
              type="button" 
              onClick={handleAddRow}
              className="w-full py-4 border border-dashed border-slate-700 rounded-2xl text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-800/30 transition-all flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Plus size={18} />
              Add Another Set Group 新增一組
            </button>
          </div>
        </div>

        {/* Fixed Bottom Action Bar */}
        <div className="p-4 border-t border-slate-800 bg-card z-20 pb-[env(safe-area-inset-bottom)]">
            <Button type="submit" size="lg" className="w-full py-4 text-lg shadow-emerald-500/20">
              Save Workout 儲存 ({rows.length})
            </Button>
        </div>
      </form>
    </div>
  );
};