import { useState } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';
import { Plus, ClipboardList } from 'lucide-react';

export default function TaskList() {
  const tasks = useTaskStore((s) => s.tasks);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();

  function handleEdit(id: string) {
    setEditId(id);
    setShowForm(true);
  }

  function handleClose() {
    setShowForm(false);
    setEditId(undefined);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-700">All Tasks</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Add Task
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <ClipboardList size={40} className="mb-3 opacity-40" />
          <p className="text-sm mb-4">No tasks yet. Add one or load sample data.</p>
          <button
            onClick={() => useTaskStore.getState().loadSeedTasks()}
            className="flex items-center gap-1.5 bg-slate-700 text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Load sample tasks
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Duration</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Priority</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} onEdit={handleEdit} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <TaskForm onClose={handleClose} editId={editId} />}
    </div>
  );
}
