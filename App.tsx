import React, { useState, useEffect, useRef } from 'react';
import { 
  PlayCircle, 
  History, 
  Settings as SettingsIcon, 
  LogOut, 
  Coffee 
} from 'lucide-react';
import { 
  getOrInitTodayRecord, 
  saveDayRecord, 
  loadSettings, 
  saveSettings 
} from './services/storageService';
import { DayRecord, AppSettings, TodoItem, IntervalLog } from './types';

import { Dashboard } from './components/Dashboard';
import { MorningBriefing } from './components/MorningBriefing';
import { HistoryView } from './components/HistoryView';
import { Modal } from './components/ui/Modal';

type View = 'dashboard' | 'history' | 'settings';

const App: React.FC = () => {
  // App State
  const [view, setView] = useState<View>('dashboard');
  const [isMorningBriefingOpen, setIsMorningBriefingOpen] = useState(false);
  const [isIntervalModalOpen, setIsIntervalModalOpen] = useState(false);
  
  // Data State
  const [todayRecord, setTodayRecord] = useState<DayRecord | null>(null);
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(settings.intervalMinutes * 60);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<number | null>(null);
  const [intervalLogText, setIntervalLogText] = useState("");

  // Initialization
  useEffect(() => {
    const record = getOrInitTodayRecord();
    setTodayRecord(record);
    // If morning review not done (simple check: if morningReview is empty), prompt it
    // In a real app, add a boolean flag to record like 'briefingCompleted'
    if (!record.morningReview && record.logs.length === 0 && record.todos.length === 0) {
       setIsMorningBriefingOpen(true);
    }
  }, []);

  // Timer Logic
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = window.setTimeout(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handleTimerComplete();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isActive, timeLeft]);

  const handleTimerComplete = () => {
    setIsActive(false);
    
    // 1. Play Sound
    if (settings.soundEnabled) {
       try {
         // Using a distinct "ding" sound
         const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.m4a');
         audio.volume = 0.5;
         audio.play();
       } catch(e) {
         console.error("Audio play failed", e);
       }
    }

    // 2. Send Sticky Notification
    if (settings.notificationsEnabled && Notification.permission === "granted") {
      try {
        const n = new Notification("Time's Up!", { 
            body: "Click here to log your accomplishment.",
            requireInteraction: true, // Keep notification on screen until clicked
            tag: 'focusflow-timer'
        });
        
        // Key feature: Click notification to bring window to front
        n.onclick = () => {
          window.focus();
          n.close();
          setIsIntervalModalOpen(true);
        };
      } catch (e) {
        console.error("Notification failed", e);
      }
    }

    setIsIntervalModalOpen(true);
  };

  const requestNotificationPermission = () => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  };

  // Actions
  const toggleTimer = () => {
    if (!isActive) {
      requestNotificationPermission();
    }
    setIsActive(!isActive);
  };

  const handleMorningComplete = (newTodos: TodoItem[]) => {
    if (!todayRecord) return;
    const updated = { 
        ...todayRecord, 
        todos: newTodos, 
        morningReview: "Completed" // Marker that briefing is done
    };
    setTodayRecord(updated);
    saveDayRecord(updated);
    setIsMorningBriefingOpen(false);
  };

  const handleIntervalLogSubmit = () => {
    if (!todayRecord) return;
    
    const newLog: IntervalLog = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      content: intervalLogText,
      durationMinutes: settings.intervalMinutes
    };

    const updated = {
      ...todayRecord,
      logs: [...todayRecord.logs, newLog]
    };

    setTodayRecord(updated);
    saveDayRecord(updated);
    
    setIntervalLogText("");
    setIsIntervalModalOpen(false);
    setTimeLeft(settings.intervalMinutes * 60);
    // Optional: Auto restart or wait for user
    // setIsActive(true); 
  };

  const handleAddTodo = (text: string) => {
    if (!todayRecord) return;
    const newTodo: TodoItem = {
      id: Date.now().toString(),
      text,
      completed: false
    };
    const updated = { ...todayRecord, todos: [...todayRecord.todos, newTodo] };
    setTodayRecord(updated);
    saveDayRecord(updated);
  };

  const handleToggleTodo = (id: string) => {
    if (!todayRecord) return;
    const updatedTodos = todayRecord.todos.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    const updated = { ...todayRecord, todos: updatedTodos };
    setTodayRecord(updated);
    saveDayRecord(updated);
  };

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
      const updated = { ...settings, ...newSettings };
      setSettings(updated);
      saveSettings(updated);
      // If changing interval, reset timer if not active
      if (newSettings.intervalMinutes && !isActive) {
          setTimeLeft(newSettings.intervalMinutes * 60);
      }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* Sidebar Navigation */}
      <aside className="w-20 lg:w-64 bg-white border-r border-slate-200 flex flex-col items-center lg:items-start py-8 px-2 lg:px-6 transition-all z-10">
        <div className="mb-12 flex items-center gap-3 px-2">
           <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
             <Coffee size={20} />
           </div>
           <span className="hidden lg:block text-xl font-bold text-slate-800">FocusFlow</span>
        </div>
        
        <nav className="flex-1 w-full space-y-2">
           <button 
             onClick={() => setView('dashboard')}
             className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${view === 'dashboard' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
           >
             <PlayCircle size={22} />
             <span className="hidden lg:block">Focus</span>
           </button>
           <button 
             onClick={() => setView('history')}
             className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${view === 'history' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
           >
             <History size={22} />
             <span className="hidden lg:block">History</span>
           </button>
           <button 
             onClick={() => setView('settings')}
             className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${view === 'settings' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
           >
             <SettingsIcon size={22} />
             <span className="hidden lg:block">Settings</span>
           </button>
        </nav>

        <button 
          onClick={() => setIsMorningBriefingOpen(true)}
          className="mt-auto w-full flex items-center gap-3 p-3 rounded-xl text-slate-500 hover:bg-amber-50 hover:text-amber-600 transition-colors border border-dashed border-slate-300 hover:border-amber-300"
        >
          <LogOut size={22} />
          <span className="hidden lg:block text-sm">Redo Morning Brief</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        <header className="h-20 px-8 flex items-center justify-between bg-white/50 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-10">
           <h1 className="text-2xl font-bold text-slate-800 capitalize">
             {view}
           </h1>
           <div className="text-sm text-slate-500 font-medium">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
           </div>
        </header>

        <div className="p-6 lg:p-8 h-[calc(100vh-80px)] overflow-y-auto">
          {view === 'dashboard' && todayRecord && (
             <Dashboard 
               todos={todayRecord.todos}
               onToggleTodo={handleToggleTodo}
               onAddTodo={handleAddTodo}
               timeLeft={timeLeft}
               totalTime={settings.intervalMinutes * 60}
               isActive={isActive}
               onToggleTimer={toggleTimer}
             />
          )}
          {view === 'history' && <HistoryView />}
          {view === 'settings' && (
             <div className="max-w-xl bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                <h2 className="text-lg font-semibold mb-6">Preferences</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Focus Interval (Minutes)
                    </label>
                    <input 
                      type="number" 
                      value={settings.intervalMinutes}
                      onChange={(e) => handleUpdateSettings({ intervalMinutes: parseInt(e.target.value) || 25 })}
                      className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 font-medium">Enable Sound Effects</span>
                    <button 
                      onClick={() => handleUpdateSettings({ soundEnabled: !settings.soundEnabled })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.soundEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.soundEnabled ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 font-medium">Desktop Notifications</span>
                    <button 
                      onClick={() => {
                        handleUpdateSettings({ notificationsEnabled: !settings.notificationsEnabled });
                        if(!settings.notificationsEnabled) requestNotificationPermission();
                      }}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.notificationsEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.notificationsEnabled ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
             </div>
          )}
        </div>
      </main>

      {/* Morning Briefing Modal (Full Screen Overlay) */}
      {isMorningBriefingOpen && (
        <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
           <div className="min-h-screen flex flex-col items-center justify-center py-10 px-4">
              <MorningBriefing 
                onComplete={handleMorningComplete} 
                initialTodos={todayRecord?.todos || []}
              />
           </div>
        </div>
      )}

      {/* Interval Check-in Modal */}
      <Modal 
        isOpen={isIntervalModalOpen} 
        onClose={() => {/* Prevent closing without logging */}} 
        title="Time Check!"
      >
        <div className="space-y-4">
           <p className="text-slate-600">
             You've focused for {settings.intervalMinutes} minutes. What did you accomplish?
           </p>
           <textarea
             className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none min-h-[120px]"
             placeholder="I worked on..."
             value={intervalLogText}
             onChange={(e) => setIntervalLogText(e.target.value)}
             autoFocus
           />
           <div className="flex justify-end">
             <button 
               onClick={handleIntervalLogSubmit}
               disabled={!intervalLogText.trim()}
               className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium transition-colors"
             >
               Save Log
             </button>
           </div>
        </div>
      </Modal>

    </div>
  );
};

export default App;