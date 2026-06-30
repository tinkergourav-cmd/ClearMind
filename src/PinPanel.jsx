import React, { useState } from 'react';
import { X, MapPin, Eye, EyeOff, Search, ChevronDown, Trash2, Pencil, CheckSquare, Square } from 'lucide-react';

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
  tasks,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState({});
  const [editingPinId, setEditingPinId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingNote, setEditingNote] = useState('');
  const [editingIcon, setEditingIcon] = useState('');
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedPinIds, setSelectedPinIds] = useState(new Set());

  if (!showPanel) return null;

  // Helper: check if a pin is an orphaned task-pin (was linked to a task that no longer exists)
  const isOrphanedTaskPin = (pin) => {
    if (!pin.id.startsWith('pin-task-')) return false;
    // Check if any task still references this pin
    return !(tasks || []).some(t => t.locationPinId === pin.id);
  };

  const toggleSection = (wsId) => {
    setCollapsedSections(prev => ({ ...prev, [wsId]: !prev[wsId] }));
  };

  const startEdit = (pin) => {
    setEditingPinId(pin.id);
    setEditingName(pin.name);
    setEditingNote(pin.note || '');
    setEditingIcon(pin.icon);
  };

  const commitEdit = (pinId, workspaceId) => {
    onUpdatePin(pinId, {
      name: editingName.trim() || 'Unnamed Pin',
      note: editingNote,
      icon: editingIcon,
    }, workspaceId);
    setEditingPinId(null);
  };

  const cancelEdit = () => {
    setEditingPinId(null);
  };

  // Gather all pins from all workspaces, filtered by search
  const filteredWorkspaces = workspaces.map(ws => {
    const pins = (ws.pins || []).filter(pin => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return pin.name.toLowerCase().includes(q) || (pin.note || '').toLowerCase().includes(q);
    });
    return { ...ws, pins };
  }).filter(ws => ws.pins.length > 0);

  const activeWsPins = workspaces.find(ws => ws.id === activeTab)?.pins || [];
  const allVisible = activeWsPins.length > 0 && activeWsPins.every(p => p.visibility_status);

  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50 shrink-0">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-rose-600" />
          <h3 className="text-sm font-bold text-slate-800">Pins</h3>
          <span className="text-xs text-slate-400 font-medium">
            ({activeWsPins.length})
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setBulkSelectMode(!bulkSelectMode); setSelectedPinIds(new Set()); }}
            className={`p-1.5 rounded-lg transition-colors ${bulkSelectMode ? 'bg-rose-100 text-rose-600' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-700'}`}
            title={bulkSelectMode ? 'Cancel Bulk Select' : 'Bulk Select'}
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          {bulkSelectMode && selectedPinIds.size > 0 && (
            <button
              onClick={() => {
                selectedPinIds.forEach(pinId => {
                  // Find which workspace contains this pin
                  const ws = workspaces.find(w => (w.pins || []).some(p => p.id === pinId));
                  if (ws) onDeletePin(pinId, ws.id);
                });
                setSelectedPinIds(new Set());
                setBulkSelectMode(false);
              }}
              className="p-1.5 hover:bg-red-100 rounded-lg text-red-500 hover:text-red-700 transition-colors"
              title={`Delete ${selectedPinIds.size} selected pins`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
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

      {/* Search */}
      <div className="px-3 py-2 border-b border-slate-100 shrink-0">
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
      </div>

      {/* Bulk select count */}
      {bulkSelectMode && (
        <div className="px-3 py-1.5 bg-rose-50 border-b border-rose-100 flex items-center justify-between shrink-0">
          <span className="text-[11px] font-medium text-rose-700">
            {selectedPinIds.size} pin{selectedPinIds.size !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => {
              // Select all visible pins
              const allPinIds = new Set();
              filteredWorkspaces.forEach(w => w.pins.forEach(p => allPinIds.add(p.id)));
              setSelectedPinIds(allPinIds);
            }}
            className="text-[10px] font-semibold text-rose-600 hover:text-rose-800 transition-colors"
          >
            Select All
          </button>
        </div>
      )}

      {/* Pin List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredWorkspaces.length === 0 && (
          <p className="text-xs text-slate-400 italic text-center py-6">
            {searchQuery ? 'No pins match your search' : 'No pins yet. Right-click on canvas or press Shift+P to add one.'}
          </p>
        )}

        {filteredWorkspaces.map(ws => {
          const isCollapsed = collapsedSections[ws.id];
          const isActive = ws.id === activeTab;

          return (
            <div key={ws.id} className="border-b border-slate-100">
              {/* Workspace Section Header */}
              <button
                onClick={() => toggleSection(ws.id)}
                className={`w-full flex items-center gap-1.5 px-3 py-2 hover:bg-slate-50 transition-colors ${isActive ? 'bg-rose-50/50' : ''}`}
              >
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                <span className={`text-[11px] font-bold uppercase tracking-wide truncate ${isActive ? 'text-rose-700' : 'text-slate-600'}`}>
                  {ws.name}
                </span>
                <span className="text-[10px] text-slate-400 shrink-0">({ws.pins.length})</span>
              </button>

              {/* Pin Entries */}
              {!isCollapsed && ws.pins.map(pin => (
                <div key={pin.id}>
                  {editingPinId === pin.id ? (
                    /* Editing Mode */
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1 mb-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-300"
                        placeholder="Pin name"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(pin.id, ws.id); if (e.key === 'Escape') cancelEdit(); }}
                      />
                      <textarea
                        value={editingNote}
                        onChange={(e) => setEditingNote(e.target.value)}
                        className="w-full text-[11px] bg-white border border-slate-200 rounded px-2 py-1 mb-1.5 text-slate-600 placeholder-slate-400 resize-none focus:outline-none focus:ring-1 focus:ring-rose-300"
                        placeholder="Note (optional)"
                        rows={2}
                      />
                      {/* Icon picker */}
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
                        <button onClick={() => commitEdit(pin.id, ws.id)} className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-semibold rounded transition-colors">Save</button>
                        <button onClick={cancelEdit} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-semibold rounded transition-colors">Cancel</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeletePin(pin.id, ws.id); setEditingPinId(null); }}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-semibold rounded transition-colors ml-auto"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <div
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer group transition-colors"
                      onClick={() => {
                        if (bulkSelectMode) {
                          setSelectedPinIds(prev => {
                            const next = new Set(prev);
                            if (next.has(pin.id)) next.delete(pin.id);
                            else next.add(pin.id);
                            return next;
                          });
                        } else {
                          onNavigateToPin(pin.id, ws.id);
                        }
                      }}
                      title={pin.note || pin.name}
                    >
                      {/* Bulk select checkbox */}
                      {bulkSelectMode && (
                        <span className="w-4 h-4 flex items-center justify-center shrink-0">
                          {selectedPinIds.has(pin.id) ? (
                            <CheckSquare className="w-3.5 h-3.5 text-rose-600" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </span>
                      )}
                      {/* Icon only */}
                      <span className="w-5 h-5 flex items-center justify-center shrink-0 text-sm">
                        {pin.icon}
                      </span>

                      {/* Name */}
                      <span className="flex-1 min-w-0 text-xs font-medium text-slate-700 truncate">
                        {pin.name}
                        {isOrphanedTaskPin(pin) && (
                          <span className="ml-1 text-[9px] text-amber-500 font-normal">(orphaned)</span>
                        )}
                      </span>

                      {/* Note indicator */}
                      {pin.note && (
                        <span className="text-[9px] text-slate-400 shrink-0 max-w-[60px] truncate hidden group-hover:inline">
                          {pin.note}
                        </span>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); onToggleVisibility(pin.id, ws.id); }}
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
                          onClick={(e) => { e.stopPropagation(); onDeletePin(pin.id, ws.id); }}
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { PIN_ICONS };
