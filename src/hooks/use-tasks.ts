import { useLocalStorage } from './use-local-storage';
import { Task } from '@/lib/types';
import { SAMPLE_TASKS } from '@/lib/static-data';

export function useTasks() {
  const [tasks, setTasks] = useLocalStorage<Task[]>('app-tasks', SAMPLE_TASKS);

  const addTask = (task: Omit<Task, 'id' | 'status' | 'distractions'>) => {
    const newTask: Task = { ...task, id: crypto.randomUUID(), status: 'pending', distractions: 0 };
    setTasks(prev => [...prev, newTask]);
    return newTask;
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const todayTasks = tasks.filter(t => t.date === new Date().toISOString().split('T')[0]);

  return { tasks, todayTasks, addTask, updateTask, deleteTask, setTasks };
}
