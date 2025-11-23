import React from 'react';
import { Timer } from './Timer';
import { TodoItem } from '../types';
import { Play, Pause, Plus, CheckCircle2, Circle, ExternalLink } from 'lucide-react';

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
    
    // Use URL object to safely construct the new URL based on the current full location
    // This handles subpaths and preview environments correctly vs just pathname
    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'mini');
    
    window.open(
      url.toString(), 
      'FocusFlowMini', 
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,alwaysOnTop=yes`
    );
  };

  const activeTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full pb-10">
      {/* 左列：计时器与专注 */}
      <div className="relative flex-1 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg shadow-slate-200/50 border border-white p-8 min-h-[450px] transition-all duration-500 hover:shadow-xl hover:shadow-indigo-100/50">
        
        {/* 右上角弹出按钮 */}
        <button 
          onClick={openMiniMode}
          className="absolute top-6 right-6 p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all flex items-center gap-2 text-sm font-medium group"
          title="打开迷你悬浮窗"
        >
          <ExternalLink size={18} className="group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">弹出</span>
        </button>

        <div className="mb-10 mt-4 transform hover:scale-105 transition-transform duration-500">
           <Timer timeLeft={timeLeft} totalSeconds={totalTime} isActive={isActive} />
        </div>
        
        <div className="flex flex-col items-center gap-5 w-full">
          <div className="flex items-center gap-3">
             <span className="text-sm font-semibold text-slate-400 uppercase tracking-widest">窗口置顶?</span>
             <button 
               onClick={openMiniMode} 
               className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-xs font-medium transition-colors"
             >
               尝试迷你模式
             </button>
          </div>

          <button
            onClick={onToggleTimer}
            className={`flex items-center gap-3 px-10 py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 ${
              isActive 
                ? 'bg-amber-100 text-amber-700 border border-amber-200 shadow-amber-200' 
                : 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-indigo-200'
            }`}
          >
            {isActive ? <><Pause fill="currentColor" /> 暂停专注</> : <><Play fill="currentColor" /> 开始专注</>}
          </button>
        </div>
        
        <p className="mt-8 text-slate-400 text-sm bg-slate-50 px-4 py-1 rounded-full">
           当前专注时长设定为 <span className="font-semibold text-slate-600">{Math.floor(totalTime / 60)} 分钟</span>
        </p>
      </div>

      {/* 右列：任务 */}
      <div className="flex-1 flex flex-col bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg shadow-slate-200/50 border border-white p-8 min-h-[450px]">
        <div className="flex items-center justify-between mb-6">
           <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
             今日任务 <span className="bg-indigo-100 text-indigo-600 text-xs px-2.5 py-1 rounded-full font-bold">{activeTodos.length}</span>
           </h2>
        </div>
        
        <form onSubmit={handleQuickAdd} className="relative mb-8 group">
          <input 
             type="text" 
             value={quickAddText}
             onChange={(e) => setQuickAddText(e.target.value)}
             placeholder="接下来要做什么？"
             className="w-full pl-5 pr-14 py-4 bg-slate-50 border-none ring-1 ring-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all shadow-inner"
          />
          <button 
            type="submit"
            disabled={!quickAddText.trim()}
            className="absolute right-2 top-2 p-2 bg-white rounded-xl text-indigo-600 hover:bg-indigo-50 shadow-sm border border-slate-100 transition-colors"
          >
            <Plus size={20} />
          </button>
        </form>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          {todos.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-center text-slate-400">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                  <CheckCircle2 size={32} />
              </div>
              <p>任务都完成了！放松一下或计划下一步。</p>
            </div>
          )}

          {activeTodos.map(todo => (
            <div key={todo.id} className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer group" onClick={() => onToggleTodo(todo.id)}>
               <button className="text-slate-300 group-hover:text-indigo-500 transition-colors transform group-hover:scale-110">
                 <Circle size={24} />
               </button>
               <span className="text-slate-700 font-medium group-hover:text-slate-900">{todo.text}</span>
            </div>
          ))}

          {completedTodos.length > 0 && (
            <div className="pt-6 mt-6 border-t border-slate-100">
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">已完成</h3>
               <div className="space-y-2">
                   {completedTodos.map(todo => (
                    <div key={todo.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group opacity-60 hover:opacity-100" onClick={() => onToggleTodo(todo.id)}>
                      <button className="text-emerald-500">
                        <CheckCircle2 size={20} />
                      </button>
                      <span className="text-slate-500 line-through decoration-slate-300 group-hover:decoration-slate-400">{todo.text}</span>
                    </div>
                   ))}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};