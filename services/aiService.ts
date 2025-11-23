import { GoogleGenAI } from "@google/genai";
import { DayRecord, IntervalLog, AppSettings } from "../types";
import { loadSettings } from "./storageService";

// 辅助函数：格式化日志
const formatLogsForPrompt = (logs: IntervalLog[]) => {
  return logs.map(log => {
    const time = new Date(log.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    return `- [${time}] (${log.durationMinutes} 分钟): ${log.content}`;
  }).join('\n');
};

// 配置辅助函数
const getProviderConfig = (settings: AppSettings) => {
  let baseUrl = settings.aiBaseUrl;
  let model = settings.aiModel;
  const apiKey = settings.aiApiKey || (settings.aiProvider === 'gemini' ? process.env.API_KEY : '');

  switch (settings.aiProvider) {
    case 'openai':
      baseUrl = baseUrl || 'https://api.openai.com/v1';
      model = model || 'gpt-4o';
      break;
    case 'deepseek':
      baseUrl = baseUrl || 'https://api.deepseek.com';
      model = model || 'deepseek-chat';
      break;
    case 'qwen':
      baseUrl = baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
      model = model || 'qwen-plus';
      break;
    case 'gemini':
    default:
      // Gemini 通过 SDK 处理
      model = model || 'gemini-2.5-flash';
      break;
  }

  return { provider: settings.aiProvider, apiKey, baseUrl, model };
};

// 通用生成函数
const generateText = async (prompt: string, systemInstruction?: string): Promise<string> => {
  const settings = loadSettings();
  const config = getProviderConfig(settings);

  if (!config.apiKey) {
    if (config.provider === 'gemini') return "缺少 API Key (未找到环境变量)。";
    return `缺少 ${config.provider} 的 API Key，请在设置中检查。`;
  }

  try {
    // --- 策略: GEMINI SDK ---
    if (config.provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey: config.apiKey });
      const response = await ai.models.generateContent({
        model: config.model,
        contents: prompt,
        config: {
            systemInstruction: systemInstruction
        }
      });
      return response.text || "";
    } 
    
    // --- 策略: OPENAI 兼容接口 (DeepSeek, Qwen 等) ---
    else {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            ...(systemInstruction ? [{ role: "system", content: systemInstruction }] : []),
            { role: "user", content: prompt }
          ],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`API 错误 ${response.status}: ${err}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "AI 未返回任何响应。";
    }

  } catch (error: any) {
    console.error("AI Service Error:", error);
    return `错误: ${error.message || "无法连接到 AI 服务"}`;
  }
};

// --- 公共方法 ---

export const generateDaySummary = async (record: DayRecord): Promise<string> => {
  if (!record.logs || record.logs.length === 0) {
    return "这一天没有记录任何活动日志。";
  }

  const prompt = `
    这是用户在 ${record.date} 记录的工作日志：
    ${formatLogsForPrompt(record.logs)}
    
    请生成一份简洁、专业的中文日报总结，概述这一天完成了什么。
    如果可能，请将相关任务归类。
    此外，请识别是否有潜在的注意力分散或效率低下的时间段，并给出鼓励性的建议。
    请使用 Markdown 格式输出。
  `;

  return generateText(prompt, "你是一个乐于助人的生产力助手。");
};

export const generateMorningPlanSuggestion = async (yesterdayRecord: DayRecord | null, pendingTodos: string[]): Promise<string> => {
  let context = "用户正在开始一天的工作。";
  if (yesterdayRecord) {
    context += `\n昨天的日志：\n${formatLogsForPrompt(yesterdayRecord.logs)}`;
  } else {
    context += "\n昨天没有日志记录。";
  }

  if (pendingTodos.length > 0) {
    context += `\n遗留/待办任务：${pendingTodos.join(', ')}`;
  }

  const prompt = `
    ${context}
    
    基于昨天的工作情况和待办事项，请用中文为今天提出 3 个关键优先事项建议。
    保持简短且可执行。
  `;

  return generateText(prompt, "你是一个战略性的生产力教练。");
};

export const generateWeeklyReview = async (records: DayRecord[], weekStart: string): Promise<string> => {
  if (records.length === 0) return "本周没有记录数据。";

  let combinedLogs = "";
  let totalTasks = 0;
  let completedTasks = 0;

  records.forEach(rec => {
    combinedLogs += `\n--- 日期: ${rec.date} ---\n`;
    combinedLogs += formatLogsForPrompt(rec.logs);
    totalTasks += rec.todos.length;
    completedTasks += rec.todos.filter(t => t.completed).length;
  });

  const prompt = `
    请分析从 ${weekStart} 开始的一周工作日志。
    
    关键指标：
    - 任务完成数：${completedTasks}/${totalTasks}
    - 工作天数：${records.length}
    
    详细日志：
    ${combinedLogs}

    请提供一份结构化的中文周报复盘 (Markdown 格式)，包括：
    1. **主要成就**：完成了哪些主要主题或项目？
    2. **时间分配**：时间主要花在哪里了？
    3. **改进领域**：关于专注模式的建设性反馈。
    4. **下周策略**：1-2 个简明扼要的下周关注点。
    
    语气：专业、深刻且鼓舞人心。
  `;

  return generateText(prompt, "你是一位进行每周绩效评估的高级生产力分析师。");
};