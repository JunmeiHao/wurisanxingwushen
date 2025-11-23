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
}

export interface AppSettings {
  intervalMinutes: number;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  themeColor: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  intervalMinutes: 30,
  soundEnabled: true,
  notificationsEnabled: true,
  themeColor: 'indigo'
};