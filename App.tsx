import React, { useState, useEffect } from 'react';
import { Tab, Exercise } from './types';
import { getExercises, saveExercise, deleteExercise } from './services/storageService';
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
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Load data on mount
  useEffect(() => {
    setExercises(getExercises());
  }, []);

  const handleAddExercise = (name: string, sets: number, reps: number, weight: number) => {
    const newExercise: Exercise = {
      id: generateId(),
      name,
      sets,
      reps,
      weight,
      date: currentDate.toISOString(),
      timestamp: Date.now(),
    };
    saveExercise(newExercise);
    setExercises(prev => [...prev, newExercise]);
  };

  const handleDeleteExercise = (id: string) => {
    deleteExercise(id);
    setExercises(prev => prev.filter(ex => ex.id !== id));
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
          />
        )}
        {activeTab === Tab.STATS && (
          <StatsReport exercises={exercises} />
        )}
        {activeTab === Tab.SETTINGS && (
          <div className="p-6 max-w-md mx-auto pt-12 animate-in slide-in-from-bottom-5 duration-300">
            <div className="bg-card rounded-3xl p-8 border border-slate-700/50 text-center shadow-xl">
                <div className="w-24 h-24 bg-slate-800 rounded-full mx-auto flex items-center justify-center text-primary mb-6 ring-4 ring-slate-800/50 shadow-inner">
                    <User size={48} />
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-1">IronLog User</h2>
                <p className="text-slate-500 text-sm mb-8">Securely logged in</p>
                
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
      {activeTab !== Tab.SETTINGS && (
        <button
            onClick={() => setIsAddModalOpen(true)}
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
          onClose={() => setIsAddModalOpen(false)} 
        />
      )}
    </div>
  );
}