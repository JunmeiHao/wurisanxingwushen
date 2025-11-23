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
  Key,
  LineChart,
  FileSpreadsheet,
  Wand2
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
import { ReviewView } from './components/ReviewView';
import { Modal } from './components/ui/Modal';
import { Timer } from './components/Timer';

type View = 'dashboard' | 'history' | 'review' | 'settings';

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
        const n = new Notification("时间到!", { 
            body: "点击这里记录你的成果。",
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
        morningReview: `已完成于 ${new Date().toLocaleTimeString('zh-CN')}`
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

  const handleExportExcel = () => {
    const rawData = localStorage.getItem('focusflow_data');
    const data: Record<string, DayRecord> = rawData ? JSON.parse(rawData) : {};
    const records = Object.values(data).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Sheet 1: 每日汇总
    const summaryRows = records.map(rec => ({
        "日期": rec.date,
        "日志数量": rec.logs.length,
        "总专注时长(分钟)": rec.logs.reduce((acc, l) => acc + l.durationMinutes, 0),
        "完成任务数": rec.todos.filter(t => t.completed).length,
        "总任务数": rec.todos.length,
        "AI 总结": rec.dailySummary || "无"
    }));

    // Sheet 2: 详细日志
    const logRows: any[] = [];
    records.forEach(rec => {
        rec.logs.forEach(log => {
            logRows.push({
                "日期": rec.date,
                "时间": new Date(log.timestamp).toLocaleTimeString('zh-CN'),
                "时长(分钟)": log.durationMinutes,
                "内容": log.content
            });
        });
    });

    // Use global XLSX
    // @ts-ignore
    if (window.XLSX) {
        // @ts-ignore
        const wb = window.XLSX.utils.book_new();
        // @ts-ignore
        const wsSummary = window.XLSX.utils.json_to_sheet(summaryRows);
        // @ts-ignore
        const wsLogs = window.XLSX.utils.json_to_sheet(logRows);

        // @ts-ignore
        window.XLSX.utils.book_append_sheet(wb, wsSummary, "每日汇总");
        // @ts-ignore
        window.XLSX.utils.book_append_sheet(wb, wsLogs, "详细日志");
        // @ts-ignore
        window.XLSX.writeFile(wb, `FocusFlow_报表_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
        alert("Excel 导出库加载失败，请检查网络。");
    }
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!window.confirm("警告：导入将覆盖您当前的所有数据。确定要继续吗？")) {
        event.target.value = ''; // Reset input
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        JSON.parse(content); // Validate JSON
        localStorage.setItem('focusflow_data', content);
        window.location.reload();
      } catch (err) {
        alert('无效的 JSON 文件');
      }
    };
    reader.readAsText(file);
  };

  // Generate Mock Data
  const handleGenerateMockData = () => {
      if (!window.confirm("这将生成过去 7 天的模拟数据（包括日志和任务），用于测试复盘功能。现有重合日期的数据将被覆盖。确定要继续吗？")) return;

      const taskPool = ["回复客户邮件", "更新项目文档", "修复登录 Bug", "前端性能优化", "参加团队周会", "整理待办事项", "学习 Next.js 新特性", "数据库迁移测试", "UI 设计评审"];
      const logPool = ["编写代码", "阅读技术文档", "调试接口", "思考架构设计", "处理紧急工单", "Code Review", "撰写测试用例"];
      
      const today = new Date();
      
      // Generate for past 7 days
      for(let i=1; i<=7; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          
          const numLogs = Math.floor(Math.random() * 4) + 2; // 2-5 logs
          const logs: IntervalLog[] = [];
          for(let j=0; j<numLogs; j++) {
              logs.push({
                  id: `mock-log-${dateStr}-${j}`,
                  timestamp: d.getTime() + (1000 * 60 * 60 * (9 + j)), // Start from 9 AM
                  content: logPool[Math.floor(Math.random() * logPool.length)],
                  durationMinutes: settings.intervalMinutes
              });
          }

          const numTodos = Math.floor(Math.random() * 4) + 3; // 3-6 todos
          const todos: TodoItem[] = [];
          for(let k=0; k<numTodos; k++) {
              todos.push({
                  id: `mock-todo-${dateStr}-${k}`,
                  text: taskPool[Math.floor(Math.random() * taskPool.length)],
                  completed: Math.random() > 0.3, // 70% chance completed
                  category: 'normal'
              });
          }

          const record: DayRecord = {
              date: dateStr,
              logs: logs,
              todos: todos,
              status: 'active',
              dailySummary: Math.random() > 0.6 ? "（模拟 AI 总结）\n今天工作非常充实，主要完成了几个关键模块的开发，虽然下午有点分心，但整体效率不错。" : undefined
          };
          
          saveDayRecord(record);
      }

      alert("✅ 模拟数据生成完毕！请前往【复盘】或【历史】页面查看效果。");
      window.location.reload();
  };

  // --- RENDER: MINI MODE ---
  if (isMiniMode) {
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
                <h2 className="text-xl font-bold text-slate-800">时间到!</h2>
                <p className="text-slate-500 text-xs">你完成了什么？</p>
             </div>
             
             <textarea 
               className="flex-1 w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none shadow-inner text-slate-700 mb-4"
               placeholder="我完成了..."
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
               <Save size={18} /> 保存并重置
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
                {isActive ? <><Pause size={20} fill="currentColor" /> 暂停</> : <><Play size={20} fill="currentColor" /> 开始</>}
              </button>
          </div>
        )}
      </div>
    );
  }

  // --- RENDER: MAIN APP ---
  return (
    <div className="flex h-screen bg-slate-100 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-800 overflow-hidden">
       {/* Background Gradients */}
       <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 opacity-50">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-200 rounded-full blur-[100px]" />
       </div>

      {/* Sidebar Navigation - Glassmorphism */}
      <aside className="w-20 lg:w-72 bg-white/80 backdrop-blur-xl border-r border-white/50 flex flex-col items-center lg:items-start py-8 px-2 lg:px-6 transition-all z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="mb-10 flex items-center gap-3 px-2 lg:w-full">
           <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
             <Coffee size={20} />
           </div>
           <div className="hidden lg:block">
              <span className="block text-xl font-bold text-slate-800 tracking-tight">FocusFlow</span>
              <span className="block text-[10px] font-medium text-slate-400 uppercase tracking-widest">专业工作台</span>
           </div>
        </div>
        
        <nav className="flex-1 w-full space-y-2">
           {[
             { id: 'dashboard', icon: PlayCircle, label: '专注' },
             { id: 'history', icon: History, label: '历史' },
             { id: 'review', icon: LineChart, label: '复盘' }, // New Tab
             { id: 'settings', icon: SettingsIcon, label: '设置' },
           ].map((item) => (
             <button 
               key={item.id}
               onClick={() => setView(item.id as View)}
               className={`w-full flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 group relative ${
                 view === item.id 
                 ? 'bg-indigo-50/80 text-indigo-600 font-semibold shadow-sm' 
                 : 'text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm'
               }`}
             >
               <item.icon size={22} className={view === item.id ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} />
               <span className="hidden lg:block">{item.label}</span>
               {view === item.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 rounded-r-full" />}
             </button>
           ))}
        </nav>

        <button 
          onClick={() => setIsMorningBriefingOpen(true)}
          className="mt-auto w-full flex items-center gap-3 p-3.5 rounded-xl text-slate-500 hover:bg-amber-50 hover:text-amber-700 transition-colors border border-dashed border-slate-300 hover:border-amber-300 group"
        >
          <LogOut size={22} className="group-hover:rotate-12 transition-transform" />
          <span className="hidden lg:block text-sm font-medium">重做晨间简报</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative z-10 flex flex-col">
        <header className="h-20 px-8 flex items-center justify-between bg-transparent sticky top-0 z-10">
           <div className="flex flex-col">
             <h1 className="text-2xl font-bold text-slate-800 capitalize tracking-tight">
               {view === 'review' ? '复盘' : 
                view === 'dashboard' ? '专注面板' :
                view === 'history' ? '历史记录' : '系统设置'}
             </h1>
             <div className="text-sm text-slate-500 font-medium">
                {new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })}
             </div>
           </div>

           {/* Contextual Actions */}
           {view === 'settings' && (
              <div className="flex gap-2">
                 <button 
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-lg shadow-emerald-200 transition-all text-sm font-medium"
                 >
                    <FileSpreadsheet size={16} /> 导出 Excel
                 </button>
              </div>
           )}
        </header>

        <div className="p-6 lg:p-8 h-[calc(100vh-80px)] overflow-y-auto scroll-smooth">
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
          {view === 'review' && <ReviewView />}
          {view === 'settings' && (
             <div className="max-w-3xl mx-auto space-y-8 pb-10">
                
                {/* Preferences */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-white">
                  <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-slate-800">
                    <SettingsIcon size={20} className="text-indigo-500"/> 偏好设置
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        专注时长 (分钟)
                      </label>
                      <input 
                        type="number" 
                        value={settings.intervalMinutes}
                        onChange={(e) => handleUpdateSettings({ intervalMinutes: parseInt(e.target.value) || 25 })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-slate-700 font-medium text-sm">提示音效</span>
                          <button 
                            onClick={() => handleUpdateSettings({ soundEnabled: !settings.soundEnabled })}
                            className={`w-11 h-6 rounded-full transition-colors relative ${settings.soundEnabled ? 'bg-indigo-500' : 'bg-slate-300'}`}
                          >
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${settings.soundEnabled ? 'left-6' : 'left-1'}`} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-slate-700 font-medium text-sm">系统通知</span>
                          <button 
                            onClick={() => {
                              handleUpdateSettings({ notificationsEnabled: !settings.notificationsEnabled });
                              if(!settings.notificationsEnabled) requestNotificationPermission();
                            }}
                            className={`w-11 h-6 rounded-full transition-colors relative ${settings.notificationsEnabled ? 'bg-indigo-500' : 'bg-slate-300'}`}
                          >
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${settings.notificationsEnabled ? 'left-6' : 'left-1'}`} />
                          </button>
                        </div>
                    </div>
                  </div>
                </div>

                {/* AI Configuration */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-white">
                  <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-slate-800">
                     <Bot size={20} className="text-indigo-500" /> AI 智能配置
                  </h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">AI 服务商</label>
                      <div className="relative">
                        <select
                            value={settings.aiProvider}
                            onChange={(e) => handleUpdateSettings({ aiProvider: e.target.value as AIProvider })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                        >
                            <option value="gemini">Gemini (Google)</option>
                            <option value="openai">OpenAI</option>
                            <option value="deepseek">DeepSeek</option>
                            <option value="qwen">通义千问 (Qwen)</option>
                            <option value="custom">自定义 (OpenAI 兼容)</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                        </div>
                      </div>
                    </div>

                    {settings.aiProvider !== 'gemini' && (
                       <div className="grid grid-cols-1 gap-6 p-6 bg-slate-50 rounded-xl border border-slate-200/60 animate-in fade-in slide-in-from-top-2">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                               <Key size={12} /> API Key
                            </label>
                            <input 
                              type="password"
                              value={settings.aiApiKey || ''}
                              onChange={(e) => handleUpdateSettings({ aiApiKey: e.target.value })}
                              placeholder={`输入 ${settings.aiProvider} API Key`}
                              className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">模型名称 (Model Name)</label>
                                <input 
                                  type="text"
                                  value={settings.aiModel || ''}
                                  onChange={(e) => handleUpdateSettings({ aiModel: e.target.value })}
                                  placeholder="例如: gpt-4o"
                                  className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Base URL (选填)</label>
                                <input 
                                  type="text"
                                  value={settings.aiBaseUrl || ''}
                                  onChange={(e) => handleUpdateSettings({ aiBaseUrl: e.target.value })}
                                  placeholder="https://api.example.com/v1"
                                  className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                                />
                              </div>
                          </div>
                       </div>
                    )}
                    {settings.aiProvider === 'gemini' && (
                       <p className="text-sm text-slate-500 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex items-start gap-3">
                         <Bot size={16} className="mt-0.5 text-indigo-500 shrink-0"/>
                         <span>使用内置 Google GenAI SDK。系统会自动从环境变量加载 API Key，如需覆盖可在上方选择其他服务商。</span>
                       </p>
                    )}
                  </div>
                </div>

                {/* Data Management */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-white">
                  <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-slate-800">
                    <Database size={20} className="text-indigo-500" /> 数据管理
                  </h2>
                  
                  <div className="bg-amber-50/80 border border-amber-100 rounded-xl p-4 mb-6 flex gap-3">
                     <div className="text-amber-500 shrink-0 mt-0.5">
                         <Database size={18} />
                     </div>
                     <div className="text-sm text-amber-900">
                         <strong>仅本地存储：</strong> 您的数据存储在当前浏览器的缓存中。它不会自动同步到其他设备，请定期备份。
                     </div>
                  </div>

                  <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={exportData}
                          className="flex items-center justify-center gap-2 py-3 px-4 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all font-medium text-slate-700 shadow-sm"
                        >
                          <Download size={18} /> 备份数据 (JSON)
                        </button>
                        
                        <label className="flex items-center justify-center gap-2 py-3 px-4 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all font-medium text-slate-700 shadow-sm cursor-pointer">
                          <Upload size={18} /> 恢复数据 (JSON)
                          <input 
                            type="file" 
                            accept=".json"
                            onChange={importData}
                            className="hidden" 
                          />
                        </label>
                      </div>
                      
                      <button 
                        onClick={handleGenerateMockData}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-violet-50 text-violet-700 border border-violet-100 rounded-xl hover:bg-violet-100 transition-colors font-medium dashed-border border-dashed"
                      >
                        <Wand2 size={18} /> 生成模拟演示数据 (过去7天)
                      </button>

                      <div className="pt-4 border-t border-slate-100">
                          <button 
                             onClick={handleExportExcel}
                             className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-colors font-medium"
                          >
                             <FileSpreadsheet size={18} /> 下载 Excel 完整报表
                          </button>
                      </div>
                  </div>
                </div>

             </div>
          )}
        </div>
      </main>

      {/* Morning Briefing Modal */}
      {isMorningBriefingOpen && (
        <div className="fixed inset-0 z-50 bg-slate-100/90 backdrop-blur-sm overflow-y-auto">
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
        title="时间检查!"
      >
        <div className="space-y-4">
           <p className="text-slate-600">
             你已经专注了 {settings.intervalMinutes} 分钟。完成了什么？
           </p>
           <textarea
             className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none min-h-[120px] resize-none"
             placeholder="我正在处理..."
             value={intervalLogText}
             onChange={(e) => setIntervalLogText(e.target.value)}
             autoFocus
           />
           <div className="flex justify-end">
             <button 
               onClick={handleIntervalLogSubmit}
               disabled={!intervalLogText.trim()}
               className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium transition-all shadow-lg shadow-indigo-200"
             >
               保存日志
             </button>
           </div>
        </div>
      </Modal>
    </div>
  );
};

export default App;