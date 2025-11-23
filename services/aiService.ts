import { GoogleGenAI } from "@google/genai";
import { DayRecord, IntervalLog, AppSettings, AIProvider } from "../types";
import { loadSettings } from "./storageService";

// Helper to format logs
const formatLogsForPrompt = (logs: IntervalLog[]) => {
  return logs.map(log => {
    const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `- [${time}] (${log.durationMinutes} mins): ${log.content}`;
  }).join('\n');
};

// Configuration Helpers
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
      // Gemini handled via SDK, model handled via SDK defaults or override
      model = model || 'gemini-2.5-flash';
      break;
  }

  return { provider: settings.aiProvider, apiKey, baseUrl, model };
};

// Universal Generative Function
const generateText = async (prompt: string, systemInstruction?: string): Promise<string> => {
  const settings = loadSettings();
  const config = getProviderConfig(settings);

  if (!config.apiKey) {
    if (config.provider === 'gemini') return "API Key missing (Env var not found).";
    return `API Key missing for ${config.provider}. Please check settings.`;
  }

  try {
    // --- STRATEGY: GEMINI SDK ---
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
    
    // --- STRATEGY: OPENAI COMPATIBLE REST API (DeepSeek, Qwen, etc) ---
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
        throw new Error(`API Error ${response.status}: ${err}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "No response from AI.";
    }

  } catch (error: any) {
    console.error("AI Service Error:", error);
    return `Error: ${error.message || "Failed to communicate with AI"}`;
  }
};

// --- Public Methods ---

export const generateDaySummary = async (record: DayRecord): Promise<string> => {
  if (!record.logs || record.logs.length === 0) {
    return "No activity logs recorded for this day.";
  }

  const prompt = `
    Here are the work logs recorded by the user for the date ${record.date}:
    ${formatLogsForPrompt(record.logs)}
    
    Please generate a concise, professional summary of what was achieved during this day. 
    Group related tasks if possible. 
    Identify if there are potential gaps or areas where focus might have been lost, but be encouraging.
    Format the output in Markdown.
  `;

  return generateText(prompt, "You are a helpful productivity assistant.");
};

export const generateMorningPlanSuggestion = async (yesterdayRecord: DayRecord | null, pendingTodos: string[]): Promise<string> => {
  let context = "User is starting their work day.";
  if (yesterdayRecord) {
    context += `\nYesterday's logs:\n${formatLogsForPrompt(yesterdayRecord.logs)}`;
  } else {
    context += "\nNo logs from yesterday.";
  }

  if (pendingTodos.length > 0) {
    context += `\nTasks left over/pending: ${pendingTodos.join(', ')}`;
  }

  const prompt = `
    ${context}
    
    Based on yesterday's work and pending items, suggest 3 key priorities for today.
    Keep it short and actionable.
  `;

  return generateText(prompt, "You are a strategic productivity coach.");
};