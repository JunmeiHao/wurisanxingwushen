import React, { useState, useEffect } from 'react';
import { loadAllData } from '../services/storageService';
import { DayRecord } from '../types';
import { Clock, CheckCircle2 } from 'lucide-react';

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
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <Clock size={48} className="mb-4 opacity-20" />
        <p>No history recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Sidebar List */}
      <div className="w-1/3 border-r border-slate-100 overflow-y-auto bg-slate-50">
        {history.map(record => (
          <div 
            key={record.date}
            onClick={() => setSelectedDay(record)}
            className={`p-4 border-b border-slate-100 cursor-pointer transition-colors ${selectedDay?.date === record.date ? 'bg-white border-l-4 border-l-indigo-600' : 'hover:bg-white border-l-4 border-l-transparent'}`}
          >
             <div className="font-semibold text-slate-800">{record.date}</div>
             <div className="text-xs text-slate-500 mt-1 flex justify-between">
               <span>{record.logs.length} Logs</span>
               <span>{record.todos.filter(t => t.completed).length}/{record.todos.length} Tasks</span>
             </div>
          </div>
        ))}
      </div>

      {/* Detail View */}
      <div className="w-2/3 p-8 overflow-y-auto">
        {selectedDay ? (
          <div className="space-y-8">
            <div>
               <h2 className="text-2xl font-bold text-slate-800 mb-1">{selectedDay.date}</h2>
               <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
                 {selectedDay.todos.filter(t=>t.completed).length} Completed Tasks
               </span>
            </div>

            {/* Tasks Section */}
            <div>
               <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Tasks</h3>
               <div className="grid grid-cols-1 gap-2">
                 {selectedDay.todos.map(todo => (
                   <div key={todo.id} className={`flex items-center gap-3 p-3 rounded-lg border ${todo.completed ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
                      {todo.completed ? <CheckCircle2 size={18} className="text-emerald-600"/> : <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-300" />}
                      <span className={todo.completed ? 'text-emerald-800 line-through opacity-70' : 'text-slate-700'}>{todo.text}</span>
                   </div>
                 ))}
                 {selectedDay.todos.length === 0 && <p className="text-slate-400 italic text-sm">No tasks recorded.</p>}
               </div>
            </div>

            {/* Logs Section */}
            <div>
               <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Activity Log</h3>
               <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
                 {selectedDay.logs.map(log => (
                   <div key={log.id} className="ml-6 relative">
                     <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-indigo-500 border-2 border-white ring-2 ring-slate-100" />
                     <div className="text-xs font-mono text-slate-400 mb-1">
                        {new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} 
                        <span className="mx-2">•</span>
                        {log.durationMinutes} mins
                     </div>
                     <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-slate-700 text-sm shadow-sm">
                        {log.content}
                     </div>
                   </div>
                 ))}
                 {selectedDay.logs.length === 0 && <p className="ml-6 text-slate-400 italic text-sm">No intervals logged.</p>}
               </div>
            </div>

          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400">Select a day to view details</div>
        )}
      </div>
    </div>
  );
};