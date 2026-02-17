'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { getTenantSlugFromClient } from '@/lib/tenant';
import { formatDate, cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface HousekeepingTask {
  id: string;
  roomNumber: string;
  roomId: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'done';
  assignedTo: string;
  assignedToName: string;
  notes: string;
  createdAt: string;
  completedAt: string | null;
}

interface RoomOption {
  id: string;
  roomNumber: string;
}

interface StaffOption {
  id: string;
  name: string;
}

const priorityColors: Record<string, string> = {
  low: 'bg-stone-100 text-stone-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-yellow-100 text-yellow-800',
  urgent: 'bg-red-100 text-red-700',
};

const statusGroups = [
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
] as const;

function TaskSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="mb-2 h-4 w-24 rounded bg-stone-200" />
      <div className="h-3 w-40 rounded bg-stone-200" />
    </div>
  );
}

export default function HousekeepingPage() {
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add task modal
  const [showAddTask, setShowAddTask] = useState(false);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [newTask, setNewTask] = useState({
    roomId: '',
    priority: 'medium',
    assignedTo: '',
    notes: '',
  });
  const [addLoading, setAddLoading] = useState(false);

  // Status update loading
  const [updatingTaskId, setUpdatingTaskId] = useState('');

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const tenantSlug = getTenantSlugFromClient();
      const data = await api.get<HousekeepingTask[]>('/admin/housekeeping', { tenantSlug });
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Fetch room and staff options for Add form
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const tenantSlug = getTenantSlugFromClient();
        const [roomData, staffData] = await Promise.all([
          api.get<RoomOption[]>('/admin/rooms/list', { tenantSlug }),
          api.get<StaffOption[]>('/admin/users/staff', { tenantSlug }),
        ]);
        setRooms(roomData);
        setStaff(staffData);
      } catch {
        // silent
      }
    };
    fetchOptions();
  }, []);

  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    setUpdatingTaskId(taskId);
    try {
      const tenantSlug = getTenantSlugFromClient();
      await api.patch(
        `/admin/housekeeping/${taskId}/status`,
        { status: newStatus },
        { tenantSlug },
      );
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: newStatus as HousekeepingTask['status'] } : t,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    } finally {
      setUpdatingTaskId('');
    }
  };

  const handleAddTask = async () => {
    setAddLoading(true);
    try {
      const tenantSlug = getTenantSlugFromClient();
      await api.post(
        '/admin/housekeeping',
        {
          roomId: newTask.roomId,
          priority: newTask.priority,
          assignedTo: newTask.assignedTo || undefined,
          notes: newTask.notes,
        },
        { tenantSlug },
      );
      setShowAddTask(false);
      setNewTask({ roomId: '', priority: 'medium', assignedTo: '', notes: '' });
      fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add task');
    } finally {
      setAddLoading(false);
    }
  };

  // Group tasks by status
  const grouped = statusGroups.map((group) => ({
    ...group,
    tasks: tasks.filter((t) => t.status === group.key),
  }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Housekeeping</h1>
        <Button size="sm" onClick={() => setShowAddTask(true)}>
          + Add Task
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      {/* Task groups */}
      {loading ? (
        <div className="space-y-6">
          {statusGroups.map((group) => (
            <div key={group.key}>
              <h2 className="mb-2 text-sm font-semibold text-stone-500">{group.label}</h2>
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <TaskSkeleton key={i} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="card py-12 text-center">
          <svg className="mx-auto h-12 w-12 text-stone-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <p className="mt-3 text-sm font-medium text-stone-900">No housekeeping tasks</p>
          <p className="mt-1 text-sm text-stone-500">Create tasks to manage room cleaning and maintenance.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.key}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-500">
                {group.label}
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                  {group.tasks.length}
                </span>
              </h2>

              {group.tasks.length === 0 ? (
                <p className="py-4 text-center text-sm text-stone-400">
                  No {group.label.toLowerCase()} tasks
                </p>
              ) : (
                <div className="space-y-2">
                  {group.tasks.map((task) => (
                    <div key={task.id} className="card">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-stone-900">Room {task.roomNumber}</p>
                            <span className={cn('badge', priorityColors[task.priority])}>
                              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                            </span>
                          </div>
                          {task.assignedToName && (
                            <p className="mt-0.5 text-sm text-stone-500">
                              Assigned to: {task.assignedToName}
                            </p>
                          )}
                          {task.notes && (
                            <p className="mt-0.5 text-sm text-stone-400">{task.notes}</p>
                          )}
                          <p className="mt-1 text-xs text-stone-400">
                            Created: {formatDate(task.createdAt)}
                            {task.completedAt && <> &middot; Completed: {formatDate(task.completedAt)}</>}
                          </p>
                        </div>

                        {/* Quick action buttons */}
                        <div className="flex flex-col gap-1">
                          {task.status === 'pending' && (
                            <button
                              onClick={() => handleStatusUpdate(task.id, 'in_progress')}
                              disabled={updatingTaskId === task.id}
                              className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 min-h-[36px] disabled:opacity-50"
                            >
                              {updatingTaskId === task.id ? '...' : 'Start'}
                            </button>
                          )}
                          {task.status === 'in_progress' && (
                            <button
                              onClick={() => handleStatusUpdate(task.id, 'done')}
                              disabled={updatingTaskId === task.id}
                              className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 min-h-[36px] disabled:opacity-50"
                            >
                              {updatingTaskId === task.id ? '...' : 'Complete'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add task modal */}
      {showAddTask && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowAddTask(false)} />
          <div className="relative z-10 w-full max-w-md rounded-t-xl bg-white p-6 shadow-xl sm:rounded-xl">
            <h3 className="mb-4 text-lg font-semibold text-stone-900">Add Housekeeping Task</h3>
            <div className="space-y-3">
              <div className="w-full">
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Room <span className="ml-0.5 text-red-500">*</span>
                </label>
                <select
                  value={newTask.roomId}
                  onChange={(e) => setNewTask({ ...newTask, roomId: e.target.value })}
                  className="input-field min-h-[44px]"
                >
                  <option value="">Select room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      Room {room.roomNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full">
                <label className="mb-1.5 block text-sm font-medium text-stone-700">Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  className="input-field min-h-[44px]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="w-full">
                <label className="mb-1.5 block text-sm font-medium text-stone-700">Assign To</label>
                <select
                  value={newTask.assignedTo}
                  onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                  className="input-field min-h-[44px]"
                >
                  <option value="">Unassigned</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Notes"
                value={newTask.notes}
                onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                placeholder="Additional notes (optional)"
              />
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="secondary" onClick={() => setShowAddTask(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                loading={addLoading}
                onClick={handleAddTask}
                disabled={!newTask.roomId}
                className="flex-1"
              >
                Add Task
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
