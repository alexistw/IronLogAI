import React, { useState, useEffect } from 'react';
import { Tab, Exercise, UserProfile } from './types';
import { getExercises, deleteExercise, getUserProfile, saveUserProfile } from './services/storageService';
import { DailyLog } from './components/DailyLog';
import { StatsReport } from './components/StatsReport';
import { LoginPage } from './components/LoginPage';
import { AddExerciseForm } from './components/AddExerciseForm';
import { Button } from './components/Button';
import { generateId } from './utils';
import { ListTodo, BarChart2, PlusCircle, Dumbbell, Settings, LogOut, User } from 'lucide-react';
import { cn } from './utils';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.LOG);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [pendingDeleteExerciseId, setPendingDeleteExerciseId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [userProfile, setUserProfile] = useState<UserProfile>({
    heightUnit: 'cm',
    heightCm: null,
    heightFt: null,
    heightIn: null,
    weightUnit: 'kg',
    weightValue: null,
  });

  // Load data on mount
  useEffect(() => {
    setExercises(getExercises());
    setUserProfile(getUserProfile());
  }, []);

  const handleProfileNumberChange = (
    field: 'heightCm' | 'heightFt' | 'heightIn' | 'weightValue',
    value: string
  ) => {
    const numericValue = value === '' ? null : Number(value);
    const normalizedValue = (() => {
      if (typeof numericValue !== 'number' || !Number.isFinite(numericValue)) return null;
      if (field === 'heightIn') {
        if (numericValue < 0) return null;
        return Math.min(numericValue, 11);
      }
      return numericValue > 0 ? numericValue : null;
    })();

    setUserProfile(prev => {
      const updated = { ...prev, [field]: normalizedValue };
      saveUserProfile(updated);
      return updated;
    });
  };

  const handleHeightUnitChange = (heightUnit: UserProfile['heightUnit']) => {
    setUserProfile(prev => {
      const updated = { ...prev, heightUnit };
      saveUserProfile(updated);
      return updated;
    });
  };

  const handleWeightUnitChange = (weightUnit: UserProfile['weightUnit']) => {
    setUserProfile(prev => {
      const updated = { ...prev, weightUnit };
      saveUserProfile(updated);
      return updated;
    });
  };

  useEffect(() => {
    if (!pendingDeleteExerciseId) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPendingDeleteExerciseId(null);
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [pendingDeleteExerciseId]);

  const handleAddExercise = (newExercisesData: {
    name: string;
    sets: number;
    reps: number;
    weight: number;
    weightUnit: Exercise['weightUnit'];
    weightMode: Exercise['weightMode'];
    plateWeightInput?: number;
    plateWeightUnitInput?: Exercise['weightUnit'];
    plateCalculationMode?: Exercise['weightMode'];
    unloadedBarWeight?: number;
    unloadedBarWeightUnit?: Exercise['weightUnit'];
  }[]) => {
    const timestamp = Date.now();
    const newExercises: Exercise[] = newExercisesData.map((data, index) => ({
      id: generateId() + index, // Ensure unique IDs even if generated in same ms
      name: data.name,
      sets: data.sets,
      reps: data.reps,
      weight: data.weight,
      weightUnit: data.weightUnit,
      weightMode: data.weightMode,
      plateWeightInput: data.plateWeightInput,
      plateWeightUnitInput: data.plateWeightUnitInput,
      plateCalculationMode: data.plateCalculationMode,
      unloadedBarWeight: data.unloadedBarWeight,
      unloadedBarWeightUnit: data.unloadedBarWeightUnit,
      date: currentDate.toISOString(),
      timestamp: timestamp + index,
    }));

    // Save each one (storage service handles arrays if we updated it, but currently it's one by one or we loop)
    // Since saveExercise handles pushing to array and saving complete list, doing it in loop is fine but inefficient for IO.
    // Optimization: Save all at once implies updating storage logic, but for simplicity/safety with existing code:
    
    // We update local state once
    setExercises(prev => {
      const updated = [...prev, ...newExercises];
      // Sync to local storage with the full new list to avoid race conditions in loop
      localStorage.setItem('ironlog_exercises', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteExercise = (id: string) => {
    setPendingDeleteExerciseId(id);
  };

  const handleConfirmDelete = () => {
    if (!pendingDeleteExerciseId) return;

    deleteExercise(pendingDeleteExerciseId);
    setExercises(prev => prev.filter(ex => ex.id !== pendingDeleteExerciseId));
    setPendingDeleteExerciseId(null);
  };

  const handleCancelDelete = () => {
    setPendingDeleteExerciseId(null);
  };

  const handleEditExercise = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setIsAddModalOpen(true);
  };

  const handleUpdateExercise = (updatedExercise: Exercise) => {
    setExercises(prev => {
      const updated = prev.map(ex => ex.id === updatedExercise.id ? updatedExercise : ex);
      localStorage.setItem('ironlog_exercises', JSON.stringify(updated));
      return updated;
    });
    setEditingExercise(null);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setEditingExercise(null);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveTab(Tab.LOG); // Reset tab to default
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-[100dvh] bg-dark text-slate-200 font-sans selection:bg-primary/30 animate-in fade-in duration-500 flex flex-col supports-[min-height:100dvh]:min-h-[100dvh]">
      {/* Header - Visible on desktop, containing logo and logout. 
          On Mobile, we might want a simple top bar padding to avoid status bar overlap if not handled by body */}
      <div className="hidden sm:block bg-card border-b border-slate-800 p-4 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Dumbbell className="text-primary" />
                <h1 className="text-xl font-bold text-white tracking-tight">IronLog AI</h1>
            </div>
            <button 
                onClick={handleLogout}
                className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-medium transition-colors"
            >
                <LogOut size={18} />
                Logout 登出
            </button>
        </div>
      </div>
      
      {/* Mobile Status Bar Spacer (Only shows on mobile) */}
      <div className="sm:hidden h-2 w-full"></div>

      <main className="flex-1 pb-32 w-full">
        {activeTab === Tab.LOG && (
          <DailyLog 
            currentDate={currentDate} 
            onDateChange={setCurrentDate}
            exercises={exercises}
            onDeleteExercise={handleDeleteExercise}
            onEditExercise={handleEditExercise}
          />
        )}
        {activeTab === Tab.STATS && (
          <StatsReport exercises={exercises} userProfile={userProfile} />
        )}
        {activeTab === Tab.SETTINGS && (
          <div className="p-6 max-w-md mx-auto pt-12 animate-in slide-in-from-bottom-5 duration-300">
            <div className="bg-card rounded-3xl p-8 border border-slate-700/50 text-center shadow-xl">
                <div className="w-24 h-24 bg-slate-800 rounded-full mx-auto flex items-center justify-center text-primary mb-6 ring-4 ring-slate-800/50 shadow-inner">
                    <User size={48} />
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-1">IronLog User</h2>
                <p className="text-slate-500 text-sm mb-8">Securely logged in</p>

                <div className="space-y-4 mb-6 text-left">
                    <div>
                        <label htmlFor="heightUnit" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                          Height Unit
                        </label>
                        <select
                          id="heightUnit"
                          value={userProfile.heightUnit}
                          onChange={(e) => handleHeightUnitChange(e.target.value as UserProfile['heightUnit'])}
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/70"
                        >
                          <option value="cm">cm</option>
                          <option value="ft_in">ft + in</option>
                        </select>
                    </div>
                    {userProfile.heightUnit === 'cm' ? (
                      <div>
                        <label htmlFor="heightCm" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                          Height (cm)
                        </label>
                        <input
                          id="heightCm"
                          type="number"
                          min="1"
                          step="0.1"
                          value={userProfile.heightCm ?? ''}
                          onChange={(e) => handleProfileNumberChange('heightCm', e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/70"
                          placeholder="e.g. 170"
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="heightFt" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                            Height (ft)
                          </label>
                          <input
                            id="heightFt"
                            type="number"
                            min="1"
                            step="1"
                            value={userProfile.heightFt ?? ''}
                            onChange={(e) => handleProfileNumberChange('heightFt', e.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/70"
                            placeholder="e.g. 5"
                          />
                        </div>
                        <div>
                          <label htmlFor="heightIn" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                            Height (in)
                          </label>
                          <input
                            id="heightIn"
                            type="number"
                            min="0"
                            max="11"
                            step="1"
                            value={userProfile.heightIn ?? ''}
                            onChange={(e) => handleProfileNumberChange('heightIn', e.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/70"
                            placeholder="e.g. 9"
                          />
                        </div>
                      </div>
                    )}
                    <div>
                        <label htmlFor="weightUnit" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                          Weight Unit
                        </label>
                        <select
                          id="weightUnit"
                          value={userProfile.weightUnit}
                          onChange={(e) => handleWeightUnitChange(e.target.value as UserProfile['weightUnit'])}
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/70"
                        >
                          <option value="kg">kg</option>
                          <option value="lb">lb</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="weightValue" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                          Weight ({userProfile.weightUnit})
                        </label>
                        <input
                          id="weightValue"
                          type="number"
                          min="1"
                          step="0.1"
                          value={userProfile.weightValue ?? ''}
                          onChange={(e) => handleProfileNumberChange('weightValue', e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/70"
                          placeholder={userProfile.weightUnit === 'kg' ? 'e.g. 70' : 'e.g. 154'}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <Button variant="danger" size="lg" className="w-full flex items-center justify-center gap-3" onClick={handleLogout}>
                        <LogOut size={20} />
                        Logout 登出
                    </Button>
                </div>
                
                <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-600">
                    <p>IronLog AI v1.1.0</p>
                    <p className="mt-1">Designed for Gains</p>
                </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Button for Adding Workout */}
      {activeTab === Tab.LOG && (
        <button
            onClick={() => {
              setEditingExercise(null);
              setIsAddModalOpen(true);
            }}
            className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-6 bg-primary hover:bg-emerald-500 text-white p-4 rounded-full shadow-lg shadow-emerald-500/30 transition-all hover:scale-105 active:scale-95 z-40"
        >
            <PlusCircle size={28} />
        </button>
      )}

      {/* Bottom Navigation with Safe Area Padding */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-lg border-t border-slate-800 z-50 pb-safe">
        <div className="max-w-md mx-auto flex justify-between items-center px-6 py-4">
          <button
            onClick={() => setActiveTab(Tab.LOG)}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors w-16",
              activeTab === Tab.LOG ? "text-primary" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <ListTodo size={24} strokeWidth={activeTab === Tab.LOG ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Log 紀錄</span>
          </button>
          
          <button
            onClick={() => setActiveTab(Tab.STATS)}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors w-16",
              activeTab === Tab.STATS ? "text-primary" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <BarChart2 size={24} strokeWidth={activeTab === Tab.STATS ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Report 報表</span>
          </button>

          <button
            onClick={() => setActiveTab(Tab.SETTINGS)}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors w-16",
              activeTab === Tab.SETTINGS ? "text-primary" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <Settings size={24} strokeWidth={activeTab === Tab.SETTINGS ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Setting 設定</span>
          </button>
        </div>
      </nav>

      {/* Modals */}
      {isAddModalOpen && (
        <AddExerciseForm 
          onAdd={handleAddExercise} 
          onUpdate={handleUpdateExercise}
          initialExercise={editingExercise}
          onClose={handleCloseAddModal} 
        />
      )}

      {pendingDeleteExerciseId && (
        <div
          className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={handleCancelDelete}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-700 bg-card p-5 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-2">
              刪除紀錄 Delete Log
            </h3>
            <p className="text-sm text-slate-300 mb-6">
              確定要刪除這筆 log 嗎？此動作無法復原。<br />
              Are you sure you want to delete this log? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={handleCancelDelete}>
                取消 Cancel
              </Button>
              <Button variant="danger" onClick={handleConfirmDelete}>
                確認刪除 Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
