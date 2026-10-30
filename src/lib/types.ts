export type TaskCategory = 'deep-work' | 'study' | 'admin' | 'gym' | 'rest';

export type TaskStatus = 'pending' | 'completed' | 'skipped';

export interface Task {
  id: string;
  name: string;
  category: TaskCategory;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  status: TaskStatus;
  distractions: number;
  energy: number; // 1-5
  date: string; // YYYY-MM-DD
}

export interface VocabularyWord {
  id: string | number;
  word: string;
  language: 'russian' | 'english';
  definition: string;
  example: string;
  synonym?: string;
  partOfSpeech?: string;
  learned: boolean;
  saved: boolean;
  date: string; // YYYY-MM-DD
}

export interface ScheduleBlock {
  id: string;
  name: string;
  category: TaskCategory | 'fixed';
  startTime: string;
  endTime: string;
  day: string; // day of week
  reasoning?: string;
}

export interface Commitment {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  days: string[];
}

export interface WeeklyGoals {
  deepWorkHours: number;
  studyHours: number;
  restHours: number;
}

/** Block categories in display order; names come from i18n (`categories.*`). */
export const TASK_CATEGORIES: TaskCategory[] = ['deep-work', 'study', 'admin', 'gym', 'rest'];

export const CATEGORY_COLORS: Record<TaskCategory | 'fixed', string> = {
  'deep-work': 'bg-primary/15 text-primary border-primary/30',
  'study': 'bg-blue-100 text-blue-700 border-blue-200',
  'admin': 'bg-muted text-muted-foreground border-border',
  'gym': 'bg-accent/15 text-accent border-accent/30',
  'rest': 'bg-amber-50 text-amber-700 border-amber-200',
  'fixed': 'bg-secondary text-secondary-foreground border-border',
};
