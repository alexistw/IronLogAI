import React, { useState } from 'react';
import { Button } from './Button';
import { Plus, X, Trash2, Copy, Layers, Repeat, Dumbbell } from 'lucide-react';

interface AddExerciseFormProps {
  // Updated signature to accept an array of sets
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

  const handleAddRow = () => {
    // Copy the values from the last row for better UX
    const lastRow = rows[rows.length - 1];
    const newRow: SetRow = {
      id: Math.random().toString(36).substr(2, 9),
      sets: '1', // Default to 1 set for new added rows usually
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

    // Convert rows to data objects, filtering out incomplete ones (optional, but let's assume if 0 it's valid)
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-lg rounded-3xl p-6 border border-slate-700 shadow-2xl animate-in slide-in-from-bottom-10 duration-300 max-h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h2 className="text-2xl font-bold text-white">Log Workout <span className="text-base font-normal text-slate-400 ml-2">紀錄健身</span></h2>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          
          {/* Exercise Name (Fixed at top) */}
          <div className="mb-6 shrink-0">
            <label className="block text-slate-400 text-sm mb-1 ml-1">Exercise Name 動作名稱</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bench Press"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-lg font-medium"
              autoFocus
            />
          </div>

          {/* Scrollable Set List */}
          <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-3 -mr-2 pr-2 custom-scrollbar">
            
            {/* Column Headers */}
            <div className="grid grid-cols-12 gap-2 text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2 px-1">
              <div className="col-span-3 flex items-center gap-1"><Layers size={12}/> Sets</div>
              <div className="col-span-3 flex items-center gap-1"><Repeat size={12}/> Reps</div>
              <div className="col-span-4 flex items-center gap-1"><Dumbbell size={12}/> KG</div>
              <div className="col-span-2 text-center">Action</div>
            </div>

            {rows.map((row, index) => (
              <div key={row.id} className="grid grid-cols-12 gap-2 items-center bg-slate-800/50 p-2 rounded-xl border border-slate-700/50 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="col-span-3">
                   <input
                    type="number"
                    value={row.sets}
                    onChange={(e) => handleRowChange(row.id, 'sets', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-white text-center focus:border-primary focus:outline-none"
                    placeholder="1"
                  />
                </div>
                <div className="col-span-3">
                   <input
                    type="number"
                    value={row.reps}
                    onChange={(e) => handleRowChange(row.id, 'reps', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-white text-center focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="col-span-4 relative">
                   <input
                    type="number"
                    value={row.weight}
                    onChange={(e) => handleRowChange(row.id, 'weight', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-white text-center focus:border-primary focus:outline-none"
                    placeholder="0"
                  />
                </div>
                <div className="col-span-2 flex justify-center">
                  {rows.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => handleRemoveRow(row.id)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="mt-6 space-y-3 shrink-0 pt-4 border-t border-slate-800">
            <button 
              type="button" 
              onClick={handleAddRow}
              className="w-full py-3 border border-dashed border-slate-600 rounded-xl text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-800/50 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Plus size={16} />
              Add Another Set Group 新增一組
            </button>

            <Button type="submit" size="lg" className="w-full">
              <Plus size={20} />
              Save {rows.length} Entries 儲存紀錄
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};