import React, { useState, useEffect } from 'react';
import { DayRecord } from '../types';
import { loadAllData } from '../services/storageService';
import { generateDaySummary, generateWeeklyReview } from '../services/aiService';
import { Calendar, Sparkles, Loader2, ChevronLeft, ChevronRight, BarChart3, PieChart } from 'lucide-react';

type ReviewPeriod = 'daily' | 'weekly';

export const ReviewView: React.FC = () => {
  const [period, setPeriod] = useState<ReviewPeriod>('daily');
  const [allData, setAllData] = useState<Record<string, DayRecord>>({});
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(""); // 周一

  // AI 状态
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string>("");

  useEffect(() => {
    const data = loadAllData();
    setAllData(data);
    
    // 设置初始周为当前周的周一
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 如果是周日，向前推6天
    const monday = new Date(d.setDate(diff));
    setSelectedWeekStart(monday.toISOString().split('T')[0]);
  }, []);

  // -- 日报逻辑 --
  const getCurrentDayRecord = () => allData[selectedDate];

  const handleGenerateDaily = async () => {
    const record = getCurrentDayRecord();
    if (!record) return;
    
    setLoading(true);
    try {
      const summary = await generateDaySummary(record);
      setGeneratedContent(summary);
    } finally {
      setLoading(false);
    }
  };

  // -- 周报逻辑 --
  const getWeekRecords = () => {
    if (!selectedWeekStart) return [];
    const records: DayRecord[] = [];
    const start = new Date(selectedWeekStart);
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      if (allData[dateStr]) {
        records.push(allData[dateStr]);
      }
    }
    return records;
  };

  const handleGenerateWeekly = async () => {
    const records = getWeekRecords();
    if (records.length === 0) {
        setGeneratedContent("本周没有找到记录。");
        return;
    }
    setLoading(true);
    try {
      const review = await generateWeeklyReview(records, selectedWeekStart);
      setGeneratedContent(review);
    } finally {
      setLoading(false);
    }
  };

  const shiftWeek = (direction: 'prev' | 'next') => {
    const d = new Date(selectedWeekStart);
    d.setDate(d.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedWeekStart(d.toISOString().split('T')[0]);
    setGeneratedContent(""); // 清除之前的内容
  };

  const shiftDay = (direction: 'prev' | 'next') => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(d.toISOString().split('T')[0]);
    setGeneratedContent("");
  };

  // 切换 Tab 时清除内容
  useEffect(() => {
    setGeneratedContent("");
  }, [period]);

  const renderContent = () => {
     if (loading) {
         return (
             <div className="flex flex-col items-center justify-center h-64 text-indigo-600">
                 <Loader2 className="animate-spin mb-4" size={32} />
                 <p>AI 分析师正在思考...</p>
             </div>
         );
     }

     if (generatedContent) {
         return (
             <div className="prose prose-slate max-w-none animate-in fade-in slide-in-from-bottom-4">
                 <div className="whitespace-pre-wrap">{generatedContent}</div>
             </div>
         );
     }

     // 默认占位符
     if (period === 'daily') {
         const rec = getCurrentDayRecord();
         if (!rec) return <div className="text-center text-slate-400 py-20">该日期没有数据记录。</div>;
         
         if (rec.dailySummary) {
             return <div className="whitespace-pre-wrap">{rec.dailySummary}</div>
         }
         
         return (
             <div className="text-center py-20">
                 <Sparkles size={48} className="mx-auto text-indigo-200 mb-4" />
                 <p className="text-slate-500 mb-6">尚未生成复盘总结。</p>
                 <button 
                    onClick={handleGenerateDaily}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
                 >
                    生成日报总结
                 </button>
             </div>
         );
     } else {
         const records = getWeekRecords();
         if (records.length === 0) return <div className="text-center text-slate-400 py-20">本周没有活动记录。</div>;
         
         return (
            <div className="text-center py-20">
                <div className="flex justify-center gap-8 mb-8">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-slate-800">{records.length}</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider">活跃天数</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-indigo-600">
                            {records.reduce((acc, r) => acc + r.logs.reduce((lAcc, l) => lAcc + l.durationMinutes, 0), 0)}
                        </div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider">专注时长(分钟)</div>
                    </div>
                </div>
                <button 
                   onClick={handleGenerateWeekly}
                   className="px-8 py-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 mx-auto"
                >
                   <Sparkles size={18} /> 生成周报分析
                </button>
            </div>
         );
     }
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto">
      {/* 控制栏 */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-2 shadow-sm border border-white mb-6 flex justify-between items-center">
         <div className="flex p-1 bg-slate-100 rounded-xl">
             <button 
               onClick={() => setPeriod('daily')}
               className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${period === 'daily' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
               日报复盘
             </button>
             <button 
               onClick={() => setPeriod('weekly')}
               className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${period === 'weekly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
               周报复盘
             </button>
         </div>

         <div className="flex items-center gap-4">
            <button onClick={() => period === 'daily' ? shiftDay('prev') : shiftWeek('prev')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <ChevronLeft size={20} className="text-slate-600"/>
            </button>
            <div className="flex items-center gap-2 font-semibold text-slate-700 min-w-[200px] justify-center">
                <Calendar size={18} className="text-indigo-500" />
                {period === 'daily' ? selectedDate : `${selectedWeekStart} 这一周`}
            </div>
            <button onClick={() => period === 'daily' ? shiftDay('next') : shiftWeek('next')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <ChevronRight size={20} className="text-slate-600"/>
            </button>
         </div>
      </div>

      {/* 内容卡片 */}
      <div className="flex-1 bg-white/80 backdrop-blur-xl rounded-3xl shadow-lg shadow-slate-200/50 border border-white p-8 overflow-y-auto relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 opacity-50" />
          
          <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                 {period === 'daily' ? <PieChart size={20} /> : <BarChart3 size={20} />}
              </div>
              <div>
                  <h2 className="text-xl font-bold text-slate-800">
                      {period === 'daily' ? '每日表现' : '每周表现'}
                  </h2>
                  <p className="text-sm text-slate-500">AI 驱动的洞察与分析</p>
              </div>
          </div>

          {renderContent()}
      </div>
    </div>
  );
};