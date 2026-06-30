import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  MapPin,
  Navigation,
  Trash2,
  Circle,
  CheckCircle,
  Clock,
  AlertCircle,
  Edit3,
  FolderPlus,
  Folder,
  Pencil,
  ChevronUp,
  Palette,
  MoreVertical,
  Maximize2,
  Minimize2,
  Check,
} from 'lucide-react';
import { GROUP_COLORS } from './taskConstants';

const STATUS_OPTIONS = [
  { value: 'todo', label: 'Todo', icon: Circle, color: 'text-slate-400' },
  { value: 'in_progress', label: 'In Progress', icon: Clock, color: 'text-blue-500' },
  { value: 'waiting', label: 'Waiting', icon: AlertCircle, color: 'text-amber-500' },
  { value: 'completed', label: 'Completed', icon: CheckCircle, color: 'text-green-500' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', badgeClass: 'bg-slate-100 text-slate-600' },
  { value: 'medium', label: 'Medium', badgeClass: 'bg-amber-100 text-amber-700' },
  { value: 'high', label: 'High', badgeClass: 'bg-red-100 text-red-700' },
];

function getStatusConfig(status) {
  return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
}

function getPriorityConfig(priority) {
  return PRIORITY_OPTIONS.find(p => p.value === priority) || PRIORITY_OPTIONS[1];
}

function getGroupColor(group) {
  if (!group || !group.color) return GROUP_COLORS[0];
  return GROUP_COLORS.find(c => c.id === group.color) || GROUP_COLORS[0];
}

export default function FullTaskManager({
  tasks,
  showPanel,
  onClose,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onBulkDeleteTasks,
  onReorderTask,
  onStartLocationSelection,
  onNavigateToLocation,
  onCancelLocationSelection,
  isSelectingLocation,
  selectingLocationForTaskId,
  workspaces,
  taskGroups,
  onAddGroup,
  onRenameGroup,
  onDeleteGroup,
  onUpdateGroupColor,
  onReorderGroup,
  mode = 'fullscreen',
  onToggleFullscreen,
}) {
  const isPanel = mode === 'panel';
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('active');
  const [activeFilter, setActiveFilter] = useState('all');
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [statusDropdownTaskId, setStatusDropdownTaskId] = useState(null);
  const [groupDropdownTaskId, setGroupDropdownTaskId] = useState(null);
  const [reorderDropdownTaskId, setReorderDropdownTaskId] = useState(null);
  const [moveToPositionTaskId, setMoveToPositionTaskId] = useState(null);
  const [positionInputValue, setPositionInputValue] = useState('');
  const statusDropdownRef = useRef(null);
  const groupDropdownRef = useRef(null);
  const reorderDropdownRef = useRef(null);

  // Bulk delete state
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newGroupId, setNewGroupId] = useState('inbox');

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('todo');
  const [editPriority, setEditPriority] = useState('medium');
  const [editGroupId, setEditGroupId] = useState('inbox');
  const [editingTitleTaskId, setEditingTitleTaskId] = useState(null);
  const [editTitleValue, setEditTitleValue] = useState('');

  // Group management state
  const [newGroupName, setNewGroupName] = useState('');
  const [renamingGroupId, setRenamingGroupId] = useState(null);
  const [renameGroupValue, setRenameGroupValue] = useState('');
  const [colorPickerGroupId, setColorPickerGroupId] = useState(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (statusDropdownTaskId && statusDropdownRef.current && !statusDropdownRef.current.contains(e.target)) {
        setStatusDropdownTaskId(null);
      }
      if (groupDropdownTaskId && groupDropdownRef.current && !groupDropdownRef.current.contains(e.target)) {
        setGroupDropdownTaskId(null);
      }
      if (reorderDropdownTaskId && reorderDropdownRef.current && !reorderDropdownRef.current.contains(e.target)) {
        setReorderDropdownTaskId(null);
        setMoveToPositionTaskId(null);
        setPositionInputValue('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [statusDropdownTaskId, groupDropdownTaskId, reorderDropdownTaskId]);

  if (!showPanel) return null;

  const groups = (() => {
    const raw = taskGroups && taskGroups.length > 0 ? taskGroups : [{ id: 'inbox', name: 'Inbox', sortOrder: 0, color: 'slate' }];
    if (!raw.find(g => g.id === 'inbox')) {
      return [{ id: 'inbox', name: 'Inbox', sortOrder: 0, color: 'slate' }, ...raw];
    }
    return raw;
  })();

  const toggleGroupCollapse = (groupId) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleRowClick = (task) => {
    if (selectedTaskId === task.id) {
      setSelectedTaskId(null);
    } else {
      setSelectedTaskId(task.id);
    }
  };

  const handleRowDoubleClick = (task) => {
    if (editingTaskId === task.id) {
      setEditingTaskId(null);
    } else {
      setEditingTaskId(task.id);
      setSelectedTaskId(null);
      setEditTitle(task.title);
      setEditNotes(task.notes || '');
      setEditStatus(task.status);
      setEditPriority(task.priority);
      setEditGroupId(task.groupId || 'inbox');
    }
  };

  const handleSaveExpanded = () => {
    if (!editTitle.trim()) return;
    onUpdateTask(editingTaskId, {
      title: editTitle.trim(),
      notes: editNotes.trim(),
      status: editStatus,
      priority: editPriority,
      groupId: editGroupId,
    });
    setEditingTaskId(null);
  };

  const handleCreateTask = (andSetLocation = false) => {
    if (!newTitle.trim()) return;
    const newTaskId = onAddTask({
      title: newTitle.trim(),
      notes: newNotes.trim(),
      priority: newPriority,
      groupId: newGroupId,
    });
    setNewTitle('');
    setNewNotes('');
    setNewPriority('medium');
    setNewGroupId('inbox');
    setShowNewTaskForm(false);
    if (andSetLocation && newTaskId) {
      onStartLocationSelection(newTaskId);
    }
  };

  const handleTitleDoubleClick = (e, task) => {
    e.stopPropagation();
    setEditingTitleTaskId(task.id);
    setEditTitleValue(task.title);
  };

  const saveTitleEdit = (taskId) => {
    if (!editTitleValue.trim()) return;
    onUpdateTask(taskId, { title: editTitleValue.trim() });
    setEditingTitleTaskId(null);
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    onAddGroup(newGroupName.trim());
    setNewGroupName('');
  };

  const handleRenameGroup = (groupId) => {
    if (!renameGroupValue.trim()) return;
    onRenameGroup(groupId, renameGroupValue.trim());
    setRenamingGroupId(null);
    setRenameGroupValue('');
  };

  const handleDeleteGroup = (groupId) => {
    if (groupId === 'inbox') return;
    onDeleteGroup(groupId);
  };

  const pinExistsForTask = (task) => {
    if (!task.locationPinId) return false;
    return (workspaces || []).some(ws => (ws.pins || []).some(p => p.id === task.locationPinId));
  };

  // Bulk delete helpers
  const cancelDeleteMode = () => {
    setDeleteMode(false);
    setSelectedForDelete(new Set());
    setShowDeleteConfirm(false);
  };

  const toggleDeleteSelection = (taskId) => {
    setSelectedForDelete(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const confirmBulkDelete = () => {
    if (onBulkDeleteTasks) {
      onBulkDeleteTasks(Array.from(selectedForDelete));
    }
    setSelectedForDelete(new Set());
    setDeleteMode(false);
    setShowDeleteConfirm(false);
  };

  // Group tasks by groupId
  const groupedTasks = useMemo(() => {
    let filtered = (tasks || []).filter(task => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return task.title.toLowerCase().includes(q) || (task.notes || '').toLowerCase().includes(q);
    });

    // Apply viewMode filter: in 'active' mode, exclude completed tasks
    if (viewMode === 'active') {
      filtered = filtered.filter(task => task.status !== 'completed');
    }

    if (activeFilter !== 'all') {
      filtered = filtered.filter(task => task.status === activeFilter);
    }

    const sorted = [...filtered].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    const result = {};
    groups.forEach(g => {
      result[g.id] = [];
    });

    sorted.forEach(task => {
      const gId = task.groupId || 'inbox';
      if (!result[gId]) result[gId] = [];
      result[gId].push(task);
    });

    // In 'all' mode, sort completed tasks to the bottom within each group
    if (viewMode === 'all') {
      Object.keys(result).forEach(gId => {
        const incomplete = result[gId].filter(t => t.status !== 'completed');
        const completed = result[gId].filter(t => t.status === 'completed');
        result[gId] = [...incomplete, ...completed];
      });
    }

    return result;
  }, [tasks, searchQuery, viewMode, activeFilter, groups]);

  const filterButtons = [
    { value: 'all', label: 'All' },
    { value: 'todo', label: 'Todo' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'waiting', label: 'Waiting' },
    { value: 'completed', label: 'Completed' },
  ];

  const sortedGroups = [...groups].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  // Collect all visible task IDs for "Select All"
  const allVisibleTaskIds = useMemo(() => {
    const ids = [];
    sortedGroups.forEach(group => {
      const gTasks = groupedTasks[group.id] || [];
      gTasks.forEach(task => ids.push(task.id));
    });
    return ids;
  }, [sortedGroups, groupedTasks]);

  const selectAllForDelete = () => {
    if (selectedForDelete.size === allVisibleTaskIds.length) {
      setSelectedForDelete(new Set());
    } else {
      setSelectedForDelete(new Set(allVisibleTaskIds));
    }
  };

  return (
    <div className={isPanel ? 'relative w-1/2 bg-white border-l border-slate-200 flex flex-col overflow-hidden shrink-0 h-full' : 'fixed inset-0 z-50 bg-white flex flex-col'}>
      {/* Toolbar - compact single-row layout */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-200 bg-slate-50 shrink-0">
        {/* Toggle Fullscreen */}
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors shrink-0"
            title={mode === 'fullscreen' ? 'Restore Split View (TT)' : 'Expand Task Manager (TT)'}
          >
            {mode === 'fullscreen' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Search */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded px-2 py-1 w-[180px] shrink-0">
          <Search className="w-3 h-3 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="flex-1 min-w-0 bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 shrink-0">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* View Mode Toggle (Active / All) */}
        <div className="flex items-center bg-slate-200 rounded p-0.5 shrink-0">
          <button
            onClick={() => {
              setViewMode('active');
              if (activeFilter === 'completed') setActiveFilter('all');
            }}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${
              viewMode === 'active'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${
              viewMode === 'all'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            All
          </button>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-0.5 shrink-0">
          {filterButtons
            .filter(fb => viewMode === 'all' || fb.value !== 'completed')
            .map(fb => (
            <button
              key={fb.value}
              onClick={() => setActiveFilter(fb.value)}
              className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full transition-colors whitespace-nowrap ${
                activeFilter === fb.value
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {fb.label}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 ml-auto shrink-0">
          {/* Bulk Delete Toggle */}
          <button
            onClick={() => { if (deleteMode) cancelDeleteMode(); else setDeleteMode(true); }}
            className={`p-1 rounded border transition-colors ${deleteMode ? 'bg-red-50 border-red-300 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-red-500'}`}
            title={deleteMode ? 'Cancel Delete' : 'Bulk Delete'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* New Group */}
          <button
            onClick={() => {
              const name = prompt('New group name:');
              if (name && name.trim()) onAddGroup(name.trim());
            }}
            className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-semibold rounded transition-colors"
            title="New Group"
          >
            <FolderPlus className="w-3 h-3" />
            <span className="hidden sm:inline">Group</span>
          </button>

          {/* New Task */}
          <button
            onClick={() => setShowNewTaskForm(!showNewTaskForm)}
            className="flex items-center gap-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-semibold rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            Task
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Delete Mode: Select All + Confirm Bar */}
      {deleteMode && (
        <div className="px-3 py-2 border-b border-red-100 bg-red-50/50 shrink-0 flex items-center gap-2">
          <button
            onClick={selectAllForDelete}
            className="text-[10px] font-semibold text-red-700 hover:text-red-800 underline transition-colors"
          >
            {selectedForDelete.size === allVisibleTaskIds.length ? 'Deselect All' : 'Select All'}
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

      {/* New Task Form (inline at top) */}
      {showNewTaskForm && (
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className={`${isPanel ? 'flex flex-col gap-2' : 'flex items-center gap-2 max-w-4xl'}`}>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Task title *"
              className="flex-1 text-xs bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-300"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTask(); if (e.key === 'Escape') setShowNewTaskForm(false); }}
            />
            <textarea
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Notes (optional)"
              className={`text-xs bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 placeholder-slate-400 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-300 ${isPanel ? 'w-full' : 'w-48'}`}
              rows={1}
            />
            <div className={`flex items-center gap-2 ${isPanel ? 'flex-wrap' : ''}`}>
              <select
                value={newGroupId}
                onChange={(e) => setNewGroupId(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-300"
              >
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-300"
              >
                {PRIORITY_OPTIONS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCreateTask(false)}
                disabled={!newTitle.trim()}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => handleCreateTask(true)}
                disabled={!newTitle.trim()}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold rounded transition-colors flex items-center gap-1"
              >
                <MapPin className="w-3 h-3" />
                Create & Set Location
              </button>
              <button
                onClick={() => { setShowNewTaskForm(false); setNewTitle(''); setNewNotes(''); setNewPriority('medium'); setNewGroupId('inbox'); }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Group sections */}
      <div className="flex-1 overflow-y-auto">
        {sortedGroups.map(group => {
          const groupTasks = groupedTasks[group.id] || [];
          const isCollapsed = collapsedGroups[group.id];
          const colorCfg = getGroupColor(group);

          return (
            <div key={group.id} className="border-b border-slate-100">
              {/* Group Header */}
              <div className={`flex items-center gap-2 px-4 py-2 border-l-4 ${colorCfg.headerBorder} ${colorCfg.headerBg}`}>
                <button
                  onClick={() => toggleGroupCollapse(group.id)}
                  className="shrink-0 text-slate-500 hover:text-slate-700"
                >
                  {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <span className={`text-sm font-semibold ${colorCfg.headerText}`}>
                  {renamingGroupId === group.id ? (
                    <input
                      type="text"
                      value={renameGroupValue}
                      onChange={(e) => setRenameGroupValue(e.target.value)}
                      className="text-sm bg-white border border-slate-200 rounded px-2 py-0.5 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-300"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRenameGroup(group.id); if (e.key === 'Escape') setRenamingGroupId(null); }}
                      onBlur={() => handleRenameGroup(group.id)}
                    />
                  ) : group.name}
                </span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${colorCfg.badgeBg}`}>
                  {groupTasks.length}
                </span>

                {/* Group actions */}
                <div className="flex items-center gap-1 ml-auto">
                  {/* Reorder Up */}
                  <button
                    onClick={() => onReorderGroup(group.id, 'up')}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                    title="Move Group Up"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>

                  {/* Reorder Down */}
                  <button
                    onClick={() => onReorderGroup(group.id, 'down')}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                    title="Move Group Down"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {/* Color picker toggle */}
                  <button
                    onClick={() => setColorPickerGroupId(colorPickerGroupId === group.id ? null : group.id)}
                    className={`p-1 rounded transition-colors ${colorPickerGroupId === group.id ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Edit Color"
                  >
                    <Palette className="w-3 h-3" />
                  </button>

                  {/* Color picker dots (shown on toggle) */}
                  {colorPickerGroupId === group.id && (
                    <div className="flex items-center gap-0.5">
                      {GROUP_COLORS.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { onUpdateGroupColor(group.id, c.id); setColorPickerGroupId(null); }}
                          className={`w-3 h-3 rounded-full ${c.dotColor} ${group.color === c.id ? 'ring-2 ring-offset-1 ring-slate-400' : ''} hover:scale-125 transition-transform`}
                          title={c.name}
                        />
                      ))}
                    </div>
                  )}

                  {/* Rename */}
                  {renamingGroupId !== group.id && (
                    <button
                      onClick={() => { setRenamingGroupId(group.id); setRenameGroupValue(group.name); }}
                      className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                      title="Rename"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}

                  {/* Delete */}
                  {group.id !== 'inbox' && (
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      title="Delete Group"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Table header */}
              {!isCollapsed && groupTasks.length > 0 && (
                <div className="flex items-center px-4 py-1 bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-400 font-medium">
                  <span className={`${isPanel ? 'w-20' : 'w-24'} shrink-0`}>Status</span>
                  <span className={`${isPanel ? 'flex-1 min-w-0' : 'w-[360px] shrink-0'}`}>Task</span>
                  <span className="w-10 shrink-0 text-center">Loc</span>
                  <span className={`${isPanel ? 'w-16' : 'w-20'} shrink-0 text-center`}>Actions</span>
                  <span className={`${isPanel ? 'w-20' : 'w-24'} shrink-0 text-center`}>Group</span>
                  <span className={`${isPanel ? 'w-24' : 'w-40'} shrink-0`}>Notes</span>
                </div>
              )}

              {/* Task rows */}
              {!isCollapsed && groupTasks.map(task => {
                const statusCfg = getStatusConfig(task.status);
                const StatusIcon = statusCfg.icon;
                const priorityCfg = getPriorityConfig(task.priority);
                const isEditing = editingTaskId === task.id;
                const isSelected = selectedTaskId === task.id;
                const taskGroup = groups.find(g => g.id === (task.groupId || 'inbox')) || { id: 'inbox', name: 'Ungrouped' };

                return (
                  <div key={task.id}>
                    {/* Task row */}
                    <div
                      className={`flex items-center px-4 py-1.5 border-b border-slate-50 cursor-pointer transition-colors border-l-2 ${
                        isEditing ? `bg-slate-50 ${colorCfg.headerBorder}` : isSelected ? `bg-indigo-50/50 border-l-transparent` : `border-l-transparent hover:bg-slate-50`
                      } ${viewMode === 'all' && task.status === 'completed' ? 'opacity-50' : ''}`}
                      onClick={() => { if (deleteMode) { toggleDeleteSelection(task.id); return; } handleRowClick(task); }}
                      onDoubleClick={() => { if (deleteMode) return; handleRowDoubleClick(task); }}
                    >
                      {/* Checkbox for delete mode */}
                      {deleteMode && (
                        <div className="w-5 shrink-0 flex items-center justify-center">
                          <div
                            className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-colors ${
                              selectedForDelete.has(task.id)
                                ? 'bg-red-500 border-red-500'
                                : 'border-slate-300 hover:border-red-400'
                            }`}
                          >
                            {selectedForDelete.has(task.id) && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                        </div>
                      )}
                      {/* Status - readable text with dropdown */}
                      <div className={`${isPanel ? 'w-20' : 'w-24'} shrink-0 relative`} ref={statusDropdownTaskId === task.id ? statusDropdownRef : null}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setStatusDropdownTaskId(statusDropdownTaskId === task.id ? null : task.id);
                            setGroupDropdownTaskId(null);
                          }}
                          className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors ${statusCfg.color}`}
                          title="Change status"
                        >
                          <StatusIcon className="w-3 h-3" />
                          <span>{statusCfg.label}</span>
                          <ChevronDown className="w-2.5 h-2.5 opacity-50" />
                        </button>
                        {statusDropdownTaskId === task.id && (
                          <div className="absolute top-full left-0 mt-0.5 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 min-w-[120px]">
                            {STATUS_OPTIONS.map(s => {
                              const SIcon = s.icon;
                              return (
                                <button
                                  key={s.value}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateTask(task.id, { status: s.value });
                                    setStatusDropdownTaskId(null);
                                  }}
                                  className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-slate-50 transition-colors ${
                                    task.status === s.value ? 'bg-indigo-50 font-medium' : ''
                                  }`}
                                >
                                  <SIcon className={`w-3.5 h-3.5 ${s.color}`} />
                                  <span className="text-slate-700">{s.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Title */}
                      <div className={`${isPanel ? 'flex-1 min-w-0' : 'w-[360px] shrink-0'}`}>
                        {editingTitleTaskId === task.id ? (
                          <input
                            type="text"
                            value={editTitleValue}
                            onChange={(e) => setEditTitleValue(e.target.value)}
                            className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-0.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveTitleEdit(task.id); if (e.key === 'Escape') setEditingTitleTaskId(null); }}
                            onBlur={() => saveTitleEdit(task.id)}
                          />
                        ) : (
                          <span
                            className={`text-xs truncate block ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-700'}`}
                            onDoubleClick={(e) => handleTitleDoubleClick(e, task)}
                            title={task.title}
                          >
                            {task.title}
                          </span>
                        )}
                      </div>

                      {/* Location */}
                      <div className="w-10 shrink-0 text-center">
                        {pinExistsForTask(task) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateToLocation(task.locationPinId, task.locationWorkspaceId);
                            }}
                            className="text-indigo-500 hover:text-indigo-700 transition-colors inline-flex"
                            title="Go to location"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Actions: Edit + Reorder */}
                      <div className={`${isPanel ? 'w-16' : 'w-20'} shrink-0 flex items-center justify-center gap-0.5`}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRowDoubleClick(task); }}
                          className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onReorderTask(task.id, 'up', 'group'); }}
                          className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                          title="Move Up"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onReorderTask(task.id, 'down', 'group'); }}
                          className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                          title="Move Down"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <div className="relative" ref={reorderDropdownTaskId === task.id ? reorderDropdownRef : null}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setReorderDropdownTaskId(reorderDropdownTaskId === task.id ? null : task.id);
                              setMoveToPositionTaskId(null);
                              setPositionInputValue('');
                              setStatusDropdownTaskId(null);
                              setGroupDropdownTaskId(null);
                            }}
                            className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                            title="More reorder options"
                          >
                            <MoreVertical className="w-3 h-3" />
                          </button>
                          {reorderDropdownTaskId === task.id && (
                            <div className="absolute top-full right-0 mt-0.5 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 min-w-[140px]">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReorderTask(task.id, 'top', 'group');
                                  setReorderDropdownTaskId(null);
                                }}
                                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-slate-50 transition-colors"
                              >
                                Move to Top
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReorderTask(task.id, 'bottom', 'group');
                                  setReorderDropdownTaskId(null);
                                }}
                                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-slate-50 transition-colors"
                              >
                                Move to Bottom
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMoveToPositionTaskId(task.id);
                                  setPositionInputValue('');
                                }}
                                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-slate-50 transition-colors"
                              >
                                Move to Position...
                              </button>
                              {moveToPositionTaskId === task.id && (
                                <div className="px-3 py-1.5">
                                  <input
                                    type="number"
                                    min="1"
                                    autoFocus
                                    value={positionInputValue}
                                    onChange={(e) => setPositionInputValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      e.stopPropagation();
                                      if (e.key === 'Enter') {
                                        const pos = parseInt(positionInputValue, 10);
                                        if (pos && pos > 0) {
                                          onReorderTask(task.id, 'toPosition', 'group', pos);
                                        }
                                        setReorderDropdownTaskId(null);
                                        setMoveToPositionTaskId(null);
                                        setPositionInputValue('');
                                      }
                                      if (e.key === 'Escape') {
                                        setMoveToPositionTaskId(null);
                                        setPositionInputValue('');
                                      }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder="Position #"
                                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Group dropdown */}
                      <div className={`${isPanel ? 'w-20' : 'w-24'} shrink-0 text-center relative`} ref={groupDropdownTaskId === task.id ? groupDropdownRef : null}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setGroupDropdownTaskId(groupDropdownTaskId === task.id ? null : task.id);
                            setStatusDropdownTaskId(null);
                          }}
                          className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors inline-flex items-center gap-0.5 max-w-[88px] truncate"
                          title="Change group"
                        >
                          <span className="truncate">{taskGroup.name}</span>
                          <ChevronDown className="w-2.5 h-2.5 opacity-50 shrink-0" />
                        </button>
                        {groupDropdownTaskId === task.id && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 min-w-[120px]">
                            {groups.map(g => (
                              <button
                                key={g.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdateTask(task.id, { groupId: g.id });
                                  setGroupDropdownTaskId(null);
                                }}
                                className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-slate-50 transition-colors ${
                                  (task.groupId || 'inbox') === g.id ? 'bg-indigo-50 font-medium' : ''
                                }`}
                              >
                                <Folder className="w-3 h-3 text-slate-400" />
                                <span className="text-slate-700">{g.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Notes preview (small, inline in row) */}
                      <div className={`${isPanel ? 'w-24' : 'w-40'} shrink-0`}>
                        {task.notes && task.notes.trim() && (
                          <span className="text-[10px] text-slate-400 truncate block">
                            {isPanel
                              ? <>{task.notes.substring(0, 30)}{task.notes.length > 30 ? '...' : ''}</>
                              : <>{task.notes.substring(0, 60)}{task.notes.length > 60 ? '...' : ''}</>
                            }
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Selected: full notes (read-only, no truncation) */}
                    {isSelected && !isEditing && task.notes && task.notes.trim() && (
                      <div className="text-xs text-slate-600 px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 whitespace-pre-wrap leading-relaxed">
                        {task.notes}
                      </div>
                    )}

                    {/* Edit mode: full edit panel */}
                    {isEditing && (
                      <div className={`px-4 py-3 bg-slate-50 border-b border-slate-200 border-l-2 ${colorCfg.headerBorder}`}>
                        <div className="max-w-2xl space-y-2">
                          {/* Notes */}
                          <div>
                            <label className="text-[10px] text-slate-500 font-medium block mb-0.5">Notes</label>
                            <textarea
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              className="w-full text-xs bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-600 placeholder-slate-400 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-300"
                              placeholder="Add notes..."
                              rows={3}
                            />
                          </div>

                          {/* Edit controls row */}
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-slate-500 font-medium">Status</span>
                              <select
                                value={editStatus}
                                onChange={(e) => setEditStatus(e.target.value)}
                                className="text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                              >
                                {STATUS_OPTIONS.map(s => (
                                  <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-slate-500 font-medium">Priority</span>
                              <select
                                value={editPriority}
                                onChange={(e) => setEditPriority(e.target.value)}
                                className="text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                              >
                                {PRIORITY_OPTIONS.map(p => (
                                  <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-slate-500 font-medium">Group</span>
                              <select
                                value={editGroupId}
                                onChange={(e) => setEditGroupId(e.target.value)}
                                className="text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                              >
                                {groups.map(g => (
                                  <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={handleSaveExpanded}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-semibold rounded transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingTaskId(null)}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-semibold rounded transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => onStartLocationSelection(task.id)}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-semibold rounded transition-colors flex items-center gap-1"
                            >
                              <MapPin className="w-3 h-3" />
                              Set Location
                            </button>
                            {pinExistsForTask(task) && (
                              <button
                                onClick={() => onNavigateToLocation(task.locationPinId, task.locationWorkspaceId)}
                                className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-semibold rounded transition-colors flex items-center gap-1"
                              >
                                <Navigation className="w-3 h-3" />
                                Go To Location
                              </button>
                            )}
                            <button
                              onClick={() => { onDeleteTask(task.id); setEditingTaskId(null); }}
                              className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-semibold rounded transition-colors flex items-center gap-1 ml-auto"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Empty group message */}
              {!isCollapsed && groupTasks.length === 0 && (
                <div className="px-4 py-3 text-xs text-slate-400 italic">
                  No tasks in this group
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-4 max-w-[300px] w-full mx-4">
            <div className="flex items-center gap-2 mb-3">
              <Trash2 className="w-5 h-5 text-red-500" />
              <h4 className="text-sm font-bold text-slate-800">Confirm Deletion</h4>
            </div>
            <p className="text-xs text-slate-600 mb-2">
              Are you sure you want to delete <strong>{selectedForDelete.size}</strong> task{selectedForDelete.size > 1 ? 's' : ''}? This action cannot be undone.
            </p>
            <p className="text-[10px] text-slate-500 mb-4">
              Any linked location pins will be converted to standalone pins.
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
