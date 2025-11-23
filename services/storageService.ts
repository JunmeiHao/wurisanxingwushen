import { DayRecord, AppSettings, DEFAULT_SETTINGS } from '../types';

const STORAGE_KEY_DATA = 'focusflow_data';
const STORAGE_KEY_SETTINGS = 'focusflow_settings';

export const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getYesterdayDateString = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const loadAllData = (): Record<string, DayRecord> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DATA);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error("Failed to load data", e);
    return {};
  }
};

export const saveDayRecord = (record: DayRecord) => {
  const allData = loadAllData();
  allData[record.date] = record;
  localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(allData));
};

export const getDayRecord = (date: string): DayRecord | null => {
  const allData = loadAllData();
  return allData[date] || null;
};

export const getOrInitTodayRecord = (): DayRecord => {
  const today = getTodayDateString();
  const existing = getDayRecord(today);
  if (existing) return existing;

  const newRecord: DayRecord = {
    date: today,
    todos: [],
    logs: [],
    status: 'active'
  };
  saveDayRecord(newRecord);
  return newRecord;
};

export const loadSettings = (): AppSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
};