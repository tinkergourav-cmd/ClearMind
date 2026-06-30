import React, { useState, useMemo, useCallback } from 'react';
import {
  X, MapPin, Eye, EyeOff, Search, Trash2, Pencil,
  ArrowUpDown, Plus, Check,
  ArrowUp, ArrowDown, Layers
} from 'lucide-react';

const PIN_ICONS = [
  { value: '\u2b50', label: 'Important' },
  { value: '\ud83d\udccc', label: 'Bookmark' },
  { value: '\u2705', label: 'Completed' },
  { value: '\ud83d\udca1', label: 'Idea' },
  { value: '\ud83d\udea9', label: 'Priority' },
  { value: '\u26a0\ufe0f', label: 'Warning' },
  { value: '\u2764\ufe0f', label: 'Personal' },
  { value: '\ud83c\udfaf', label: 'Goal' },
  { value: '\ud83d\udcd6', label: 'Learning' },
  { value: '\ud83d\udd25', label: 'Urgent' },
];

const DEFAULT_PIN_GROUP = 'default';
const TASK_PIN_GROUP = 'task';


export default function PinPanel({
  workspaces,
  activeTab,
  onNavigateToPin,
  onUpdatePin,
  onDeletePin,
  onToggleVisibility,
  onToggleAllVisibility,
  showPanel,
  onClose,
  tasks = [],
  pinGroups = [],
  onUpdatePinGroups,
}) {
  // --- State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('name'); // 'name' | 'workspace' | 'group'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingPinId, setEditingPinId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingNote, setEditingNote] = useState('');
  const [editingIcon, setEditingIcon] = useState('');
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [changingGroupForPin, setChangingGroupForPin] = useState(null);
  const [groupFilter, setGroupFilter] = useState('all'); // 'all' | group id

  if (!showPanel) return null;


  // --- Derived: effective pin groups (always includes default + task) ---
  const effectiveGroups = useMemo(() => {
    const base = [
      { id: DEFAULT_PIN_GROUP, name: 'General', color: '#64748b' },
      { id: TASK_PIN_GROUP, name: 'Task', color: '#6366f1' },
    ];
    const custom = (pinGroups || []).filter(
      g => g.id !== DEFAULT_PIN_GROUP && g.id !== TASK_PIN_GROUP
    );
    return [...base, ...custom];
  }, [pinGroups]);

  // --- Derived: task-linked pin IDs ---
  const taskLinkedPinIds = useMemo(() => {
    const ids = new Set();
    (tasks || []).forEach(t => {
      if (t.locationPinId) ids.add(t.locationPinId);
    });
    return ids;
  }, [tasks]);

  // --- Derived: flat list of all pins with workspace info ---
  const allPins = useMemo(() => {
    const pins = [];
    workspaces.forEach(ws => {
      (ws.pins || []).forEach(pin => {
        // Determine group: task-linked pins go to "task" group
        let groupId = pin.pinGroupId || DEFAULT_PIN_GROUP;
        if (taskLinkedPinIds.has(pin.id)) {
          groupId = TASK_PIN_GROUP;
        }
        pins.push({
          ...pin,
          workspaceId: ws.id,
          workspaceName: ws.name,
          pinGroupId: groupId,
        });
      });
    });
    return pins;
  }, [workspaces, taskLinkedPinIds]);


  // --- Filtering ---
  const filteredPins = useMemo(() => {
    let result = allPins;
    // Group filter
    if (groupFilter !== 'all') {
      result = result.filter(p => p.pinGroupId === groupFilter);
    }
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.note || '').toLowerCase().includes(q) ||
        p.workspaceName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allPins, searchQuery, groupFilter]);

  // --- Sorting ---
  const sortedPins = useMemo(() => {
    const sorted = [...filteredPins];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortField === 'workspace') {
        cmp = a.workspaceName.localeCompare(b.workspaceName);
      } else if (sortField === 'group') {
        const groupA = effectiveGroups.find(g => g.id === a.pinGroupId)?.name || '';
        const groupB = effectiveGroups.find(g => g.id === b.pinGroupId)?.name || '';
        cmp = groupA.localeCompare(groupB);
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredPins, sortField, sortDirection, effectiveGroups]);


  // --- Handlers ---
  const handleSort = useCallback((field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const toggleDeleteSelection = useCallback((pinId) => {
    setSelectedForDelete(prev => {
      const next = new Set(prev);
      if (next.has(pinId)) next.delete(pinId);
      else next.add(pinId);
      return next;
    });
  }, []);

  const selectAllForDelete = useCallback(() => {
    if (selectedForDelete.size === sortedPins.length) {
      setSelectedForDelete(new Set());
    } else {
      setSelectedForDelete(new Set(sortedPins.map(p => p.id)));
    }
  }, [sortedPins, selectedForDelete.size]);

  const confirmBulkDelete = useCallback(() => {
    selectedForDelete.forEach(pinId => {
      const pin = allPins.find(p => p.id === pinId);
      if (pin) onDeletePin(pinId, pin.workspaceId);
    });
    setSelectedForDelete(new Set());
    setDeleteMode(false);
    setShowDeleteConfirm(false);
  }, [selectedForDelete, allPins, onDeletePin]);

  const cancelDeleteMode = useCallback(() => {
    setDeleteMode(false);
    setSelectedForDelete(new Set());
    setShowDeleteConfirm(false);
  }, []);


  const startEdit = useCallback((pin) => {
    setEditingPinId(pin.id);
    setEditingName(pin.name);
    setEditingNote(pin.note || '');
    setEditingIcon(pin.icon);
  }, []);

  const commitEdit = useCallback((pinId, workspaceId) => {
    onUpdatePin(pinId, {
      name: editingName.trim() || 'Unnamed Pin',
      note: editingNote,
      icon: editingIcon,
    }, workspaceId);
    setEditingPinId(null);
  }, [editingName, editingNote, editingIcon, onUpdatePin]);

  const cancelEdit = useCallback(() => {
    setEditingPinId(null);
  }, []);

  // --- Group management ---
  const addGroup = useCallback(() => {
    if (!newGroupName.trim()) return;
    const newGroup = {
      id: `pg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: newGroupName.trim(),
      color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
    };
    const updated = [...(pinGroups || []), newGroup];
    if (onUpdatePinGroups) onUpdatePinGroups(updated);
    setNewGroupName('');
  }, [newGroupName, pinGroups, onUpdatePinGroups]);

  const deleteGroup = useCallback((groupId) => {
    if (groupId === DEFAULT_PIN_GROUP || groupId === TASK_PIN_GROUP) return;
    // Move pins from deleted group to default
    allPins.forEach(pin => {
      if (pin.pinGroupId === groupId) {
        onUpdatePin(pin.id, { pinGroupId: DEFAULT_PIN_GROUP }, pin.workspaceId);
      }
    });
    const updated = (pinGroups || []).filter(g => g.id !== groupId);
    if (onUpdatePinGroups) onUpdatePinGroups(updated);
  }, [pinGroups, allPins, onUpdatePinGroups, onUpdatePin]);


  const changeGroup = useCallback((pinId, newGroupId, workspaceId) => {
    onUpdatePin(pinId, { pinGroupId: newGroupId }, workspaceId);
    setChangingGroupForPin(null);
  }, [onUpdatePin]);

  const activeWsPins = workspaces.find(ws => ws.id === activeTab)?.pins || [];
  const allVisible = activeWsPins.length > 0 && activeWsPins.every(p => p.visibility_status);

  // --- Sort indicator ---
  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-300" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="w-3 h-3 text-indigo-600" />
      : <ArrowDown className="w-3 h-3 text-indigo-600" />;
  };

  return (
    <div className="w-96 bg-white border-l border-slate-200 flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50 shrink-0">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-rose-600" />
          <h3 className="text-sm font-bold text-slate-800">Pins</h3>
          <span className="text-xs text-slate-400 font-medium">
            ({allPins.length})
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleAllVisibility(!allVisible)}
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
            title={allVisible ? 'Hide All Pins' : 'Show All Pins'}
          >
            {allVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
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


      {/* Toolbar: Search + Actions */}
      <div className="px-3 py-2 border-b border-slate-100 shrink-0 space-y-2">
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-2.5 py-1.5">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pins..."
            className="flex-1 bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Group filter dropdown */}
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="flex-1 text-[11px] font-medium bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          >
            <option value="all">All Groups</option>
            {effectiveGroups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          {/* Group Manager toggle */}
          <button
            onClick={() => setShowGroupManager(!showGroupManager)}
            className={`p-1.5 rounded-md border transition-colors ${showGroupManager ? 'bg-indigo-50 border-indigo-300 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'}`}
            title="Manage Groups"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
          {/* Delete mode toggle */}
          <button
            onClick={() => { if (deleteMode) cancelDeleteMode(); else setDeleteMode(true); }}
            className={`p-1.5 rounded-md border transition-colors ${deleteMode ? 'bg-red-50 border-red-300 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-red-500'}`}
            title={deleteMode ? 'Cancel Delete' : 'Bulk Delete'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>


      {/* Group Manager Panel */}
      {showGroupManager && (
        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Pin Groups</span>
          <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar mb-2">
            {effectiveGroups.map(g => (
              <div key={g.id} className="flex items-center gap-2 px-2 py-1 rounded-md bg-white border border-slate-100">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                <span className="text-[11px] font-medium text-slate-700 flex-1 truncate">{g.name}</span>
                <span className="text-[9px] text-slate-400">{allPins.filter(p => p.pinGroupId === g.id).length}</span>
                {g.id !== DEFAULT_PIN_GROUP && g.id !== TASK_PIN_GROUP && (
                  <button
                    onClick={() => deleteGroup(g.id)}
                    className="p-0.5 text-slate-300 hover:text-red-500 transition-colors"
                    title="Delete group"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="New group name..."
              className="flex-1 text-[11px] bg-white border border-slate-200 rounded-md px-2 py-1.5 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
              onKeyDown={(e) => { if (e.key === 'Enter') addGroup(); }}
            />
            <button
              onClick={addGroup}
              disabled={!newGroupName.trim()}
              className="px-2 py-1.5 text-[10px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}


      {/* Delete Mode: Select All + Confirm */}
      {deleteMode && (
        <div className="px-3 py-2 border-b border-red-100 bg-red-50/50 shrink-0 flex items-center gap-2">
          <button
            onClick={selectAllForDelete}
            className="text-[10px] font-semibold text-red-700 hover:text-red-800 underline transition-colors"
          >
            {selectedForDelete.size === sortedPins.length ? 'Deselect All' : 'Select All'}
          </button>
          <span className="text-[10px] text-red-500 flex-1">
            {selectedForDelete.size} selected
          </span>
          <button
            onClick={() => { if (selectedForDelete.size > 0) setShowDeleteConfirm(true); }}
            disabled={selectedForDelete.size === 0}
            className="px-2.5 py-1 text-[10px] font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Delete ({selectedForDelete.size})
          </button>
        </div>
      )}

      {/* Table Header */}
      <div className="flex items-center px-3 py-1.5 border-b border-slate-200 bg-slate-50/80 shrink-0 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
        {deleteMode && <div className="w-5 shrink-0" />}
        <button
          onClick={() => handleSort('name')}
          className="flex items-center gap-1 flex-1 min-w-0 hover:text-slate-700 transition-colors"
        >
          <span>Pin</span>
          <SortIcon field="name" />
        </button>
        <button
          onClick={() => handleSort('group')}
          className="flex items-center gap-1 w-20 shrink-0 hover:text-slate-700 transition-colors"
        >
          <span>Group</span>
          <SortIcon field="group" />
        </button>
        <button
          onClick={() => handleSort('workspace')}
          className="flex items-center gap-1 w-24 shrink-0 hover:text-slate-700 transition-colors"
        >
          <span>Workspace</span>
          <SortIcon field="workspace" />
        </button>
        <div className="w-16 shrink-0 text-right">Actions</div>
      </div>


      {/* Table Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {sortedPins.length === 0 && (
          <p className="text-xs text-slate-400 italic text-center py-6">
            {searchQuery ? 'No pins match your search' : 'No pins yet. Right-click on canvas or press Shift+P to add one.'}
          </p>
        )}

        {sortedPins.map(pin => {
          const groupInfo = effectiveGroups.find(g => g.id === pin.pinGroupId) || effectiveGroups[0];

          if (editingPinId === pin.id) {
            return (
              <div key={pin.id} className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1 mb-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-300"
                  placeholder="Pin name"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(pin.id, pin.workspaceId); if (e.key === 'Escape') cancelEdit(); }}
                />
                <textarea
                  value={editingNote}
                  onChange={(e) => setEditingNote(e.target.value)}
                  className="w-full text-[11px] bg-white border border-slate-200 rounded px-2 py-1 mb-1.5 text-slate-600 placeholder-slate-400 resize-none focus:outline-none focus:ring-1 focus:ring-rose-300"
                  placeholder="Note (optional)"
                  rows={2}
                />
                <div className="mb-2">
                  <span className="text-[10px] text-slate-500 font-medium block mb-1">Icon:</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {PIN_ICONS.map(ic => (
                      <button
                        key={ic.value}
                        onClick={() => setEditingIcon(ic.value)}
                        className={`w-6 h-6 rounded flex items-center justify-center text-sm transition-all ${editingIcon === ic.value ? 'bg-slate-200 ring-1 ring-slate-400' : 'hover:bg-slate-100'}`}
                        title={ic.label}
                      >
                        {ic.value}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => commitEdit(pin.id, pin.workspaceId)} className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-semibold rounded transition-colors">Save</button>
                  <button onClick={cancelEdit} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-semibold rounded transition-colors">Cancel</button>
                </div>
              </div>
            );
          }


          return (
            <div
              key={pin.id}
              className="flex items-center px-3 py-1.5 hover:bg-slate-50 cursor-pointer group transition-colors border-b border-slate-50"
              onClick={() => {
                if (deleteMode) { toggleDeleteSelection(pin.id); return; }
                onNavigateToPin(pin.id, pin.workspaceId);
              }}
              title={pin.note || pin.name}
            >
              {/* Checkbox for delete mode */}
              {deleteMode && (
                <div className="w-5 shrink-0 flex items-center justify-center">
                  <div
                    className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-colors ${
                      selectedForDelete.has(pin.id)
                        ? 'bg-red-500 border-red-500'
                        : 'border-slate-300 hover:border-red-400'
                    }`}
                  >
                    {selectedForDelete.has(pin.id) && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                </div>
              )}

              {/* Icon + Name */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="w-5 h-5 flex items-center justify-center shrink-0 text-sm">
                  {pin.icon}
                </span>
                <span className="text-xs font-medium text-slate-700 truncate">
                  {pin.name}
                </span>
              </div>

              {/* Group */}
              <div className="w-20 shrink-0 relative">
                {changingGroupForPin === pin.id ? (
                  <select
                    value={pin.pinGroupId}
                    onChange={(e) => changeGroup(pin.id, e.target.value, pin.workspaceId)}
                    onBlur={() => setChangingGroupForPin(null)}
                    autoFocus
                    className="w-full text-[9px] bg-white border border-indigo-300 rounded px-1 py-0.5 text-slate-700 focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {effectiveGroups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-500 px-1.5 py-0.5 rounded-full bg-slate-100 cursor-pointer hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    onClick={(e) => { e.stopPropagation(); setChangingGroupForPin(pin.id); }}
                    title="Change group"
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: groupInfo.color }} />
                    <span className="truncate max-w-[50px]">{groupInfo.name}</span>
                  </span>
                )}
              </div>


              {/* Workspace */}
              <div className="w-24 shrink-0">
                <span className="text-[9px] font-medium text-slate-400 truncate block">
                  {pin.workspaceName}
                </span>
              </div>

              {/* Actions */}
              <div className="w-16 shrink-0 flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleVisibility(pin.id, pin.workspaceId); }}
                  className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                  title={pin.visibility_status ? 'Hide' : 'Show'}
                >
                  {pin.visibility_status ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); startEdit(pin); }}
                  className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeletePin(pin.id, pin.workspaceId); }}
                  className="p-0.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>


      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-4 max-w-[280px] w-full mx-4">
            <div className="flex items-center gap-2 mb-3">
              <Trash2 className="w-5 h-5 text-red-500" />
              <h4 className="text-sm font-bold text-slate-800">Confirm Deletion</h4>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Are you sure you want to delete <strong>{selectedForDelete.size}</strong> pin{selectedForDelete.size > 1 ? 's' : ''}? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkDelete}
                className="px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { PIN_ICONS };
