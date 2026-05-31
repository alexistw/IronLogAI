import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Plus, X, Trash2, Layers, Repeat, Dumbbell, ChevronLeft } from 'lucide-react';
import { cn, LB_TO_KG } from '../utils';
import { Exercise, UserProfile, WeightMode, WeightUnit } from '../types';

interface ExerciseFormData {
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
  assisted?: boolean;
  assistanceWeight?: number;
  assistanceWeightInput?: number;
  assistanceWeightUnitInput?: WeightUnit;
}

interface AddExerciseFormProps {
  onAdd: (exercises: ExerciseFormData[]) => void;
  onUpdate?: (exercise: Exercise, additionalExercises?: ExerciseFormData[]) => void;
  initialExercise?: Exercise | null;
  userProfile: UserProfile;
  onClose: () => void;
}

interface SetRow {
  id: string;
  sets: string;
  reps: string;
  weight: string;
  weightUnit: WeightUnit;
}

export const AddExerciseForm: React.FC<AddExerciseFormProps> = ({ onAdd, onUpdate, initialExercise, userProfile, onClose }) => {
  const isEditMode = !!initialExercise;
  const [name, setName] = useState(initialExercise?.name ?? '');
  const [bodyweightMode, setBodyweightMode] = useState<'normal' | 'bw_plus' | 'bw_minus'>(
    initialExercise?.bodyweightMode ?? (initialExercise?.assisted ? 'bw_minus' : 'normal')
  );
  const [barWeight, setBarWeight] = useState(
    initialExercise ? String(initialExercise.unloadedBarWeight ?? 0) : '0'
  );
  const [barWeightUnit, setBarWeightUnit] = useState<WeightUnit>(
    initialExercise?.unloadedBarWeightUnit ?? 'kg'
  );
  const [weightMode, setWeightMode] = useState<WeightMode>(
    initialExercise?.plateCalculationMode ?? initialExercise?.weightMode ?? 'double_hand'
  );

  const bodyWeightKg = userProfile.weightValue !== null
    ? (userProfile.weightUnit === 'lb' ? userProfile.weightValue * LB_TO_KG : userProfile.weightValue)
    : null;

  // Initialize with one empty row
  const [rows, setRows] = useState<SetRow[]>([
    {
      id: '1',
      sets: initialExercise ? String(initialExercise.sets) : '',
      reps: initialExercise ? String(initialExercise.reps) : '',
      weight: initialExercise
        ? String(initialExercise.assisted
            ? (initialExercise.assistanceWeightInput ?? 0)
            : (initialExercise.plateWeightInput ?? initialExercise.weight))
        : '',
      weightUnit: initialExercise?.assisted
        ? (initialExercise.assistanceWeightUnitInput ?? 'kg')
        : (initialExercise?.plateWeightUnitInput ?? initialExercise?.weightUnit ?? 'kg'),
    }
  ]);
  const [pendingDeleteRowId, setPendingDeleteRowId] = useState<string | null>(null);

  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (pendingDeleteRowId) {
        setPendingDeleteRowId(null);
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, pendingDeleteRowId]);

  useEffect(() => {
    if (!initialExercise) return;
    setName(initialExercise.name);
    setBodyweightMode(initialExercise.bodyweightMode ?? (initialExercise.assisted ? 'bw_minus' : 'normal'));
    setBarWeight(String(initialExercise.unloadedBarWeight ?? 0));
    setBarWeightUnit(initialExercise.unloadedBarWeightUnit ?? 'kg');
    setWeightMode(initialExercise.plateCalculationMode ?? initialExercise.weightMode);
    setRows([{
      id: '1',
      sets: String(initialExercise.sets),
      reps: String(initialExercise.reps),
      weight: String(initialExercise.assisted
        ? (initialExercise.assistanceWeightInput ?? 0)
        : (initialExercise.plateWeightInput ?? initialExercise.weight)),
      weightUnit: initialExercise.assisted
        ? (initialExercise.assistanceWeightUnitInput ?? 'kg')
        : (initialExercise.plateWeightUnitInput ?? initialExercise.weightUnit),
    }]);
  }, [initialExercise]);

  const handleAddRow = () => {
    const newRow: SetRow = {
      id: Math.random().toString(36).substr(2, 9),
      sets: '',
      reps: '',
      weight: '',
      weightUnit: 'kg',
    };
    setRows([...rows, newRow]);
  };

  const handleConfirmRemoveRow = () => {
    if (!pendingDeleteRowId) return;
    setRows(prev => prev.filter(r => r.id !== pendingDeleteRowId));
    setPendingDeleteRowId(null);
  };

  const handleCancelRemoveRow = () => {
    setPendingDeleteRowId(null);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) return;
    setPendingDeleteRowId(id);
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
      const inputWeight = Number(row.weight) || 0;
      const inputBarWeight = Number(barWeight) || 0;

      if (bodyweightMode !== 'normal') {
        const addedKg = row.weightUnit === 'lb' ? inputWeight * LB_TO_KG : inputWeight;
        const bw = bodyWeightKg ?? 0;
        const effectiveKg = bodyweightMode === 'bw_plus'
          ? Math.round((bw + addedKg) * 100) / 100
          : Math.max(0, Math.round((bw - addedKg) * 100) / 100);
        return {
          name,
          sets: Number(row.sets) || 1,
          reps: Number(row.reps) || 0,
          weight: effectiveKg,
          weightUnit: 'kg' as const,
          weightMode: 'double_hand' as const,
          bodyweightMode,
          assisted: bodyweightMode === 'bw_minus',
          assistanceWeight: Math.round(addedKg * 100) / 100,
          assistanceWeightInput: inputWeight,
          assistanceWeightUnitInput: row.weightUnit,
        };
      }

      return {
        name,
        sets: Number(row.sets) || 1,
        reps: Number(row.reps) || 0,
        weight: normalizeToKgTotal(inputWeight, row.weightUnit, weightMode, inputBarWeight, barWeightUnit),
        weightUnit: 'kg' as const,
        weightMode: 'double_hand' as const,
        plateWeightInput: inputWeight,
        plateWeightUnitInput: row.weightUnit,
        plateCalculationMode: weightMode,
        unloadedBarWeight: inputBarWeight,
        unloadedBarWeightUnit: barWeightUnit,
      };
    });

    if (isEditMode && initialExercise && onUpdate) {
      const firstRow = dataToAdd[0];
      const additionalRows = dataToAdd.slice(1);
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
      }, additionalRows);
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

          {/* Bodyweight Mode Toggle */}
          <div className="mb-6">
            <label className="block text-primary text-xs font-bold uppercase tracking-wider mb-2 ml-1">
              Bodyweight Mode 體重計算模式
            </label>
            <div className="grid grid-cols-3 bg-slate-800/60 border border-slate-700 rounded-2xl p-1 gap-1">
              {([
                { value: 'normal', label: 'Normal 一般' },
                { value: 'bw_plus', label: 'BW+ 加掛' },
                { value: 'bw_minus', label: 'BW− 輔助' },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setBodyweightMode(value)}
                  className={cn(
                    "rounded-xl py-2 text-xs font-semibold transition-colors",
                    bodyweightMode === value
                      ? value === 'bw_plus' ? "bg-blue-500 text-white"
                        : value === 'bw_minus' ? "bg-amber-500 text-white"
                        : "bg-primary text-white"
                      : "text-slate-300 hover:bg-slate-700/70"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {bodyweightMode !== 'normal' && (
              <div className={cn(
                "mt-2 px-4 py-3 rounded-xl text-sm",
                bodyWeightKg !== null
                  ? "bg-slate-800/60 text-slate-400"
                  : "bg-red-500/10 border border-red-500/30 text-red-400"
              )}>
                {bodyWeightKg !== null
                  ? <>體重 Body weight: <span className="text-white font-semibold">{Math.round(bodyWeightKg * 10) / 10} kg</span></>
                  : "⚠ 請先在 Settings 設定體重 / Set your body weight in Settings first"}
              </div>
            )}
          </div>

          <div className={cn("mb-6 space-y-4", bodyweightMode !== 'normal' && "hidden")}>
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
              <div className="col-span-6 pl-1 text-center text-[10px] text-slate-500 font-semibold uppercase">
                {bodyweightMode === 'bw_plus' ? 'Added 外掛重量' : bodyweightMode === 'bw_minus' ? 'Assistance 輔助重量' : 'Weight 槓片重量'}
              </div>
              <div className="col-span-1"></div>
            </div>

            {rows.map((row, index) => (
              <div key={row.id} className={cn("grid grid-cols-12 gap-2 bg-slate-800/40 p-3 rounded-2xl border border-slate-700/30", bodyweightMode !== 'normal' ? "items-end" : "items-center")}>
                <div className="col-span-2">
                  <div className="relative">
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none">
                      <Layers size={14} />
                    </div>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={row.sets}
                      onChange={(e) => handleRowChange(row.id, 'sets', e.target.value)}
                      onFocus={handleNumberInputFocus}
                      className="w-full bg-slate-900 border-none rounded-xl py-3 pl-5 pr-2 text-white text-center font-bold text-base sm:text-lg focus:ring-2 focus:ring-primary/50"
                      placeholder="1"
                    />
                  </div>
                </div>
                <div className="col-span-3">
                  <div className="relative">
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
                </div>
                <div className="col-span-6 pl-1">
                  {bodyweightMode !== 'normal' && (() => {
                    const addedKg = row.weightUnit === 'lb' ? (Number(row.weight) || 0) * LB_TO_KG : (Number(row.weight) || 0);
                    const bw = bodyWeightKg ?? 0;
                    const effective = bodyweightMode === 'bw_plus'
                      ? Math.round((bw + addedKg) * 10) / 10
                      : Math.max(0, Math.round((bw - addedKg) * 10) / 10);
                    return (
                      <div className="mb-1 text-center text-xs text-slate-500">
                        {bodyWeightKg !== null ? (
                          <>有效總重 Effective: <span className={bodyweightMode === 'bw_plus' ? 'text-blue-400 font-medium' : 'text-amber-400 font-medium'}>{effective} kg</span></>
                        ) : (
                          <span className="text-red-400/70">set body weight first</span>
                        )}
                      </div>
                    );
                  })()}
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
                  {rows.length > 1 && (!isEditMode || index > 0) ? (
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

      {pendingDeleteRowId && (
        <div
          className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={handleCancelRemoveRow}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-700 bg-card p-5 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-2">
              刪除紀錄 Delete Log
            </h3>
            <p className="text-sm text-slate-300 mb-6">
              確定要刪除這組資料嗎？此動作無法復原。<br />
              Are you sure you want to delete this set row? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={handleCancelRemoveRow}>
                取消 Cancel
              </Button>
              <Button variant="danger" onClick={handleConfirmRemoveRow}>
                確認刪除 Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
