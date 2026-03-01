import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Plus, X, Trash2, Layers, Repeat, Dumbbell, ChevronLeft } from 'lucide-react';
import { cn, LB_TO_KG } from '../utils';
import { Exercise, WeightMode, WeightUnit } from '../types';

interface AddExerciseFormProps {
  onAdd: (exercises: {
    name: string;
    sets: number;
    reps: number;
    weight: number;
    weightUnit: WeightUnit;
    weightMode: WeightMode;
    plateWeightInput?: number;
    plateWeightUnitInput?: WeightUnit;
    plateCalculationMode?: WeightMode;
    unloadedBarWeight?: number;
    unloadedBarWeightUnit?: WeightUnit;
  }[]) => void;
  onUpdate?: (exercise: Exercise) => void;
  initialExercise?: Exercise | null;
  onClose: () => void;
}

interface SetRow {
  id: string;
  sets: string;
  reps: string;
  weight: string;
  weightUnit: WeightUnit;
}

export const AddExerciseForm: React.FC<AddExerciseFormProps> = ({ onAdd, onUpdate, initialExercise, onClose }) => {
  const isEditMode = !!initialExercise;
  const [name, setName] = useState(initialExercise?.name ?? '');
  const [barWeight, setBarWeight] = useState(
    initialExercise ? String(initialExercise.unloadedBarWeight ?? 0) : '0'
  );
  const [barWeightUnit, setBarWeightUnit] = useState<WeightUnit>(
    initialExercise?.unloadedBarWeightUnit ?? 'kg'
  );
  const [weightMode, setWeightMode] = useState<WeightMode>(
    initialExercise?.plateCalculationMode ?? initialExercise?.weightMode ?? 'double_hand'
  );
  
  // Initialize with one empty row
  const [rows, setRows] = useState<SetRow[]>([
    {
      id: '1',
      sets: initialExercise ? String(initialExercise.sets) : '',
      reps: initialExercise ? String(initialExercise.reps) : '',
      weight: initialExercise ? String(initialExercise.plateWeightInput ?? initialExercise.weight) : '',
      weightUnit: initialExercise?.plateWeightUnitInput ?? initialExercise?.weightUnit ?? 'kg',
    }
  ]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (!initialExercise) return;
    setName(initialExercise.name);
    setBarWeight(String(initialExercise.unloadedBarWeight ?? 0));
    setBarWeightUnit(initialExercise.unloadedBarWeightUnit ?? 'kg');
    setWeightMode(initialExercise.plateCalculationMode ?? initialExercise.weightMode);
    setRows([{
      id: '1',
      sets: String(initialExercise.sets),
      reps: String(initialExercise.reps),
      weight: String(initialExercise.plateWeightInput ?? initialExercise.weight),
      weightUnit: initialExercise.plateWeightUnitInput ?? initialExercise.weightUnit,
    }]);
  }, [initialExercise]);

  const handleAddRow = () => {
    if (isEditMode) return;
    const newRow: SetRow = {
      id: Math.random().toString(36).substr(2, 9),
      sets: '',
      reps: '',
      weight: '',
      weightUnit: 'kg',
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

  const handleNumberInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const normalizeToKgTotal = (plateWeight: number, plateUnit: WeightUnit, mode: WeightMode, unloadedBarWeight: number, unloadedBarUnit: WeightUnit) => {
    const plateWeightInKg = plateUnit === 'lb' ? plateWeight * LB_TO_KG : plateWeight;
    const unloadedBarWeightInKg = unloadedBarUnit === 'lb' ? unloadedBarWeight * LB_TO_KG : unloadedBarWeight;
    const totalPlateWeightKg = mode === 'single_hand' ? plateWeightInKg * 2 : plateWeightInKg;
    const totalWeightKg = unloadedBarWeightInKg + totalPlateWeightKg;
    return Math.round(totalWeightKg * 100) / 100;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const dataToAdd = rows.map(row => {
      const inputPlateWeight = Number(row.weight) || 0;
      const inputBarWeight = Number(barWeight) || 0;
      return {
        name: name,
        sets: Number(row.sets) || 1,
        reps: Number(row.reps) || 0,
        weight: normalizeToKgTotal(inputPlateWeight, row.weightUnit, weightMode, inputBarWeight, barWeightUnit),
        weightUnit: 'kg' as const,
        weightMode: 'double_hand' as const,
        plateWeightInput: inputPlateWeight,
        plateWeightUnitInput: row.weightUnit,
        plateCalculationMode: weightMode,
        unloadedBarWeight: inputBarWeight,
        unloadedBarWeightUnit: barWeightUnit,
      };
    });

    if (isEditMode && initialExercise && onUpdate) {
      const firstRow = dataToAdd[0];
      onUpdate({
        ...initialExercise,
        name: firstRow.name,
        sets: firstRow.sets,
        reps: firstRow.reps,
        weight: firstRow.weight,
        weightUnit: firstRow.weightUnit,
        weightMode: firstRow.weightMode,
        plateWeightInput: firstRow.plateWeightInput,
        plateWeightUnitInput: firstRow.plateWeightUnitInput,
        plateCalculationMode: firstRow.plateCalculationMode,
        unloadedBarWeight: firstRow.unloadedBarWeight,
        unloadedBarWeightUnit: firstRow.unloadedBarWeightUnit,
      });
      onClose();
      return;
    }

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
          <ChevronLeft size={28} />
        </button>
        <h2 className="text-lg font-bold text-white">{isEditMode ? 'Edit Workout 編輯動作' : 'Log Workout 紀錄'}</h2>
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

          <div className="mb-6 space-y-4">
            <div>
              <label className="block text-primary text-xs font-bold uppercase tracking-wider mb-2 ml-1">
                Unloaded Bar Weight 空槓(器材)重量
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  value={barWeight}
                  onChange={(e) => setBarWeight(e.target.value)}
                  onFocus={handleNumberInputFocus}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-xl font-medium"
                  placeholder="0"
                />
                <div className="w-[120px] grid grid-cols-2 bg-slate-800/60 border border-slate-700 rounded-2xl p-1">
                  <button
                    type="button"
                    onClick={() => setBarWeightUnit('kg')}
                    className={cn(
                      "rounded-xl py-2 text-sm font-semibold transition-colors",
                      barWeightUnit === 'kg' ? "bg-primary text-white" : "text-slate-300 hover:bg-slate-700/70"
                    )}
                  >
                    kg
                  </button>
                  <button
                    type="button"
                    onClick={() => setBarWeightUnit('lb')}
                    className={cn(
                      "rounded-xl py-2 text-sm font-semibold transition-colors",
                      barWeightUnit === 'lb' ? "bg-primary text-white" : "text-slate-300 hover:bg-slate-700/70"
                    )}
                  >
                    lb
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-primary text-xs font-bold uppercase tracking-wider mb-2 ml-1">
                Plate Calculation Mode 槓片計算模式
              </label>
              <div className="grid grid-cols-2 bg-slate-800/60 border border-slate-700 rounded-2xl p-1">
                <button
                  type="button"
                  onClick={() => setWeightMode('single_hand')}
                  className={cn(
                    "rounded-xl py-2 text-sm font-semibold transition-colors",
                    weightMode === 'single_hand' ? "bg-primary text-white" : "text-slate-300 hover:bg-slate-700/70"
                  )}
                >
                  Per Side 單邊槓片量
                </button>
                <button
                  type="button"
                  onClick={() => setWeightMode('double_hand')}
                  className={cn(
                    "rounded-xl py-2 text-sm font-semibold transition-colors",
                    weightMode === 'double_hand' ? "bg-primary text-white" : "text-slate-300 hover:bg-slate-700/70"
                  )}
                >
                  Total 槓片總重量
                </button>
              </div>
            </div>
          </div>

          {/* Sets Container */}
          <div className="space-y-4 mb-20"> {/* Bottom padding for potential keyboard overlap buffering */}
            <div className="flex items-center justify-between px-1">
              <label className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                Sets Detail 組數詳情
              </label>
            </div>

            {/* Column Headers (Restored Chinese) */}
            <div className="grid grid-cols-12 gap-2 px-2 mb-2">
              <div className="col-span-2 text-center text-[10px] text-slate-500 font-semibold uppercase">Sets 組數</div>
              <div className="col-span-3 text-center text-[10px] text-slate-500 font-semibold uppercase">Reps 次數</div>
              <div className="col-span-6 pl-1 text-center text-[10px] text-slate-500 font-semibold uppercase">Weight 槓片重量</div>
              <div className="col-span-1"></div>
            </div>

            {rows.map((row, index) => (
              <div key={row.id} className="grid grid-cols-12 gap-2 items-center bg-slate-800/40 p-3 rounded-2xl border border-slate-700/30">
                <div className="col-span-2 relative">
                   <div className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none">
                     <Layers size={14} />
                   </div>
                   <input
                    type="number" // tel or number ensures numeric keyboard on mobile
                    inputMode="numeric"
                    value={row.sets}
                    onChange={(e) => handleRowChange(row.id, 'sets', e.target.value)}
                    onFocus={handleNumberInputFocus}
                    className="w-full bg-slate-900 border-none rounded-xl py-3 pl-5 pr-2 text-white text-center font-bold text-base sm:text-lg focus:ring-2 focus:ring-primary/50"
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
                    onFocus={handleNumberInputFocus}
                    className="w-full bg-slate-900 border-none rounded-xl py-3 pl-5 pr-2 text-white text-center font-bold text-base sm:text-lg focus:ring-2 focus:ring-primary/50"
                    placeholder="10"
                  />
                </div>
                <div className="col-span-6 pl-1">
                  <div className="flex gap-1.5">
                    <div className="relative flex-1">
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none">
                        <Dumbbell size={14} />
                      </div>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={row.weight}
                        onChange={(e) => handleRowChange(row.id, 'weight', e.target.value)}
                        onFocus={handleNumberInputFocus}
                        className="w-full bg-slate-900 border-none rounded-xl py-3 pl-6 pr-2 text-white text-center font-bold text-lg focus:ring-2 focus:ring-primary/50"
                        placeholder="0"
                      />
                    </div>
                    <div className="w-[72px] grid grid-cols-2 bg-slate-900 border border-slate-700 rounded-lg p-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRowChange(row.id, 'weightUnit', 'kg')}
                        className={cn(
                          "rounded-md py-1.5 text-[10px] font-semibold leading-none transition-colors",
                          row.weightUnit === 'kg' ? "bg-primary text-white" : "text-slate-300 hover:bg-slate-700/70"
                        )}
                      >
                        kg
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRowChange(row.id, 'weightUnit', 'lb')}
                        className={cn(
                          "rounded-md py-1.5 text-[10px] font-semibold leading-none transition-colors",
                          row.weightUnit === 'lb' ? "bg-primary text-white" : "text-slate-300 hover:bg-slate-700/70"
                        )}
                      >
                        lb
                      </button>
                    </div>
                  </div>
                </div>
                <div className="col-span-1 flex justify-end">
                  {rows.length > 1 && !isEditMode ? (
                    <button 
                      type="button" 
                      onClick={() => handleRemoveRow(row.id)}
                      className="p-2 text-slate-500 hover:text-red-400 bg-slate-800 hover:bg-red-400/10 rounded-xl transition-colors"
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
              {isEditMode ? 'Update Workout 更新動作' : `Save Workout 儲存 (${rows.length})`}
            </Button>
        </div>
      </form>
    </div>
  );
};
