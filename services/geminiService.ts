import { GoogleGenAI } from "@google/genai";
import { DayRecord, IntervalLog } from "../types";

// Helper to format logs for the AI
const formatLogsForPrompt = (logs: IntervalLog[]) => {
  return logs.map(log => {
    const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `- [${time}] (${log.durationMinutes} mins): ${log.content}`;
  }).join('\n');
};

export const generateDaySummary = async (record: DayRecord): Promise<string> => {
  if (!process.env.API_KEY) {
    console.warn("No API Key found");
    return "API Key missing. Cannot generate summary.";
  }

  if (!record.logs || record.logs.length === 0) {
    return "No activity logs recorded for this day.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    You are a helpful productivity assistant.
    Here are the work logs recorded by the user for the date ${record.date}:
    
    ${formatLogsForPrompt(record.logs)}
    
    Please generate a concise, professional summary of what was achieved during this day. 
    Group related tasks if possible. 
    Also, identify if there are any potential gaps or areas where focus might have been lost, but be encouraging.
    Format the output in Markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Could not generate summary.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error communicating with AI service.";
  }
};

export const generateMorningPlanSuggestion = async (yesterdayRecord: DayRecord | null, pendingTodos: string[]): Promise<string> => {
  if (!process.env.API_KEY) return "";

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "";
  } catch (error) {
    console.error(error);
    return "";
  }
};