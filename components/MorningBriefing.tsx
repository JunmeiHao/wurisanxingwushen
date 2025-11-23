import React, { useState, useEffect } from 'react';
import { DayRecord, TodoItem } from '../types';
import { getYesterdayDateString, getDayRecord } from '../services/storageService';
import { generateDaySummary, generateMorningPlanSuggestion } from '../services/aiService';
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

      // 总是尝试生成，服务会处理 Key 的检查
      if (yRec) {
        setLoadingSummary(true);
        try {
          const summary = await generateDaySummary(yRec);
          setAiSummary(summary);
          
          // 获取计划建议
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
      {/* 头部 */}
      <div className="bg-indigo-600 p-8 text-white">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
           <Sparkles className="text-yellow-300" /> 晨间简报
        </h1>
        <p className="text-indigo-100">
          {step === 1 ? "让我们回顾一下昨天的进度。" : "为今天的成功做计划。"}
        </p>
      </div>

      {/* 内容区 */}
      <div className="flex-1 p-8">
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
               <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <Calendar size={20} className="text-indigo-500"/> 昨天回顾 ({yesterdayRecord?.date || '无数据'})
               </h2>
            </div>

            {yesterdayRecord ? (
               <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                  {loadingSummary ? (
                    <div className="flex items-center gap-3 text-indigo-600">
                      <Loader2 className="animate-spin" /> AI 正在分析日志...
                    </div>
                  ) : (
                    <div className="prose prose-slate max-w-none">
                       <div className="mb-4 font-medium text-slate-500 uppercase text-xs tracking-wider">AI 总结</div>
                       {aiSummary ? (
                         <div className="whitespace-pre-wrap">{aiSummary}</div>
                       ) : (
                         <p className="text-slate-400 italic">暂无 AI 总结。</p>
                       )}
                    </div>
                  )}

                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h3 className="font-medium text-slate-700 mb-3">原始日志</h3>
                    <ul className="space-y-2">
                      {yesterdayRecord.logs.map(log => (
                        <li key={log.id} className="text-sm text-slate-600 flex gap-3">
                           <span className="font-mono text-slate-400 text-xs py-0.5">
                             {new Date(log.timestamp).toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'})}
                           </span>
                           <span>{log.content}</span>
                        </li>
                      ))}
                      {yesterdayRecord.logs.length === 0 && <li className="text-slate-400 italic">没有记录日志。</li>}
                    </ul>
                  </div>
               </div>
            ) : (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
                <p className="text-slate-500">未找到昨天的记录。开始新的一天吧！</p>
              </div>
            )}

            <div className="flex justify-end mt-8">
              <button 
                onClick={() => setStep(2)}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                下一步: 规划今天
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
             <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <CheckSquare size={20} className="text-indigo-500"/> 今日目标
             </h2>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 左: 输入 */}
                <div className="space-y-4">
                  <form onSubmit={handleAddTodo} className="flex gap-2">
                    <input
                      type="text"
                      value={newTodoText}
                      onChange={(e) => setNewTodoText(e.target.value)}
                      placeholder="今天需要完成什么？"
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
                      <p className="text-center text-slate-400 py-4">尚未添加任务。</p>
                    )}
                  </div>
                </div>

                {/* 右: AI 建议 */}
                <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100">
                   <h3 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                     <Sparkles size={16} /> AI 建议
                   </h3>
                   {loadingSummary ? (
                     <div className="flex items-center gap-2 text-indigo-600 text-sm">
                        <Loader2 className="animate-spin" size={16} /> 思考中...
                     </div>
                   ) : (
                     <div className="text-sm text-indigo-800 whitespace-pre-wrap leading-relaxed">
                       {planSuggestion || "添加任务以开始，或等待 AI 基于历史进行分析。"}
                     </div>
                   )}
                </div>
             </div>

             <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
                <button 
                  onClick={() => setStep(1)}
                  className="text-slate-500 hover:text-slate-700 font-medium"
                >
                  返回
                </button>
                <button 
                  onClick={() => onComplete(todos)}
                  className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-lg shadow-green-200 transition-all hover:scale-105"
                >
                  开启一天
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};