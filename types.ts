export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  category?: 'urgent' | 'important' | 'normal';
}

export interface IntervalLog {
  id: string;
  timestamp: number; // Date.now()
  content: string;
  durationMinutes: number;
}

export interface DayRecord {
  date: string; // YYYY-MM-DD
  todos: TodoItem[];
  logs: IntervalLog[];
  morningReview?: string; // Manual or AI summary of yesterday done in the morning
  status: 'active' | 'completed';
  dailySummary?: string; // AI generated summary for the day (can be generated anytime)
}

export interface WeeklyRecord {
  weekStartDate: string; // YYYY-MM-DD (Monday)
  aiReview: string;
  totalFocusMinutes: number;
  totalTasksCompleted: number;
}

export type AIProvider = 'gemini' | 'openai' | 'deepseek' | 'qwen' | 'custom';

export interface AppSettings {
  intervalMinutes: number;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  themeColor: string;
  // AI Settings
  aiProvider: AIProvider;
  aiApiKey: string;
  aiBaseUrl: string;
  aiModel: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  intervalMinutes: 30,
  soundEnabled: true,
  notificationsEnabled: true,
  themeColor: 'indigo',
  aiProvider: 'gemini',
  aiApiKey: '', // User entered key. If empty for Gemini, falls back to env var
  aiBaseUrl: '',
  aiModel: ''
};
