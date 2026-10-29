import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete, isAuthenticated, adjustDistractionsApi } from '@/lib/api';
import { applyDistractionDelta } from '@/lib/distractions';
import { Task } from '@/lib/types';
import { toast } from 'sonner';
import { useLocalStorage } from './use-local-storage';
import { SAMPLE_TASKS } from '@/lib/static-data';
import { localDateString } from '@/lib/dates';

interface TasksResponse {
  tasks: Task[];
  count: number;
}

interface TaskResponse {
  message: string;
  task: Task;
}


export type AddResult = { ok: true } | { ok: false; error: string };

function showWriteError(err: Error) {
  toast.error(err.message || 'Could not save the change');
}

export function useTasks() {
  const queryClient = useQueryClient();
  const today = localDateString();
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

  // Task writes change the task list and today's server-side metrics.
  const invalidateTaskViews = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  // Mutations
  const addMutation = useMutation({
    mutationFn: (task: Omit<Task, 'id' | 'status' | 'distractions'>) =>
      apiPost<TaskResponse>('/tasks', { ...task, date: task.date || today }),
    onSuccess: invalidateTaskViews,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number | string; updates: Partial<Task> }) =>
      apiPut<TaskResponse>(`/tasks/${id}`, updates),
    onSuccess: invalidateTaskViews,
    onError: showWriteError,
  });

  const distractionsMutation = useMutation({
    mutationFn: ({ id, delta }: { id: number | string; delta: 1 | -1 }) => adjustDistractionsApi(id, delta),
    onSuccess: invalidateTaskViews,
    onError: showWriteError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => apiDelete<{ message: string }>(`/tasks/${id}`),
    onSuccess: invalidateTaskViews,
    onError: showWriteError,
  });

  // Unified API (works with both localStorage and API)
  // Resolves with the server's verdict so callers can show 400/409 errors (invalid or overlapping block).
  const addTask = async (task: Omit<Task, 'id' | 'status' | 'distractions'>): Promise<AddResult> => {
    if (loggedIn) {
      try {
        await addMutation.mutateAsync(task);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Could not add block' };
      }
    } else {
      const newTask: Task = {
        ...task,
        id: crypto.randomUUID(),
        status: 'pending',
        distractions: 0,
      };
      setLocalTasks(prev => [...prev, newTask]);
      return { ok: true };
    }
  };

  const updateTask = (id: string | number, updates: Partial<Task>) => {
    if (loggedIn) {
      updateMutation.mutate({ id, updates });
    } else {
      setLocalTasks(prev => prev.map(t => t.id === String(id) ? { ...t, ...updates } : t));
    }
  };

  // Sends a +1/-1 delta so rapid clicks are counted server-side instead of overwriting each other.
  const adjustDistractions = (id: string | number, delta: 1 | -1) => {
    if (loggedIn) {
      distractionsMutation.mutate({ id, delta });
    } else {
      setLocalTasks(prev => prev.map(t =>
        t.id === String(id) ? { ...t, distractions: applyDistractionDelta(t.distractions, delta) } : t));
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
    adjustDistractions,
    deleteTask,
    isLoading: loggedIn ? isLoading : false,
    setTasks: setLocalTasks,
  };
}
