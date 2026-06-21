import React, { useState, useRef } from 'react';
import { X, Bell, Search, Pencil, Trash2, Plus, Download, Upload } from 'lucide-react';

const REMINDER_ICONS = [
  { value: '\u{1F4A7}', label: 'Water' },
  { value: '\u{1F9D8}', label: 'Yoga' },
  { value: '\u{1F6B6}', label: 'Walking' },
  { value: '\u{1F441}\uFE0F', label: 'Eye' },
  { value: '\u{1F9E0}', label: 'Brain' },
  { value: '\u{1F3AF}', label: 'Target' },
  { value: '\u{1F33F}', label: 'Leaf' },
  { value: '\u23F0', label: 'Clock' },
  { value: '\u2600\uFE0F', label: 'Sun' },
  { value: '\u{1F319}', label: 'Moon' },
  { value: '\u2615', label: 'Coffee' },
  { value: '\u{1F45F}', label: 'Sneaker' },
];

const FREQUENCY_OPTIONS = [
  { value: 1, label: '1min' },
  { value: 15, label: '15min' },
  { value: 30, label: '30min' },
  { value: 60, label: '1hr' },
  { value: 120, label: '2hr' },
  { value: 240, label: '4hr' },
  { value: 1440, label: 'daily' },
  { value: 'custom', label: 'Custom' },
];

function getFrequencyLabel(freq) {
  if (freq <= 1) return '1m';
  if (freq <= 15) return '15m';
  if (freq <= 30) return '30m';
  if (freq <= 60) return '1h';
  if (freq <= 120) return '2h';
  if (freq <= 240) return '4h';
  if (freq >= 1440) return 'daily';
  return `${freq}m`;
}

function EditForm({ isNew, editForm, setEditForm, customFreqInput, setCustomFreqInput, saveEdit, cancelEdit, onDeleteReminder, editingId }) {
  return (
    <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
      <input
        type="text"
        value={editForm.title}
        onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
        className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1 mb-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-300"
        placeholder="Reminder title"
        autoFocus
      />
      <textarea
        value={editForm.content}
        onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))}
        className="w-full text-[11px] bg-white border border-slate-200 rounded px-2 py-1 mb-1.5 text-slate-600 placeholder-slate-400 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-300"
        placeholder="Message/content"
        rows={2}
      />
      {/* Icon picker */}
      <div className="mb-2">
        <span className="text-[10px] text-slate-500 font-medium block mb-1">Icon:</span>
        <div className="flex items-center gap-1 flex-wrap">
          {REMINDER_ICONS.map(ic => (
            <button
              key={ic.value}
              onClick={() => setEditForm(prev => ({ ...prev, icon: ic.value }))}
              className={`w-6 h-6 rounded flex items-center justify-center text-sm transition-all ${editForm.icon === ic.value ? 'bg-indigo-100 ring-1 ring-indigo-400' : 'hover:bg-slate-100'}`}
              title={ic.label}
            >
              {ic.value}
            </button>
          ))}
        </div>
      </div>
      {/* Frequency */}
      <div className="mb-2">
        <span className="text-[10px] text-slate-500 font-medium block mb-1">Frequency:</span>
        <select
          value={editForm.frequency}
          onChange={(e) => {
            const val = e.target.value === 'custom' ? 'custom' : parseInt(e.target.value, 10);
            setEditForm(prev => ({ ...prev, frequency: val }));
          }}
          className="text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-300"
        >
          {FREQUENCY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {editForm.frequency === 'custom' && (
          <input
            type="number"
            min="1"
            value={customFreqInput}
            onChange={(e) => setCustomFreqInput(e.target.value)}
            className="ml-2 w-16 text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            placeholder="min"
          />
        )}
      </div>
      {/* Toggles */}
      <div className="space-y-1.5 mb-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={editForm.showOnWorkspaceOpen}
            onChange={(e) => setEditForm(prev => ({ ...prev, showOnWorkspaceOpen: e.target.checked }))}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-300 w-3.5 h-3.5"
          />
          <span className="text-[11px] text-slate-600">Show on workspace open</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={editForm.randomMode}
            onChange={(e) => setEditForm(prev => ({ ...prev, randomMode: e.target.checked }))}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-300 w-3.5 h-3.5"
          />
          <span className="text-[11px] text-slate-600">Participate in random reminders</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={editForm.enabled}
            onChange={(e) => setEditForm(prev => ({ ...prev, enabled: e.target.checked }))}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-300 w-3.5 h-3.5"
          />
          <span className="text-[11px] text-slate-600">Enabled</span>
        </label>
      </div>
      {/* Active Hours */}
      <div className="mb-2">
        <label className="flex items-center gap-2 cursor-pointer mb-1">
          <input
            type="checkbox"
            checked={!!editForm.activeHours}
            onChange={(e) => setEditForm(prev => ({ ...prev, activeHours: e.target.checked ? { start: '09:00', end: '17:00' } : null }))}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-300 w-3.5 h-3.5"
          />
          <span className="text-[11px] text-slate-600">Active hours only</span>
        </label>
        {editForm.activeHours && (
          <div className="flex items-center gap-1 ml-5">
            <input
              type="time"
              value={editForm.activeHours.start}
              onChange={(e) => setEditForm(prev => ({ ...prev, activeHours: { ...prev.activeHours, start: e.target.value } }))}
              className="text-[11px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            />
            <span className="text-[10px] text-slate-400">to</span>
            <input
              type="time"
              value={editForm.activeHours.end}
              onChange={(e) => setEditForm(prev => ({ ...prev, activeHours: { ...prev.activeHours, end: e.target.value } }))}
              className="text-[11px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            />
          </div>
        )}
      </div>
      {/* Actions */}
      <div className="flex gap-1.5">
        <button onClick={saveEdit} className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-semibold rounded transition-colors">Save</button>
        <button onClick={cancelEdit} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-semibold rounded transition-colors">Cancel</button>
        {!isNew && (
          <button
            onClick={() => { onDeleteReminder(editingId); }}
            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-semibold rounded transition-colors ml-auto"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export default function ReminderPanel({
  reminders,
  showPanel,
  onClose,
  onAddReminder,
  onUpdateReminder,
  onDeleteReminder,
  onToggleReminder,
  onImportReminders,
  onExportReminders,
  onEnableAll,
  onDisableAll,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [customFreqInput, setCustomFreqInput] = useState('');
  const fileInputRef = useRef(null);

  if (!showPanel) return null;

  const filteredReminders = reminders.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.title.toLowerCase().includes(q) || (r.content || '').toLowerCase().includes(q);
  });

  const startEdit = (reminder) => {
    const isCustom = !FREQUENCY_OPTIONS.find(o => o.value === reminder.frequency);
    setEditingId(reminder.id);
    setEditForm({
      title: reminder.title,
      content: reminder.content || '',
      icon: reminder.icon,
      frequency: isCustom ? 'custom' : reminder.frequency,
      showOnWorkspaceOpen: reminder.showOnWorkspaceOpen || false,
      randomMode: reminder.randomMode !== false,
      activeHours: reminder.activeHours || null,
      enabled: reminder.enabled,
    });
    setCustomFreqInput(isCustom ? String(reminder.frequency) : '');
  };

  const startAdd = () => {
    setEditingId('new');
    setEditForm({
      title: '',
      content: '',
      icon: '\u{1F4A7}',
      frequency: 60,
      showOnWorkspaceOpen: false,
      randomMode: true,
      activeHours: null,
      enabled: true,
    });
    setCustomFreqInput('');
  };

  const saveEdit = () => {
    const freq = editForm.frequency === 'custom'
      ? Math.max(1, parseInt(customFreqInput, 10) || 60)
      : editForm.frequency;
    const data = { ...editForm, frequency: freq };

    if (editingId === 'new') {
      onAddReminder(data);
    } else {
      onUpdateReminder(editingId, data);
    }
    setEditingId(null);
    setEditForm({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.type === 'thoughtflow-reminder-collection' && Array.isArray(data.reminders)) {
          const validReminders = data.reminders
            .filter(r => typeof r.title === 'string' && typeof r.frequency === 'number' && r.frequency > 0)
            .map(({ lastShownAt, nextReminderAt, ...rest }) => rest);
          onImportReminders(validReminders);
        }
      } catch (err) {
        // Invalid file
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50 shrink-0">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-800">Reminders</h3>
          <span className="text-xs text-slate-400 font-medium">
            ({reminders.filter(r => r.enabled).length}/{reminders.length})
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEnableAll}
            className="px-1.5 py-0.5 text-[10px] font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded transition-colors"
            title="Enable All"
          >
            All On
          </button>
          <button
            onClick={onDisableAll}
            className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
            title="Disable All"
          >
            All Off
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-2.5 py-1.5">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reminders..."
            className="flex-1 bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Reminder List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredReminders.length === 0 && (
          <p className="text-xs text-slate-400 italic text-center py-6">
            {searchQuery ? 'No reminders match your search' : 'No reminders yet. Add one below.'}
          </p>
        )}

        {filteredReminders.map(reminder => (
          <div key={reminder.id}>
            {editingId === reminder.id ? (
              /* Editing Mode */
              <EditForm isNew={false} editForm={editForm} setEditForm={setEditForm} customFreqInput={customFreqInput} setCustomFreqInput={setCustomFreqInput} saveEdit={saveEdit} cancelEdit={cancelEdit} onDeleteReminder={onDeleteReminder} editingId={editingId} />
            ) : (
              /* Display Mode */
              <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 group transition-colors border-b border-slate-50">
                {/* Icon */}
                <span className="w-5 h-5 flex items-center justify-center shrink-0 text-sm">
                  {reminder.icon}
                </span>

                {/* Title */}
                <span className={`flex-1 min-w-0 text-xs font-medium truncate ${reminder.enabled ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
                  {reminder.title}
                </span>

                {/* Frequency badge */}
                <span className="text-[9px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">
                  {getFrequencyLabel(reminder.frequency)}
                </span>

                {/* Toggle */}
                <button
                  onClick={() => onToggleReminder(reminder.id)}
                  className={`w-7 h-4 rounded-full relative transition-colors shrink-0 ${reminder.enabled ? 'bg-indigo-500' : 'bg-slate-300'}`}
                  title={reminder.enabled ? 'Disable' : 'Enable'}
                >
                  <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${reminder.enabled ? 'left-3.5' : 'left-0.5'}`} />
                </button>

                {/* Actions (show on hover) */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => startEdit(reminder)}
                    className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onDeleteReminder(reminder.id)}
                    className="p-0.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* New Reminder Inline Form */}
        {editingId === 'new' && (
          <EditForm isNew={true} editForm={editForm} setEditForm={setEditForm} customFreqInput={customFreqInput} setCustomFreqInput={setCustomFreqInput} saveEdit={saveEdit} cancelEdit={cancelEdit} onDeleteReminder={onDeleteReminder} editingId={editingId} />
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center gap-2 shrink-0">
        <button
          onClick={startAdd}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-semibold rounded-lg transition-colors"
        >
          <Upload className="w-3 h-3" /> Import
        </button>
        <button
          onClick={onExportReminders}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-semibold rounded-lg transition-colors"
        >
          <Download className="w-3 h-3" /> Export
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
      </div>
    </div>
  );
}
