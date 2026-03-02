import { Task, VocabularyWord } from './types';

const today = new Date().toISOString().split('T')[0];

export const SAMPLE_TASKS: Task[] = [
  { id: '1', name: 'Morning routine', category: 'deep-work', startTime: '08:00', endTime: '09:30', status: 'pending', distractions: 0, energy: 5, date: today },
  { id: '2', name: 'Project work', category: 'deep-work', startTime: '10:00', endTime: '12:00', status: 'pending', distractions: 0, energy: 4, date: today },
  { id: '3', name: 'Lunch break', category: 'rest', startTime: '12:00', endTime: '13:00', status: 'pending', distractions: 0, energy: 3, date: today },
  { id: '4', name: 'Afternoon tasks', category: 'admin', startTime: '13:00', endTime: '15:00', status: 'pending', distractions: 1, energy: 3, date: today },
  { id: '5', name: 'Exercise', category: 'gym', startTime: '16:00', endTime: '17:00', status: 'pending', distractions: 0, energy: 4, date: today },
  { id: '6', name: 'Evening review', category: 'study', startTime: '19:00', endTime: '20:00', status: 'pending', distractions: 0, energy: 2, date: today },
];

export const VOCABULARY_WORDS: VocabularyWord[] = [
  { id: 'e1', word: 'discipline', language: 'english', definition: 'Training that corrects, molds, or perfects mental faculties or moral character', example: 'Daily practice builds discipline.', synonym: 'self-control', partOfSpeech: 'noun', learned: false, saved: false, date: today },
  { id: 'e2', word: 'productivity', language: 'english', definition: 'The quality or state of being productive', example: 'High productivity requires focus and planning.', synonym: 'efficiency', partOfSpeech: 'noun', learned: false, saved: false, date: today },
  { id: 'r1', word: 'достижение', language: 'russian', definition: 'То, чего добились усилиями; успех, результат', example: 'Это было большое достижение в его карьере.', learned: false, saved: false, date: today },
  { id: 'r2', word: 'развитие', language: 'russian', definition: 'Процесс перехода к более совершенному состоянию', example: 'Развитие навыков требует постоянной практики.', learned: false, saved: false, date: today },
  { id: 'e3', word: 'consistency', language: 'english', definition: 'A harmonious uniformity', example: 'Consistency in habits leads to lasting results.', synonym: 'regularity', partOfSpeech: 'noun', learned: false, saved: false, date: '2026-02-25' },
  { id: 'e4', word: 'focus', language: 'english', definition: 'A center of activity or attention', example: 'Maintaining focus is essential for deep work.', synonym: 'concentration', partOfSpeech: 'noun', learned: true, saved: true, date: '2026-02-24' },
  { id: 'r3', word: 'настойчивость', language: 'russian', definition: 'Упорство в достижении цели', example: 'Настойчивость помогает преодолевать трудности.', learned: false, saved: false, date: '2026-02-25' },
  { id: 'r4', word: 'дисциплина', language: 'russian', definition: 'Подчинение правилам и порядку', example: 'Самодисциплина ведёт к успеху.', learned: true, saved: false, date: '2026-02-24' },
  { id: 'e5', word: 'momentum', language: 'english', definition: 'The impetus gained by movement', example: 'Building momentum takes consistent effort.', synonym: 'progress', partOfSpeech: 'noun', learned: true, saved: false, date: '2026-02-24' },
  { id: 'e6', word: 'routine', language: 'english', definition: 'A regular course of action', example: 'Establishing a morning routine improves productivity.', synonym: 'habit', partOfSpeech: 'noun', learned: false, saved: false, date: '2026-02-23' },
  { id: 'r5', word: 'мотивация', language: 'russian', definition: 'Побуждение к деятельности', example: 'Внутренняя мотивация сильнее внешней.', learned: false, saved: true, date: '2026-02-23' },
  { id: 'r6', word: 'терпение', language: 'russian', definition: 'Способность спокойно ожидать и переносить трудности', example: 'Терпение — ключ к мастерству.', learned: false, saved: false, date: '2026-02-23' },
  { id: 'e7', word: 'strategy', language: 'english', definition: 'A careful plan for achieving a goal', example: 'Good strategy requires planning and execution.', synonym: 'tactic', partOfSpeech: 'noun', learned: false, saved: true, date: '2026-02-23' },
  { id: 'e8', word: 'execution', language: 'english', definition: 'The act of doing something', example: 'Perfect execution comes from practice.', synonym: 'implementation', partOfSpeech: 'noun', learned: false, saved: false, date: '2026-02-22' },
  { id: 'r7', word: 'продуктивность', language: 'russian', definition: 'Способность создавать результаты эффективно', example: 'Продуктивность зависит от планирования.', learned: false, saved: false, date: '2026-02-22' },
  { id: 'r8', word: 'уверенность', language: 'russian', definition: 'Твёрдая вера в свои силы', example: 'Уверенность приходит с опытом.', learned: false, saved: false, date: '2026-02-22' },
];

export const MICRO_MESSAGES = [
  'Start with the most important task.',
  'Small consistent actions create big results.',
  'What is the next step?',
  'Deep work requires protection.',
  'Focus on one thing at a time.',
  'Momentum builds through consistency.',
  'Track what matters most.',
  'Rest enhances performance.',
  'Discipline creates freedom.',
  'Act first, optimize later.',
];

export const ANALYTICS_DATA = {
  completionTrend: [
    { week: 'Week 1', rate: 68 },
    { week: 'Week 2', rate: 72 },
    { week: 'Week 3', rate: 78 },
    { week: 'Week 4', rate: 82 },
  ],
  deepWorkHours: [
    { week: 'Week 1', hours: 12 },
    { week: 'Week 2', hours: 15 },
    { week: 'Week 3', hours: 14 },
    { week: 'Week 4', hours: 18 },
  ],
  productivityByDay: [
    { day: 'Mon', score: 85 },
    { day: 'Tue', score: 78 },
    { day: 'Wed', score: 72 },
    { day: 'Thu', score: 80 },
    { day: 'Fri', score: 65 },
    { day: 'Sat', score: 45 },
    { day: 'Sun', score: 50 },
  ],
  disciplineIndex: 76,
  disciplineTrend: +4,
};

export const COMPLETION_MESSAGES = [
  'Block completed.',
  'Execution logged.',
  'Momentum confirmed.',
  'Consistency building.',
  'Progress recorded.',
  'Focus protected.',
];
