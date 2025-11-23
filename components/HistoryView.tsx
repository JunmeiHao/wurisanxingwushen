import React, { useState, useEffect } from 'react';
import { loadAllData } from '../services/storageService';
import { DayRecord } from '../types';
import { Clock, CheckCircle2, CalendarDays } from 'lucide-react';

export const HistoryView: React.FC = () => {
  const [history, setHistory] = useState<DayRecord[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayRecord | null>(null);

  useEffect(() => {
    const data = loadAllData();
    const sorted = Object.values(data).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setHistory(sorted);
    if (sorted.length > 0) setSelectedDay(sorted[0]);
  }, []);

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] text-slate-400">
        <Clock size={48} className="mb-4 opacity-20" />
        <p>暂无历史记录。</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg shadow-slate-200/50 border border-white overflow-hidden">
      {/* 左侧列表 */}
      <div className="w-1/3 border-r border-slate-100 overflow-y-auto bg-slate-50/50">
        {history.map(record => (
          <div 
            key={record.date}
            onClick={() => setSelectedDay(record)}
            className={`p-5 border-b border-slate-100 cursor-pointer transition-all ${selectedDay?.date === record.date ? 'bg-white border-l-4 border-l-indigo-600 shadow-sm z-10 relative' : 'hover:bg-white/60 border-l-4 border-l-transparent'}`}
          >
             <div className="font-semibold text-slate-800 flex items-center gap-2">
                <CalendarDays size={16} className={selectedDay?.date === record.date ? 'text-indigo-500' : 'text-slate-400'} />
                {record.date}
             </div>
             <div className="flex gap-2 mt-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                   {record.logs.length} 条日志
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${record.todos.every(t => t.completed) && record.todos.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                   {record.todos.filter(t => t.completed).length}/{record.todos.length} 任务
                </span>
             </div>
          </div>
        ))}
      </div>

      {/* 详情视图 */}
      <div className="w-2/3 p-8 overflow-y-auto bg-white/40">
        {selectedDay ? (
          <div className="space-y-8 max-w-2xl mx-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
               <div>
                   <h2 className="text-3xl font-bold text-slate-800 mb-2">{selectedDay.date}</h2>
                   <p className="text-slate-500">每日汇总</p>
               </div>
               <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-bold text-xl border border-indigo-100">
                   {Math.round(selectedDay.logs.reduce((acc, l) => acc + l.durationMinutes, 0) / 60 * 10) / 10}h
               </div>
            </div>

            {/* 任务部分 */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <CheckCircle2 size={14} /> 任务完成情况
               </h3>
               <div className="space-y-3">
                 {selectedDay.todos.map(todo => (
                   <div key={todo.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${todo.completed ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-slate-100 shadow-sm'}`}>
                      {todo.completed ? <CheckCircle2 size={20} className="text-emerald-500"/> : <div className="w-5 h-5 rounded-full border-2 border-slate-300" />}
                      <span className={todo.completed ? 'text-emerald-900 line-through opacity-60' : 'text-slate-700 font-medium'}>{todo.text}</span>
                   </div>
                 ))}
                 {selectedDay.todos.length === 0 && <p className="text-slate-400 italic text-sm pl-2">当日无任务记录。</p>}
               </div>
            </div>

            {/* 日志部分 */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Clock size={14} /> 专注时间轴
               </h3>
               <div className="relative border-l-2 border-indigo-100 ml-3 space-y-8 pb-4">
                 {selectedDay.logs.map(log => (
                   <div key={log.id} className="ml-8 relative group">
                     <div className="absolute -left-[39px] top-0 w-5 h-5 rounded-full bg-white border-4 border-indigo-500 group-hover:scale-125 transition-transform shadow-sm" />
                     
                     <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md border border-indigo-100">
                            {new Date(log.timestamp).toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'})}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                            专注 {log.durationMinutes} 分钟
                        </span>
                     </div>

                     <div className="bg-white p-5 rounded-2xl border border-slate-100 text-slate-700 text-sm shadow-sm hover:shadow-md transition-shadow leading-relaxed">
                        {log.content}
                     </div>
                   </div>
                 ))}
                 {selectedDay.logs.length === 0 && <p className="ml-8 text-slate-400 italic text-sm">暂无专注记录。</p>}
               </div>
            </div>

          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400">选择一天查看详情</div>
        )}
      </div>
    </div>
  );
};