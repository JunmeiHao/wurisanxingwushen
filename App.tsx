import React, { useState, useEffect, useRef } from 'react';
import { 
  PlayCircle, 
  History, 
  Settings as SettingsIcon, 
  LogOut, 
  Coffee,
  Play,
  Pause,
  Save,
  CheckCircle2,
  Download,
  Upload,
  Database,
  Bot,
  Key
} from 'lucide-react';
import { 
  getOrInitTodayRecord, 
  saveDayRecord, 
  loadSettings, 
  saveSettings 
} from './services/storageService';
import { DayRecord, AppSettings, TodoItem, IntervalLog, AIProvider } from './types';

import { Dashboard } from './components/Dashboard';
import { MorningBriefing } from './components/MorningBriefing';
import { HistoryView } from './components/HistoryView';
import { Modal } from './components/ui/Modal';
import { Timer } from './components/Timer';

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
  
  // Mini Mode State
  const [isMiniMode, setIsMiniMode] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Initialization
  useEffect(() => {
    // Check for Mini Mode query param
    const params = new URLSearchParams(window.location.search);
    const mini = params.get('mode') === 'mini';
    setIsMiniMode(mini);

    const record = getOrInitTodayRecord();
    setTodayRecord(record);
    // Only prompt briefing in main mode
    if (!mini && !record.morningReview && record.logs.length === 0 && record.todos.length === 0) {
       setIsMorningBriefingOpen(true);
    }
  }, []);

  // Window Synchronization
  useEffect(() => {
    const channel = new BroadcastChannel('focusflow_sync');
    channelRef.current = channel;

    channel.onmessage = (event) => {
      const { type, payload } = event.data;
      
      switch (type) {
        case 'SYNC_STATE':
          // Update local state from broadcast if significant drift
          if (payload.timeLeft !== undefined && Math.abs(payload.timeLeft - timeLeft) > 2) {
             setTimeLeft(payload.timeLeft);
          }
          if (payload.isActive !== undefined) setIsActive(payload.isActive);
          break;
        case 'ACTION':
          if (payload.action === 'START') setIsActive(true);
          if (payload.action === 'PAUSE') setIsActive(false);
          if (payload.action === 'RESET') {
             setIsActive(false);
             setTimeLeft(settings.intervalMinutes * 60);
          }
          break;
        case 'TIMER_COMPLETE':
          setIsActive(false);
          setTimeLeft(0);
          setIsIntervalModalOpen(true);
          break;
        case 'DATA_UPDATED':
          setTodayRecord(getOrInitTodayRecord());
          break;
      }
    };

    return () => channel.close();
  }, [timeLeft, settings.intervalMinutes]);

  // Timer Logic
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = window.setTimeout(() => {
        const newTime = timeLeft - 1;
        setTimeLeft(newTime);
        
        // Broadcast sync occasionally (every 2 seconds) to keep windows aligned
        if (newTime % 2 === 0 && channelRef.current) {
            channelRef.current.postMessage({
                type: 'SYNC_STATE',
                payload: { timeLeft: newTime, isActive: true }
            });
        }
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handleTimerComplete(true);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isActive, timeLeft]);

  const handleTimerComplete = (shouldBroadcast = true) => {
    setIsActive(false);
    
    // Play sound
    if (settings.soundEnabled) {
       try {
         const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.m4a');
         audio.volume = 0.5;
         audio.play().catch(() => {});
       } catch(e) {}
    }

    // Notification handling
    if (isMiniMode) {
        window.focus();
    } else if (settings.notificationsEnabled && Notification.permission === "granted") {
      try {
        const n = new Notification("Time's Up!", { 
            body: "Click here to log your accomplishment.",
            requireInteraction: true,
            tag: 'focusflow-timer'
        });
        n.onclick = () => {
          window.focus();
          n.close();
          setIsIntervalModalOpen(true);
        };
      } catch (e) {}
    }

    setIsIntervalModalOpen(true);

    if (shouldBroadcast && channelRef.current) {
        channelRef.current.postMessage({ type: 'TIMER_COMPLETE' });
    }
  };

  const requestNotificationPermission = () => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  };

  const toggleTimer = () => {
    const newState = !isActive;
    setIsActive(newState);
    if (newState) requestNotificationPermission();

    // Broadcast action
    if (channelRef.current) {
        channelRef.current.postMessage({ 
            type: 'ACTION', 
            payload: { action: newState ? 'START' : 'PAUSE' } 
        });
    }
  };

  const handleMorningComplete = (newTodos: TodoItem[]) => {
    if (!todayRecord) return;
    const updated = { 
        ...todayRecord, 
        todos: newTodos, 
        morningReview: "Completed" 
    };
    setTodayRecord(updated);
    saveDayRecord(updated);
    setIsMorningBriefingOpen(false);
    channelRef.current?.postMessage({ type: 'DATA_UPDATED' });
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

    if (channelRef.current) {
        channelRef.current.postMessage({ type: 'DATA_UPDATED' });
        channelRef.current.postMessage({ type: 'ACTION', payload: { action: 'RESET' } });
    }
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
    channelRef.current?.postMessage({ type: 'DATA_UPDATED' });
  };

  const handleToggleTodo = (id: string) => {
    if (!todayRecord) return;
    const updatedTodos = todayRecord.todos.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    const updated = { ...todayRecord, todos: updatedTodos };
    setTodayRecord(updated);
    saveDayRecord(updated);
    channelRef.current?.postMessage({ type: 'DATA_UPDATED' });
  };

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
      const updated = { ...settings, ...newSettings };
      setSettings(updated);
      saveSettings(updated);
      if (newSettings.intervalMinutes && !isActive) {
          setTimeLeft(newSettings.intervalMinutes * 60);
      }
  };

  // Data Management Handlers
  const exportData = () => {
    const data = localStorage.getItem('focusflow_data');
    const blob = new Blob([data || '{}'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `focusflow_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        JSON.parse(content); // Validate JSON
        localStorage.setItem('focusflow_data', content);
        window.location.reload();
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  // --- RENDER: MINI MODE ---
  if (isMiniMode) {
    // ... (Mini mode logic remains same as previous)
    return (
      <div className="h-screen w-screen bg-slate-50 flex flex-col overflow-hidden">
        <div className="h-8 bg-slate-100 w-full flex items-center justify-center cursor-move border-b border-slate-200">
           <div className="w-12 h-1.5 rounded-full bg-slate-300" />
        </div>

        {isIntervalModalOpen ? (
          <div className="flex-1 p-6 flex flex-col animate-in fade-in zoom-in duration-300 bg-white">
             <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 text-green-600 rounded-full mb-2 animate-bounce">
                   <CheckCircle2 size={24} />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Time's Up!</h2>
                <p className="text-slate-500 text-xs">What did you achieve?</p>
             </div>
             
             <textarea 
               className="flex-1 w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none shadow-inner text-slate-700 mb-4"
               placeholder="I worked on..."
               value={intervalLogText}
               onChange={(e) => setIntervalLogText(e.target.value)}
               autoFocus
               onKeyDown={(e) => {
                   if(e.key === 'Enter' && !e.shiftKey) {
                       e.preventDefault();
                       if(intervalLogText.trim()) handleIntervalLogSubmit();
                   }
               }}
             />
             
             <button 
               onClick={handleIntervalLogSubmit}
               disabled={!intervalLogText.trim()}
               className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-indigo-200"
             >
               <Save size={18} /> Save & Reset
             </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
             <div className="transform scale-90">
               <Timer 
                 timeLeft={timeLeft} 
                 totalSeconds={settings.intervalMinutes * 60} 
                 isActive={isActive}
                 isMini={true}
               />
             </div>
             
             <button
                onClick={toggleTimer}
                className={`mt-6 flex items-center gap-2 px-8 py-3 rounded-full font-bold shadow-md transition-all ${
                  isActive 
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {isActive ? <><Pause size={20} fill="currentColor" /> Pause</> : <><Play size={20} fill="currentColor" /> Start</>}
              </button>
          </div>
        )}
      </div>
    );
  }

  // --- RENDER: MAIN APP ---
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
             <div className="max-w-2xl mx-auto space-y-8">
                
                {/* Preferences */}
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                  <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <SettingsIcon size={20} className="text-indigo-600"/> Preferences
                  </h2>
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

                {/* AI Configuration */}
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                  <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                     <Bot size={20} className="text-indigo-600" /> AI Configuration
                  </h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">AI Provider</label>
                      <select
                        value={settings.aiProvider}
                        onChange={(e) => handleUpdateSettings({ aiProvider: e.target.value as AIProvider })}
                        className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      >
                        <option value="gemini">Gemini (Google)</option>
                        <option value="openai">OpenAI</option>
                        <option value="deepseek">DeepSeek</option>
                        <option value="qwen">Qwen (Alibaba)</option>
                        <option value="custom">Custom (OpenAI Compatible)</option>
                      </select>
                    </div>

                    {settings.aiProvider !== 'gemini' && (
                       <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                               <Key size={14} /> API Key
                            </label>
                            <input 
                              type="password"
                              value={settings.aiApiKey || ''}
                              onChange={(e) => handleUpdateSettings({ aiApiKey: e.target.value })}
                              placeholder={`Enter your ${settings.aiProvider} API Key`}
                              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Model Name</label>
                            <input 
                              type="text"
                              value={settings.aiModel || ''}
                              onChange={(e) => handleUpdateSettings({ aiModel: e.target.value })}
                              placeholder={
                                settings.aiProvider === 'openai' ? 'gpt-4o' : 
                                settings.aiProvider === 'deepseek' ? 'deepseek-chat' : 
                                settings.aiProvider === 'qwen' ? 'qwen-plus' : 'Model Name'
                              }
                              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Base URL (Optional)</label>
                            <input 
                              type="text"
                              value={settings.aiBaseUrl || ''}
                              onChange={(e) => handleUpdateSettings({ aiBaseUrl: e.target.value })}
                              placeholder="https://api.example.com/v1"
                              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                            />
                          </div>
                       </div>
                    )}
                    {settings.aiProvider === 'gemini' && (
                       <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
                         Using built-in Google GenAI SDK. API Key is loaded from environment variables automatically, but you can override it if needed.
                       </p>
                    )}
                  </div>
                </div>

                {/* Data Management */}
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                  <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <Database size={20} className="text-indigo-600" /> Data Management
                  </h2>
                  
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-6 text-sm text-indigo-900">
                     <strong>Current Location:</strong> Browser Local Storage (Persistent)
                     <p className="mt-1 opacity-80">Your data stays in this browser unless you clear cookies/site data.</p>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={exportData}
                      className="flex-1 flex items-center justify-center gap-2 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium text-slate-700"
                    >
                      <Download size={18} /> Export JSON
                    </button>
                    
                    <label className="flex-1 flex items-center justify-center gap-2 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium text-slate-700 cursor-pointer">
                      <Upload size={18} /> Import JSON
                      <input 
                        type="file" 
                        accept=".json"
                        onChange={importData}
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>

             </div>
          )}
        </div>
      </main>

      {/* Morning Briefing Modal */}
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
        onClose={() => {}} 
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