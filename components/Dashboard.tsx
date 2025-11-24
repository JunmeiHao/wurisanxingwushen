import React from 'react';
import { Timer } from './Timer';
import { TodoItem } from '../types';
import { Play, Pause, Plus, CheckCircle2, Circle, ExternalLink, MonitorUp } from 'lucide-react';

interface DashboardProps {
  todos: TodoItem[];
  onToggleTodo: (id: string) => void;
  onAddTodo: (text: string) => void;
  timeLeft: number;
  totalTime: number;
  isActive: boolean;
  onToggleTimer: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  todos,
  onToggleTodo,
  onAddTodo,
  timeLeft,
  totalTime,
  isActive,
  onToggleTimer
}) => {
  const [quickAddText, setQuickAddText] = React.useState("");

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickAddText.trim()) {
      onAddTodo(quickAddText);
      setQuickAddText("");
    }
  };

  const openMiniMode = () => {
    const width = 350;
    const height = 500;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    window.open(
      `${window.location.pathname}?mode=mini`, 
      'FocusFlowMini', 
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,alwaysOnTop=yes`
    );
  };

  const activeTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full">
      {/* Left Column: Timer & Focus */}
      <div className="relative flex-1 flex flex-col items-center justify-center bg-white rounded-2xl shadow-sm border border-slate-100 p-8 min-h-[400px]">
        
        {/* Top Right Pop Out Button */}
        <button 
          onClick={openMiniMode}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
          title="Open Mini Timer Window"
        >
          <ExternalLink size={18} />
          <span className="hidden sm:inline">Pop Out</span>
        </button>

        <div className="mb-8 mt-4">
           <Timer timeLeft={timeLeft} totalSeconds={totalTime} isActive={isActive} />
        </div>
        
        <div className="flex flex-col items-center gap-4 w-full">
          <button
            onClick={onToggleTimer}
            className={`flex items-center gap-2 px-8 py-4 rounded-full font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${
              isActive 
                ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isActive ? <><Pause fill="currentColor" /> Pause</> : <><Play fill="currentColor" /> Start Focus</>}
          </button>

          <button 
             onClick={openMiniMode}
             className="text-indigo-600 text-sm font-medium hover:underline flex items-center gap-1.5 opacity-80 hover:opacity-100"
          >
             <MonitorUp size={14} />
             Switch to Mini Window
          </button>
        </div>
        
        <p className="mt-8 text-slate-400 text-sm">
           Interval is set to {Math.floor(totalTime / 60)} minutes.
        </p>
      </div>

      {/* Right Column: Tasks */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 p-6 min-h-[400px]">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          Today's Tasks <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full">{activeTodos.length}</span>
        </h2>
        
        <form onSubmit={handleQuickAdd} className="relative mb-6">
          <input 
             type="text" 
             value={quickAddText}
             onChange={(e) => setQuickAddText(e.target.value)}
             placeholder="Add a quick task..."
             className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
          />
          <button 
            type="submit"
            disabled={!quickAddText.trim()}
            className="absolute right-2 top-2 p-1.5 bg-white rounded-lg text-indigo-600 hover:bg-indigo-50 shadow-sm border border-slate-100"
          >
            <Plus size={20} />
          </button>
        </form>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {todos.length === 0 && (
            <div className="text-center text-slate-400 py-10">
              <p>No tasks for today. Relax or add one!</p>
            </div>
          )}

          {activeTodos.map(todo => (
            <div key={todo.id} className="flex items-start gap-3 p-3 group hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" onClick={() => onToggleTodo(todo.id)}>
               <button className="mt-0.5 text-slate-300 group-hover:text-indigo-500 transition-colors">
                 <Circle size={20} />
               </button>
               <span className="text-slate-700 group-hover:text-slate-900">{todo.text}</span>
            </div>
          ))}

          {completedTodos.length > 0 && (
            <div className="pt-4 mt-4 border-t border-slate-100">
               <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Completed</h3>
               {completedTodos.map(todo => (
                <div key={todo.id} className="flex items-start gap-3 p-3 opacity-60 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => onToggleTodo(todo.id)}>
                  <button className="mt-0.5 text-emerald-500">
                    <CheckCircle2 size={20} />
                  </button>
                  <span className="text-slate-500 line-through decoration-slate-300">{todo.text}</span>
                </div>
               ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};