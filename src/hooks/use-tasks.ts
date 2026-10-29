import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete, isAuthenticated } from '@/lib/api';
import { Task } from '@/lib/types';
import { useLocalStorage } from './use-local-storage';
import { SAMPLE_TASKS } from '@/lib/static-data';

interface TasksResponse {
  tasks: Task[];
  count: number;
}

interface TaskResponse {
  message: string;
  task: Task;
}

// Returns today's date as YYYY-MM-DD
function getToday() {
  return new Date().toISOString().split('T')[0];
}

export function useTasks() {
  const queryClient = useQueryClient();
  const today = getToday();
  const loggedIn = isAuthenticated();

  // Fallback to localStorage when not logged in
  const [localTasks, setLocalTasks] = useLocalStorage<Task[]>('app-tasks', SAMPLE_TASKS);

  // API-backed query
  const { data, isLoading } = useQuery<TasksResponse>({
    queryKey: ['tasks', today],
    queryFn: () => apiGet<TasksResponse>(`/tasks?date=${today}`),
    enabled: loggedIn,
    staleTime: 30_000,
  });

  const tasks = loggedIn ? (data?.tasks ?? []) : localTasks;
  const todayTasks = loggedIn
    ? tasks
    : localTasks.filter(t => t.date === today);

  // Mutations
  const addMutation = useMutation({
    mutationFn: (task: Omit<Task, 'id' | 'status' | 'distractions'>) =>
      apiPost<TaskResponse>('/tasks', { ...task, date: task.date || today }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number | string; updates: Partial<Task> }) =>
      apiPut<TaskResponse>(`/tasks/${id}`, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => apiDelete<{ message: string }>(`/tasks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  // Unified API (works with both localStorage and API)
  const addTask = (task: Omit<Task, 'id' | 'status' | 'distractions'>) => {
    if (loggedIn) {
      addMutation.mutate(task);
    } else {
      const newTask: Task = {
        ...task,
        id: crypto.randomUUID(),
        status: 'pending',
        distractions: 0,
      };
      setLocalTasks(prev => [...prev, newTask]);
      return newTask;
    }
  };

  const updateTask = (id: string | number, updates: Partial<Task>) => {
    if (loggedIn) {
      updateMutation.mutate({ id, updates });
    } else {
      setLocalTasks(prev => prev.map(t => t.id === String(id) ? { ...t, ...updates } : t));
    }
  };

  const deleteTask = (id: string | number) => {
    if (loggedIn) {
      deleteMutation.mutate(id);
    } else {
      setLocalTasks(prev => prev.filter(t => t.id !== String(id)));
    }
  };

  return {
    tasks,
    todayTasks,
    addTask,
    updateTask,
    deleteTask,
    isLoading: loggedIn ? isLoading : false,
    setTasks: setLocalTasks,
  };
}
