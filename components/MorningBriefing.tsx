import React, { useState, useEffect } from 'react';
import { DayRecord, TodoItem } from '../types';
import { getYesterdayDateString, getDayRecord, getTodayDateString } from '../services/storageService';
import { generateDaySummary, generateMorningPlanSuggestion } from '../services/geminiService';
import { Loader2, CheckSquare, Calendar, Sparkles, Plus, Trash2 } from 'lucide-react';

interface MorningBriefingProps {
  onComplete: (newTodos: TodoItem[]) => void;
  initialTodos: TodoItem[];
}

export const MorningBriefing: React.FC<MorningBriefingProps> = ({ onComplete, initialTodos }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [yesterdayRecord, setYesterdayRecord] = useState<DayRecord | null>(null);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [planSuggestion, setPlanSuggestion] = useState<string>("");
  
  // Todo state
  const [newTodoText, setNewTodoText] = useState("");
  const [todos, setTodos] = useState<TodoItem[]>(initialTodos);

  useEffect(() => {
    const loadData = async () => {
      const yStr = getYesterdayDateString();
      const yRec = getDayRecord(yStr);
      setYesterdayRecord(yRec);

      if (yRec && process.env.API_KEY) {
        setLoadingSummary(true);
        try {
          const summary = await generateDaySummary(yRec);
          setAiSummary(summary);
          
          // Get plan suggestions
          const suggestions = await generateMorningPlanSuggestion(yRec, []);
          setPlanSuggestion(suggestions);
        } finally {
          setLoadingSummary(false);
        }
      }
    };
    loadData();
  }, []);

  const handleAddTodo = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newTodoText.trim()) return;
    const newItem: TodoItem = {
      id: Date.now().toString(),
      text: newTodoText,
      completed: false,
      category: 'normal'
    };
    setTodos([...todos, newItem]);
    setNewTodoText("");
  };

  const removeTodo = (id: string) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden min-h-[600px] flex flex-col">
      {/* Header */}
      <div className="bg-indigo-600 p-8 text-white">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
           <Sparkles className="text-yellow-300" /> Morning Briefing
        </h1>
        <p className="text-indigo-100">
          {step === 1 ? "Let's review your progress from yesterday." : "Plan your day for success."}
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 p-8">
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
               <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <Calendar size={20} className="text-indigo-500"/> Yesterday's Review ({yesterdayRecord?.date || 'No Data'})
               </h2>
            </div>

            {yesterdayRecord ? (
               <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                  {loadingSummary ? (
                    <div className="flex items-center gap-3 text-indigo-600">
                      <Loader2 className="animate-spin" /> Analyzing logs with Gemini...
                    </div>
                  ) : (
                    <div className="prose prose-slate max-w-none">
                       <div className="mb-4 font-medium text-slate-500 uppercase text-xs tracking-wider">AI Summary</div>
                       {aiSummary ? (
                         <div className="whitespace-pre-wrap">{aiSummary}</div>
                       ) : (
                         <p className="text-slate-400 italic">No AI summary available.</p>
                       )}
                    </div>
                  )}

                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h3 className="font-medium text-slate-700 mb-3">Raw Logs</h3>
                    <ul className="space-y-2">
                      {yesterdayRecord.logs.map(log => (
                        <li key={log.id} className="text-sm text-slate-600 flex gap-3">
                           <span className="font-mono text-slate-400 text-xs py-0.5">
                             {new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                           </span>
                           <span>{log.content}</span>
                        </li>
                      ))}
                      {yesterdayRecord.logs.length === 0 && <li className="text-slate-400 italic">No logs recorded.</li>}
                    </ul>
                  </div>
               </div>
            ) : (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
                <p className="text-slate-500">No records found for yesterday. Start fresh!</p>
              </div>
            )}

            <div className="flex justify-end mt-8">
              <button 
                onClick={() => setStep(2)}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                Next: Plan Today
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
             <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <CheckSquare size={20} className="text-indigo-500"/> Today's Goals
             </h2>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: Input */}
                <div className="space-y-4">
                  <form onSubmit={handleAddTodo} className="flex gap-2">
                    <input
                      type="text"
                      value={newTodoText}
                      onChange={(e) => setNewTodoText(e.target.value)}
                      placeholder="What needs to be done?"
                      className="flex-1 px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                      autoFocus
                    />
                    <button 
                      type="submit"
                      disabled={!newTodoText.trim()}
                      className="px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      <Plus size={24} />
                    </button>
                  </form>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {todos.map(todo => (
                      <div key={todo.id} className="group flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm hover:shadow-md transition-all">
                        <span className="text-slate-700">{todo.text}</span>
                        <button 
                          onClick={() => removeTodo(todo.id)}
                          className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                    {todos.length === 0 && (
                      <p className="text-center text-slate-400 py-4">No tasks added yet.</p>
                    )}
                  </div>
                </div>

                {/* Right: AI Suggestions */}
                <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100">
                   <h3 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                     <Sparkles size={16} /> AI Suggestions
                   </h3>
                   {loadingSummary ? (
                     <div className="flex items-center gap-2 text-indigo-600 text-sm">
                        <Loader2 className="animate-spin" size={16} /> Thinking...
                     </div>
                   ) : (
                     <div className="text-sm text-indigo-800 whitespace-pre-wrap leading-relaxed">
                       {planSuggestion || "Add tasks to get started, or wait for AI analysis based on history."}
                     </div>
                   )}
                </div>
             </div>

             <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
                <button 
                  onClick={() => setStep(1)}
                  className="text-slate-500 hover:text-slate-700 font-medium"
                >
                  Back
                </button>
                <button 
                  onClick={() => onComplete(todos)}
                  className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-lg shadow-green-200 transition-all hover:scale-105"
                >
                  Start Day
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};