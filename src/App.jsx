import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Plus, Trash2, X, ChevronDown, 
  FileText, Network, FolderOpen, Palette, Check, ZoomIn, ZoomOut, Focus,
  Download, Upload, Undo2, Redo2, Layers, Link2, ExternalLink,
  Sparkles, PanelLeftClose, PanelLeft,
  Copy, ArrowUp, ArrowDown, RefreshCw, LayoutList, MonitorSpeaker,
  MoreVertical, ImageIcon, ChevronUp, Scissors, ClipboardPaste,
  Lock, Shield, Eye, EyeOff, GitBranch, Map, Timer,
  MapPin, Bell, Pencil, MousePointer, ListTodo, Cloud, CloudOff, Loader,
  AlertTriangle
} from 'lucide-react';
import MiniMap from './MiniMap';
import PinPanel, { PIN_ICONS } from './PinPanel';
import ReminderPanel from './ReminderPanel';
import FullTaskManager from './FullTaskManager';
import { GROUP_COLORS } from './taskConstants';
import MarkdownRenderer from './MarkdownRenderer';
import CardEditorPanel from './CardEditorPanel';
import { isFirebaseConfigured } from './firebase';
import { validateWorkspaces } from './workspaceValidator';
import {
  saveProjectMeta,
  saveWorkspace as saveWorkspaceToLocal,
  saveTasks,
  saveMeta,
  loadMeta,
  loadWorkspace as loadWorkspaceFromLocal,
  loadTasks,
  loadProjectMeta,
  loadAllProjectIds,
  generateId,
  createDebouncedSaver,
  hydrateProject,
  enrichProjectWithLocalMetadata,
  saveWorkspaceToFirestore,
  deleteWorkspaceFromFirestore,
  deleteProjectFromFirestore,
  removeWorkspaceLocal,
  saveTasksToFirestore,
  saveProjectToFirestore,
  loadProjectFromFirestore,
  loadWorkspaceFromFirestore,
  loadAllWorkspacesFromFirestore,
  loadAllProjectsFromFirestore,
  loadTasksFromFirestore,
  saveUserMeta,
  loadUserMeta
} from './persistenceService';

// --- Premium Color Themes (10 colors) ---
const THEMES = {
  blue: {
    name: 'Ocean Blue',
    cardBg: '#bfdbfe',
    wrapper: 'bg-slate-50 border-blue-200/80 hover:border-blue-400/50',
    header: 'bg-blue-50/80 border-blue-200',
    tag: 'bg-blue-100/80 border-blue-300 text-blue-800',
    port: 'bg-blue-500 hover:bg-blue-400 border-blue-100',
    text: 'text-blue-900',
    line: '#3b82f6',
    border: '#3b82f6',
    groupBg: 'bg-blue-100/40 border-blue-400/60',
    groupHeader: 'bg-blue-200/60 border-blue-300/50',
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.15)]'
  },
  green: {
    name: 'Fresh Green',
    cardBg: '#bbf7d0',
    wrapper: 'bg-emerald-50/20 border-emerald-200/80 hover:border-emerald-400/50',
    header: 'bg-emerald-50/80 border-emerald-200',
    tag: 'bg-emerald-100/80 border-emerald-300 text-emerald-800',
    port: 'bg-emerald-500 hover:bg-emerald-400 border-emerald-100',
    text: 'text-emerald-900',
    line: '#10b981',
    border: '#10b981',
    groupBg: 'bg-emerald-100/40 border-emerald-400/60',
    groupHeader: 'bg-emerald-200/60 border-emerald-300/50',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]'
  },
  pink: {
    name: 'Soft Pink',
    cardBg: '#fbcfe8',
    wrapper: 'bg-pink-50/20 border-pink-200/80 hover:border-pink-400/50',
    header: 'bg-pink-50/80 border-pink-200',
    tag: 'bg-pink-100/80 border-pink-300 text-pink-800',
    port: 'bg-pink-500 hover:bg-pink-400 border-pink-100',
    text: 'text-pink-900',
    line: '#ec4899',
    border: '#ec4899',
    groupBg: 'bg-pink-100/40 border-pink-400/60',
    groupHeader: 'bg-pink-200/60 border-pink-300/50',
    glow: 'shadow-[0_0_20px_rgba(236,72,153,0.15)]'
  },
  yellow: {
    name: 'Sunny Yellow',
    cardBg: '#fef08a',
    wrapper: 'bg-yellow-50/20 border-yellow-200/80 hover:border-yellow-400/50',
    header: 'bg-yellow-50/80 border-yellow-200',
    tag: 'bg-yellow-100/80 border-yellow-300 text-yellow-800',
    port: 'bg-yellow-500 hover:bg-yellow-400 border-yellow-100',
    text: 'text-yellow-900',
    line: '#eab308',
    border: '#eab308',
    groupBg: 'bg-yellow-100/40 border-yellow-400/60',
    groupHeader: 'bg-yellow-200/60 border-yellow-300/50',
    glow: 'shadow-[0_0_20px_rgba(234,179,8,0.15)]'
  },
  purple: {
    name: 'Royal Purple',
    cardBg: '#e9d5ff',
    wrapper: 'bg-purple-50/20 border-purple-200/80 hover:border-purple-400/50',
    header: 'bg-purple-50/80 border-purple-200',
    tag: 'bg-purple-100/80 border-purple-300 text-purple-800',
    port: 'bg-purple-500 hover:bg-purple-400 border-purple-100',
    text: 'text-purple-900',
    line: '#8b5cf6',
    border: '#8b5cf6',
    groupBg: 'bg-purple-100/40 border-purple-400/60',
    groupHeader: 'bg-purple-200/60 border-purple-300/50',
    glow: 'shadow-[0_0_20px_rgba(139,92,246,0.15)]'
  },
  orange: {
    name: 'Warm Orange',
    cardBg: '#fed7aa',
    wrapper: 'bg-orange-50/20 border-orange-200/80 hover:border-orange-400/50',
    header: 'bg-orange-50/80 border-orange-200',
    tag: 'bg-orange-100/80 border-orange-300 text-orange-800',
    port: 'bg-orange-500 hover:bg-orange-400 border-orange-100',
    text: 'text-orange-900',
    line: '#f97316',
    border: '#f97316',
    groupBg: 'bg-orange-100/40 border-orange-400/60',
    groupHeader: 'bg-orange-200/60 border-orange-300/50',
    glow: 'shadow-[0_0_20px_rgba(249,115,22,0.15)]'
  },
  teal: {
    name: 'Cool Teal',
    cardBg: '#99f6e4',
    wrapper: 'bg-teal-50/20 border-teal-200/80 hover:border-teal-400/50',
    header: 'bg-teal-50/80 border-teal-200',
    tag: 'bg-teal-100/80 border-teal-300 text-teal-800',
    port: 'bg-teal-500 hover:bg-teal-400 border-teal-100',
    text: 'text-teal-900',
    line: '#14b8a6',
    border: '#14b8a6',
    groupBg: 'bg-teal-100/40 border-teal-400/60',
    groupHeader: 'bg-teal-200/60 border-teal-300/50',
    glow: 'shadow-[0_0_20px_rgba(20,184,166,0.15)]'
  },
  rose: {
    name: 'Rose Red',
    cardBg: '#fecdd3',
    wrapper: 'bg-rose-50/20 border-rose-200/80 hover:border-rose-400/50',
    header: 'bg-rose-50/80 border-rose-200',
    tag: 'bg-rose-100/80 border-rose-300 text-rose-800',
    port: 'bg-rose-500 hover:bg-rose-400 border-rose-100',
    text: 'text-rose-900',
    line: '#f43f5e',
    border: '#f43f5e',
    groupBg: 'bg-rose-100/40 border-rose-400/60',
    groupHeader: 'bg-rose-200/60 border-rose-300/50',
    glow: 'shadow-[0_0_20px_rgba(244,63,94,0.15)]'
  },
  indigo: {
    name: 'Deep Indigo',
    cardBg: '#c7d2fe',
    wrapper: 'bg-indigo-50/20 border-indigo-200/80 hover:border-indigo-400/50',
    header: 'bg-indigo-50/80 border-indigo-200',
    tag: 'bg-indigo-100/80 border-indigo-300 text-indigo-800',
    port: 'bg-indigo-500 hover:bg-indigo-400 border-indigo-100',
    text: 'text-indigo-900',
    line: '#6366f1',
    border: '#6366f1',
    groupBg: 'bg-indigo-100/40 border-indigo-400/60',
    groupHeader: 'bg-indigo-200/60 border-indigo-300/50',
    glow: 'shadow-[0_0_20px_rgba(99,102,241,0.15)]'
  },
  slate: {
    name: 'Neutral Slate',
    cardBg: '#e2e8f0',
    wrapper: 'bg-slate-50/20 border-slate-200/80 hover:border-slate-400/50',
    header: 'bg-slate-50/80 border-slate-200',
    tag: 'bg-slate-100/80 border-slate-300 text-slate-800',
    port: 'bg-slate-500 hover:bg-slate-400 border-slate-100',
    text: 'text-slate-900',
    line: '#64748b',
    border: '#64748b',
    groupBg: 'bg-slate-100/40 border-slate-400/60',
    groupHeader: 'bg-slate-200/60 border-slate-300/50',
    glow: 'shadow-[0_0_20px_rgba(100,116,139,0.15)]'
  }
};

// --- Password Hashing Helper ---
const hashPassword = async (password) => {
  if (!password) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const defaultWorkspaces = [
  {
    id: 'ws-1', name: 'Product Launch Roadmap',
    groups: [
      { id: 'g-1', name: 'Phase 1: Discovery & Research', x: 80, y: 80, width: 440, height: 440, theme: 'orange', parentGroupId: null, workspaceId: 'ws-1' },
      { id: 'g-2', name: 'Phase 2: Product Design UI', x: 580, y: 80, width: 440, height: 440, theme: 'purple', parentGroupId: null, workspaceId: 'ws-1' }
    ],
    nodes: [
      { id: '1', x: 130, y: 150, title: 'User Interviews', content: 'Synthesize feedback from 15 target users.', theme: 'orange', groupId: 'g-1', cloneSourceId: null, workspaceId: 'ws-1' },
      { id: '2', x: 130, y: 310, title: 'Competitor Benchmark', content: 'Benchmark workflows against Top 3 competitors.', theme: 'blue', groupId: 'g-1', cloneSourceId: null, workspaceId: 'ws-1' },
      { id: '3', x: 630, y: 150, title: 'Component Library', content: 'Establish design system in Figma.', theme: 'purple', groupId: 'g-2', cloneSourceId: null, workspaceId: 'ws-1' },
      { id: '4', x: 1100, y: 200, title: 'Launch Strategy Plan', content: 'Define GTM parameters.', theme: 'blue', groupId: null, cloneSourceId: null, workspaceId: 'ws-1' }
    ],
    edges: [
      { id: 'e1', source: '1', target: '3', workspaceId: 'ws-1' },
      { id: 'e2', source: '2', target: '3', workspaceId: 'ws-1' },
      { id: 'e3', source: '3', target: '4', workspaceId: 'ws-1' }
    ],
    images: [],
    pins: []
  }
];


// --- Recursive Hierarchy Helpers ---
const isDescendantOf = (childId, parentId, groupsList) => {
  let curr = groupsList.find(g => g.id === childId);
  while (curr && curr.parentGroupId) {
    if (curr.parentGroupId === parentId) return true;
    curr = groupsList.find(g => g.id === curr.parentGroupId);
  }
  return false;
};

const getDescendants = (groupId, currentGroups, currentNodes) => {
  let descendantGroupIds = [];
  let descendantNodeIds = [];

  const recurse = (id) => {
    const childGroups = currentGroups.filter(g => g.parentGroupId === id);
    childGroups.forEach(cg => {
      descendantGroupIds.push(cg.id);
      recurse(cg.id);
    });
    const childNodes = currentNodes.filter(n => n.groupId === id);
    childNodes.forEach(cn => {
      descendantNodeIds.push(cn.id);
    });
  };

  recurse(groupId);
  return { descendantGroupIds, descendantNodeIds };
};

// --- Bottom-up Layout Auto-adjuster ---
const computeLayout = (currentGroups, currentNodes) => {
  if (!currentGroups || currentGroups.length === 0) return currentGroups;

  const getDepth = (g) => {
    let depth = 0;
    let curr = g;
    while (curr && curr.parentGroupId) {
      depth++;
      curr = currentGroups.find(p => p.id === curr.parentGroupId);
    }
    return depth;
  };

  const groupsWithDepth = currentGroups.map(g => ({
    ...g,
    depth: getDepth(g)
  }));

  groupsWithDepth.sort((a, b) => b.depth - a.depth);

  const computed = {};
  currentGroups.forEach(g => {
    computed[g.id] = { 
      x: g.x, 
      y: g.y, 
      width: g.width || 440, 
      height: g.height || 420 
    };
  });

  groupsWithDepth.forEach(group => {
    const innerNodes = currentNodes.filter(n => n.groupId === group.id);
    const innerSubgroups = currentGroups.filter(g => g.parentGroupId === group.id);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let hasChildren = false;

    innerNodes.forEach(n => {
      hasChildren = true;
      const nW = 280;
      const nH = 180;
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + nW);
      maxY = Math.max(maxY, n.y + nH);
    });


    innerSubgroups.forEach(sg => {
      hasChildren = true;
      const comp = computed[sg.id];
      minX = Math.min(minX, comp.x);
      minY = Math.min(minY, comp.y);
      maxX = Math.max(maxX, comp.x + comp.width);
      maxY = Math.max(maxY, comp.y + comp.height);
    });

    if (hasChildren) {
      const paddingX = 30;
      const paddingTop = 60;
      const paddingBottom = 40;

      const calculatedX = minX - paddingX;
      const calculatedY = minY - paddingTop;
      const calculatedW = (maxX - minX) + (paddingX * 2);
      const calculatedH = (maxY - minY) + paddingTop + paddingBottom;

      computed[group.id] = {
        x: calculatedX,
        y: calculatedY,
        width: Math.max(calculatedW, group.manualWidth || 440),
        height: Math.max(calculatedH, group.manualHeight || 420)
      };
    } else {
      computed[group.id] = {
        x: group.x,
        y: group.y,
        width: Math.max(group.width || 440, group.manualWidth || 440),
        height: Math.max(group.height || 420, group.manualHeight || 420)
      };
    }
  });

  return currentGroups.map(g => {
    const comp = computed[g.id];
    return {
      ...g,
      x: comp.x,
      y: comp.y,
      width: comp.width,
      height: comp.height
    };
  });
};


// --- Default Wellness Reminders ---
const DEFAULT_REMINDERS = [
  { id: 'r-1', title: 'Drink Water', content: 'Stay hydrated - drink a glass of water.', icon: '\u{1F4A7}', enabled: true, frequency: 60, showOnWorkspaceOpen: false, randomMode: true, activeHours: null, lastShownAt: null, nextReminderAt: null, createdAt: Date.now() },
  { id: 'r-2', title: 'Take a Deep Breath', content: 'Pause for a moment. Take a deep breath and relax.', icon: '\u{1F9D8}', enabled: true, frequency: 45, showOnWorkspaceOpen: true, randomMode: true, activeHours: null, lastShownAt: null, nextReminderAt: null, createdAt: Date.now() },
  { id: 'r-3', title: 'Stand Up & Stretch', content: 'You have been sitting for a while. Stand up and stretch your body.', icon: '\u{1F6B6}', enabled: true, frequency: 90, showOnWorkspaceOpen: false, randomMode: true, activeHours: null, lastShownAt: null, nextReminderAt: null, createdAt: Date.now() },
  { id: 'r-4', title: 'Rest Your Eyes', content: 'Look away from the screen. Focus on something distant for 20 seconds.', icon: '\u{1F441}\uFE0F', enabled: true, frequency: 30, showOnWorkspaceOpen: false, randomMode: true, activeHours: null, lastShownAt: null, nextReminderAt: null, createdAt: Date.now() },
  { id: 'r-5', title: 'Take a Short Break', content: 'Step away for 5 minutes. Your mind needs rest to stay sharp.', icon: '\u2615', enabled: true, frequency: 120, showOnWorkspaceOpen: false, randomMode: true, activeHours: null, lastShownAt: null, nextReminderAt: null, createdAt: Date.now() },
  { id: 'r-6', title: 'Review Your Goals', content: 'What are you trying to achieve right now? Refocus on your priorities.', icon: '\u{1F3AF}', enabled: false, frequency: 240, showOnWorkspaceOpen: true, randomMode: false, activeHours: null, lastShownAt: null, nextReminderAt: null, createdAt: Date.now() },
  { id: 'r-7', title: 'Walk for a Few Minutes', content: 'A short walk helps clear your mind and boost creativity.', icon: '\u{1F45F}', enabled: true, frequency: 180, showOnWorkspaceOpen: false, randomMode: true, activeHours: null, lastShownAt: null, nextReminderAt: null, createdAt: Date.now() },
  { id: 'r-8', title: 'Reset Your Mind', content: 'Feeling stuck? Take a moment to clear your thoughts before continuing.', icon: '\u{1F9E0}', enabled: true, frequency: 60, showOnWorkspaceOpen: false, randomMode: true, activeHours: null, lastShownAt: null, nextReminderAt: null, createdAt: Date.now() }
];

const MARKDOWN_ZOOM_THRESHOLD = 0.6;
const MAX_CARD_WIDTH = 600;
const MAX_CARD_HEIGHT = 800;

// Helper: stamp workspaceId on all objects in workspaces that are missing it
function migrateWorkspaceIds(workspaces) {
  return workspaces.map(ws => ({
    ...ws,
    nodes: (ws.nodes || []).map(n => n.workspaceId ? n : { ...n, workspaceId: ws.id }),
    edges: (ws.edges || []).map(e => e.workspaceId ? e : { ...e, workspaceId: ws.id }),
    groups: (ws.groups || []).map(g => g.workspaceId ? g : { ...g, workspaceId: ws.id }),
    pins: (ws.pins || []).map(p => p.workspaceId ? p : { ...p, workspaceId: ws.id }),
    images: (ws.images || []).map(img => img.workspaceId ? img : { ...img, workspaceId: ws.id })
  }));
}

export default function WorkflowApp() {
  // --- Core State ---
  const [workspaces, setWorkspaces] = useState([]);
  const [activeTab, setActiveTab] = useState('');
  const [nextId, setNextId] = useState(10);
  const [initialized, setInitialized] = useState(false);
  const [syncStatus, setSyncStatus] = useState('offline'); // 'synced', 'syncing', 'error', 'offline'
  const workspaceRef = useRef(null);

  // --- UI Layout Panels ---
  const [showSidebar, setShowSidebar] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);

  // --- Dragging & Resizing Interactions ---
  const [draggingNode, setDraggingNode] = useState(null);
  const [draggingGroup, setDraggingGroup] = useState(null);
  const [draggingImage, setDraggingImage] = useState(null);
  const [resizingGroup, setResizingGroup] = useState(null);
  const [dragHoveredGroupId, setDragHoveredGroupId] = useState(null);

  const [connecting, setConnecting] = useState(null);
  const [connectHoverNodeId, setConnectHoverNodeId] = useState(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [openColorPicker, setOpenColorPicker] = useState(null);
  const [openLinkPicker, setOpenLinkPicker] = useState(null);
  const [editingTab, setEditingTab] = useState(null);
  const [editingTextNode, setEditingTextNode] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [nodeContextMenu, setNodeContextMenu] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [focusedNodeId, setFocusedNodeId] = useState(null);
  const [focusedGroupId, setFocusedGroupId] = useState(null);
  const [groupContextMenu, setGroupContextMenu] = useState(null);

  // --- Clone Panel States ---
  const [showClonePanel, setShowClonePanel] = useState(false);
  const [selectedCloneSourceId, setSelectedCloneSourceId] = useState(null);
  const [cloneToTabMenu, setCloneToTabMenu] = useState(null);

  const fileInputRef = useRef(null);
  const fullBackupInputRef = useRef(null);
  const partialImportInputRef = useRef(null);
  const animTimerRef = useRef(null);

  // --- Stable debounced saver instances (created once, reused across re-renders) ---
  const debouncedWorkspaceSaverRef = useRef(createDebouncedSaver(300));
  const debouncedTaskSaverRef = useRef(createDebouncedSaver(500));
  const debouncedMetaSaverRef = useRef(createDebouncedSaver(200));

  // --- Refs for tracking previous values to avoid redundant saves ---
  const prevWorkspacesRef = useRef(null);
  const prevActiveProjectIdRef = useRef(null);

  // --- History (Undo/Redo) States ---
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  const stateRef = useRef({ workspaces: defaultWorkspaces, activeTab: 'ws-1', nextId: 10 });
  const dragSnapshot = useRef(null);
  const draggingNodeRef = useRef(null);

  // --- Pan & Zoom States ---
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isAnimatingTransform, setIsAnimatingTransform] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // --- Mini Map States ---
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [miniMapOpenedViaShortcut, setMiniMapOpenedViaShortcut] = useState(false);

  // --- Pin System States ---
  const [showPinPanel, setShowPinPanel] = useState(false);
  const [focusedPinId, setFocusedPinId] = useState(null);
  const [editingPinOnCanvas, setEditingPinOnCanvas] = useState(null);
  const [hoveredPinId, setHoveredPinId] = useState(null);
  const [selectedPinId, setSelectedPinId] = useState(null);
  const [draggingPin, setDraggingPin] = useState(null);
  const [pinsVisible, setPinsVisible] = useState(true);
  const lastPKeyTimeRef = useRef(0);
  const lastTKeyTimeRef = useRef(0);
  const pinDraggedRef = useRef(false);

  // --- Reminder & Wellness System States ---
  const [reminders, setReminders] = useState([]);
  const [showReminderPanel, setShowReminderPanel] = useState(false);
  const [showCardEditorPanel, setShowCardEditorPanel] = useState(false);
  const [reminderNotificationQueue, setReminderNotificationQueue] = useState([]);
  const [sessionStartTime] = useState(Date.now());
  const reminderCheckIntervalRef = useRef(null);
  const reminderNotificationTimerRef = useRef(null);
  const lastSessionNotifiedAtRef = useRef(Date.now());
  const reminderNotificationRef = useRef(null);

  // --- Timer States ---
  const [showTimer, setShowTimer] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [timerDone, setTimerDone] = useState(false);
  const [timerCustomMinutes, setTimerCustomMinutes] = useState('');
  const [timerNotification, setTimerNotification] = useState(false);
  const timerIntervalRef = useRef(null);
  const timerNotificationTimerRef = useRef(null);

  // --- Task System States ---
  const [tasks, setTasks] = useState([]);
  const [taskGroups, setTaskGroups] = useState([{ id: 'inbox', name: 'Inbox', sortOrder: 0, color: 'slate' }]);
  const [taskPanelMode, setTaskPanelMode] = useState('closed'); // 'closed' | 'panel' | 'fullscreen'
  const [isSelectingTaskLocation, setIsSelectingTaskLocation] = useState(false);
  const [selectingLocationForTaskId, setSelectingLocationForTaskId] = useState(null);

  // --- Multi-Selection States ---
  const [selectedNodeIds, setSelectedNodeIds] = useState([]);
  const [selectionBox, setSelectionBox] = useState(null);
  const [isMultiSelecting, setIsMultiSelecting] = useState(false);
  const [selectionMenuOpen, setSelectionMenuOpen] = useState(false);
  const selectionMenuRef = useRef(null);

  // --- Toast Notification ---
  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef(null);


  // --- Partial Import States ---
  const [partialImportData, setPartialImportData] = useState(null);
  const [showPartialImportDialog, setShowPartialImportDialog] = useState(false);
  const [partialImportPlacement, setPartialImportPlacement] = useState('center');


  // --- Dual Viewport Engine ---
  const [viewMode, setViewMode] = useState('canvas');
  const [mobileSheet, setMobileSheet] = useState(null);
  const [expandedOutlineCards, setExpandedOutlineCards] = useState({});

  // --- Header Notification Indicators ---
  const [isMultiTab, setIsMultiTab] = useState(false);
  const [isMultiTabSameWorkspace, setIsMultiTabSameWorkspace] = useState(false);
  const [showMultiTabTooltip, setShowMultiTabTooltip] = useState(false);
  const [showExportBreath, setShowExportBreath] = useState(false);
  const exportBreathTimerRef = useRef(null);
  const broadcastChannelRef = useRef(null);
  const tabIdRef = useRef(Date.now().toString(36) + Math.random().toString(36).slice(2));
  const otherTabsRef = useRef(new Map());

  // --- Password Protection ---
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [storedPassword, setStoredPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // --- Edit Mode ---
  const [editMode, setEditMode] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showGatePassword, setShowGatePassword] = useState(false);

  // --- Hidden Project System ---
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState('');
  const [defaultProjectId, setDefaultProjectId] = useState('');
  const [showProjectPanel, setShowProjectPanel] = useState(false);
  const [projectPanelMode, setProjectPanelMode] = useState('dashboard'); // dashboard, create, edit, switch, delete, changePassword
  const [projectNameInput, setProjectNameInput] = useState('');
  const [projectDescriptionInput, setProjectDescriptionInput] = useState('');
  const [projectThumbnailInput, setProjectThumbnailInput] = useState(null);
  const [projectPasswordInput, setProjectPasswordInput] = useState('');
  const [projectPasswordConfirm, setProjectPasswordConfirm] = useState('');
  const [projectPasswordEnabled, setProjectPasswordEnabled] = useState(false);
  const [projectDefaultToggle, setProjectDefaultToggle] = useState(false);
  const [projectError, setProjectError] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [cardMenuOpenId, setCardMenuOpenId] = useState(null);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const logoTapRef = useRef({ count: 0, lastTap: 0 });
  const saveTimerRef = useRef(null);
  const projectsRef = useRef([]);

  // --- Touch Gesture Refs (Pinch-to-Zoom) ---
  const touchRef = useRef({ isPinching: false, lastDist: 0, lastMidX: 0, lastMidY: 0 });
  const nodeTapRef = useRef(null);

  // --- Coordinate Mapping Helpers ---
  const getWorkspaceCoords = useCallback((e) => {
    if (!workspaceRef.current) return { x: 0, y: 0 };
    const rect = workspaceRef.current.getBoundingClientRect();
    return { 
      x: (e.clientX - rect.left - transform.x) / transform.scale, 
      y: (e.clientY - rect.top - transform.y) / transform.scale 
    };
  }, [transform]);

  // --- Node Dimensions Helper ---
  const getNodeDimensions = useCallback((node) => {
    const titleLen = (node.title || '').length;
    const content = node.content || '';
    const contentLen = content.length;
    const newlineCount = (content.match(/\n/g) || []).length;
    const totalLen = titleLen + contentLen;
    let width = 180 + Math.min(200, totalLen * 1.2);
    // Multi-line content needs more width to display properly
    if (newlineCount > 0) {
      width = Math.max(width, 220 + newlineCount * 20);
    }
    width = Math.max(180, Math.min(MAX_CARD_WIDTH, width));
    // Height grows with content but caps at MAX_CARD_HEIGHT
    let height = 60 + Math.min(740, contentLen * 0.3 + newlineCount * 18);
    height = Math.max(60, Math.min(MAX_CARD_HEIGHT, height));
    return { width, height };
  }, []);

  // --- Zoom Helpers ---
  const handleZoom = useCallback((delta) => {
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.2, Math.min(3, prev.scale + delta))
    }));
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setEditingPinOnCanvas(null);
    if (animTimerRef.current) { clearTimeout(animTimerRef.current); animTimerRef.current = null; }
    setIsAnimatingTransform(false);
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setTransform(prev => {
      const newScale = Math.max(0.2, Math.min(3, prev.scale + delta));
      if (!workspaceRef.current) return prev;
      const rect = workspaceRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const scaleFactor = newScale / prev.scale;
      return {
        scale: newScale,
        x: mouseX - scaleFactor * (mouseX - prev.x),
        y: mouseY - scaleFactor * (mouseY - prev.y)
      };
    });
  }, []);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    if (!workspaceRef.current) return;
    const rect = workspaceRef.current.getBoundingClientRect();
    const isClickBg = e.target === workspaceRef.current || e.target.classList.contains('canvas-grid-clickable');
    if (!isClickBg) return;
    setContextMenu({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      clientX: e.clientX,
      clientY: e.clientY
    });
    setNodeContextMenu(null);
    setGroupContextMenu(null);
  }, []);


  // --- Touch Gesture Handlers (Pinch-to-Zoom & One-Finger Pan) ---
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      setIsPanning(false);
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchRef.current = {
        isPinching: true,
        lastDist: dist,
        lastMidX: (t1.clientX + t2.clientX) / 2,
        lastMidY: (t1.clientY + t2.clientY) / 2,
      };
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && touchRef.current.isPinching) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;

      const scaleDelta = dist / Math.max(touchRef.current.lastDist, 1);

      setTransform(prev => {
        const newScale = Math.max(0.2, Math.min(3, prev.scale * scaleDelta));
        if (!workspaceRef.current) return prev;
        const rect = workspaceRef.current.getBoundingClientRect();
        const localMidX = midX - rect.left;
        const localMidY = midY - rect.top;
        const sf = newScale / prev.scale;
        return {
          scale: newScale,
          x: localMidX - sf * (localMidX - prev.x),
          y: localMidY - sf * (localMidY - prev.y),
        };
      });

      touchRef.current.lastDist = dist;
      touchRef.current.lastMidX = midX;
      touchRef.current.lastMidY = midY;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    touchRef.current = { isPinching: false, lastDist: 0, lastMidX: 0, lastMidY: 0 };
  }, []);


  // --- Initialization & Auto-Save ---
  useEffect(() => {
    const init = async () => {
      try {
        // Try loading from Firestore first (primary data source)
        let firestoreProjects = null;
        let firestoreActiveId = null;
        let firestoreDefaultId = null;
        if (isFirebaseConfigured()) {
          setSyncStatus('syncing');
          try {
            // Load from subcollection format (userMeta + project docs + workspace subcollections)
            const userMeta = await loadUserMeta();
            if (userMeta && userMeta.activeProjectId) {
              const projectMeta = await loadProjectFromFirestore(userMeta.activeProjectId);
              if (projectMeta) {
                // Load workspaces from subcollections (only for active project)
                const workspaceIds = projectMeta.workspaceIds || [];
                const loadedWorkspaces = [];
                for (const wsId of workspaceIds) {
                  const wsData = await loadWorkspaceFromFirestore(userMeta.activeProjectId, wsId);
                  if (wsData) loadedWorkspaces.push(wsData);
                }
                const tasksData = await loadTasksFromFirestore(userMeta.activeProjectId);

                // Load ALL projects from Firestore (not just the active one)
                const allProjectsMap = await loadAllProjectsFromFirestore();
                const allProjects = [];
                if (allProjectsMap && allProjectsMap.size > 0) {
                  for (const [pid, pmeta] of allProjectsMap) {
                    if (pid === userMeta.activeProjectId) {
                      // For the active project, attach full workspace/task data
                      allProjects.push({
                        ...pmeta,
                        id: pid,
                        workspaces: loadedWorkspaces.length > 0 ? loadedWorkspaces : undefined,
                        tasks: tasksData ? (tasksData.tasks || []) : [],
                        taskGroups: tasksData ? (tasksData.taskGroups || []) : []
                      });
                    } else {
                      // For non-active projects, include metadata only (no workspace data loaded)
                      allProjects.push({
                        ...pmeta,
                        id: pid,
                        workspaces: undefined,
                        tasks: [],
                        taskGroups: []
                      });
                    }
                  }
                } else {
                  // Fallback: if getDocs on projects collection failed, at least include active project
                  allProjects.push({
                    ...projectMeta,
                    id: userMeta.activeProjectId,
                    workspaces: loadedWorkspaces.length > 0 ? loadedWorkspaces : undefined,
                    tasks: tasksData ? (tasksData.tasks || []) : [],
                    taskGroups: tasksData ? (tasksData.taskGroups || []) : []
                  });
                }

                firestoreProjects = allProjects;
                firestoreActiveId = userMeta.activeProjectId;
                firestoreDefaultId = userMeta.defaultProjectId || userMeta.activeProjectId;

                // Check if local data is newer
                const localMeta = loadMeta();
                if (localMeta && localMeta.activeProjectId) {
                  const localProjMeta = loadProjectMeta(localMeta.activeProjectId);
                  if (localProjMeta && (localProjMeta.lastModified || 0) > (projectMeta.lastModified || 0)) {
                    console.info('[Firebase] Local data is newer than cloud subcollection data. Keeping local edits.');
                    firestoreProjects = null;
                    firestoreActiveId = null;
                    firestoreDefaultId = null;
                  }
                }

                if (firestoreProjects) {
                  // Hydrate localStorage with ALL project metadata from Firestore
                  for (const proj of firestoreProjects) {
                    const wsIds = (proj.workspaces || []).map(ws => ws.id);
                    // Preserve existing localStorage password hash (passwords are stored
                    // only in localStorage and intentionally stripped from Firestore)
                    const existingLocal = loadProjectMeta(proj.id);
                    const preservedPassword = existingLocal ? existingLocal.password : null;
                    saveProjectMeta(proj.id, {
                      id: proj.id, name: proj.name || 'Untitled', description: proj.description || '',
                      password: preservedPassword || null, thumbnail: proj.thumbnail || null,
                      lastModified: proj.lastModified || Date.now(), activeTab: proj.activeTab || wsIds[0] || '',
                      nextId: proj.nextId || 1, reminders: proj.reminders || [],
                      workspaceIds: proj.workspaceIds || wsIds, schemaVersion: 2
                    });
                  }
                  setSyncStatus('synced');
                }
              }
            }
            setSyncStatus('synced');
          } catch (e) {
            console.warn('[Firebase] Could not load from Firestore, falling back to localStorage:', e);
            setSyncStatus('error');
          }
        }

        // Use Firestore data if available, otherwise fall back to localStorage cm-* keys
        let loadedProjects = null;
        let loadedActiveId = null;
        let loadedDefaultId = null;

        if (firestoreProjects) {
          loadedProjects = firestoreProjects;
          loadedActiveId = firestoreActiveId;
          loadedDefaultId = firestoreDefaultId;

          // === Local-only metadata enrichment ===
          // Firestore objects intentionally lack local-only fields (e.g. password).
          // Before migration or React state, merge those fields back from localStorage.
          loadedProjects = loadedProjects.map(enrichProjectWithLocalMetadata);
        } else {
          // Load from localStorage cm-* keys
          const meta = loadMeta();
          if (meta && meta.activeProjectId) {
            const projectIds = loadAllProjectIds();
            const projectsArray = [];
            for (const pid of projectIds) {
              const projMeta = loadProjectMeta(pid);
              if (projMeta) {
                // Load workspaces for this project
                const wsIds = projMeta.workspaceIds || [];
                const workspaces = [];
                for (const wsId of wsIds) {
                  const wsData = loadWorkspaceFromLocal(pid, wsId);
                  if (wsData) workspaces.push(wsData);
                }
                // Load tasks for this project
                const tasksData = loadTasks(pid);
                projectsArray.push({
                  ...projMeta,
                  workspaces,
                  tasks: tasksData ? (tasksData.tasks || []) : [],
                  taskGroups: tasksData ? (tasksData.taskGroups || []) : []
                });
              }
            }
            if (projectsArray.length > 0) {
              loadedProjects = projectsArray;
              loadedActiveId = meta.activeProjectId;
              loadedDefaultId = meta.defaultProjectId || meta.activeProjectId;
            }
          }
        }

        if (loadedProjects && loadedProjects.length > 0) {
          const parsedProjects = loadedProjects;

          // Migrate any unhashed passwords (short strings that are not 64-char hex)
          let needsSave = false;
          const migratedProjects = await Promise.all(parsedProjects.map(async (p) => {
            if (p.password && !/^[a-f0-9]{64}$/.test(p.password)) {
              needsSave = true;
              return { ...p, password: await hashPassword(p.password) };
            }
            return p;
          }));

          // Migrate projects: add missing fields (description, thumbnail, lastModified)
          let migrationNeeded = false;
          const fullyMigrated = migratedProjects.map(p => {
            let updated = p;
            if (typeof p.description === 'undefined') {
              updated = { ...updated, description: '' };
              migrationNeeded = true;
            }
            if (typeof p.thumbnail === 'undefined') {
              updated = { ...updated, thumbnail: null };
              migrationNeeded = true;
            }
            if (typeof p.lastModified === 'undefined') {
              updated = { ...updated, lastModified: Date.now() };
              migrationNeeded = true;
            }
            return updated;
          });

          // Persist field additions to per-workspace keys if needed
          if (needsSave || migrationNeeded) {
            for (const proj of fullyMigrated) {
              const wsIds = (proj.workspaces || []).map(ws => ws.id);
              // Preserve existing localStorage password hash if the in-memory
              // project has no password (e.g. Firestore-sourced data)
              const existingMeta = loadProjectMeta(proj.id);
              const resolvedPassword = proj.password || (existingMeta ? existingMeta.password : null) || null;
              saveProjectMeta(proj.id, {
                id: proj.id, name: proj.name || 'Untitled', description: proj.description || '',
                password: resolvedPassword, thumbnail: proj.thumbnail || null,
                lastModified: proj.lastModified || Date.now(), activeTab: proj.activeTab || wsIds[0] || '',
                nextId: proj.nextId || 1, reminders: proj.reminders || [],
                workspaceIds: wsIds, schemaVersion: 2
              });
              for (const ws of (proj.workspaces || [])) {
                saveWorkspaceToLocal(proj.id, ws.id, {
                  id: ws.id, name: ws.name || 'Workspace', nodes: ws.nodes || [], edges: ws.edges || [],
                  groups: ws.groups || [], pins: ws.pins || [], images: ws.images || [], lastModified: Date.now()
                });
              }
              saveTasks(proj.id, { tasks: proj.tasks || [], taskGroups: proj.taskGroups || [] });
            }
          }

          setProjects(fullyMigrated);

          // Resolve default project ID
          let resolvedDefaultId = loadedDefaultId;
          if (!resolvedDefaultId || !fullyMigrated.find(p => p.id === resolvedDefaultId)) {
            resolvedDefaultId = fullyMigrated[0].id;
          }
          setDefaultProjectId(resolvedDefaultId);

          // Save meta
          saveMeta({ activeProjectId: resolvedDefaultId, defaultProjectId: resolvedDefaultId, schemaVersion: 2 });

          // Always load the default project on page load
          const activeId = resolvedDefaultId;
          setActiveProjectId(activeId);
          const activeProj = fullyMigrated.find(p => p.id === activeId) || fullyMigrated[0];
          
          let initialWorkspaces = activeProj.workspaces || defaultWorkspaces;
          initialWorkspaces = initialWorkspaces.map(ws => {
            const grps = ws.groups || [];
            const nds = ws.nodes || [];
            return { ...ws, groups: computeLayout(grps, nds), nodes: nds, edges: ws.edges || [] };
          });

          // Migrate: stamp workspaceId on any objects missing it
          initialWorkspaces = migrateWorkspaceIds(initialWorkspaces);
          if (import.meta.env.DEV) validateWorkspaces(initialWorkspaces, 'after init migration', activeProj.tasks || []);
          
          setWorkspaces(initialWorkspaces);
          setActiveTab(activeProj.activeTab || (initialWorkspaces.length > 0 ? initialWorkspaces[0].id : ''));
          setNextId(activeProj.nextId || 10);

          // Load reminder data
          const loadedReminders = activeProj.reminders || DEFAULT_REMINDERS;
          setReminders(loadedReminders);

          // Load task data
          const loadedTasks = activeProj.tasks || [];
          setTasks(normalizeTasks(loadedTasks));
          const loadedTaskGroups = activeProj.taskGroups || [{ id: 'inbox', name: 'Inbox', sortOrder: 0, color: 'slate' }];
          const groupsWithColor = loadedTaskGroups.map((g, i) => ({
            ...g,
            color: g.color || GROUP_COLORS[i % GROUP_COLORS.length].id,
          }));
          if (!groupsWithColor.find(g => g.id === 'inbox')) {
            groupsWithColor.unshift({ id: 'inbox', name: 'Inbox', sortOrder: 0, color: 'slate' });
          }
          setTaskGroups(groupsWithColor);
          
          // Show workspace-open reminder after a short delay
          setTimeout(() => {
            const openReminders = loadedReminders.filter(r => r.enabled && r.showOnWorkspaceOpen);
            if (openReminders.length > 0) {
              const picked = openReminders[Math.floor(Math.random() * openReminders.length)];
              setReminderNotificationQueue(q => [...q, { id: picked.id, icon: picked.icon, title: 'Welcome Back', content: picked.content }]);
            }
          }, 1500);
          
          // Default project is always password-free
          const isDefaultProject = activeProj.id === resolvedDefaultId;
          if (!isDefaultProject && activeProj.password) {
            setPasswordEnabled(true);
            setStoredPassword(activeProj.password);
          }
          // Strip password from default project in storage if present
          const defaultProjIdx = fullyMigrated.findIndex(p => p.id === resolvedDefaultId);
          if (defaultProjIdx >= 0 && fullyMigrated[defaultProjIdx].password) {
            fullyMigrated[defaultProjIdx] = { ...fullyMigrated[defaultProjIdx], password: '' };
            // Save updated project meta without password
            const projMetaUpdate = loadProjectMeta(resolvedDefaultId);
            if (projMetaUpdate) {
              saveProjectMeta(resolvedDefaultId, { ...projMetaUpdate, password: '' });
            }
          }
        } else {
          // No data found anywhere - create a default project
          const defaultProject = {
            id: 'proj-default',
            name: 'Default',
            password: '',
            description: '',
            thumbnail: null,
            lastModified: Date.now(),
            workspaces: defaultWorkspaces,
            activeTab: 'ws-1',
            nextId: 10
          };

          setProjects([defaultProject]);
          setActiveProjectId('proj-default');
          setDefaultProjectId('proj-default');
          setWorkspaces(defaultWorkspaces);
          setActiveTab('ws-1');
          setNextId(10);

          // Save to per-workspace format
          const wsIds = defaultWorkspaces.map(ws => ws.id);
          saveProjectMeta('proj-default', {
            id: 'proj-default', name: 'Default', description: '', password: '',
            thumbnail: null, lastModified: Date.now(), activeTab: 'ws-1',
            nextId: 10, reminders: [], workspaceIds: wsIds, schemaVersion: 2
          });
          for (const ws of defaultWorkspaces) {
            saveWorkspaceToLocal('proj-default', ws.id, {
              id: ws.id, name: ws.name || 'Workspace', nodes: ws.nodes || [], edges: ws.edges || [],
              groups: ws.groups || [], pins: ws.pins || [], images: ws.images || [], lastModified: Date.now()
            });
          }
          saveTasks('proj-default', { tasks: [], taskGroups: [] });
          saveMeta({ activeProjectId: 'proj-default', defaultProjectId: 'proj-default', schemaVersion: 2 });
        }
      } catch (e) {
        const defaultProject = {
          id: 'proj-default',
          name: 'Default',
          password: '',
          description: '',
          thumbnail: null,
          lastModified: Date.now(),
          workspaces: defaultWorkspaces,
          activeTab: 'ws-1',
          nextId: 10
        };
      setProjects([defaultProject]);
      setActiveProjectId('proj-default');
      setDefaultProjectId('proj-default');
      setWorkspaces(defaultWorkspaces);
      setActiveTab('ws-1');
      setNextId(10);
      saveMeta({ activeProjectId: 'proj-default', defaultProjectId: 'proj-default', schemaVersion: 2 });
      }
      setInitialized(true);
    };
    init();
  }, []);

  useEffect(() => {
    stateRef.current = { workspaces, activeTab, nextId };
  }, [workspaces, activeTab, nextId]);

  // --- Timer Countdown Effect ---
  useEffect(() => {
    if (timerRunning && !timerPaused && timerSeconds > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            setTimerRunning(false);
            setTimerDone(true);
            setTimerNotification(true);
            // Play a short beep using Web Audio API
            try {
              const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
              const oscillator = audioCtx.createOscillator();
              const gainNode = audioCtx.createGain();
              oscillator.connect(gainNode);
              gainNode.connect(audioCtx.destination);
              oscillator.frequency.value = 800;
              oscillator.type = 'sine';
              gainNode.gain.value = 0.3;
              oscillator.start();
              oscillator.stop(audioCtx.currentTime + 0.3);
              setTimeout(() => audioCtx.close(), 500);
            } catch (e) { /* Audio not available */ }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [timerRunning, timerPaused]);

  // --- Timer Notification Auto-Dismiss ---
  useEffect(() => {
    if (timerNotification) {
      timerNotificationTimerRef.current = setTimeout(() => setTimerNotification(false), 5000);
    }
    return () => { if (timerNotificationTimerRef.current) clearTimeout(timerNotificationTimerRef.current); };
  }, [timerNotification]);

  // --- Multi-Tab Detection via BroadcastChannel ---
  useEffect(() => {
    let channel = null;
    let heartbeatInterval = null;
    let cleanupInterval = null;
    const CHANNEL_NAME = 'thoughtflow-tab-presence';
    const myTabId = tabIdRef.current;

    const deriveFlags = () => {
      let sameProject = false;
      let sameWorkspace = false;
      otherTabsRef.current.forEach((info) => {
        if (info.projectId && info.projectId === activeProjectId) {
          sameProject = true;
          if (info.workspaceId && info.workspaceId === activeTab) {
            sameWorkspace = true;
          }
        }
      });
      setIsMultiTab(sameProject);
      setIsMultiTabSameWorkspace(sameWorkspace);
    };

    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      broadcastChannelRef.current = channel;

      // When we receive a message from another tab
      channel.onmessage = (event) => {
        if (!event.data || !event.data.tabId || event.data.tabId === myTabId) return;

        if (event.data.type === 'presence') {
          otherTabsRef.current.set(event.data.tabId, {
            projectId: event.data.projectId,
            workspaceId: event.data.workspaceId,
            lastSeen: Date.now()
          });
          deriveFlags();
        } else if (event.data.type === 'leave') {
          otherTabsRef.current.delete(event.data.tabId);
          deriveFlags();
        }
      };

      // Broadcast our presence immediately and on interval
      const sendPresence = () => {
        channel.postMessage({ type: 'presence', tabId: myTabId, projectId: activeProjectId, workspaceId: activeTab });
      };
      sendPresence();
      heartbeatInterval = setInterval(sendPresence, 4000);

      // Cleanup stale entries (older than 10s)
      cleanupInterval = setInterval(() => {
        const now = Date.now();
        let changed = false;
        otherTabsRef.current.forEach((info, id) => {
          if (now - info.lastSeen > 10000) {
            otherTabsRef.current.delete(id);
            changed = true;
          }
        });
        if (changed) deriveFlags();
      }, 5000);

      // Send leave on tab close (beforeunload) so sibling clears warning immediately
      const handleBeforeUnload = () => {
        channel.postMessage({ type: 'leave', tabId: myTabId });
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        if (cleanupInterval) clearInterval(cleanupInterval);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        if (channel) {
          channel.postMessage({ type: 'leave', tabId: myTabId });
          channel.close();
        }
      };
    } catch (e) {
      // BroadcastChannel not supported, fallback to localStorage
      const storageKey = 'thoughtflow-tab-presence';

      const checkOtherTabs = () => {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            // Remove stale entries and our own entry
            const now = Date.now();
            let sameProject = false;
            let sameWorkspace = false;
            Object.entries(parsed).forEach(([id, info]) => {
              if (id === myTabId) return;
              if (now - info.timestamp > 10000) return;
              if (info.projectId && info.projectId === activeProjectId) {
                sameProject = true;
                if (info.workspaceId && info.workspaceId === activeTab) {
                  sameWorkspace = true;
                }
              }
            });
            setIsMultiTab(sameProject);
            setIsMultiTabSameWorkspace(sameWorkspace);
          } catch {
            setIsMultiTab(false);
            setIsMultiTabSameWorkspace(false);
          }
        }
      };

      const writePresence = () => {
        const stored = localStorage.getItem(storageKey);
        let data = {};
        if (stored) {
          try { data = JSON.parse(stored); } catch { data = {}; }
        }
        // Clean stale entries
        const now = Date.now();
        Object.keys(data).forEach((id) => {
          if (now - data[id].timestamp > 10000) delete data[id];
        });
        data[myTabId] = { projectId: activeProjectId, workspaceId: activeTab, timestamp: now };
        localStorage.setItem(storageKey, JSON.stringify(data));
      };

      writePresence();
      checkOtherTabs();
      heartbeatInterval = setInterval(() => {
        writePresence();
        checkOtherTabs();
      }, 4000);

      const handleStorage = (e) => {
        if (e.key === storageKey) checkOtherTabs();
      };
      window.addEventListener('storage', handleStorage);

      const handleBeforeUnload = () => {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          try {
            const data = JSON.parse(stored);
            delete data[myTabId];
            localStorage.setItem(storageKey, JSON.stringify(data));
          } catch {}
        }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        clearInterval(heartbeatInterval);
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        handleBeforeUnload();
      };
    }
  }, [activeProjectId, activeTab]);

  // Close multi-tab tooltip when the warning clears
  useEffect(() => {
    if (!isMultiTab && !isMultiTabSameWorkspace) setShowMultiTabTooltip(false);
  }, [isMultiTab, isMultiTabSameWorkspace]);

  // --- Export Reminder Breathing Animation (every 5 minutes) ---
  const exportBreathTimeoutRef = useRef(null);
  useEffect(() => {
    exportBreathTimerRef.current = setInterval(() => {
      setShowExportBreath(true);
      // Remove animation class after animation completes (3.5s)
      exportBreathTimeoutRef.current = setTimeout(() => setShowExportBreath(false), 3500);
    }, 300000); // 5 minutes = 300000ms

    return () => {
      if (exportBreathTimerRef.current) clearInterval(exportBreathTimerRef.current);
      if (exportBreathTimeoutRef.current) clearTimeout(exportBreathTimeoutRef.current);
    };
  }, []);

  // Keep projectsRef in sync with projects state for debounced localStorage writes
  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  // --- Three independent debounced autosave useEffects ---
  // (a) Workspace autosave (300ms): watches [workspaces, activeTab]
  // NOTE (stale closure risk): The cleanup cancels the debounced callback when activeProjectId
  // changes, and the eager meta commit below only fires when activeProjectId actually changes
  // (guarded by prevActiveProjectIdRef). switchProject/cycleToProject explicitly persist the old
  // project before switching, so the stale closure race is mitigated. Any new code path that
  // changes activeProjectId must also pre-persist the old project to avoid data loss.
  useEffect(() => {
    if (!initialized || !activeProjectId) return;
    debouncedWorkspaceSaverRef.current(() => {
      const currentWorkspaces = workspaces;
      const prevWorkspaces = prevWorkspacesRef.current;
      const projMeta = loadProjectMeta(activeProjectId);
      // Save only workspaces whose reference changed (or all if no previous state)
      let anyChanged = false;
      for (const ws of currentWorkspaces) {
        const prevWs = prevWorkspaces ? prevWorkspaces.find(pw => pw.id === ws.id) : null;
        if (prevWs === ws && prevWorkspaces) continue; // reference unchanged, skip
        anyChanged = true;
        const wsData = {
          id: ws.id,
          name: ws.name || 'Workspace',
          nodes: ws.nodes || [],
          edges: ws.edges || [],
          groups: ws.groups || [],
          pins: ws.pins || [],
          images: ws.images || [],
          lastModified: Date.now()
        };
        saveWorkspaceToLocal(activeProjectId, ws.id, wsData);
        // Fire-and-forget Firestore save
        if (isFirebaseConfigured()) {
          saveWorkspaceToFirestore(activeProjectId, ws.id, wsData).catch(() => {});
        }
      }
      // Update project metadata with activeTab and workspaceIds
      if (projMeta && anyChanged) {
        const updatedMeta = { ...projMeta, activeTab, workspaceIds: currentWorkspaces.map(ws => ws.id), lastModified: Date.now() };
        saveProjectMeta(activeProjectId, updatedMeta);
        if (isFirebaseConfigured()) {
          saveProjectToFirestore(activeProjectId, updatedMeta)
            .then((success) => setSyncStatus(success ? 'synced' : 'error'))
            .catch(() => setSyncStatus('error'));
        }
      }
      // Update in-memory projects
      if (anyChanged) {
        setProjects(prev => prev.map(p => p.id === activeProjectId
          ? { ...p, workspaces: currentWorkspaces, activeTab, lastModified: Date.now() }
          : p
        ));
      }
      // Persist meta/userMeta inside the debounced closure to avoid per-keystroke Firestore writes
      const meta = loadMeta();
      if (meta) {
        saveMeta({ ...meta, activeProjectId });
      }
      if (isFirebaseConfigured()) {
        setSyncStatus('syncing');
        saveUserMeta({ activeProjectId, defaultProjectId }).catch(() => {});
      }
      // Update previous workspaces ref after successful save
      prevWorkspacesRef.current = currentWorkspaces;
      if (!isFirebaseConfigured()) setSyncStatus('synced');
    });
    // Track activeProjectId changes - reset workspace tracking on project switch
    if (prevActiveProjectIdRef.current !== activeProjectId) {
      prevWorkspacesRef.current = null; // force full save on project switch
      prevActiveProjectIdRef.current = activeProjectId;
    }
    return () => debouncedWorkspaceSaverRef.current.cancel();
  }, [workspaces, activeTab, initialized, activeProjectId]);

  // (b) Task autosave (500ms): watches [tasks, taskGroups]
  useEffect(() => {
    if (!initialized || !activeProjectId) return;
    debouncedTaskSaverRef.current(() => {
      const tasksData = { tasks, taskGroups };
      saveTasks(activeProjectId, tasksData);
      // Update lastModified on project metadata
      const projMeta = loadProjectMeta(activeProjectId);
      if (projMeta) {
        const updatedMeta = { ...projMeta, lastModified: Date.now() };
        saveProjectMeta(activeProjectId, updatedMeta);
        if (isFirebaseConfigured()) {
          saveProjectToFirestore(activeProjectId, updatedMeta).catch(() => {});
        }
      }
      // Fire-and-forget Firestore save
      if (isFirebaseConfigured()) {
        setSyncStatus('syncing');
        saveTasksToFirestore(activeProjectId, tasksData)
          .then((success) => setSyncStatus(success ? 'synced' : 'error'))
          .catch(() => setSyncStatus('error'));
      }
      // Update in-memory projects
      setProjects(prev => prev.map(p => p.id === activeProjectId
        ? { ...p, tasks, taskGroups, lastModified: Date.now() }
        : p
      ));
    });
    return () => debouncedTaskSaverRef.current.cancel();
  }, [tasks, taskGroups, initialized, activeProjectId]);

  // (c) Metadata autosave (200ms): watches [nextId, reminders]
  useEffect(() => {
    if (!initialized || !activeProjectId) return;
    debouncedMetaSaverRef.current(() => {
      const projMeta = loadProjectMeta(activeProjectId);
      if (projMeta) {
        const updatedMeta = { ...projMeta, nextId, reminders, lastModified: Date.now() };
        saveProjectMeta(activeProjectId, updatedMeta);
        if (isFirebaseConfigured()) {
          setSyncStatus('syncing');
          saveProjectToFirestore(activeProjectId, updatedMeta)
            .then((success) => setSyncStatus(success ? 'synced' : 'error'))
            .catch(() => setSyncStatus('error'));
        }
      }
      // Update in-memory projects
      setProjects(prev => prev.map(p => p.id === activeProjectId
        ? { ...p, nextId, reminders, lastModified: Date.now() }
        : p
      ));
    });
    return () => debouncedMetaSaverRef.current.cancel();
  }, [nextId, reminders, initialized, activeProjectId]);

  // Password save effect
  useEffect(() => {
    if (!initialized || !activeProjectId) return;
    setProjects(prev => prev.map(p => p.id === activeProjectId
      ? { ...p, password: storedPassword }
      : p
    ));
    const projMeta = loadProjectMeta(activeProjectId);
    if (projMeta) {
      const updatedMeta = { ...projMeta, password: storedPassword };
      saveProjectMeta(activeProjectId, updatedMeta);
      if (isFirebaseConfigured()) {
        saveProjectToFirestore(activeProjectId, updatedMeta).catch(() => {});
      }
    }
  }, [storedPassword, initialized, activeProjectId]);

  useEffect(() => {
    setFocusedNodeId(null);
  }, [activeTab]);

  // --- Secret Keyboard Shortcuts (Alt+Shift+X toggle, Ctrl+Shift+/ boss key, Escape dismiss) ---
  useEffect(() => {
    const handleSecretKey = (e) => {
      if (e.altKey && e.shiftKey && e.key === 'X') {
        e.preventDefault();
        setShowProjectPanel(prev => {
          if (prev) return false;
          setProjectPanelMode('dashboard');
          setProjectError('');
          setProjectNameInput('');
          setProjectPasswordInput('');
          setProjectPasswordConfirm('');
          setSelectedProjectId(null);
          setCardMenuOpenId(null);
          return true;
        });
      }
      // Ctrl+Shift+? (Ctrl+Shift+/) - boss key: instantly switch to default project
      if (e.ctrlKey && e.shiftKey && (e.key === '?' || e.key === '/')) {
        e.preventDefault();
        const currentProjects = projectsRef.current;
        if (currentProjects.length > 0 && defaultProjectId) {
          // Only switch if not already on the default project
          if (activeProjectId !== defaultProjectId) {
            cycleToProject(defaultProjectId);
          }
        }
      }
      if (e.key === 'Escape' && showProjectPanel) {
        setShowProjectPanel(false);
      }
    };
    window.addEventListener('keydown', handleSecretKey);
    return () => window.removeEventListener('keydown', handleSecretKey);
  }, [showProjectPanel, activeProjectId, defaultProjectId]);

  // --- Auto-hide sidebar on small screens ---
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setShowSidebar(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  // --- History Actions ---
  const updateHistory = useCallback((past, future) => {
    pastRef.current = past;
    futureRef.current = future;
    setCanUndo(past.length > 0);
    setCanRedo(future.length > 0);
  }, []);

  const takeSnapshot = useCallback(() => {
    const newPast = [...pastRef.current, JSON.parse(JSON.stringify(stateRef.current))];
    updateHistory(newPast, []);
  }, [updateHistory]);

  const performUndo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    const newPast = [...pastRef.current];
    const prev = newPast.pop();
    
    const newFuture = [JSON.parse(JSON.stringify(stateRef.current)), ...futureRef.current];
    
    updateHistory(newPast, newFuture);
    
    setWorkspaces(prev.workspaces);
    setActiveTab(prev.activeTab);
    setNextId(prev.nextId);
  }, [updateHistory]);

  const performRedo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const newFuture = [...futureRef.current];
    const next = newFuture.shift();
    
    const newPast = [...pastRef.current, JSON.parse(JSON.stringify(stateRef.current))];
    
    updateHistory(newPast, newFuture);
    
    setWorkspaces(next.workspaces);
    setActiveTab(next.activeTab);
    setNextId(next.nextId);
  }, [updateHistory]);

  const activeWs = workspaces.find(w => w.id === activeTab) || workspaces[0];
  const nodes = activeWs?.nodes || [];
  const edges = activeWs?.edges || [];
  const groups = activeWs?.groups || [];

  const cardEditorNode = (selectedNodeIds.length === 1) ? nodes.find(n => n.id === selectedNodeIds[0]) : null;

  const updateActiveWorkspace = useCallback((updater) => {
    setWorkspaces(prev => prev.map(ws => ws.id === activeTab ? { ...ws, ...updater(ws) } : ws));
  }, [activeTab]);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(''), 2000);
  }, []);

  // --- Copy/Cut/Paste Node Functions ---
  const copyNode = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const clipData = {
      node: { ...node, id: undefined },
      action: 'copy',
      sourceWorkspaceId: activeTab,
      sourceNodeId: nodeId,
      timestamp: Date.now()
    };
    localStorage.setItem('nexus-clipboard', JSON.stringify(clipData));
    localStorage.removeItem('nexus-clipboard-group');
  }, [nodes, activeTab]);

  const cutNode = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const clipData = {
      node: { ...node, id: undefined },
      action: 'cut',
      sourceWorkspaceId: activeTab,
      sourceNodeId: nodeId,
      timestamp: Date.now()
    };
    localStorage.setItem('nexus-clipboard', JSON.stringify(clipData));
    localStorage.removeItem('nexus-clipboard-group');
  }, [nodes, activeTab]);

  const pasteNode = useCallback((targetX, targetY) => {
    const clipJson = localStorage.getItem('nexus-clipboard');
    if (!clipJson) return;
    try {
      const clipData = JSON.parse(clipJson);
      if (!clipData.node) return;

      takeSnapshot();

      let pasteX = targetX;
      let pasteY = targetY;
      if (pasteX === undefined || pasteY === undefined) {
        if (workspaceRef.current) {
          const rect = workspaceRef.current.getBoundingClientRect();
          pasteX = (rect.width / 2 - transform.x) / transform.scale - 170;
          pasteY = (rect.height / 2 - transform.y) / transform.scale - 80;
        } else {
          pasteX = 200;
          pasteY = 200;
        }
      }

      const newNode = {
        ...clipData.node,
        id: nextId.toString(),
        x: pasteX,
        y: pasteY,
        groupId: null,
        cloneSourceId: null,
        workspaceId: activeTab
      };

      if (clipData.action === 'cut') {
        // Atomic: paste + remove source in one setWorkspaces call
        setWorkspaces(prev => prev.map(ws => {
          if (ws.id === activeTab) {
            // Add pasted node to active workspace
            const updatedNodes = [...ws.nodes, newNode];
            let resultWs = {
              ...ws,
              nodes: updatedNodes,
              groups: computeLayout(ws.groups, updatedNodes)
            };
            // If source is ALSO active workspace, remove source from same update
            if (clipData.sourceWorkspaceId === activeTab) {
              const filteredNodes = resultWs.nodes.filter(n => n.id !== clipData.sourceNodeId);
              resultWs = {
                ...resultWs,
                nodes: filteredNodes,
                edges: resultWs.edges.filter(e => e.source !== clipData.sourceNodeId && e.target !== clipData.sourceNodeId),
                groups: computeLayout(resultWs.groups, filteredNodes)
              };
            }
            return resultWs;
          } else if (ws.id === clipData.sourceWorkspaceId) {
            // Remove source from different workspace
            const filteredNodes = ws.nodes.filter(n => n.id !== clipData.sourceNodeId);
            return {
              ...ws,
              nodes: filteredNodes,
              edges: ws.edges.filter(e => e.source !== clipData.sourceNodeId && e.target !== clipData.sourceNodeId),
              groups: computeLayout(ws.groups, filteredNodes)
            };
          }
          return ws;
        }));
      } else {
        // Copy: just add to active workspace
        updateActiveWorkspace(ws => {
          const updatedNodes = [...ws.nodes, newNode];
          return {
            nodes: updatedNodes,
            groups: computeLayout(ws.groups, updatedNodes)
          };
        });
      }

      setNextId(prev => prev + 1);
      localStorage.removeItem('nexus-clipboard');
    } catch (e) {
      // Invalid clipboard data, ignore
    }
  }, [takeSnapshot, nextId, transform, updateActiveWorkspace, setWorkspaces, activeTab]);

  // --- Copy/Cut/Paste Group Functions ---
  const copyGroup = useCallback((groupId) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const { descendantGroupIds, descendantNodeIds } = getDescendants(groupId, groups, nodes);
    const allGroupIds = [groupId, ...descendantGroupIds];
    const allNodeIds = [...new Set([...descendantNodeIds, ...nodes.filter(n => n.groupId === groupId).map(n => n.id)])];
    
    const groupData = groups.filter(g => allGroupIds.includes(g.id));
    const nodeData = nodes.filter(n => allNodeIds.includes(n.id));
    const nodeIdSet = new Set(allNodeIds);
    const edgeData = edges.filter(e => nodeIdSet.has(e.source) && nodeIdSet.has(e.target));

    // Store positions relative to the root group's top-left
    const originX = group.x;
    const originY = group.y;

    const clipData = {
      groups: groupData.map(g => ({ ...g, x: g.x - originX, y: g.y - originY })),
      nodes: nodeData.map(n => ({ ...n, x: n.x - originX, y: n.y - originY })),
      edges: edgeData,
      action: 'copy',
      sourceWorkspaceId: activeTab,
      sourceGroupId: groupId,
      timestamp: Date.now()
    };
    localStorage.setItem('nexus-clipboard-group', JSON.stringify(clipData));
    localStorage.removeItem('nexus-clipboard');
  }, [groups, nodes, edges, activeTab]);

  const cutGroup = useCallback((groupId) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const { descendantGroupIds, descendantNodeIds } = getDescendants(groupId, groups, nodes);
    const allGroupIds = [groupId, ...descendantGroupIds];
    const allNodeIds = [...new Set([...descendantNodeIds, ...nodes.filter(n => n.groupId === groupId).map(n => n.id)])];
    
    const groupData = groups.filter(g => allGroupIds.includes(g.id));
    const nodeData = nodes.filter(n => allNodeIds.includes(n.id));
    const nodeIdSet = new Set(allNodeIds);
    const edgeData = edges.filter(e => nodeIdSet.has(e.source) && nodeIdSet.has(e.target));

    const originX = group.x;
    const originY = group.y;

    const clipData = {
      groups: groupData.map(g => ({ ...g, x: g.x - originX, y: g.y - originY })),
      nodes: nodeData.map(n => ({ ...n, x: n.x - originX, y: n.y - originY })),
      edges: edgeData,
      action: 'cut',
      sourceWorkspaceId: activeTab,
      sourceGroupId: groupId,
      sourceGroupIds: allGroupIds,
      sourceNodeIds: allNodeIds,
      timestamp: Date.now()
    };
    localStorage.setItem('nexus-clipboard-group', JSON.stringify(clipData));
    localStorage.removeItem('nexus-clipboard');
  }, [groups, nodes, edges, activeTab]);

  const pasteGroup = useCallback((targetX, targetY) => {
    const clipJson = localStorage.getItem('nexus-clipboard-group');
    if (!clipJson) return;
    try {
      const clipData = JSON.parse(clipJson);
      if (!clipData.groups || clipData.groups.length === 0) return;

      takeSnapshot();

      let pasteX = targetX;
      let pasteY = targetY;
      if (pasteX === undefined || pasteY === undefined) {
        if (workspaceRef.current) {
          const rect = workspaceRef.current.getBoundingClientRect();
          pasteX = (rect.width / 2 - transform.x) / transform.scale - 200;
          pasteY = (rect.height / 2 - transform.y) / transform.scale - 150;
        } else {
          pasteX = 200;
          pasteY = 200;
        }
      }

      // Generate new IDs for all groups, nodes, and edges
      let idCounter = nextId;
      const groupIdMap = {};
      const nodeIdMap = {};

      clipData.groups.forEach(g => {
        groupIdMap[g.id] = `g-${Date.now()}-${idCounter}`;
        idCounter++;
      });
      clipData.nodes.forEach(n => {
        nodeIdMap[n.id] = idCounter.toString();
        idCounter++;
      });

      const newGroups = clipData.groups.map(g => ({
        ...g,
        id: groupIdMap[g.id],
        x: g.x + pasteX,
        y: g.y + pasteY,
        parentGroupId: g.parentGroupId ? groupIdMap[g.parentGroupId] || null : null,
        workspaceId: activeTab
      }));

      const newNodes = clipData.nodes.map(n => ({
        ...n,
        id: nodeIdMap[n.id],
        x: n.x + pasteX,
        y: n.y + pasteY,
        groupId: n.groupId ? groupIdMap[n.groupId] || null : null,
        workspaceId: activeTab
      }));

      const newEdges = clipData.edges.map(e => ({
        ...e,
        id: `e-${Date.now()}-${idCounter++}`,
        source: nodeIdMap[e.source] || e.source,
        target: nodeIdMap[e.target] || e.target,
        workspaceId: activeTab
      }));

      if (clipData.action === 'cut') {
        setWorkspaces(prev => prev.map(ws => {
          if (ws.id === activeTab) {
            let updatedNodes = [...ws.nodes, ...newNodes];
            let updatedGroups = [...ws.groups, ...newGroups];
            let updatedEdges = [...ws.edges, ...newEdges];
            // If source is also active workspace, remove originals
            if (clipData.sourceWorkspaceId === activeTab) {
              updatedNodes = updatedNodes.filter(n => !clipData.sourceNodeIds.includes(n.id));
              updatedGroups = updatedGroups.filter(g => !clipData.sourceGroupIds.includes(g.id));
              const sourceNodeSet = new Set(clipData.sourceNodeIds);
              updatedEdges = updatedEdges.filter(e => !sourceNodeSet.has(e.source) && !sourceNodeSet.has(e.target));
            }
            return {
              ...ws,
              nodes: updatedNodes,
              edges: updatedEdges,
              groups: computeLayout(updatedGroups, updatedNodes)
            };
          } else if (ws.id === clipData.sourceWorkspaceId) {
            const updatedNodes = ws.nodes.filter(n => !clipData.sourceNodeIds.includes(n.id));
            const sourceNodeSet = new Set(clipData.sourceNodeIds);
            return {
              ...ws,
              nodes: updatedNodes,
              edges: ws.edges.filter(e => !sourceNodeSet.has(e.source) && !sourceNodeSet.has(e.target)),
              groups: computeLayout(ws.groups.filter(g => !clipData.sourceGroupIds.includes(g.id)), updatedNodes)
            };
          }
          return ws;
        }));
      } else {
        updateActiveWorkspace(ws => {
          const updatedNodes = [...ws.nodes, ...newNodes];
          const updatedGroups = [...ws.groups, ...newGroups];
          const updatedEdges = [...ws.edges, ...newEdges];
          return {
            nodes: updatedNodes,
            edges: updatedEdges,
            groups: computeLayout(updatedGroups, updatedNodes)
          };
        });
      }

      setNextId(idCounter);
      localStorage.removeItem('nexus-clipboard-group');
    } catch (e) {
      // Invalid clipboard data, ignore
    }
  }, [takeSnapshot, nextId, transform, updateActiveWorkspace, setWorkspaces, activeTab]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) performRedo();
        else performUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        performRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (focusedGroupId) {
          e.preventDefault();
          copyGroup(focusedGroupId);
        } else if (focusedNodeId) {
          e.preventDefault();
          copyNode(focusedNodeId);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        if (focusedGroupId) {
          e.preventDefault();
          cutGroup(focusedGroupId);
        } else if (focusedNodeId) {
          e.preventDefault();
          cutNode(focusedNodeId);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        // Prefer group clipboard if it exists
        if (localStorage.getItem('nexus-clipboard-group')) {
          pasteGroup();
        } else {
          pasteNode();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [performUndo, performRedo, copyNode, cutNode, pasteNode, copyGroup, cutGroup, pasteGroup, focusedNodeId, focusedGroupId]);

  // --- Escape key clears multi-selection ---
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape' && selectedNodeIds.length > 0) {
        setSelectedNodeIds([]);
      }
    };
    window.addEventListener('keydown', handleEscapeKey);
    return () => window.removeEventListener('keydown', handleEscapeKey);
  }, [selectedNodeIds]);

  // --- Close selection menu when selection is cleared ---
  useEffect(() => {
    if (selectedNodeIds.length === 0) {
      setSelectionMenuOpen(false);
    }
  }, [selectedNodeIds]);

  // --- Click-outside handler for selection menu ---
  useEffect(() => {
    if (!selectionMenuOpen) return;
    const handleClickOutside = (e) => {
      if (selectionMenuRef.current && !selectionMenuRef.current.contains(e.target)) {
        setSelectionMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectionMenuOpen]);

  // --- W key toggles mini map ---
  useEffect(() => {
    const handleMiniMapKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        setShowMiniMap(prev => {
          const next = !prev;
          setMiniMapOpenedViaShortcut(next);
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleMiniMapKey);
    return () => window.removeEventListener('keydown', handleMiniMapKey);
  }, []);

  // --- F key focuses (centers + resets zoom) the selected card ---
  useEffect(() => {
    const handleFocusKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (selectedNodeIds.length === 0) {
          showToast('No card selected.');
          return;
        }
        if (selectedNodeIds.length > 1) {
          showToast('Select a single card to focus.');
          return;
        }
        const node = nodes.find(n => n.id === selectedNodeIds[0]);
        if (!node) return;
        if (!workspaceRef.current) return;
        const { width, height } = getNodeDimensions(node);
        const cardCenterX = node.x + width / 2;
        const cardCenterY = node.y + height / 2;
        const rect = workspaceRef.current.getBoundingClientRect();
        const newTransform = {
          x: rect.width / 2 - cardCenterX,
          y: rect.height / 2 - cardCenterY,
          scale: 1.0
        };
        if (animTimerRef.current) clearTimeout(animTimerRef.current);
        setIsAnimatingTransform(true);
        setTransform(newTransform);
        animTimerRef.current = setTimeout(() => {
          setIsAnimatingTransform(false);
          animTimerRef.current = null;
        }, 300);
      }
    };
    window.addEventListener('keydown', handleFocusKey);
    return () => {
      window.removeEventListener('keydown', handleFocusKey);
      if (animTimerRef.current) { clearTimeout(animTimerRef.current); animTimerRef.current = null; }
    };
  }, [selectedNodeIds, nodes, showToast, getNodeDimensions]);

  // --- P key toggles pin visibility, PP (double-press) toggles pin panel, Shift+P drops pin at viewport center ---
  useEffect(() => {
    const handlePinKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'P' && e.shiftKey) {
        e.preventDefault();
        if (!workspaceRef.current) return;
        const rect = workspaceRef.current.getBoundingClientRect();
        const canvasX = (rect.width / 2 - transform.x) / transform.scale;
        const canvasY = (rect.height / 2 - transform.y) / transform.scale;
        addPinRef.current(canvasX, canvasY);
        return;
      }
      if ((e.key === 'p' || e.key === 'P') && !e.shiftKey) {
        e.preventDefault();
        const now = Date.now();
        const timeSinceLast = now - lastPKeyTimeRef.current;
        lastPKeyTimeRef.current = now;
        if (timeSinceLast < 300) {
          // Double-press P: toggle pin panel
          setShowPinPanel(prev => !prev);
        } else {
          // Single press P: toggle pin visibility (delayed to allow double-press detection)
          setTimeout(() => {
            if (Date.now() - lastPKeyTimeRef.current >= 280) {
              setPinsVisible(prev => !prev);
            }
          }, 300);
        }
      }
    };
    window.addEventListener('keydown', handlePinKey);
    return () => window.removeEventListener('keydown', handlePinKey);
  }, [transform]);

  // --- R key toggles reminder panel ---
  useEffect(() => {
    const handleReminderKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setShowReminderPanel(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleReminderKey);
    return () => window.removeEventListener('keydown', handleReminderKey);
  }, []);

  // --- E key toggles card editor panel ---
  useEffect(() => {
    const handleCardEditorKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        setShowCardEditorPanel(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleCardEditorKey);
    return () => window.removeEventListener('keydown', handleCardEditorKey);
  }, []);

  // --- C key toggles clone panel ---
  useEffect(() => {
    const handleClonePanelKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setShowClonePanel(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleClonePanelKey);
    return () => window.removeEventListener('keydown', handleClonePanelKey);
  }, []);

  // --- T key toggles task panel (single press), TT (double-press) toggles fullscreen ---
  useEffect(() => {
    const handleTaskKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        const now = Date.now();
        const timeSinceLast = now - lastTKeyTimeRef.current;
        lastTKeyTimeRef.current = now;
        if (timeSinceLast < 300) {
          // Double-press T: toggle fullscreen mode
          setTaskPanelMode(prev => prev === 'fullscreen' ? 'panel' : 'fullscreen');
        } else {
          // Single press T: toggle side panel (delayed to allow double-press detection)
          setTimeout(() => {
            if (Date.now() - lastTKeyTimeRef.current >= 280) {
              setTaskPanelMode(prev => prev === 'closed' ? 'panel' : 'closed');
            }
          }, 300);
        }
      }
    };
    window.addEventListener('keydown', handleTaskKey);
    return () => window.removeEventListener('keydown', handleTaskKey);
  }, []);

  // --- A key toggles alarm/timer panel ---
  useEffect(() => {
    const handleTimerKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setShowTimer(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleTimerKey);
    return () => window.removeEventListener('keydown', handleTimerKey);
  }, []);

  // --- M key toggles edit mode ---
  useEffect(() => {
    const handleEditModeKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setEditMode(prev => {
          if (prev) setEditingTextNode(null);
          return !prev;
        });
      }
    };
    window.addEventListener('keydown', handleEditModeKey);
    return () => window.removeEventListener('keydown', handleEditModeKey);
  }, []);

  // --- Reminder Scheduling Engine ---
  useEffect(() => {
    if (!initialized) return;

    // Initialize nextReminderAt for reminders that don't have it
    setReminders(prev => prev.map(r => {
      if (r.enabled && !r.nextReminderAt) {
        return { ...r, nextReminderAt: Date.now() + r.frequency * 60000 };
      }
      return r;
    }));

    reminderCheckIntervalRef.current = setInterval(() => {
      const now = Date.now();

      // Skip if a notification is already being displayed
      if (reminderNotificationRef.current) return;

      let firedThisTick = false;

      setReminders(prev => {
        const firedReminders = [];
        const updated = prev.map(r => {
          if (!r.enabled) return r;
          if (!r.nextReminderAt) return r;

          // Check active hours
          if (r.activeHours) {
            const currentTime = new Date();
            const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
            const [startH, startM] = r.activeHours.start.split(':').map(Number);
            const [endH, endM] = r.activeHours.end.split(':').map(Number);
            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;
            if (startMinutes > endMinutes) {
              // Overnight range (e.g., 22:00-06:00): block only if between end and start
              if (currentMinutes < startMinutes && currentMinutes > endMinutes) return r;
            } else {
              if (currentMinutes < startMinutes || currentMinutes > endMinutes) return r;
            }
          }

          if (now >= r.nextReminderAt) {
            firedReminders.push(r);
            return { ...r, lastShownAt: now, nextReminderAt: now + r.frequency * 60000 };
          }
          return r;
        });

        if (firedReminders.length > 0) {
          firedThisTick = true;
          setTimeout(() => {
            const notifications = firedReminders.map(r => ({ id: r.id, icon: r.icon, title: r.title, content: r.content }));
            setReminderNotificationQueue(q => [...q, ...notifications]);
          }, 0);
        }

        return firedReminders.length > 0 ? updated : prev;
      });

      // Long session detection (every 60 minutes) - skip if already fired a reminder this tick
      if (!firedThisTick && now - lastSessionNotifiedAtRef.current >= 3600000) {
        lastSessionNotifiedAtRef.current = now;
        const sessionMinutes = Math.floor((now - sessionStartTime) / 60000);
        setTimeout(() => {
          setReminderNotificationQueue(q => [...q, {
            id: 'session-' + sessionMinutes,
            icon: '\u23F0',
            title: 'Long Session Detected',
            content: `You have been working for ${sessionMinutes} minutes. Consider taking a short break.`
          }]);
        }, 0);
      }
    }, 60000);

    return () => { if (reminderCheckIntervalRef.current) clearInterval(reminderCheckIntervalRef.current); };
  }, [initialized, sessionStartTime]);

  // --- Reminder Notification Queue Consumer & Auto-Dismiss ---
  const activeReminderNotification = reminderNotificationQueue.length > 0 ? reminderNotificationQueue[0] : null;

  const dismissReminderNotification = useCallback(() => {
    setReminderNotificationQueue(q => q.slice(1));
  }, []);

  useEffect(() => {
    reminderNotificationRef.current = activeReminderNotification;
    if (activeReminderNotification) {
      if (reminderNotificationTimerRef.current) clearTimeout(reminderNotificationTimerRef.current);
      reminderNotificationTimerRef.current = setTimeout(() => {
        dismissReminderNotification();
      }, 8000);
    }
    return () => { if (reminderNotificationTimerRef.current) clearTimeout(reminderNotificationTimerRef.current); };
  }, [activeReminderNotification, dismissReminderNotification]);

  // --- S key toggles sidebar ---
  useEffect(() => {
    const handleSidebarKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (e.key === 's') {
        e.preventDefault();
        setShowSidebar(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleSidebarKey);
    return () => window.removeEventListener('keydown', handleSidebarKey);
  }, []);

  // --- N key creates new card ---
  useEffect(() => {
    const handleNewCardKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        addNodeRef.current();
      }
    };
    window.addEventListener('keydown', handleNewCardKey);
    return () => window.removeEventListener('keydown', handleNewCardKey);
  }, []);

  // --- L key links (connects) two selected objects ---
  useEffect(() => {
    const handleConnectKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (e.key === 'l' || e.key === 'L') {
        if (selectedNodeIds.length < 2) return;
        e.preventDefault();
        if (selectedNodeIds.length === 2) {
          const [sourceId, targetId] = selectedNodeIds;
          const currentEdges = stateRef.current.workspaces.find(w => w.id === stateRef.current.activeTab)?.edges || [];
          const exists = currentEdges.some(edge => (edge.source === sourceId && edge.target === targetId) || (edge.source === targetId && edge.target === sourceId));
          if (!exists) {
            takeSnapshot();
            updateActiveWorkspace(ws => ({ edges: [...ws.edges, { id: `e-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, source: sourceId, target: targetId, workspaceId: activeTab }] }));
            showToast('Connected');
          } else {
            showToast('Already connected');
          }
          setSelectedNodeIds([]);
        } else {
          showToast('Select only 2 objects');
        }
      }
    };
    window.addEventListener('keydown', handleConnectKey);
    return () => window.removeEventListener('keydown', handleConnectKey);
  }, [selectedNodeIds, takeSnapshot, updateActiveWorkspace, showToast]);

  // --- Arrow key movement for selected nodes ---
  useEffect(() => {
    const handleArrowKeys = (e) => {
      if (selectedNodeIds.length === 0) return;
      // Don't capture if user is typing in an input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      const STEP = 20;
      let dx = 0, dy = 0;
      if (e.key === 'ArrowUp') dy = -STEP;
      else if (e.key === 'ArrowDown') dy = STEP;
      else if (e.key === 'ArrowLeft') dx = -STEP;
      else if (e.key === 'ArrowRight') dx = STEP;
      else return;
      e.preventDefault();
      takeSnapshot();
      updateActiveWorkspace(ws => {
        const updatedNodes = ws.nodes.map(n => {
          if (selectedNodeIds.includes(n.id)) {
            return { ...n, x: n.x + dx, y: n.y + dy };
          }
          return n;
        });
        return { nodes: updatedNodes, groups: computeLayout(ws.groups, updatedNodes) };
      });
    };
    window.addEventListener('keydown', handleArrowKeys);
    return () => window.removeEventListener('keydown', handleArrowKeys);
  }, [selectedNodeIds, takeSnapshot, updateActiveWorkspace]);

  // --- Clear selection on workspace tab change ---
  useEffect(() => {
    setSelectedNodeIds([]);
  }, [activeTab]);


  // --- Workspace (Tab) Operations ---
  const addWorkspace = () => {
    takeSnapshot();
    const newId = generateId();
    setWorkspaces(prev => [...prev, { id: newId, name: `Map Phase ${prev.length + 1}`, nodes: [], edges: [], groups: [] }]);
    setActiveTab(newId);
    setTransform({ x: 0, y: 0, scale: 1 });
    // Save workspace immediately and update project metadata
    saveWorkspaceToLocal(activeProjectId, newId, { id: newId, name: `Map Phase ${workspaces.length + 1}`, nodes: [], edges: [], groups: [], pins: [], images: [], lastModified: Date.now() });
    const projMeta = loadProjectMeta(activeProjectId);
    if (projMeta) {
      const updatedIds = [...(projMeta.workspaceIds || []), newId];
      saveProjectMeta(activeProjectId, { ...projMeta, workspaceIds: updatedIds });
      if (isFirebaseConfigured()) saveProjectToFirestore(activeProjectId, { ...projMeta, workspaceIds: updatedIds }).catch(() => {});
    }
    if (isFirebaseConfigured()) saveWorkspaceToFirestore(activeProjectId, newId, { id: newId, name: `Map Phase ${workspaces.length + 1}`, nodes: [], edges: [], groups: [], pins: [], images: [], lastModified: Date.now() }).catch(() => {});
  };

  const deleteWorkspace = (id, e) => {
    e.stopPropagation();
    if (workspaces.length <= 1) return;
    takeSnapshot();

    // Convert tasks linked to pins in this workspace to unassigned
    const wsToDelete = workspaces.find(w => w.id === id);
    if (wsToDelete) {
      const pinIdsInWorkspace = new Set((wsToDelete.pins || []).map(p => p.id));
      if (pinIdsInWorkspace.size > 0) {
        setTasks(prev => prev.map(t =>
          t.locationPinId && pinIdsInWorkspace.has(t.locationPinId)
            ? { ...t, locationPinId: undefined, locationWorkspaceId: undefined }
            : t
        ));
      }
    }

    // Remove from localStorage and Firestore
    removeWorkspaceLocal(activeProjectId, id);
    if (isFirebaseConfigured()) {
      deleteWorkspaceFromFirestore(activeProjectId, id).catch(() => {});
    }

    setWorkspaces(prev => prev.filter(w => w.id !== id));
    if (activeTab === id) setActiveTab(workspaces.find(w => w.id !== id).id);
  };

  const renameWorkspace = (id, newName) => {
    setWorkspaces(prev => prev.map(ws => ws.id === id ? { ...ws, name: newName } : ws));
    setEditingTab(null);
  };

  const duplicateWorkspace = (wsId) => {
    takeSnapshot();
    const source = workspaces.find(w => w.id === wsId);
    if (!source) return;
    const newWsId = generateId();
    let idCounter = nextId;
    const nodeIdMap = {};
    const groupIdMap = {};
    const pinIdMap = {};

    // Generate new IDs for groups
    (source.groups || []).forEach(g => {
      groupIdMap[g.id] = `g-${Date.now()}-${idCounter}`;
      idCounter++;
    });

    // Generate new IDs for nodes
    (source.nodes || []).forEach(n => {
      nodeIdMap[n.id] = idCounter.toString();
      idCounter++;
    });

    // Generate new IDs for pins
    (source.pins || []).forEach(p => {
      pinIdMap[p.id] = `pin-${Date.now()}-${idCounter}`;
      idCounter++;
    });

    const newNodes = (source.nodes || []).map(n => ({
      ...n,
      id: nodeIdMap[n.id],
      groupId: n.groupId ? groupIdMap[n.groupId] || null : null,
      cloneSourceId: n.cloneSourceId ? (nodeIdMap[n.cloneSourceId] || n.cloneSourceId) : null,
      workspaceId: newWsId
    }));

    const newGroups = (source.groups || []).map(g => ({
      ...g,
      id: groupIdMap[g.id],
      parentGroupId: g.parentGroupId ? groupIdMap[g.parentGroupId] || null : null,
      workspaceId: newWsId
    }));

    const newEdges = (source.edges || []).map(e => ({
      ...e,
      id: `e-${Date.now()}-${idCounter++}`,
      source: nodeIdMap[e.source] || e.source,
      target: nodeIdMap[e.target] || e.target,
      workspaceId: newWsId
    }));

    const newPins = (source.pins || []).map(p => ({
      ...p,
      id: pinIdMap[p.id],
      workspaceId: newWsId
    }));

    const newImages = (source.images || []).map(img => ({
      ...img,
      id: `img-${Date.now()}-${idCounter++}`,
      workspaceId: newWsId
    }));

    const newWorkspace = {
      id: newWsId,
      name: `${source.name} (Copy)`,
      nodes: newNodes,
      edges: newEdges,
      groups: newGroups,
      pins: newPins,
      images: newImages
    };

    setWorkspaces(prev => [...prev, newWorkspace]);
    setActiveTab(newWsId);
    setNextId(idCounter);
    setTransform({ x: 0, y: 0, scale: 1 });

    // Save the new workspace to per-workspace keys and update project metadata
    saveWorkspaceToLocal(activeProjectId, newWsId, {
      id: newWsId, name: newWorkspace.name, nodes: newWorkspace.nodes || [], edges: newWorkspace.edges || [],
      groups: newWorkspace.groups || [], pins: newWorkspace.pins || [], images: newWorkspace.images || [], lastModified: Date.now()
    });
    const projMeta = loadProjectMeta(activeProjectId);
    if (projMeta) {
      const updatedIds = [...(projMeta.workspaceIds || []), newWsId];
      saveProjectMeta(activeProjectId, { ...projMeta, workspaceIds: updatedIds });
      if (isFirebaseConfigured()) saveProjectToFirestore(activeProjectId, { ...projMeta, workspaceIds: updatedIds }).catch(() => {});
    }
    if (isFirebaseConfigured()) saveWorkspaceToFirestore(activeProjectId, newWsId, { id: newWsId, name: newWorkspace.name, nodes: newWorkspace.nodes || [], edges: newWorkspace.edges || [], groups: newWorkspace.groups || [], pins: newWorkspace.pins || [], images: newWorkspace.images || [], lastModified: Date.now() }).catch(() => {});

    // Duplicate tasks linked to pins in the source workspace
    if (Object.keys(pinIdMap).length > 0) {
      setTasks(prev => {
        const newTasks = [];
        for (const task of prev) {
          if (task.locationPinId && pinIdMap[task.locationPinId]) {
            newTasks.push({
              ...task,
              id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              locationPinId: pinIdMap[task.locationPinId],
              locationWorkspaceId: newWsId,
            });
          }
        }
        return newTasks.length > 0 ? [...prev, ...newTasks] : prev;
      });
    }
  };

  // --- Project Management Functions ---
  const openProjectPanel = () => {
    setShowProjectPanel(true);
    setProjectPanelMode('dashboard');
    setProjectError('');
    setProjectNameInput('');
    setProjectDescriptionInput('');
    setProjectThumbnailInput(null);
    setProjectPasswordInput('');
    setProjectPasswordConfirm('');
    setProjectPasswordEnabled(false);
    setProjectDefaultToggle(false);
    setSelectedProjectId(null);
    setCardMenuOpenId(null);
    setEditingProjectId(null);
  };

  const handleLogoTap = () => {
    const now = Date.now();
    const ref = logoTapRef.current;
    if (now - ref.lastTap < 1000) {
      ref.count += 1;
    } else {
      ref.count = 1;
    }
    ref.lastTap = now;
    if (ref.count >= 6) {
      ref.count = 0;
      openProjectPanel();
    }
  };

  const createProject = async () => {
    if (!projectNameInput.trim()) {
      setProjectError('Project name is required.');
      return;
    }
    const nameExists = projects.some(p => p.name.toLowerCase() === projectNameInput.trim().toLowerCase());
    if (nameExists) {
      setProjectError('A project with this name already exists.');
      return;
    }
    if (projectPasswordEnabled && !projectPasswordInput.trim()) {
      setProjectError('Password is required when protection is enabled.');
      return;
    }
    const wsId = generateId();
    const hashedPass = projectPasswordEnabled ? await hashPassword(projectPasswordInput.trim()) : '';
    const newProj = {
      id: generateId(),
      name: projectNameInput.trim(),
      description: projectDescriptionInput.trim(),
      thumbnail: projectThumbnailInput,
      password: hashedPass,
      lastModified: Date.now(),
      workspaces: [{ id: wsId, name: 'Workspace 1', nodes: [], edges: [], groups: [] }],
      activeTab: wsId,
      nextId: 10
    };
    // Write to per-workspace keys
    saveProjectMeta(newProj.id, {
      id: newProj.id,
      name: newProj.name,
      description: newProj.description,
      password: newProj.password,
      thumbnail: newProj.thumbnail,
      lastModified: newProj.lastModified,
      activeTab: wsId,
      nextId: 10,
      reminders: [],
      workspaceIds: [wsId],
      schemaVersion: 2
    });
    saveWorkspaceToLocal(newProj.id, wsId, { id: wsId, name: 'Workspace 1', nodes: [], edges: [], groups: [], pins: [], images: [], lastModified: Date.now() });
    saveTasks(newProj.id, { tasks: [], taskGroups: [] });
    // Update cm-meta
    const meta = loadMeta() || { activeProjectId, defaultProjectId, schemaVersion: 2 };
    saveMeta(meta);
    // Fire-and-forget Firestore
    if (isFirebaseConfigured()) {
      saveProjectToFirestore(newProj.id, { id: newProj.id, name: newProj.name, description: newProj.description, thumbnail: newProj.thumbnail, lastModified: newProj.lastModified, workspaceIds: [wsId], activeTab: wsId, nextId: 10, reminders: [] }).catch(() => {});
      saveWorkspaceToFirestore(newProj.id, wsId, { id: wsId, name: 'Workspace 1', nodes: [], edges: [], groups: [], pins: [], images: [], lastModified: Date.now() }).catch(() => {});
      saveTasksToFirestore(newProj.id, { tasks: [], taskGroups: [] }).catch(() => {});
    }
    setProjects(prev => [...prev, newProj]);
    // Handle default toggle
    if (projectDefaultToggle) {
      setDefaultProjectId(newProj.id);
      const updatedMeta = { ...meta, defaultProjectId: newProj.id };
      saveMeta(updatedMeta);
      if (isFirebaseConfigured()) saveUserMeta({ activeProjectId, defaultProjectId: newProj.id }).catch(() => {});
    }
    setProjectError('');
    setProjectPanelMode('dashboard');
    setProjectNameInput('');
    setProjectDescriptionInput('');
    setProjectThumbnailInput(null);
    setProjectPasswordInput('');
    setProjectPasswordEnabled(false);
    setProjectDefaultToggle(false);
  };

  const switchProject = async (targetId) => {
    const target = projects.find(p => p.id === targetId);
    if (!target) return;
    const hashedInput = await hashPassword(projectPasswordInput);
    if (hashedInput !== target.password) {
      setProjectError('Incorrect.');
      return;
    }
    // Save current project state to per-workspace keys
    setProjects(prev => {
      const updated = prev.map(p => p.id === activeProjectId
        ? { ...p, workspaces, activeTab, nextId, tasks, taskGroups }
        : p
      );
      // Save current workspace data to per-workspace keys
      for (const ws of workspaces) {
        saveWorkspaceToLocal(activeProjectId, ws.id, {
          id: ws.id, name: ws.name || 'Workspace', nodes: ws.nodes || [], edges: ws.edges || [],
          groups: ws.groups || [], pins: ws.pins || [], images: ws.images || [], lastModified: Date.now()
        });
      }
      saveTasks(activeProjectId, { tasks, taskGroups });
      const projMeta = loadProjectMeta(activeProjectId);
      if (projMeta) {
        saveProjectMeta(activeProjectId, { ...projMeta, activeTab, nextId, workspaceIds: workspaces.map(ws => ws.id), lastModified: Date.now() });
      }
      // Fire-and-forget Firestore
      if (isFirebaseConfigured()) {
        setSyncStatus('syncing');
        const firestorePromises = [];
        for (const ws of workspaces) {
          firestorePromises.push(saveWorkspaceToFirestore(activeProjectId, ws.id, { id: ws.id, name: ws.name || 'Workspace', nodes: ws.nodes || [], edges: ws.edges || [], groups: ws.groups || [], pins: ws.pins || [], images: ws.images || [], lastModified: Date.now() }));
        }
        firestorePromises.push(saveTasksToFirestore(activeProjectId, { tasks, taskGroups }));
        if (projMeta) firestorePromises.push(saveProjectToFirestore(activeProjectId, { ...projMeta, activeTab, nextId, workspaceIds: workspaces.map(ws => ws.id), lastModified: Date.now() }));
        Promise.all(firestorePromises)
          .then((results) => setSyncStatus(results.every(Boolean) ? 'synced' : 'error'))
          .catch(() => setSyncStatus('error'));
      }
      return updated;
    });
    // Hydrate target project from storage
    const hydrated = await hydrateProject(targetId);
    let targetWorkspaces = (hydrated && hydrated.workspaces && hydrated.workspaces.length > 0)
      ? hydrated.workspaces
      : defaultWorkspaces;
    targetWorkspaces = targetWorkspaces.map(ws => {
      const grps = ws.groups || [];
      const nds = ws.nodes || [];
      return { ...ws, groups: computeLayout(grps, nds), nodes: nds, edges: ws.edges || [] };
    });
    // Migrate: stamp workspaceId on any objects missing it
    targetWorkspaces = migrateWorkspaceIds(targetWorkspaces);
    const hydratedTasks = hydrated ? (hydrated.tasks || []) : [];
    const hydratedTaskGroups = hydrated ? (hydrated.taskGroups || []) : [];
    if (import.meta.env.DEV) validateWorkspaces(targetWorkspaces, 'after project switch', normalizeTasks(hydratedTasks));
    setActiveProjectId(targetId);
    setWorkspaces(targetWorkspaces);
    setActiveTab((hydrated && hydrated.activeTab) || (targetWorkspaces.length > 0 ? targetWorkspaces[0].id : ''));
    setNextId((hydrated && hydrated.nextId) || 10);
    setReminders((hydrated && hydrated.reminders) || DEFAULT_REMINDERS);
    setTasks(normalizeTasks(hydratedTasks));
    const switchedTaskGroups = hydratedTaskGroups.length > 0
      ? hydratedTaskGroups
      : [{ id: 'inbox', name: 'Inbox', sortOrder: 0, color: 'slate' }];
    setTaskGroups(switchedTaskGroups.map((g, i) => ({
      ...g,
      color: g.color || GROUP_COLORS[i % GROUP_COLORS.length].id,
    })));
    setStoredPassword(target.password || '');
    setPasswordEnabled(!!target.password);
    setIsAuthenticated(true);
    // Update cm-meta with new active project
    const meta = loadMeta() || { schemaVersion: 2 };
    saveMeta({ ...meta, activeProjectId: targetId });
    // Save to Firestore
    if (isFirebaseConfigured()) saveUserMeta({ activeProjectId: targetId, defaultProjectId }).catch(() => {});
    setShowProjectPanel(false);
    setProjectPasswordInput('');
    setProjectError('');
    setTransform({ x: 0, y: 0, scale: 1 });
    // Reset history
    pastRef.current = [];
    futureRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
  };

  // Passwordless project switch - used by boss key (Ctrl+Shift+/) and default project switch from panel
  const cycleToProject = async (targetId) => {
    const target = projectsRef.current.find(p => p.id === targetId);
    if (!target) return;
    const { workspaces: currentWs, activeTab: currentTab, nextId: currentNextId } = stateRef.current;
    // Save current project state to per-workspace keys
    setProjects(prev => {
      const updated = prev.map(p => p.id === activeProjectId
        ? { ...p, workspaces: currentWs, activeTab: currentTab, nextId: currentNextId, tasks, taskGroups }
        : p
      );
      // Save current workspace data to per-workspace keys
      for (const ws of currentWs) {
        saveWorkspaceToLocal(activeProjectId, ws.id, {
          id: ws.id, name: ws.name || 'Workspace', nodes: ws.nodes || [], edges: ws.edges || [],
          groups: ws.groups || [], pins: ws.pins || [], images: ws.images || [], lastModified: Date.now()
        });
      }
      saveTasks(activeProjectId, { tasks, taskGroups });
      const projMeta = loadProjectMeta(activeProjectId);
      if (projMeta) {
        saveProjectMeta(activeProjectId, { ...projMeta, activeTab: currentTab, nextId: currentNextId, workspaceIds: currentWs.map(ws => ws.id), lastModified: Date.now() });
      }
      // Fire-and-forget Firestore
      if (isFirebaseConfigured()) {
        setSyncStatus('syncing');
        const firestorePromises = [];
        for (const ws of currentWs) {
          firestorePromises.push(saveWorkspaceToFirestore(activeProjectId, ws.id, { id: ws.id, name: ws.name || 'Workspace', nodes: ws.nodes || [], edges: ws.edges || [], groups: ws.groups || [], pins: ws.pins || [], images: ws.images || [], lastModified: Date.now() }));
        }
        firestorePromises.push(saveTasksToFirestore(activeProjectId, { tasks, taskGroups }));
        if (projMeta) firestorePromises.push(saveProjectToFirestore(activeProjectId, { ...projMeta, activeTab: currentTab, nextId: currentNextId, workspaceIds: currentWs.map(ws => ws.id), lastModified: Date.now() }));
        Promise.all(firestorePromises)
          .then((results) => setSyncStatus(results.every(Boolean) ? 'synced' : 'error'))
          .catch(() => setSyncStatus('error'));
      }
      return updated;
    });
    // Hydrate target project from storage
    const hydrated = await hydrateProject(targetId);
    let targetWorkspaces = (hydrated && hydrated.workspaces && hydrated.workspaces.length > 0)
      ? hydrated.workspaces
      : defaultWorkspaces;
    targetWorkspaces = targetWorkspaces.map(ws => {
      const grps = ws.groups || [];
      const nds = ws.nodes || [];
      return { ...ws, groups: computeLayout(grps, nds), nodes: nds, edges: ws.edges || [] };
    });
    // Migrate: stamp workspaceId on any objects missing it
    targetWorkspaces = migrateWorkspaceIds(targetWorkspaces);
    const hydratedTasks = hydrated ? (hydrated.tasks || []) : [];
    const hydratedTaskGroups = hydrated ? (hydrated.taskGroups || []) : [];
    if (import.meta.env.DEV) validateWorkspaces(targetWorkspaces, 'after project cycle', normalizeTasks(hydratedTasks));
    const isDefault = target.id === defaultProjectId;
    setActiveProjectId(targetId);
    setWorkspaces(targetWorkspaces);
    setActiveTab((hydrated && hydrated.activeTab) || (targetWorkspaces.length > 0 ? targetWorkspaces[0].id : ''));
    setNextId((hydrated && hydrated.nextId) || 10);
    setReminders((hydrated && hydrated.reminders) || DEFAULT_REMINDERS);
    setTasks(normalizeTasks(hydratedTasks));
    const cycledTaskGroups = hydratedTaskGroups.length > 0
      ? hydratedTaskGroups
      : [{ id: 'inbox', name: 'Inbox', sortOrder: 0, color: 'slate' }];
    setTaskGroups(cycledTaskGroups.map((g, i) => ({
      ...g,
      color: g.color || GROUP_COLORS[i % GROUP_COLORS.length].id,
    })));
    // Default project is always password-free
    if (isDefault) {
      setStoredPassword('');
      setPasswordEnabled(false);
    } else {
      setStoredPassword(target.password || '');
      setPasswordEnabled(!!target.password);
    }
    setIsAuthenticated(true);
    // Update cm-meta with new active project
    const meta = loadMeta() || { schemaVersion: 2 };
    saveMeta({ ...meta, activeProjectId: targetId });
    // Save to Firestore
    if (isFirebaseConfigured()) saveUserMeta({ activeProjectId: targetId, defaultProjectId }).catch(() => {});
    setShowProjectPanel(false);
    setProjectPasswordInput('');
    setProjectError('');
    setTransform({ x: 0, y: 0, scale: 1 });
    // Reset history
    pastRef.current = [];
    futureRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
  };

  // Save/edit a project from the modal
  const saveEditProject = async () => {
    if (!projectNameInput.trim()) {
      setProjectError('Project name is required.');
      return;
    }
    const nameExists = projects.some(p => p.name.toLowerCase() === projectNameInput.trim().toLowerCase() && p.id !== editingProjectId);
    if (nameExists) {
      setProjectError('A project with this name already exists.');
      return;
    }
    if (projectPasswordEnabled && !projectPasswordInput.trim()) {
      // If we're editing and already have a password, keep it
      const existing = projects.find(p => p.id === editingProjectId);
      if (!existing || !existing.password) {
        setProjectError('Password is required when protection is enabled.');
        return;
      }
    }
    const existing = projects.find(p => p.id === editingProjectId);
    if (!existing) return;

    let newPass = existing.password;
    if (editingProjectId === defaultProjectId) {
      // Default project cannot be password-protected
      newPass = '';
    } else if (projectPasswordEnabled && projectPasswordInput.trim()) {
      newPass = await hashPassword(projectPasswordInput.trim());
    } else if (!projectPasswordEnabled) {
      newPass = '';
    }

    setProjects(prev => {
      const updated = prev.map(p => p.id === editingProjectId
        ? { ...p, name: projectNameInput.trim(), description: projectDescriptionInput.trim(), thumbnail: projectThumbnailInput, password: newPass, lastModified: Date.now() }
        : p
      );

      // Save to per-workspace keys
      const projMeta = loadProjectMeta(editingProjectId);
      if (projMeta) {
        const updatedMeta = { ...projMeta, name: projectNameInput.trim(), description: projectDescriptionInput.trim(), thumbnail: projectThumbnailInput, password: newPass, lastModified: Date.now() };
        saveProjectMeta(editingProjectId, updatedMeta);
        if (isFirebaseConfigured()) saveProjectToFirestore(editingProjectId, updatedMeta).catch(() => {});
      }

      // Handle default toggle inside updater to avoid stale reference
      if (projectDefaultToggle) {
        setDefaultProjectId(editingProjectId);
        const meta = loadMeta() || { schemaVersion: 2 };
        saveMeta({ ...meta, defaultProjectId: editingProjectId });
        if (isFirebaseConfigured()) saveUserMeta({ activeProjectId, defaultProjectId: editingProjectId }).catch(() => {});
      } else if (defaultProjectId === editingProjectId) {
        // Find fallback: first project in prev that is not the one being edited
        const fallback = prev.find(p => p.id !== editingProjectId);
        const fallbackId = fallback ? fallback.id : prev[0].id;
        setDefaultProjectId(fallbackId);
        const meta = loadMeta() || { schemaVersion: 2 };
        saveMeta({ ...meta, defaultProjectId: fallbackId });
        if (isFirebaseConfigured()) saveUserMeta({ activeProjectId, defaultProjectId: fallbackId }).catch(() => {});
      }

      return updated;
    });

    // Update stored password if editing the active project
    if (editingProjectId === activeProjectId) {
      setStoredPassword(newPass);
      setPasswordEnabled(!!newPass);
    }

    setProjectError('');
    setProjectPanelMode('dashboard');
    setEditingProjectId(null);
    setProjectNameInput('');
    setProjectDescriptionInput('');
    setProjectThumbnailInput(null);
    setProjectPasswordInput('');
    setProjectPasswordEnabled(false);
    setProjectDefaultToggle(false);
  };

  // Duplicate a project
  const duplicateProject = (targetId) => {
    const target = projects.find(p => p.id === targetId);
    if (!target) return;
    const cloned = JSON.parse(JSON.stringify(target));
    // Generate new unique workspace IDs and reassign all object workspaceIds
    const newWorkspaces = (cloned.workspaces || []).map(ws => {
      const newWsId = generateId();
      return {
        ...ws,
        id: newWsId,
        nodes: (ws.nodes || []).map(n => ({ ...n, workspaceId: newWsId })),
        edges: (ws.edges || []).map(e => ({ ...e, workspaceId: newWsId })),
        groups: (ws.groups || []).map(g => ({ ...g, workspaceId: newWsId })),
        pins: (ws.pins || []).map(p => ({ ...p, workspaceId: newWsId })),
        images: (ws.images || []).map(img => ({ ...img, workspaceId: newWsId }))
      };
    });
    const newProjId = generateId();
    const newProj = {
      ...cloned,
      id: newProjId,
      name: `${target.name} (Copy)`,
      password: '',
      lastModified: Date.now(),
      workspaces: newWorkspaces,
      activeTab: newWorkspaces.length > 0 ? newWorkspaces[0].id : ''
    };
    // Write to per-workspace keys
    const wsIds = newWorkspaces.map(ws => ws.id);
    saveProjectMeta(newProjId, {
      id: newProjId, name: newProj.name, description: newProj.description || '', password: '',
      thumbnail: newProj.thumbnail || null, lastModified: newProj.lastModified,
      activeTab: newProj.activeTab, nextId: newProj.nextId || 10, reminders: newProj.reminders || [],
      workspaceIds: wsIds, schemaVersion: 2
    });
    for (const ws of newWorkspaces) {
      saveWorkspaceToLocal(newProjId, ws.id, {
        id: ws.id, name: ws.name || 'Workspace', nodes: ws.nodes || [], edges: ws.edges || [],
        groups: ws.groups || [], pins: ws.pins || [], images: ws.images || [], lastModified: Date.now()
      });
    }
    saveTasks(newProjId, { tasks: newProj.tasks || [], taskGroups: newProj.taskGroups || [] });
    // Fire-and-forget Firestore
    if (isFirebaseConfigured()) {
      saveProjectToFirestore(newProjId, { id: newProjId, name: newProj.name, description: newProj.description || '', thumbnail: newProj.thumbnail || null, lastModified: newProj.lastModified, workspaceIds: wsIds, activeTab: newProj.activeTab, nextId: newProj.nextId || 10, reminders: newProj.reminders || [] }).catch(() => {});
      for (const ws of newWorkspaces) {
        saveWorkspaceToFirestore(newProjId, ws.id, { id: ws.id, name: ws.name || 'Workspace', nodes: ws.nodes || [], edges: ws.edges || [], groups: ws.groups || [], pins: ws.pins || [], images: ws.images || [], lastModified: Date.now() }).catch(() => {});
      }
      saveTasksToFirestore(newProjId, { tasks: newProj.tasks || [], taskGroups: newProj.taskGroups || [] }).catch(() => {});
    }
    setProjects(prev => [...prev, newProj]);
    setCardMenuOpenId(null);
  };

  // Export a single project as JSON
  const exportSingleProject = async (targetId) => {
    const target = projects.find(p => p.id === targetId);
    if (!target) return;
    // Hydrate project from storage to get complete workspace and task data
    const hydrated = await hydrateProject(targetId);
    const exportData = hydrated
      ? { ...hydrated, password: '' }
      : { ...target, password: '' };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${target.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setCardMenuOpenId(null);
  };

  // Export all projects as a full backup
  const exportAllData = () => {
    // Assemble full backup from per-workspace storage
    const exportProjects = projects.map(proj => {
      // Gather workspace data from per-workspace keys
      const projMetaLocal = loadProjectMeta(proj.id);
      const wsIds = projMetaLocal ? (projMetaLocal.workspaceIds || []) : (proj.workspaces || []).map(ws => ws.id);
      const assembledWorkspaces = wsIds.map(wsId => {
        const wsData = loadWorkspaceFromLocal(proj.id, wsId);
        return wsData || (proj.workspaces || []).find(ws => ws.id === wsId) || { id: wsId, name: 'Workspace', nodes: [], edges: [], groups: [] };
      });
      const tasksData = loadTasks(proj.id);
      return {
        ...proj,
        workspaces: assembledWorkspaces,
        tasks: tasksData ? tasksData.tasks : (proj.tasks || []),
        taskGroups: tasksData ? tasksData.taskGroups : (proj.taskGroups || [])
      };
    });
    const backupData = {
      type: 'thoughtflow-backup',
      version: 2,
      exportDate: new Date().toISOString(),
      defaultProjectId,
      projects: exportProjects
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thoughtflow-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Helper: relative time display
  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'Modified just now';
    if (minutes < 60) return `Modified ${minutes}m ago`;
    if (hours < 24) return `Modified ${hours}h ago`;
    if (days < 7) return `Modified ${days}d ago`;
    const date = new Date(timestamp);
    return `Modified ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  const deleteProject = async (targetId) => {
    const target = projects.find(p => p.id === targetId);
    if (!target) return;
    if (projects.length <= 1) {
      setProjectError('Cannot remove the only entry.');
      return;
    }
    // For password-protected projects, require password confirmation
    if (target.password) {
      const hashedInput = await hashPassword(projectPasswordInput);
      if (hashedInput !== target.password) {
        setProjectError('Incorrect password.');
        return;
      }
    }
    const updated = projects.filter(p => p.id !== targetId);
    setProjects(updated);
    // Remove per-workspace keys for the deleted project
    const deletedProjMeta = loadProjectMeta(targetId);
    if (deletedProjMeta && deletedProjMeta.workspaceIds) {
      for (const wsId of deletedProjMeta.workspaceIds) {
        localStorage.removeItem(`cm-ws-${targetId}-${wsId}`);
      }
    }
    localStorage.removeItem(`cm-proj-${targetId}`);
    localStorage.removeItem(`cm-tasks-${targetId}`);
    // Delete Firestore documents (project doc, workspace subcollection, tasks subcollection)
    if (isFirebaseConfigured()) {
      const wsIds = (deletedProjMeta && deletedProjMeta.workspaceIds) || (target.workspaces || []).map(ws => ws.id);
      deleteProjectFromFirestore(targetId, wsIds).catch(() => {});
    }
    // If deleting the default project, reassign default
    if (targetId === defaultProjectId) {
      const newDefault = updated[0].id;
      setDefaultProjectId(newDefault);
      const meta = loadMeta() || { schemaVersion: 2 };
      saveMeta({ ...meta, defaultProjectId: newDefault });
      if (isFirebaseConfigured()) saveUserMeta({ activeProjectId, defaultProjectId: newDefault }).catch(() => {});
    }
    // If deleting active project, switch to first available
    if (targetId === activeProjectId) {
      const next = updated[0];
      // Hydrate next project from storage
      const hydrated = await hydrateProject(next.id);
      setActiveProjectId(next.id);
      let nextWorkspaces = (hydrated && hydrated.workspaces && hydrated.workspaces.length > 0)
        ? hydrated.workspaces
        : defaultWorkspaces;
      nextWorkspaces = nextWorkspaces.map(ws => {
        const grps = ws.groups || [];
        const nds = ws.nodes || [];
        return { ...ws, groups: computeLayout(grps, nds), nodes: nds, edges: ws.edges || [] };
      });
      // Migrate: stamp workspaceId on any objects missing it
      nextWorkspaces = migrateWorkspaceIds(nextWorkspaces);
      const hydratedTasks = hydrated ? (hydrated.tasks || []) : [];
      const hydratedTaskGroups = hydrated ? (hydrated.taskGroups || []) : [];
      if (import.meta.env.DEV) validateWorkspaces(nextWorkspaces, 'after project delete/switch', normalizeTasks(hydratedTasks));
      setWorkspaces(nextWorkspaces);
      setActiveTab((hydrated && hydrated.activeTab) || (nextWorkspaces.length > 0 ? nextWorkspaces[0].id : ''));
      setNextId((hydrated && hydrated.nextId) || 10);
      setTasks(normalizeTasks(hydratedTasks));
      const nextTaskGroups = hydratedTaskGroups.length > 0
        ? hydratedTaskGroups
        : [{ id: 'inbox', name: 'Inbox', sortOrder: 0, color: 'slate' }];
      setTaskGroups(nextTaskGroups.map((g, i) => ({
        ...g,
        color: g.color || GROUP_COLORS[i % GROUP_COLORS.length].id,
      })));
      setStoredPassword(next.password || '');
      setPasswordEnabled(!!next.password);
      setIsAuthenticated(false);
      const meta = loadMeta() || { schemaVersion: 2 };
      saveMeta({ ...meta, activeProjectId: next.id });
      if (isFirebaseConfigured()) saveUserMeta({ activeProjectId: next.id, defaultProjectId }).catch(() => {});
    }
    setShowProjectPanel(false);
    setProjectPasswordInput('');
    setProjectError('');
    setSelectedProjectId(null);
    setCardMenuOpenId(null);
  };

  const changeProjectPassword = async () => {
    const current = projects.find(p => p.id === activeProjectId);
    if (!current) return;
    // Default project cannot have a password
    if (current.id === defaultProjectId) {
      setProjectError('Cannot set key on default.');
      return;
    }
    // Skip current password check if project has no password set
    if (current.password) {
      if (!projectPasswordInput.trim()) {
        setProjectError('Current password required.');
        return;
      }
      const hashedInput = await hashPassword(projectPasswordInput);
      if (hashedInput !== current.password) {
        setProjectError('Incorrect current password.');
        return;
      }
    }
    if (!projectPasswordConfirm.trim()) {
      setProjectError('New password required.');
      return;
    }
    const newPass = await hashPassword(projectPasswordConfirm.trim());
    setStoredPassword(newPass);
    setPasswordEnabled(!!newPass);
    setProjects(prev => {
      const updated = prev.map(p => p.id === activeProjectId ? { ...p, password: newPass } : p);
      return updated;
    });
    // Save password to per-workspace key and Firestore
    const projMeta = loadProjectMeta(activeProjectId);
    if (projMeta) {
      const updatedMeta = { ...projMeta, password: newPass };
      saveProjectMeta(activeProjectId, updatedMeta);
      if (isFirebaseConfigured()) saveProjectToFirestore(activeProjectId, updatedMeta).catch(() => {});
    }
    setShowProjectPanel(false);
    setProjectPasswordInput('');
    setProjectPasswordConfirm('');
    setProjectError('');
  };

  // --- Import / Export ---
  const exportData = () => {
    if (import.meta.env.DEV) validateWorkspaces(workspaces, 'before exportData', tasks);
    const data = { workspaces, activeTab, nextId, tasks, taskGroups };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thoughtflow-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportSelectedNodes = (nodeIds) => {
    if (!nodeIds || nodeIds.length === 0) return;

    // Collect all selected nodes and their descendants via edges
    const collectedIds = new Set(nodeIds);
    const visited = new Set();

    // BFS to find all descendants via edges
    const queue = [...nodeIds];
    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);
      collectedIds.add(current);
      // Find edges where current is the source
      const childEdges = edges.filter(e => e.source === current);
      childEdges.forEach(e => {
        if (!visited.has(e.target)) {
          queue.push(e.target);
        }
      });
    }

    const exportNodes = nodes.filter(n => collectedIds.has(n.id));
    const exportNodeIds = new Set(exportNodes.map(n => n.id));
    const exportEdges = edges.filter(e => exportNodeIds.has(e.source) && exportNodeIds.has(e.target));

    // Collect groups that contain exported nodes
    const groupIds = new Set(exportNodes.map(n => n.groupId).filter(Boolean));
    const exportGroups = groups.filter(g => groupIds.has(g.id));

    const exportPayload = {
      type: 'nexus-partial-export',
      version: 1,
      metadata: {
        sourceWorkspace: activeWs?.name || 'Unknown',
        sourceWorkspaceId: activeTab,
        exportDate: new Date().toISOString(),
        nodeCount: exportNodes.length,
        edgeCount: exportEdges.length
      },
      nodes: exportNodes,
      edges: exportEdges,
      groups: exportGroups
    };

    const wsName = (activeWs?.name || 'workspace').replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thoughtflow-partial-${wsName}-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (importedData.workspaces && Array.isArray(importedData.workspaces)) {
          takeSnapshot();
          // Stamp workspaceId on all objects in imported workspaces
          const migratedWorkspaces = importedData.workspaces.map(ws => ({
            ...ws,
            nodes: (ws.nodes || []).map(n => ({ ...n, workspaceId: ws.id })),
            edges: (ws.edges || []).map(e => ({ ...e, workspaceId: ws.id })),
            groups: (ws.groups || []).map(g => ({ ...g, workspaceId: ws.id })),
            pins: (ws.pins || []).map(p => ({ ...p, workspaceId: ws.id })),
            images: (ws.images || []).map(img => ({ ...img, workspaceId: ws.id }))
          }));
          setWorkspaces(migratedWorkspaces);
          if (import.meta.env.DEV) validateWorkspaces(migratedWorkspaces, 'after handleImport');
          setActiveTab(importedData.activeTab || migratedWorkspaces[0]?.id || '');
          setNextId(importedData.nextId || 10);
          if (importedData.tasks) setTasks(normalizeTasks(importedData.tasks));
          if (importedData.taskGroups) setTaskGroups(importedData.taskGroups.map((g, i) => ({
            ...g,
            color: g.color || GROUP_COLORS[i % GROUP_COLORS.length].id,
          })));
        } else {
          setErrorMessage("Invalid workflow file format.");
        }
      } catch (err) {
        setErrorMessage("Failed to read file.");
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  // Import full backup data
  const importAllData = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if ((importedData.type === 'nexus-full-backup' || importedData.type === 'thoughtflow-backup') && Array.isArray(importedData.projects)) {
          // Validate each project has required structure
          const isValid = importedData.projects.every(p =>
            p && typeof p.id === 'string' && Array.isArray(p.workspaces)
          );
          if (!isValid) {
            setErrorMessage("Backup file contains invalid project data.");
            e.target.value = null;
            return;
          }

          if (!window.confirm('This will replace all existing data. Continue?')) {
            e.target.value = null;
            return;
          }

          // Save current state for rollback
          const previousProjects = projects;

          try {
            const restoredProjects = importedData.projects;
            const restoredDefault = importedData.defaultProjectId || restoredProjects[0]?.id;
            // Migrate workspaceId on all objects in all projects
            const migratedProjects = restoredProjects.map(proj => ({
              ...proj,
              workspaces: migrateWorkspaceIds(proj.workspaces || [])
            }));
            if (import.meta.env.DEV) {
              migratedProjects.forEach(proj => validateWorkspaces(proj.workspaces || [], `after importAllData [project: ${proj.id}]`));
            }
            setProjects(migratedProjects);
            setDefaultProjectId(restoredDefault);
            setActiveProjectId(restoredDefault);

            // Decompose into per-workspace keys
            for (const proj of migratedProjects) {
              const wsIds = (proj.workspaces || []).map(ws => ws.id);
              saveProjectMeta(proj.id, {
                id: proj.id, name: proj.name || 'Untitled', description: proj.description || '',
                password: proj.password || null, thumbnail: proj.thumbnail || null,
                lastModified: proj.lastModified || Date.now(), activeTab: proj.activeTab || wsIds[0] || '',
                nextId: proj.nextId || 1, reminders: proj.reminders || [],
                workspaceIds: wsIds, schemaVersion: 2
              });
              for (const ws of (proj.workspaces || [])) {
                saveWorkspaceToLocal(proj.id, ws.id, {
                  id: ws.id, name: ws.name || 'Workspace', nodes: ws.nodes || [], edges: ws.edges || [],
                  groups: ws.groups || [], pins: ws.pins || [], images: ws.images || [], lastModified: Date.now()
                });
              }
              saveTasks(proj.id, { tasks: proj.tasks || [], taskGroups: proj.taskGroups || [] });
              // Fire-and-forget Firestore sync
              if (isFirebaseConfigured()) {
                saveProjectToFirestore(proj.id, { id: proj.id, name: proj.name || 'Untitled', description: proj.description || '', thumbnail: proj.thumbnail || null, lastModified: proj.lastModified || Date.now(), workspaceIds: wsIds, activeTab: proj.activeTab || wsIds[0] || '', nextId: proj.nextId || 1, reminders: proj.reminders || [] }).catch(() => {});
                for (const ws of (proj.workspaces || [])) {
                  saveWorkspaceToFirestore(proj.id, ws.id, { id: ws.id, name: ws.name || 'Workspace', nodes: ws.nodes || [], edges: ws.edges || [], groups: ws.groups || [], pins: ws.pins || [], images: ws.images || [], lastModified: Date.now() }).catch(() => {});
                }
                saveTasksToFirestore(proj.id, { tasks: proj.tasks || [], taskGroups: proj.taskGroups || [] }).catch(() => {});
              }
            }
            // Update cm-meta
            saveMeta({ activeProjectId: restoredDefault, defaultProjectId: restoredDefault, schemaVersion: 2 });
            if (isFirebaseConfigured()) saveUserMeta({ activeProjectId: restoredDefault, defaultProjectId: restoredDefault }).catch(() => {});

            const defaultProj = migratedProjects.find(p => p.id === restoredDefault) || migratedProjects[0];
            if (defaultProj) {
              setWorkspaces(defaultProj.workspaces || []);
              setActiveTab(defaultProj.activeTab || defaultProj.workspaces?.[0]?.id || '');
              setNextId(defaultProj.nextId || 10);
              setTasks(normalizeTasks(defaultProj.tasks || []));
              const restoredTaskGroups = defaultProj.taskGroups || [{ id: 'inbox', name: 'Inbox', sortOrder: 0, color: 'slate' }];
              setTaskGroups(restoredTaskGroups.map((g, i) => ({
                ...g,
                color: g.color || GROUP_COLORS[i % GROUP_COLORS.length].id,
              })));
            }
          } catch (restoreErr) {
            // Rollback to previous state
            setProjects(previousProjects);
            setErrorMessage("Import failed. Previous data has been restored.");
          }
        } else {
          setErrorMessage("Invalid backup file format.");
        }
      } catch (err) {
        setErrorMessage("Invalid backup file format.");
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  // --- Partial Import ---
  const handlePartialImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.type !== 'nexus-partial-export' || !data.nodes || !Array.isArray(data.nodes)) {
          setErrorMessage("Invalid partial export file format.");
          return;
        }
        setPartialImportData(data);
        setPartialImportPlacement('center');
        setShowPartialImportDialog(true);
      } catch (err) {
        setErrorMessage("Failed to read partial export file.");
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const executePartialImport = () => {
    if (!partialImportData) return;
    takeSnapshot();

    const importedNodes = partialImportData.nodes || [];
    const importedEdges = partialImportData.edges || [];
    const importedGroups = partialImportData.groups || [];

    if (importedNodes.length === 0) {
      setErrorMessage("No nodes to import.");
      setShowPartialImportDialog(false);
      setPartialImportData(null);
      return;
    }

    // Calculate bounding box of imported content
    const minX = Math.min(...importedNodes.map(n => n.x));
    const minY = Math.min(...importedNodes.map(n => n.y));

    // Calculate target position based on placement
    let offsetX = 0;
    let offsetY = 0;

    if (partialImportPlacement === 'center') {
      if (workspaceRef.current) {
        const rect = workspaceRef.current.getBoundingClientRect();
        const centerX = (rect.width / 2 - transform.x) / transform.scale;
        const centerY = (rect.height / 2 - transform.y) / transform.scale;
        offsetX = centerX - minX - 170;
        offsetY = centerY - minY - 80;
      }
    } else if (partialImportPlacement === 'inside-selected' && focusedNodeId) {
      const targetNode = nodes.find(n => n.id === focusedNodeId);
      if (targetNode) {
        offsetX = targetNode.x - minX;
        offsetY = targetNode.y + 200 - minY;
      }
    } else if (partialImportPlacement === 'left' && focusedNodeId) {
      const targetNode = nodes.find(n => n.id === focusedNodeId);
      if (targetNode) {
        offsetX = targetNode.x - 400 - minX;
        offsetY = targetNode.y - minY;
      }
    } else if (partialImportPlacement === 'right' && focusedNodeId) {
      const targetNode = nodes.find(n => n.id === focusedNodeId);
      if (targetNode) {
        offsetX = targetNode.x + 400 - minX;
        offsetY = targetNode.y - minY;
      }
    } else if (partialImportPlacement === 'top' && focusedNodeId) {
      const targetNode = nodes.find(n => n.id === focusedNodeId);
      if (targetNode) {
        offsetX = targetNode.x - minX;
        offsetY = targetNode.y - 250 - minY;
      }
    } else if (partialImportPlacement === 'bottom' && focusedNodeId) {
      const targetNode = nodes.find(n => n.id === focusedNodeId);
      if (targetNode) {
        offsetX = targetNode.x - minX;
        offsetY = targetNode.y + 250 - minY;
      }
    } else if (partialImportPlacement === 'separate-branch') {
      const maxExistingX = nodes.length > 0 ? Math.max(...nodes.map(n => n.x)) : 0;
      offsetX = maxExistingX + 500 - minX;
      offsetY = -minY + 100;
    }

    // Generate new IDs and remap references
    let currentId = nextId;
    const nodeIdMap = {};
    const groupIdMap = {};

    importedGroups.forEach(g => {
      const newId = `g-imported-${currentId}`;
      groupIdMap[g.id] = newId;
      currentId++;
    });

    importedNodes.forEach(n => {
      const newId = currentId.toString();
      nodeIdMap[n.id] = newId;
      currentId++;
    });

    const newNodes = importedNodes.map(n => ({
      ...n,
      id: nodeIdMap[n.id],
      x: n.x + offsetX,
      y: n.y + offsetY,
      groupId: n.groupId ? (groupIdMap[n.groupId] || null) : null,
      cloneSourceId: null,
      workspaceId: activeTab
    }));

    const newEdges = importedEdges
      .filter(e => nodeIdMap[e.source] && nodeIdMap[e.target])
      .map(e => ({
        id: `e-${currentId++}`,
        source: nodeIdMap[e.source],
        target: nodeIdMap[e.target],
        workspaceId: activeTab
      }));

    const newGroups = importedGroups.map(g => ({
      ...g,
      id: groupIdMap[g.id],
      x: g.x + offsetX,
      y: g.y + offsetY,
      parentGroupId: g.parentGroupId ? (groupIdMap[g.parentGroupId] || null) : null,
      workspaceId: activeTab
    }));

    updateActiveWorkspace(ws => {
      const updatedNodes = [...ws.nodes, ...newNodes];
      const updatedGroups = [...ws.groups, ...newGroups];
      return {
        nodes: updatedNodes,
        edges: [...ws.edges, ...newEdges],
        groups: computeLayout(updatedGroups, updatedNodes)
      };
    });

    setNextId(currentId);
    setSelectedNodeIds(newNodes.map(n => n.id));
    setShowPartialImportDialog(false);
    setPartialImportData(null);
  };


  // --- Climb up the dragging hierarchy to fetch active drag-offsets ---
  const getLiveOffset = useCallback((item, parentGroupIdField) => {
    let dx = 0;
    let dy = 0;
    let currParentId = item[parentGroupIdField];

    while (currParentId) {
      const parentGroup = groups.find(g => g.id === currParentId);
      if (!parentGroup) break;

      if (draggingGroup?.id === parentGroup.id) {
        dx += draggingGroup.currentX - parentGroup.x;
        dy += draggingGroup.currentY - parentGroup.y;
        break; 
      }
      currParentId = parentGroup.parentGroupId;
    }
    return { dx, dy };
  }, [groups, draggingGroup]);

  const getLiveCoordinates = useCallback((item, isGroup) => {
    if (!isGroup) {
      const dragRef = draggingNodeRef.current;
      if (dragRef && dragRef.id === item.id) {
        return { x: dragRef.currentX, y: dragRef.currentY };
      }

      const offset = getLiveOffset(item, 'groupId');
      return { x: item.x + offset.dx, y: item.y + offset.dy };
    } else {
      if (draggingGroup && draggingGroup.id === item.id) {
        return { x: draggingGroup.currentX, y: draggingGroup.currentY };
      }
      const offset = getLiveOffset(item, 'parentGroupId');
      return { x: item.x + offset.dx, y: item.y + offset.dy };
    }
  }, [draggingGroup, getLiveOffset]);

  // --- Helper: Node Group Intersection Checker ---
  const getSpatiallyHoveredGroup = useCallback((nodeX, nodeY, nodeWidth) => {
    const NODE_WIDTH_VAL = nodeWidth || 280;
    const nodeCenterX = nodeX + NODE_WIDTH_VAL / 2;
    const nodeCenterY = nodeY + 80;

    // Collect all groups containing the point
    const containingGroups = [];
    for (const group of groups) {
      const coords = getLiveCoordinates(group, true);
      const gW = group.width || 440;
      const gH = group.height || 420;

      if (
        nodeCenterX >= coords.x &&
        nodeCenterX <= coords.x + gW &&
        nodeCenterY >= coords.y &&
        nodeCenterY <= coords.y + gH
      ) {
        containingGroups.push(group);
      }
    }

    if (containingGroups.length === 0) return null;

    // Return the deepest (most nested) group
    const getDepth = (g) => {
      let depth = 0;
      let curr = g;
      const visited = new Set();
      while (curr && curr.parentGroupId) {
        if (visited.has(curr.id)) break;
        visited.add(curr.id);
        depth++;
        curr = groups.find(p => p.id === curr.parentGroupId);
      }
      return depth;
    };

    containingGroups.sort((a, b) => getDepth(b) - getDepth(a));
    return containingGroups[0].id;
  }, [groups, getLiveCoordinates]);


  // --- Helper: Drag group over parent group ---
  const getSpatiallyHoveredGroupForGroup = useCallback((draggedGroupId, grpX, grpY, grpW, grpH) => {
    const center = {
      x: grpX + grpW / 2,
      y: grpY + 24
    };

    const { descendantGroupIds } = getDescendants(draggedGroupId, groups, nodes);

    for (const targetGroup of groups) {
      if (targetGroup.id === draggedGroupId) continue;
      if (descendantGroupIds.includes(targetGroup.id)) continue;
      if (isDescendantOf(targetGroup.id, draggedGroupId, groups)) continue;

      const coords = getLiveCoordinates(targetGroup, true);
      const tW = targetGroup.width || 440;
      const tH = targetGroup.height || 420;

      if (
        center.x >= coords.x &&
        center.x <= coords.x + tW &&
        center.y >= coords.y &&
        center.y <= coords.y + tH
      ) {
        return targetGroup.id;
      }
    }
    return null;
  }, [groups, nodes, getLiveCoordinates]);

  // --- Pointer Interactions (Pan, Drag & Resize) ---
  const handlePointerDownMain = (e) => {
    if (e.button !== 0) return;
    if (animTimerRef.current) { clearTimeout(animTimerRef.current); animTimerRef.current = null; }
    setIsAnimatingTransform(false);

    if (isSelectingTaskLocation) {
      const rect = workspaceRef.current.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left - transform.x) / transform.scale;
      const canvasY = (e.clientY - rect.top - transform.y) / transform.scale;

      const pinId = `pin-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const taskForLocation = tasks.find(t => t.id === selectingLocationForTaskId);
      const newPin = {
        id: pinId,
        name: taskForLocation?.title || 'Task Location',
        canvas_position_x: canvasX,
        canvas_position_y: canvasY,
        note: '',
        color: '#6366f1',
        icon: '\ud83c\udfaf',
        visibility_status: true,
        created_date: new Date().toISOString(),
        workspaceId: activeTab,
      };
      updateActiveWorkspace(ws => ({
        pins: [...(ws.pins || []), newPin],
      }));

      setTasks(prev => prev.map(t => t.id === selectingLocationForTaskId ? { ...t, locationPinId: pinId, locationWorkspaceId: activeTab } : t));

      setIsSelectingTaskLocation(false);
      setSelectingLocationForTaskId(null);
      setTaskPanelMode('panel');
      showToast('Task location set');
      return;
    }
    
    setOpenColorPicker(null);
    setOpenLinkPicker(null);
    setContextMenu(null);
    setNodeContextMenu(null);
    setGroupContextMenu(null);
    setCloneToTabMenu(null);
    setFocusedNodeId(null);
    setFocusedGroupId(null);
    setEditingPinOnCanvas(null);
    setSelectedPinId(null);

    const isClickBg = e.target === workspaceRef.current || e.target.classList.contains('canvas-grid-clickable');
    if (isClickBg) {
      if (e.shiftKey) {
        const coords = getWorkspaceCoords(e);
        setIsMultiSelecting(true);
        setSelectionBox({ startX: coords.x, startY: coords.y, endX: coords.x, endY: coords.y });
      } else {
        setSelectedNodeIds([]);
        setIsPanning(true);
        setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
      }
    }
  };


  const handlePointerMove = useCallback((e) => {
    if (isMultiSelecting && selectionBox) {
      const coords = getWorkspaceCoords(e);
      setSelectionBox(prev => prev ? { ...prev, endX: coords.x, endY: coords.y } : null);
      const minX = Math.min(selectionBox.startX, coords.x);
      const maxX = Math.max(selectionBox.startX, coords.x);
      const minY = Math.min(selectionBox.startY, coords.y);
      const maxY = Math.max(selectionBox.startY, coords.y);
      const NODE_W = 280;
      const NODE_H = 160;
      const insideNodes = nodes.filter(n => {
        const nx = n.x, ny = n.y;
        return (nx + NODE_W > minX && nx < maxX && ny + NODE_H > minY && ny < maxY);
      });
      const insideImages = (activeWs?.images || []).filter(img => {
        const iw = img.width || 280;
        const ih = img.height || 180;
        return (img.x + iw > minX && img.x < maxX && img.y + ih > minY && img.y < maxY);
      });
      const insideGroups = groups.filter(g => {
        const gw = g.width || 440;
        const gh = g.height || 420;
        return (g.x + gw > minX && g.x < maxX && g.y + gh > minY && g.y < maxY);
      });
      setSelectedNodeIds([...insideNodes.map(n => n.id), ...insideImages.map(img => img.id), ...insideGroups.map(g => g.id)]);
      return;
    }
    if (isPanning) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      }));
    } else if (draggingNode) {
      const dx = (e.clientX - draggingNode.startX) / transform.scale;
      const dy = (e.clientY - draggingNode.startY) / transform.scale;
      
      const newX = draggingNode.initialX + dx;
      const newY = draggingNode.initialY + dy;

      draggingNodeRef.current = {
        ...draggingNodeRef.current,
        currentX: newX,
        currentY: newY
      };

      setDraggingNode(prev => ({
        ...prev,
        currentX: newX,
        currentY: newY
      }));

      const activeGroupHoverId = getSpatiallyHoveredGroup(newX, newY, getNodeDimensions(nodes.find(n => n.id === draggingNode.id) || {}).width);
      setDragHoveredGroupId(activeGroupHoverId);

    } else if (draggingGroup) {
      const dx = (e.clientX - draggingGroup.startX) / transform.scale;
      const dy = (e.clientY - draggingGroup.startY) / transform.scale;

      const newX = draggingGroup.initialX + dx;
      const newY = draggingGroup.initialY + dy;

      setDraggingGroup(prev => ({
        ...prev,
        currentX: newX,
        currentY: newY
      }));

      const activeGroupHoverId = getSpatiallyHoveredGroupForGroup(
        draggingGroup.id,
        newX,
        newY,
        draggingGroup.width,
        draggingGroup.height
      );
      setDragHoveredGroupId(activeGroupHoverId);

    } else if (resizingGroup) {
      const dx = (e.clientX - resizingGroup.startX) / transform.scale;
      const dy = (e.clientY - resizingGroup.startY) / transform.scale;

      updateActiveWorkspace(ws => {
        const updatedGroups = ws.groups.map(g => {
          if (g.id === resizingGroup.id) {
            return {
              ...g,
              manualWidth: Math.max(280, resizingGroup.initialWidth + dx),
              manualHeight: Math.max(160, resizingGroup.initialHeight + dy)
            };
          }
          return g;
        });

        return {
          groups: computeLayout(updatedGroups, ws.nodes)
        };
      });
    } else if (connecting) {
      const coords = getWorkspaceCoords(e);
      setConnecting(prev => ({ ...prev, currentX: coords.x, currentY: coords.y }));
    } else if (draggingImage) {
      const dx = (e.clientX - draggingImage.startX) / transform.scale;
      const dy = (e.clientY - draggingImage.startY) / transform.scale;
      setDraggingImage(prev => ({
        ...prev,
        currentX: draggingImage.initialX + dx,
        currentY: draggingImage.initialY + dy
      }));
    } else if (draggingPin) {
      const dx = (e.clientX - draggingPin.startX) / transform.scale;
      const dy = (e.clientY - draggingPin.startY) / transform.scale;
      setDraggingPin(prev => ({
        ...prev,
        currentX: draggingPin.initialX + dx,
        currentY: draggingPin.initialY + dy
      }));
    }
  }, [draggingNode, draggingGroup, draggingImage, draggingPin, resizingGroup, isPanning, panStart, transform.scale, getWorkspaceCoords, getSpatiallyHoveredGroup, getSpatiallyHoveredGroupForGroup, updateActiveWorkspace, isMultiSelecting, selectionBox, nodes, getNodeDimensions]);


  const handlePointerUp = useCallback(() => {
    if (isMultiSelecting) {
      setIsMultiSelecting(false);
      setSelectionBox(null);
      return;
    }
    if (draggingNode) {
      const dragRef = draggingNodeRef.current || draggingNode;
      const movement = Math.hypot(
        dragRef.currentX - dragRef.initialX,
        dragRef.currentY - dragRef.initialY
      );

      if (movement >= 5) {
        const finalGroupAdoptId = dragHoveredGroupId;

        updateActiveWorkspace(ws => {
          let resolvedGroupId = finalGroupAdoptId;

          // For micro-drags (< 15px), preserve original groupId
          if (movement < 15) {
            const originalNode = ws.nodes.find(n => n.id === draggingNode.id);
            resolvedGroupId = originalNode ? originalNode.groupId : resolvedGroupId;
          } else if (resolvedGroupId === null) {
            const originalNode = ws.nodes.find(n => n.id === draggingNode.id);
            if (originalNode && originalNode.groupId) {
              const originalGroup = ws.groups.find(g => g.id === originalNode.groupId);
              if (originalGroup) {
                const nodeForDims = ws.nodes.find(n => n.id === draggingNode.id) || {};
                const NODE_WIDTH_VAL = getNodeDimensions(nodeForDims).width;
                const nodeCenterX = dragRef.currentX + NODE_WIDTH_VAL / 2;
                const nodeCenterY = dragRef.currentY + 80;
                const gW = originalGroup.width || 440;
                const gH = originalGroup.height || 420;

                if (
                  nodeCenterX >= originalGroup.x &&
                  nodeCenterX <= originalGroup.x + gW &&
                  nodeCenterY >= originalGroup.y &&
                  nodeCenterY <= originalGroup.y + gH
                ) {
                  resolvedGroupId = originalNode.groupId;
                }
              }
            }
          }

          const updatedNodes = ws.nodes.map(n => n.id === draggingNode.id 
            ? { ...n, x: dragRef.currentX, y: dragRef.currentY, groupId: resolvedGroupId } 
            : n);

          return {
            nodes: updatedNodes,
            groups: computeLayout(ws.groups, updatedNodes)
          };
        });

        if (dragSnapshot.current) {
          const snapshotToSave = dragSnapshot.current;
          const newPast = [...pastRef.current, snapshotToSave];
          updateHistory(newPast, []);
        }
      } else {
        // Click (no drag) - select the node
        setFocusedNodeId(draggingNode.id);
        setFocusedGroupId(null);
        bringToFront(draggingNode.id);
      }
    }

    if (draggingGroup) {
      if (draggingGroup.currentX !== draggingGroup.initialX || draggingGroup.currentY !== draggingGroup.initialY || dragHoveredGroupId !== draggingGroup.parentGroupId) {
        const dx = draggingGroup.currentX - draggingGroup.initialX;
        const dy = draggingGroup.currentY - draggingGroup.initialY;
        const finalParentId = dragHoveredGroupId;

        updateActiveWorkspace(ws => {
          const { descendantGroupIds, descendantNodeIds } = getDescendants(draggingGroup.id, ws.groups, ws.nodes);

          const updatedGroups = ws.groups.map(g => {
            if (g.id === draggingGroup.id) {
              return { ...g, x: g.x + dx, y: g.y + dy, parentGroupId: finalParentId };
            }
            if (descendantGroupIds.includes(g.id)) {
              return { ...g, x: g.x + dx, y: g.y + dy };
            }
            return g;
          });

          const updatedNodes = ws.nodes.map(n => {
            if (descendantNodeIds.includes(n.id)) {
              return { ...n, x: n.x + dx, y: n.y + dy };
            }
            return n;
          });

          const updatedImages = (ws.images || []).map(img => {
            if (img.groupId === draggingGroup.id || descendantGroupIds.includes(img.groupId)) {
              return { ...img, x: img.x + dx, y: img.y + dy };
            }
            return img;
          });

          return {
            groups: computeLayout(updatedGroups, updatedNodes),
            nodes: updatedNodes,
            images: updatedImages
          };
        });

        if (dragSnapshot.current) {
          const snapshotToSave = dragSnapshot.current;
          const newPast = [...pastRef.current, snapshotToSave];
          updateHistory(newPast, []);
        }
      }
    }

    if (resizingGroup) {
      if (dragSnapshot.current) {
        const snapshotToSave = dragSnapshot.current;
        const newPast = [...pastRef.current, snapshotToSave];
        updateHistory(newPast, []);
      }
    }

    if (draggingImage) {
      if (draggingImage.currentX !== draggingImage.initialX || draggingImage.currentY !== draggingImage.initialY) {
        updateActiveWorkspace(ws => {
          const imgObj = (ws.images || []).find(img => img.id === draggingImage.id);
          const imgW = imgObj ? imgObj.width || 280 : 280;
          const imgH = imgObj ? imgObj.height || 200 : 200;
          const imgCenterX = draggingImage.currentX + imgW / 2;
          const imgCenterY = draggingImage.currentY + imgH / 2;

          let newGroupId = null;
          const containingGroups = [];
          for (const group of ws.groups) {
            const gW = group.width || 440;
            const gH = group.height || 420;
            if (imgCenterX >= group.x && imgCenterX <= group.x + gW && imgCenterY >= group.y && imgCenterY <= group.y + gH) {
              containingGroups.push(group);
            }
          }
          if (containingGroups.length > 0) {
            const getDepth = (g) => {
              let depth = 0;
              let curr = g;
              while (curr && curr.parentGroupId) { depth++; curr = ws.groups.find(p => p.id === curr.parentGroupId); }
              return depth;
            };
            containingGroups.sort((a, b) => getDepth(b) - getDepth(a));
            newGroupId = containingGroups[0].id;
          }

          return {
            images: (ws.images || []).map(img => img.id === draggingImage.id
              ? { ...img, x: draggingImage.currentX, y: draggingImage.currentY, groupId: newGroupId }
              : img)
          };
        });
        if (dragSnapshot.current) {
          const snapshotToSave = dragSnapshot.current;
          const newPast = [...pastRef.current, snapshotToSave];
          updateHistory(newPast, []);
        }
      }
    }

    if (draggingPin) {
      if (draggingPin.currentX !== draggingPin.initialX || draggingPin.currentY !== draggingPin.initialY) {
        pinDraggedRef.current = true;
        updateActiveWorkspace(ws => ({
          pins: (ws.pins || []).map(p => p.id === draggingPin.id ? { ...p, canvas_position_x: draggingPin.currentX, canvas_position_y: draggingPin.currentY } : p)
        }));
      }
    }

    setDraggingNode(null);
    draggingNodeRef.current = null;
    setDraggingGroup(null);
    setResizingGroup(null);
    setDragHoveredGroupId(null);
    setConnecting(null);
    setConnectHoverNodeId(null);
    setIsPanning(false);
    setDraggingImage(null);
    setDraggingPin(null);
    dragSnapshot.current = null;
  }, [draggingNode, draggingGroup, draggingImage, draggingPin, resizingGroup, dragHoveredGroupId, updateActiveWorkspace, updateHistory, isMultiSelecting, getNodeDimensions]);


  // --- Node, Edge, and Group Creators ---
  const handleCanvasImageDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const MAX_SIZE = 1024;
        if (width > height && width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

        const rect = workspaceRef.current.getBoundingClientRect();
        const dropX = (e.clientX - rect.left - transform.x) / transform.scale;
        const dropY = (e.clientY - rect.top - transform.y) / transform.scale;

        const displayWidth = 280;
        const displayHeight = Math.round((height / width) * displayWidth);

        // Check if image was dropped inside a group
        const imgCenterX = dropX + displayWidth / 2;
        const imgCenterY = dropY + displayHeight / 2;
        let imageGroupId = null;
        const currentGroups = stateRef.current.workspaces.find(w => w.id === stateRef.current.activeTab)?.groups || [];
        const containingGroups = [];
        for (const group of currentGroups) {
          const gW = group.width || 440;
          const gH = group.height || 420;
          if (imgCenterX >= group.x && imgCenterX <= group.x + gW && imgCenterY >= group.y && imgCenterY <= group.y + gH) {
            containingGroups.push(group);
          }
        }
        if (containingGroups.length > 0) {
          const getDepth = (g) => {
            let depth = 0;
            let curr = g;
            while (curr && curr.parentGroupId) { depth++; curr = currentGroups.find(p => p.id === curr.parentGroupId); }
            return depth;
          };
          containingGroups.sort((a, b) => getDepth(b) - getDepth(a));
          imageGroupId = containingGroups[0].id;
        }

        takeSnapshot();
        updateActiveWorkspace(ws => ({
          images: [...(ws.images || []), {
            id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            x: dropX,
            y: dropY,
            width: displayWidth,
            height: displayHeight,
            src: compressedBase64,
            groupId: imageGroupId,
            workspaceId: activeTab
          }]
        }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const deleteImage = (imgId) => {
    takeSnapshot();
    updateActiveWorkspace(ws => ({
      images: (ws.images || []).filter(i => i.id !== imgId),
      edges: ws.edges.filter(e => e.source !== imgId && e.target !== imgId)
    }));
  };

  const addNode = (clientX, clientY, targetGroupId = null) => {
    if (!workspaceRef.current) return;
    takeSnapshot();
    const rect = workspaceRef.current.getBoundingClientRect();
    let targetX, targetY;

    if (clientX !== undefined && clientY !== undefined) {
      targetX = (clientX - rect.left - transform.x) / transform.scale;
      targetY = (clientY - rect.top - transform.y) / transform.scale;
    } else if (rect.width > 0 && rect.height > 0) {
      targetX = (rect.width / 2 - transform.x) / transform.scale - 150;
      targetY = (rect.height / 2 - transform.y) / transform.scale - 50;
    } else {
      // Canvas not visible, place at a default position relative to existing nodes
      const existingNodes = activeWs?.nodes || [];
      const maxX = existingNodes.length > 0 ? Math.max(...existingNodes.map(n => n.x)) + 320 : 200;
      targetX = maxX;
      targetY = 200;
    }

    const newNode = {
      id: nextId.toString(),
      workspaceId: activeTab,
      x: targetX, y: targetY,
      title: 'New Card', content: '', theme: 'blue',
      groupId: targetGroupId, cloneSourceId: null
    };
    
    updateActiveWorkspace(ws => {
      const updatedNodes = [...ws.nodes, newNode];
      return {
        nodes: updatedNodes,
        groups: computeLayout(ws.groups, updatedNodes)
      };
    });
    setNextId(prev => prev + 1);
  };

  const addNodeRef = useRef(addNode);
  useEffect(() => { addNodeRef.current = addNode; });

  // --- Pin System Functions ---
  const addPin = (canvasX, canvasY) => {
    const currentPins = activeWs?.pins || [];
    const pinCount = currentPins.length + 1;
    const newPin = {
      id: `pin-${Date.now()}`,
      workspaceId: activeTab,
      name: `Pin ${pinCount}`,
      canvas_position_x: canvasX,
      canvas_position_y: canvasY,
      note: '',
      color: '#ef4444',
      icon: '\ud83d\udccc',
      visibility_status: true,
      created_date: new Date().toISOString(),
    };
    updateActiveWorkspace(ws => ({
      pins: [...(ws.pins || []), newPin],
    }));
    showToast(`Pin dropped: ${newPin.name}`);
  };

  const addPinRef = useRef(addPin);
  useEffect(() => { addPinRef.current = addPin; });

  const updatePin = (pinId, updates, workspaceId) => {
    const targetId = workspaceId || activeTab;
    setWorkspaces(prev => prev.map(ws => ws.id === targetId ? { ...ws, pins: (ws.pins || []).map(p => p.id === pinId ? { ...p, ...updates } : p) } : ws));
  };

  const deletePin = (pinId, workspaceId) => {
    const targetId = workspaceId || activeTab;
    // Clear locationPinId/locationWorkspaceId on any task referencing this pin
    setTasks(prev => prev.map(t =>
      t.locationPinId === pinId
        ? { ...t, locationPinId: undefined, locationWorkspaceId: undefined }
        : t
    ));
    setWorkspaces(prev => prev.map(ws => ws.id === targetId ? { ...ws, pins: (ws.pins || []).filter(p => p.id !== pinId) } : ws));
    if (editingPinOnCanvas === pinId) setEditingPinOnCanvas(null);
    if (focusedPinId === pinId) setFocusedPinId(null);
  };

  const togglePinVisibility = (pinId, workspaceId) => {
    const targetId = workspaceId || activeTab;
    setWorkspaces(prev => prev.map(ws => ws.id === targetId ? { ...ws, pins: (ws.pins || []).map(p => p.id === pinId ? { ...p, visibility_status: !p.visibility_status } : p) } : ws));
  };

  const toggleAllPinsVisibility = (visible) => {
    updateActiveWorkspace(ws => ({
      pins: (ws.pins || []).map(p => ({ ...p, visibility_status: visible })),
    }));
  };

  const navigateToPin = (pinId, workspaceId) => {
    // Switch workspace if needed
    if (workspaceId && workspaceId !== activeTab) {
      setActiveTab(workspaceId);
    }
    const targetWs = workspaceId ? workspaces.find(w => w.id === workspaceId) : activeWs;
    const pin = (targetWs?.pins || []).find(p => p.id === pinId);
    if (!pin || !workspaceRef.current) return;
    const rect = workspaceRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    setTransform(prev => ({
      x: centerX - pin.canvas_position_x * prev.scale,
      y: centerY - pin.canvas_position_y * prev.scale,
      scale: prev.scale,
    }));
    setFocusedPinId(pinId);
    setTimeout(() => setFocusedPinId(null), 2000);
  };

  // --- Task System Functions ---
  const normalizeTasks = (taskList) => {
    return taskList.map((t, i) => ({
      ...t,
      groupId: t.groupId || 'inbox',
      sortOrder: t.sortOrder || (i + 1),
    }));
  };

  const getTaskSection = (task) => {
    if (task.status === 'completed') return 'completed';
    return 'active';
  };

  const addTask = (taskData) => {
    const newId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setTasks(prev => {
      const newTask = {
        id: newId,
        createdAt: new Date().toISOString(),
        status: 'todo',
        sortOrder: Math.max(0, ...prev.map(t => (t.sortOrder || 0))) + 1,
        ...taskData,
      };
      return [...prev, newTask];
    });
    return newId;
  };

  const updateTask = (taskId, updates) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
  };

  const deleteTask = (taskId) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === taskId);
      if (task && task.locationPinId) {
        // Remove the orphaned pin from all workspaces
        setWorkspaces(wsArr => wsArr.map(ws => ({
          ...ws,
          pins: (ws.pins || []).filter(p => p.id !== task.locationPinId),
        })));
      }
      return prev.filter(t => t.id !== taskId);
    });
  };

  const reorderTask = (taskId, direction, partitionBy = 'section', targetPosition) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === taskId);
      if (!task) return prev;
      let peerTasks;
      if (partitionBy === 'group') {
        const groupKey = task.groupId || 'inbox';
        peerTasks = prev.filter(t => (t.groupId || 'inbox') === groupKey).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      } else {
        const section = getTaskSection(task);
        peerTasks = prev.filter(t => getTaskSection(t) === section).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      }
      const idx = peerTasks.findIndex(t => t.id === taskId);

      if (direction === 'top') {
        if (idx === 0) return prev;
        // Re-index: place this task at position 1, shift others down
        const reindexed = {};
        const others = peerTasks.filter(t => t.id !== taskId);
        reindexed[taskId] = 1;
        others.forEach((t, i) => { reindexed[t.id] = i + 2; });
        return prev.map(t => reindexed[t.id] !== undefined ? { ...t, sortOrder: reindexed[t.id] } : t);
      }

      if (direction === 'bottom') {
        if (idx === peerTasks.length - 1) return prev;
        // Re-index: place this task at end, others get sequential from 1
        const reindexed = {};
        const others = peerTasks.filter(t => t.id !== taskId);
        others.forEach((t, i) => { reindexed[t.id] = i + 1; });
        reindexed[taskId] = others.length + 1;
        return prev.map(t => reindexed[t.id] !== undefined ? { ...t, sortOrder: reindexed[t.id] } : t);
      }

      if (direction === 'toPosition') {
        const pos = Math.max(1, Math.min(targetPosition || 1, peerTasks.length));
        if (pos === idx + 1) return prev;
        // Remove task from list and insert at target position (1-based)
        const others = peerTasks.filter(t => t.id !== taskId);
        others.splice(pos - 1, 0, task);
        const reindexed = {};
        others.forEach((t, i) => { reindexed[t.id] = i + 1; });
        return prev.map(t => reindexed[t.id] !== undefined ? { ...t, sortOrder: reindexed[t.id] } : t);
      }

      // Existing up/down logic
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= peerTasks.length) return prev;
      // Re-index peer tasks with sequential sortOrder to ensure unique values
      const reindexed = {};
      peerTasks.forEach((t, i) => { reindexed[t.id] = i + 1; });
      // Swap the two positions
      const targetId = peerTasks[swapIdx].id;
      const temp = reindexed[taskId];
      reindexed[taskId] = reindexed[targetId];
      reindexed[targetId] = temp;
      return prev.map(t => reindexed[t.id] !== undefined ? { ...t, sortOrder: reindexed[t.id] } : t);
    });
  };

  const startLocationSelection = (taskId) => {
    setIsSelectingTaskLocation(true);
    setSelectingLocationForTaskId(taskId);
    setTaskPanelMode('closed');
  };

  const cancelLocationSelection = () => {
    setIsSelectingTaskLocation(false);
    setSelectingLocationForTaskId(null);
    setTaskPanelMode('panel');
  };

  const navigateToTaskLocation = (pinId, workspaceId) => {
    navigateToPin(pinId, workspaceId);
  };

  // --- Task Group CRUD ---
  const addTaskGroup = (name, color) => {
    setTaskGroups(prev => {
      const assignedColor = color || GROUP_COLORS[prev.length % GROUP_COLORS.length].id;
      const newGroup = {
        id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        sortOrder: Math.max(0, ...prev.map(g => (g.sortOrder || 0))) + 1,
        color: assignedColor,
      };
      return [...prev, newGroup];
    });
  };

  const renameTaskGroup = (groupId, newName) => {
    setTaskGroups(prev => prev.map(g => g.id === groupId ? { ...g, name: newName } : g));
  };

  const updateTaskGroupColor = (groupId, color) => {
    setTaskGroups(prev => prev.map(g => g.id === groupId ? { ...g, color } : g));
  };

  const deleteTaskGroup = (groupId) => {
    if (groupId === 'inbox') return;
    // Move tasks from deleted group to inbox
    setTasks(prev => prev.map(t => (t.groupId === groupId ? { ...t, groupId: 'inbox' } : t)));
    setTaskGroups(prev => prev.filter(g => g.id !== groupId));
  };

  const reorderTaskGroup = (groupId, direction) => {
    setTaskGroups(prev => {
      const sorted = [...prev].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      const idx = sorted.findIndex(g => g.id === groupId);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return prev;
      const reindexed = {};
      sorted.forEach((g, i) => { reindexed[g.id] = i + 1; });
      const targetId = sorted[swapIdx].id;
      const temp = reindexed[groupId];
      reindexed[groupId] = reindexed[targetId];
      reindexed[targetId] = temp;
      return prev.map(g => reindexed[g.id] !== undefined ? { ...g, sortOrder: reindexed[g.id] } : g);
    });
  };

  const createGroup = (clientX, clientY) => {
    takeSnapshot();
    const rect = workspaceRef.current.getBoundingClientRect();
    let targetX, targetY;

    if (clientX !== undefined && clientY !== undefined) {
      targetX = (clientX - rect.left - transform.x) / transform.scale;
      targetY = (clientY - rect.top - transform.y) / transform.scale;
    } else {
      targetX = (rect.width / 2 - transform.x) / transform.scale - 200;
      targetY = (rect.height / 2 - transform.y) / transform.scale - 150;
    }

    const newGroup = {
      id: `g-${Date.now()}`,
      workspaceId: activeTab,
      name: 'Dynamic Section',
      x: targetX, y: targetY,
      width: 440, height: 420,
      theme: 'blue',
      parentGroupId: null
    };
    updateActiveWorkspace(ws => ({ groups: [...ws.groups, newGroup] }));
  };

  const duplicateNode = (nodeId) => {
    takeSnapshot();
    const target = nodes.find(n => n.id === nodeId);
    if (!target) return;

    const dup = {
      id: nextId.toString(),
      workspaceId: activeTab,
      x: target.x + 40,
      y: target.y + 40,
      title: `${target.title} (Copy)`,
      content: target.content || '',
      theme: target.theme,
      groupId: target.groupId,
      cloneSourceId: null,
      linkToTab: target.linkToTab || null
    };

    updateActiveWorkspace(ws => {
      const updatedNodes = [...ws.nodes, dup];
      return {
        nodes: updatedNodes,
        groups: computeLayout(ws.groups, updatedNodes)
      };
    });
    setNextId(prev => prev + 1);
  };

  const cloneNode = (nodeId) => {
    takeSnapshot();
    const target = nodes.find(n => n.id === nodeId);
    if (!target) return;

    // Determine the clone source: if target is already a clone, use its source; otherwise use target itself
    const sourceId = target.cloneSourceId || target.id;

    const clone = {
      id: nextId.toString(),
      workspaceId: activeTab,
      x: target.x + 60,
      y: target.y + 60,
      title: target.title,
      content: target.content,
      theme: target.theme,
      groupId: null,
      cloneSourceId: sourceId
    };

    updateActiveWorkspace(ws => {
      const updatedNodes = [...ws.nodes, clone];
      return {
        nodes: updatedNodes,
        groups: computeLayout(ws.groups, updatedNodes)
      };
    });
    setNextId(prev => prev + 1);
  };

  const cloneNodeToWorkspace = (nodeId, targetWorkspaceId) => {
    takeSnapshot();
    const target = nodes.find(n => n.id === nodeId);
    if (!target) return;

    const sourceId = target.cloneSourceId || target.id;

    // Compute an offset position to avoid stacking clones
    const targetWs = workspaces.find(ws => ws.id === targetWorkspaceId);
    const targetNodes = targetWs ? targetWs.nodes : [];
    const existingClonesCount = targetNodes.filter(n => n.cloneSourceId === sourceId).length;
    const cloneX = 200 + 60 * existingClonesCount;
    const cloneY = 200 + 60 * existingClonesCount;

    const clone = {
      id: nextId.toString(),
      x: cloneX,
      y: cloneY,
      title: target.title,
      content: target.content,
      theme: target.theme,
      groupId: null,
      cloneSourceId: sourceId,
      workspaceId: targetWorkspaceId
    };

    setWorkspaces(prev => prev.map(ws => {
      if (ws.id !== targetWorkspaceId) return ws;
      const updatedNodes = [...ws.nodes, clone];
      return { ...ws, nodes: updatedNodes, groups: computeLayout(ws.groups, updatedNodes) };
    }));
    setNextId(prev => prev + 1);
  };

  const disconnectNodeLinks = (nodeId) => {
    takeSnapshot();
    updateActiveWorkspace(ws => ({
      edges: ws.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
    }));
  };


  const updateGroup = (id, updates) => updateActiveWorkspace(ws => {
    const updatedGroups = ws.groups.map(g => g.id === id ? { ...g, ...updates } : g);
    return {
      groups: computeLayout(updatedGroups, ws.nodes)
    };
  });

  const deleteGroup = (id) => {
    takeSnapshot();
    updateActiveWorkspace(ws => {
      const filteredGroups = ws.groups.filter(g => g.id !== id).map(g => g.parentGroupId === id ? { ...g, parentGroupId: null } : g);
      const updatedNodes = ws.nodes.map(n => n.groupId === id ? { ...n, groupId: null } : n);
      return {
        groups: computeLayout(filteredGroups, updatedNodes),
        nodes: updatedNodes
      };
    });
  };

  const updateNode = (id, updates) => {
    // Single atomic state update that handles both the direct node edit
    // and cross-workspace clone propagation in one pass
    const syncFields = {};
    if (updates.title !== undefined) syncFields.title = updates.title;
    if (updates.content !== undefined) syncFields.content = updates.content;
    const shouldPropagate = Object.keys(syncFields).length > 0;

    setWorkspaces(prev => {
      // Find the source id for clone propagation
      let sourceId = null;
      if (shouldPropagate) {
        for (const ws of prev) {
          const found = ws.nodes.find(n => n.id === id);
          if (found) {
            sourceId = found.cloneSourceId || found.id;
            break;
          }
        }
      }

      return prev.map(ws => {
        const isActiveWs = ws.id === activeTab;
        const hasEditedNode = ws.nodes.some(n => n.id === id);
        const hasRelatedClone = shouldPropagate && sourceId && ws.nodes.some(n =>
          n.id === sourceId || n.cloneSourceId === sourceId
        );

        if (!isActiveWs && !hasEditedNode && !hasRelatedClone) return ws;

        const updatedNodes = ws.nodes.map(n => {
          // Apply direct update to the edited node
          if (n.id === id) return { ...n, ...updates };
          // Propagate title/content to related clones
          if (shouldPropagate && sourceId && (n.id === sourceId || n.cloneSourceId === sourceId)) {
            return { ...n, ...syncFields };
          }
          return n;
        });

        return { ...ws, nodes: updatedNodes, groups: computeLayout(ws.groups, updatedNodes) };
      });
    });
  };

  const deleteNode = (id) => {
    takeSnapshot();
    updateActiveWorkspace(ws => {
      const filteredNodes = ws.nodes.filter(n => n.id !== id)
        .map(n => n.cloneSourceId === id ? { ...n, cloneSourceId: null } : n);
      return {
        nodes: filteredNodes,
        edges: ws.edges.filter(e => e.source !== id && e.target !== id),
        groups: computeLayout(ws.groups, filteredNodes)
      };
    });
  };

  const bringToFront = (id) => {
    updateActiveWorkspace(ws => {
      const idx = ws.nodes.findIndex(n => n.id === id);
      if (idx === -1) return ws;
      const newNodes = [...ws.nodes];
      const [node] = newNodes.splice(idx, 1);
      newNodes.push(node);
      return { nodes: newNodes };
    });
  };

  const sendToBack = (id) => {
    updateActiveWorkspace(ws => {
      const idx = ws.nodes.findIndex(n => n.id === id);
      if (idx === -1) return ws;
      const newNodes = [...ws.nodes];
      const [node] = newNodes.splice(idx, 1);
      newNodes.unshift(node);
      return { nodes: newNodes };
    });
  };

  // --- Timer Functions ---
  const startTimer = (minutes) => {
    setTimerSeconds(minutes * 60);
    setTimerRunning(true);
    setTimerPaused(false);
    setTimerDone(false);
  };
  const pauseTimer = () => { setTimerPaused(true); };
  const resumeTimer = () => { setTimerPaused(false); };
  const resetTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setTimerRunning(false);
    setTimerPaused(false);
    setTimerSeconds(0);
    setTimerDone(false);
  };
  const formatTimerDisplay = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const clearAllNodes = () => { takeSnapshot(); updateActiveWorkspace(() => ({ nodes: [], edges: [], groups: [] })); setShowConfirmClear(false); };
  const removeEdge = (edgeId) => { takeSnapshot(); updateActiveWorkspace(ws => ({ edges: ws.edges.filter(e => e.id !== edgeId) })); };

  const drawCurve = (x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);

    if (dist < 20) {
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }

    const absDx = Math.abs(dx);
    const offset = dx > 0
      ? Math.min(absDx * 0.5, Math.max(dist * 0.3, 20))
      : Math.max(50, dist * 0.4);

    if (dx > 0) {
      return `M ${x1} ${y1} C ${x1 + offset} ${y1}, ${x2 - offset} ${y2}, ${x2} ${y2}`;
    } else {
      const vertOffset = Math.max(Math.abs(dy) * 0.5, 40);
      const sign = dy >= 0 ? -1 : 1;
      return `M ${x1} ${y1} C ${x1 + offset} ${y1 + sign * vertOffset}, ${x2 - offset} ${y2 + sign * vertOffset}, ${x2} ${y2}`;
    }
  };

  // --- Collision Overlap Disperser (Jitter) ---
  const disperseOverlappingNodes = () => {
    takeSnapshot();
    updateActiveWorkspace(ws => {
      const adjustedNodes = [...ws.nodes];
      let conflictResolved = false;

      for (let i = 0; i < adjustedNodes.length; i++) {
        for (let j = i + 1; j < adjustedNodes.length; j++) {
          const dx = adjustedNodes[i].x - adjustedNodes[j].x;
          const dy = adjustedNodes[i].y - adjustedNodes[j].y;
          const dist = Math.hypot(dx, dy);
          
          if (dist < 40) { 
            adjustedNodes[j] = {
              ...adjustedNodes[j],
              x: adjustedNodes[j].x + 60,
              y: adjustedNodes[j].y + 60
            };
            conflictResolved = true;
          }
        }
      }

      if (conflictResolved) {
        return {
          nodes: adjustedNodes,
          groups: computeLayout(ws.groups, adjustedNodes)
        };
      }
      return ws;
    });
  };


  // --- Auto-Layout Engine ---
  const autoAlignWorkspace = () => {
    takeSnapshot();
    
    const resetGroups = groups.map(g => ({
      ...g,
      manualWidth: undefined,
      manualHeight: undefined
    }));

    const rootGroups = resetGroups.filter(g => !g.parentGroupId);
    let currentRootX = 100;

    const alignGroupContents = (groupId, startX, startY, updatedNodes, updatedGroups) => {
      let currentY = startY + 80;

      const groupNodes = updatedNodes.filter(n => n.groupId === groupId);
      const groupNodeIds = new Set(groupNodes.map(n => n.id));

      // Find edges that connect nodes within this group
      const intraGroupEdges = edges.filter(e => groupNodeIds.has(e.source) && groupNodeIds.has(e.target));

      // Separate connected vs unconnected nodes
      const connectedNodeIds = new Set();
      intraGroupEdges.forEach(e => {
        connectedNodeIds.add(e.source);
        connectedNodeIds.add(e.target);
      });

      const connectedNodes = groupNodes.filter(n => connectedNodeIds.has(n.id));
      const unconnectedNodes = groupNodes.filter(n => !connectedNodeIds.has(n.id));

      if (connectedNodes.length > 0) {
        // Build adjacency for topological sort (depth assignment)
        const inDegree = {};
        const adj = {};
        connectedNodes.forEach(n => { inDegree[n.id] = 0; adj[n.id] = []; });
        intraGroupEdges.forEach(e => {
          if (adj[e.source]) adj[e.source].push(e.target);
          if (inDegree[e.target] !== undefined) inDegree[e.target]++;
        });

        // Assign depth via BFS (Kahn's algorithm)
        const depth = {};
        const queue = [];
        connectedNodes.forEach(n => { if (inDegree[n.id] === 0) { queue.push(n.id); depth[n.id] = 0; } });
        let qi = 0;
        while (qi < queue.length) {
          const cur = queue[qi++];
          (adj[cur] || []).forEach(t => {
            inDegree[t]--;
            depth[t] = Math.max(depth[t] || 0, (depth[cur] || 0) + 1);
            if (inDegree[t] === 0) queue.push(t);
          });
        }
        // Handle cycles: assign remaining nodes to max depth + 1
        connectedNodes.forEach(n => { if (depth[n.id] === undefined) depth[n.id] = (Math.max(...Object.values(depth), 0)) + 1; });

        // Group nodes by column (depth)
        const columns = {};
        connectedNodes.forEach(n => {
          const d = depth[n.id] || 0;
          if (!columns[d]) columns[d] = [];
          columns[d].push(n);
        });

        const NODE_WIDTH = 380;
        const H_GAP = 80;
        const V_GAP = 30;
        const baseX = startX + 40;
        const baseY = currentY;
        let maxBottomY = baseY;

        const sortedDepths = Object.keys(columns).map(Number).sort((a, b) => a - b);
        const positionMap = {};

        sortedDepths.forEach((d, colIdx) => {
          const colX = baseX + colIdx * (NODE_WIDTH + H_GAP);
          let colY = baseY;
          columns[d].forEach(n => {
            positionMap[n.id] = { x: colX, y: colY };
            colY += 180 + V_GAP;
          });
          maxBottomY = Math.max(maxBottomY, colY);
        });

        updatedNodes = updatedNodes.map(n => {
          if (positionMap[n.id]) {
            return { ...n, x: positionMap[n.id].x, y: positionMap[n.id].y };
          }
          return n;
        });

        currentY = maxBottomY + 20;
      }

      // Stack unconnected nodes vertically below
      updatedNodes = updatedNodes.map(n => {
        if (n.groupId === groupId && !connectedNodeIds.has(n.id)) {
          const nodeX = startX + 40;
          const nodeY = currentY;
          currentY += 180 + 30;
          return { ...n, x: nodeX, y: nodeY };
        }
        return n;
      });

      updatedGroups = updatedGroups.map(sg => {
        if (sg.parentGroupId === groupId) {
          const sgX = startX + 40;
          const sgY = currentY;
          
          const res = alignGroupContents(sg.id, sgX, sgY, updatedNodes, updatedGroups);
          updatedNodes = res.nodes;
          updatedGroups = res.groups;

          const innerN = updatedNodes.filter(n => n.groupId === sg.id);
          const innerS = updatedGroups.filter(g => g.parentGroupId === sg.id);
          let maxChildY = sgY + 160;
          let maxChildX = sgX + 400;
          innerN.forEach(n => {
            maxChildY = Math.max(maxChildY, n.y + 180);
            maxChildX = Math.max(maxChildX, n.x + 280);
          });
          innerS.forEach(s => {
            maxChildY = Math.max(maxChildY, s.y + (s.height || 420));
            maxChildX = Math.max(maxChildX, s.x + (s.width || 440));
          });
          
          const computedWidth = Math.max(440, maxChildX - sgX + 40);
          currentY = maxChildY + 40;
          return { ...sg, x: sgX, y: sgY, width: computedWidth, height: Math.max(320, maxChildY - sgY + 20) };
        }
        return sg;
      });

      return { nodes: updatedNodes, groups: updatedGroups };
    };

    let workingNodes = [...nodes];
    let workingGroups = [...resetGroups];

    rootGroups.forEach((rg) => {
      const rgX = currentRootX;
      const rgY = 100;
      
      workingGroups = workingGroups.map(g => g.id === rg.id ? { ...g, x: rgX, y: rgY } : g);

      const res = alignGroupContents(rg.id, rgX, rgY, workingNodes, workingGroups);
      workingNodes = res.nodes;
      workingGroups = res.groups;

      // Compute actual width of this root group by examining all nodes and descendant subgroups
      const { descendantGroupIds, descendantNodeIds } = getDescendants(rg.id, workingGroups, workingNodes);
      const allGroupIds = [rg.id, ...descendantGroupIds];
      const allNodeIds = [...descendantNodeIds, ...workingNodes.filter(n => n.groupId === rg.id).map(n => n.id)];

      let maxX = rgX + 440;

      allNodeIds.forEach(nid => {
        const n = workingNodes.find(nd => nd.id === nid);
        if (n) {
          maxX = Math.max(maxX, n.x + 280);
        }
      });

      allGroupIds.forEach(gid => {
        const g = workingGroups.find(gr => gr.id === gid);
        if (g) {
          maxX = Math.max(maxX, g.x + (g.width || 440));
        }
      });

      currentRootX = maxX + 60;
    });

    const looseNodes = workingNodes.filter(n => !n.groupId);
    const looseX = currentRootX;
    let looseY = 100;

    workingNodes = workingNodes.map(node => {
      if (!node.groupId) {
        const nodeY = looseY;
        looseY += 180 + 40;
        return { ...node, x: looseX, y: nodeY };
      }
      return node;
    });

    const finalGroups = computeLayout(workingGroups, workingNodes);

    setWorkspaces(prev => prev.map(ws => ws.id === activeTab ? {
      ...ws,
      groups: finalGroups,
      nodes: workingNodes
    } : ws));
  };




  const HEADER_CENTER_Y = 24;

  const getConnectionPoint = (nodeId, isSource) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
      // Check if it's an image object
      const img = (activeWs?.images || []).find(i => i.id === nodeId);
      if (img) {
        const imgX = draggingImage?.id === img.id ? draggingImage.currentX : img.x;
        const imgY = draggingImage?.id === img.id ? draggingImage.currentY : img.y;
        return {
          x: isSource ? imgX + (img.width || 280) : imgX,
          y: imgY + (img.height || 180) / 2
        };
      }
      // Check if it's a group
      const group = groups.find(g => g.id === nodeId);
      if (group) {
        const coords = getLiveCoordinates(group, true);
        const gW = group.width || 440;
        const gH = group.height || 420;
        return {
          x: isSource ? coords.x + gW : coords.x,
          y: coords.y + gH / 2
        };
      }
      return null;
    }

    const dims = getNodeDimensions(node);
    const coords = getLiveCoordinates(node, false);
    return {
      x: isSource ? coords.x + dims.width : coords.x,
      y: coords.y + HEADER_CENTER_Y
    };
  };

  const getCardStats = () => {
    const total = nodes.length;
    return { total };
  };

  const stats = getCardStats();

  if (!initialized || !activeWs) return null;


  // --- Outline Board Content ---
  const renderOutlineCard = (node) => {
    const nTheme = THEMES[node.theme] || THEMES.blue;
    const isExpanded = expandedOutlineCards[node.id];
    return (
      <div key={node.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200">
        <div className={`flex items-center gap-2 px-3 py-2.5 border-b ${isExpanded ? 'border-slate-100' : 'border-transparent'}`}>
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${nTheme.port}`} />
          <span className="flex-1 text-xs font-semibold text-slate-700 line-clamp-2 break-words">{node.title || `Card #${node.id}`}</span>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setExpandedOutlineCards(prev => ({...prev, [node.id]: !prev[node.id]}))} className="p-1 hover:bg-slate-100 rounded-md text-slate-400">
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => deleteNode(node.id)} className="p-1 hover:bg-red-50 hover:text-red-500 text-slate-300 rounded-md transition-colors"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        {isExpanded && (
          <div className="p-3 space-y-2 bg-slate-50/50">
            <textarea
              className="w-full text-xs text-slate-600 bg-white border border-slate-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 leading-relaxed min-h-[64px]"
              placeholder="Write notes, requirements, or links..."
              value={node.content || ''}
              onFocus={() => takeSnapshot()}
              onChange={(e) => updateNode(node.id, { content: e.target.value })}
            />
          </div>
        )}
      </div>
    );
  };


  const outlineBoardContent = (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-3">
      {groups.map(group => {
        const theme = THEMES[group.theme] || THEMES.blue;
        const childNodes = nodes.filter(n => n.groupId === group.id);
        const totalChildren = childNodes.length;
        return (
          <div key={group.id} className={`rounded-2xl border-2 border-dashed ${theme.groupBg}`} style={{ overflow: 'visible' }}>
            <div className={`relative flex items-center gap-2 px-4 py-3 ${theme.groupHeader} border-b`}>
              <div className={`w-3 h-3 rounded-full shrink-0 ${theme.port}`} />
              <input className={`bg-transparent font-bold focus:bg-white/60 focus:outline-none rounded px-1 py-0.5 text-xs tracking-wide uppercase flex-1 min-w-0 ${theme.text}`} value={group.name || ''} onChange={(e) => updateGroup(group.id, { name: e.target.value })} />
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/60 border ${theme.tag}`}>{totalChildren} items</span>
              <button onClick={(e) => { e.stopPropagation(); setOpenColorPicker(openColorPicker === `ob-${group.id}` ? null : `ob-${group.id}`); }} className={`p-1.5 hover:bg-white/50 rounded-md transition-colors ${theme.text}`} title="Change theme"><Palette className="w-3.5 h-3.5" /></button>
              {openColorPicker === `ob-${group.id}` && (
                <div className="absolute top-12 right-16 bg-white p-2 rounded-xl shadow-xl border border-slate-100 flex gap-1.5 z-50" onClick={(e) => e.stopPropagation()}>
                  {Object.keys(THEMES).map(colorKey => (
                    <button key={colorKey} onClick={() => { takeSnapshot(); updateGroup(group.id, { theme: colorKey }); setOpenColorPicker(null); }} className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-transform hover:scale-110 ${THEMES[colorKey].port}`}>{group.theme === colorKey && <Check className="w-3 h-3 text-white" />}</button>
                  ))}
                </div>
              )}
              <button onClick={() => addNode(undefined, undefined, group.id)} className={`p-1.5 hover:bg-white/50 rounded-md transition-colors ${theme.text}`} title="Add card"><Plus className="w-3.5 h-3.5" /></button>
              <button onClick={() => deleteGroup(group.id)} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-md transition-colors"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="p-3 space-y-2">
              {childNodes.map(node => renderOutlineCard(node))}
              {childNodes.length === 0 && (
                <button onClick={() => addNode(undefined, undefined, group.id)} className="w-full py-3 text-xs font-semibold text-slate-400 hover:text-indigo-600 hover:bg-white/50 rounded-xl border border-dashed border-slate-300 hover:border-indigo-300 transition-all flex items-center justify-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add first card
                </button>
              )}
            </div>
          </div>
        );
      })}


      {nodes.filter(n => !n.groupId).length > 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-300/60 bg-white/40 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-slate-100/60 border-b border-slate-200">
            <FileText className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex-1">Unassigned Cards</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-500">{nodes.filter(n => !n.groupId).length} items</span>
          </div>
          <div className="p-3 space-y-2">
            {nodes.filter(n => !n.groupId).map(node => renderOutlineCard(node))}
          </div>
        </div>
      )}

      {groups.length === 0 && nodes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <LayoutList className="w-12 h-12 text-slate-300 mb-4" />
          <p className="text-slate-500 font-semibold text-sm mb-1">No backlog items yet</p>
          <p className="text-slate-400 text-xs mb-6">Switch to Canvas view or add cards here</p>
          <button onClick={() => addNode()} className="flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow transition-all">
            <Plus className="w-4 h-4 mr-1.5" /> Add First Card
          </button>
        </div>
      )}
    </div>
  );

  const renderProjectPanel = (isGate = false) => {
    const zBg = isGate ? 'z-[10000]' : 'z-[9998]';
    const zContent = isGate ? 'z-[10001]' : 'z-[9999]';

    // Gate mode: simple switch list for password-protected project auth screen
    if (isGate) {
      return (
        <>
          <div className={`fixed inset-0 ${zBg} bg-slate-900/40 backdrop-blur-sm`} onClick={() => setShowProjectPanel(false)} />
          <div className={`fixed inset-0 ${zContent} flex items-center justify-center pointer-events-none`}>
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 w-full max-w-xs mx-4 pointer-events-auto">
              {projectPanelMode === 'switch' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center mb-2">
                    <Lock className="w-5 h-5 text-slate-400" />
                  </div>
                  {!selectedProjectId ? (
                    <div className="space-y-2">
                      {projects.filter(p => p.id !== activeProjectId).map(p => {
                        const isDefProj = p.id === defaultProjectId;
                        return (
                          <button key={p.id} onClick={() => {
                            if (!p.password) {
                              cycleToProject(p.id);
                            } else {
                              setSelectedProjectId(p.id);
                              setProjectPasswordInput('');
                              setProjectError('');
                            }
                          }} className="w-full py-2.5 px-3 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors text-left flex items-center justify-between">
                            <span>{p.name}</span>
                            {isDefProj && <span className="text-[10px] text-amber-500 ml-2">Default</span>}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <input type="password" value={projectPasswordInput} onChange={(e) => setProjectPasswordInput(e.target.value)} placeholder="Enter password" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') switchProject(selectedProjectId); }} />
                      {projectError && <p className="text-xs text-red-500">{projectError}</p>}
                      <button onClick={() => switchProject(selectedProjectId)} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors">Confirm</button>
                      <button onClick={() => { setSelectedProjectId(null); setProjectError(''); }} className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors">Back</button>
                    </div>
                  )}
                  <button onClick={() => setShowProjectPanel(false)} className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center mb-2">
                    <Lock className="w-5 h-5 text-slate-400" />
                  </div>
                  {projects.length > 1 && (
                    <button onClick={() => { setProjectPanelMode('switch'); setProjectError(''); setSelectedProjectId(null); }} className="w-full py-2.5 px-3 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors">Switch Project</button>
                  )}
                  <button onClick={() => setShowProjectPanel(false)} className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
                </div>
              )}
            </div>
          </div>
        </>
      );
    }

    // Full dashboard mode (non-gate)
    return (
      <>
        <div className={`fixed inset-0 ${zBg} bg-slate-900/60 backdrop-blur-sm`} onClick={() => { setShowProjectPanel(false); setCardMenuOpenId(null); }} />
        <div className={`fixed inset-0 ${zContent} flex items-center justify-center pointer-events-none`}>

          {/* Dashboard Grid */}
          {projectPanelMode === 'dashboard' && (
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col pointer-events-auto">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-800">Projects</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setProjectPanelMode('create'); setProjectError(''); setProjectNameInput(''); setProjectDescriptionInput(''); setProjectThumbnailInput(null); setProjectPasswordInput(''); setProjectPasswordEnabled(false); setProjectDefaultToggle(false); }} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                    <Plus className="w-4 h-4" /> New Project
                  </button>
                  <button onClick={exportAllData} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors">
                    <Download className="w-4 h-4" /> Export All
                  </button>
                  <button onClick={() => fullBackupInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors">
                    <Upload className="w-4 h-4" /> Import All
                  </button>
                  <button onClick={() => setShowProjectPanel(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-5 overflow-y-auto custom-scrollbar" onClick={() => setCardMenuOpenId(null)}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map(p => {
                    const isDefProj = p.id === defaultProjectId;
                    const isActive = p.id === activeProjectId;
                    const colors = ['bg-indigo-100 text-indigo-600', 'bg-emerald-100 text-emerald-600', 'bg-amber-100 text-amber-600', 'bg-rose-100 text-rose-600', 'bg-purple-100 text-purple-600', 'bg-cyan-100 text-cyan-600'];
                    const colorIdx = Math.abs(p.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % colors.length;
                    return (
                      <div key={p.id} className={`relative group bg-white rounded-xl border ${isActive ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'} shadow-sm hover:shadow-md transition-all cursor-pointer`}
                        onClick={() => {
                          if (p.id === activeProjectId) { setShowProjectPanel(false); }
                          else if (!p.password) { cycleToProject(p.id); }
                          else { setSelectedProjectId(p.id); setProjectPasswordInput(''); setProjectError(''); setProjectPanelMode('switch'); }
                        }}>
                        <div className={`h-24 rounded-t-xl flex items-center justify-center ${p.thumbnail ? '' : colors[colorIdx].split(' ')[0]}`}>
                          {p.thumbnail ? (<img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover rounded-t-xl" />) : (<span className={`text-2xl font-bold ${colors[colorIdx].split(' ')[1]}`}>{p.name.charAt(0).toUpperCase()}</span>)}
                        </div>
                        <div className="p-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-slate-800 truncate">{p.name}</span>
                            {isDefProj && <span className="text-[9px] font-medium px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">Default</span>}
                            {p.password && <Lock className="w-3 h-3 text-slate-400 flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{formatRelativeTime(p.lastModified)}</p>
                        </div>
                        <div className="absolute top-2 right-2">
                          <button onClick={(e) => { e.stopPropagation(); setCardMenuOpenId(cardMenuOpenId === p.id ? null : p.id); }} className="p-1.5 rounded-lg bg-white/80 hover:bg-white border border-slate-200/50 hover:border-slate-300 shadow-sm opacity-0 group-hover:opacity-100 transition-all">
                            <MoreVertical className="w-3.5 h-3.5 text-slate-500" />
                          </button>
                          {cardMenuOpenId === p.id && (
                            <div className="absolute top-8 right-0 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[140px] z-10" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => { setEditingProjectId(p.id); setProjectNameInput(p.name); setProjectDescriptionInput(p.description || ''); setProjectThumbnailInput(p.thumbnail || null); setProjectPasswordEnabled(!!p.password); setProjectPasswordInput(''); setProjectDefaultToggle(p.id === defaultProjectId); setProjectError(''); setProjectPanelMode('edit'); setCardMenuOpenId(null); }} className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors">Edit Project</button>
                              <button onClick={() => { duplicateProject(p.id); }} className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors">Duplicate</button>
                              <button onClick={() => { exportSingleProject(p.id); }} className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors">Export Project</button>
                              {projects.length > 1 && (<button onClick={() => { setSelectedProjectId(p.id); setProjectPasswordInput(''); setProjectError(''); setProjectPanelMode('delete'); setCardMenuOpenId(null); }} className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors">Delete Project</button>)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Create/Edit Modal */}
          {(projectPanelMode === 'create' || projectPanelMode === 'edit') && (
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md mx-4 pointer-events-auto">
              <div className="p-5 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800">{projectPanelMode === 'create' ? 'New Project' : 'Edit Project'}</h3>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Project Name *</label>
                  <input type="text" value={projectNameInput} onChange={(e) => setProjectNameInput(e.target.value)} placeholder="My Project" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea value={projectDescriptionInput} onChange={(e) => setProjectDescriptionInput(e.target.value)} placeholder="Optional project description..." rows={3} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Thumbnail</label>
                  <div className="flex items-center gap-3">
                    {projectThumbnailInput ? (
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                        <img src={projectThumbnailInput} alt="Thumbnail" className="w-full h-full object-cover" />
                        <button onClick={() => setProjectThumbnailInput(null)} className="absolute top-0.5 right-0.5 p-0.5 bg-white/90 rounded-full"><X className="w-3 h-3 text-slate-500" /></button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center"><ImageIcon className="w-5 h-5 text-slate-300" /></div>
                    )}
                    <label className="px-3 py-2 text-sm text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-colors">
                      <span>Upload Image</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (ev) => { const img = new Image(); img.onload = () => { const MAX = 300; let w = img.width, h = img.height; if (w > MAX || h > MAX) { if (w > h) { h = Math.round(h * MAX / w); w = MAX; } else { w = Math.round(w * MAX / h); h = MAX; } } const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, w, h); setProjectThumbnailInput(canvas.toDataURL('image/jpeg', 0.7)); }; img.src = ev.target.result; }; reader.readAsDataURL(file); e.target.value = null; }} />
                    </label>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">Password Protection</label>
                    {projectPanelMode === 'edit' && editingProjectId === defaultProjectId ? (
                      <span className="text-xs text-slate-400 italic">Default workspace cannot be password-protected</span>
                    ) : (
                      <button onClick={() => setProjectPasswordEnabled(!projectPasswordEnabled)} className={`relative w-10 h-5 rounded-full transition-colors ${projectPasswordEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}><span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${projectPasswordEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} /></button>
                    )}
                  </div>
                  {projectPasswordEnabled && !(projectPanelMode === 'edit' && editingProjectId === defaultProjectId) && (<input type="password" value={projectPasswordInput} onChange={(e) => setProjectPasswordInput(e.target.value)} placeholder={projectPanelMode === 'edit' ? 'New password (leave empty to keep current)' : 'Enter password'} className="w-full mt-2 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />)}
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Set as Default Workspace</label>
                  <button onClick={() => setProjectDefaultToggle(!projectDefaultToggle)} className={`relative w-10 h-5 rounded-full transition-colors ${projectDefaultToggle ? 'bg-indigo-600' : 'bg-slate-200'}`}><span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${projectDefaultToggle ? 'translate-x-5' : 'translate-x-0.5'}`} /></button>
                </div>
                {projectError && <p className="text-xs text-red-500">{projectError}</p>}
              </div>
              <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100">
                <button onClick={() => { setProjectPanelMode('dashboard'); setProjectError(''); setEditingProjectId(null); }} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
                <button onClick={projectPanelMode === 'create' ? createProject : saveEditProject} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors">{projectPanelMode === 'create' ? 'Create' : 'Save'}</button>
              </div>
            </div>
          )}

          {/* Switch mode (password entry) */}
          {projectPanelMode === 'switch' && (
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 w-full max-w-xs mx-4 pointer-events-auto">
              <div className="space-y-3">
                <div className="flex items-center justify-center mb-2"><Lock className="w-5 h-5 text-slate-400" /></div>
                <p className="text-sm text-slate-600 text-center">Enter password to switch project</p>
                <input type="password" value={projectPasswordInput} onChange={(e) => setProjectPasswordInput(e.target.value)} placeholder="Enter password" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') switchProject(selectedProjectId); }} />
                {projectError && <p className="text-xs text-red-500">{projectError}</p>}
                <button onClick={() => switchProject(selectedProjectId)} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors">Confirm</button>
                <button onClick={() => { setProjectPanelMode('dashboard'); setProjectError(''); setSelectedProjectId(null); }} className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors">Back</button>
              </div>
            </div>
          )}

          {/* Delete confirmation */}
          {projectPanelMode === 'delete' && (
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 w-full max-w-xs mx-4 pointer-events-auto">
              <div className="space-y-3">
                <div className="flex items-center justify-center mb-2"><Trash2 className="w-5 h-5 text-red-400" /></div>
                <p className="text-sm text-slate-600 text-center">Delete &quot;{projects.find(p => p.id === selectedProjectId)?.name}&quot;?</p>
                {(() => { const t = projects.find(p => p.id === selectedProjectId); return t && t.password; })() && (
                  <input type="password" value={projectPasswordInput} onChange={(e) => setProjectPasswordInput(e.target.value)} placeholder="Enter password to confirm" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') deleteProject(selectedProjectId); }} />
                )}
                {projectError && <p className="text-xs text-red-500">{projectError}</p>}
                <button onClick={() => deleteProject(selectedProjectId)} className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors">Delete</button>
                <button onClick={() => { setProjectPanelMode('dashboard'); setProjectError(''); setSelectedProjectId(null); }} className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
              </div>
            </div>
          )}

          {/* Change Password mode */}
          {projectPanelMode === 'changePassword' && (
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 w-full max-w-xs mx-4 pointer-events-auto">
              <div className="space-y-3">
                <div className="flex items-center justify-center mb-2"><Lock className="w-5 h-5 text-slate-400" /></div>
                {(() => { const current = projects.find(p => p.id === activeProjectId); return current && current.password; })() && (
                  <input type="password" value={projectPasswordInput} onChange={(e) => setProjectPasswordInput(e.target.value)} placeholder="Current key" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" autoFocus />
                )}
                <input type="password" value={projectPasswordConfirm} onChange={(e) => setProjectPasswordConfirm(e.target.value)} placeholder="New key" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" autoFocus={!(() => { const current = projects.find(p => p.id === activeProjectId); return current && current.password; })()} />
                {projectError && <p className="text-xs text-red-500">{projectError}</p>}
                <button onClick={changeProjectPassword} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors">Update</button>
                <button onClick={() => { setProjectPanelMode('dashboard'); setProjectError(''); }} className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors">Back</button>
              </div>
            </div>
          )}

        </div>
      </>
    );
  };

  if (passwordEnabled && !isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 w-full max-w-sm mx-4">
          <div className="flex flex-col items-center mb-6">
            <div className="p-3 bg-indigo-50 rounded-xl mb-3">
              <Shield className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Password Required</h2>
            <p className="text-sm text-slate-500 mt-1">Enter your password to access the app</p>
          </div>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const hashedInput = await hashPassword(passwordInput);
            if (hashedInput === storedPassword) {
              setIsAuthenticated(true);
              setPasswordInput('');
              setPasswordError('');
            } else {
              setPasswordError('Incorrect password. Please try again.');
            }
          }}>
            <div className="relative mb-3">
              <input
                type={showGatePassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowGatePassword(!showGatePassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showGatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordError && (
              <p className="text-xs text-red-500 mb-3">{passwordError}</p>
            )}
            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md transition-colors"
            >
              Unlock
            </button>
          </form>
        </div>
        {showProjectPanel && renderProjectPanel(true)}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#f8fafc] font-sans text-slate-800 selection:bg-indigo-100 overflow-hidden">
      
      {/* --- Top Command Toolbar --- */}
      <header className="h-10 bg-white/50 backdrop-blur-sm border-b border-slate-200/80 flex items-center px-2 sm:px-3 z-50 justify-between shrink-0 gap-1 sm:gap-2 hover:bg-white/90 transition-all duration-300">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
          <button 
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors shrink-0"
            title={showSidebar ? "Hide Sidebar (S)" : "Show Sidebar (S)"}
          >
            {showSidebar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>
          
          <div className="p-1.5 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-lg text-white shadow-md shadow-indigo-100 shrink-0">
            <Network className="w-4 h-4" />
          </div>

          {/* Workspace Dropdown Selector */}
          <div className="relative min-w-0 flex-1 max-w-[200px] sm:max-w-[240px] md:max-w-[300px]">
            <button
              onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
              className="flex items-center gap-1 sm:gap-2 px-2 py-1 rounded-lg hover:bg-slate-50 border border-slate-200 transition-colors w-full"
            >
              <span className="text-xs sm:text-sm font-semibold text-slate-700 truncate flex-1 text-left">
                {activeWs?.name || 'Select Workspace'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 transition-transform shrink-0 ${showWorkspaceDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showWorkspaceDropdown && (
              <>
                <div className="fixed inset-0 z-[99]" onClick={() => setShowWorkspaceDropdown(false)}></div>
                <div className="absolute top-full left-0 mt-2 w-56 sm:w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-[100] max-w-[calc(100vw-2rem)]">
                  {workspaces.map(ws => (
                    <button
                      key={ws.id}
                      onClick={() => { setActiveTab(ws.id); setShowWorkspaceDropdown(false); }}
                      className={`w-full flex items-center px-4 py-2.5 text-sm font-medium transition-colors ${
                        activeTab === ws.id 
                          ? 'bg-indigo-50 text-indigo-700' 
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <FolderOpen className={`w-4 h-4 mr-2.5 shrink-0 ${activeTab === ws.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span className="truncate">{ws.name}</span>
                      {activeTab === ws.id && <Check className="w-4 h-4 ml-auto text-indigo-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* --- Header Notification Indicators --- */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Multi-tab warning - conditional, icon-only on xs, full on sm+ */}
          {(isMultiTab || isMultiTabSameWorkspace) && (
            <div className="relative">
              <div
                className="flex items-center gap-1.5 px-1.5 sm:px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer"
                onClick={() => setShowMultiTabTooltip((prev) => !prev)}
                onMouseEnter={() => setShowMultiTabTooltip(true)}
                onMouseLeave={() => setShowMultiTabTooltip(false)}
                role="button"
                aria-label="Multi-tab warning. Tap for details."
                aria-expanded={showMultiTabTooltip}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="hidden sm:inline text-xs font-medium text-amber-700 whitespace-nowrap">Open in another tab</span>
              </div>
              {showMultiTabTooltip && (
                <div className="absolute top-full left-0 mt-1 z-50 w-64 sm:w-72 p-2.5 bg-white border border-amber-200 rounded-lg shadow-lg text-xs text-slate-700 leading-relaxed">
                  <p className="mb-1">{'\u26A0'} This project is already open in another tab. Task data may be overwritten.</p>
                  {isMultiTabSameWorkspace && (
                    <p className="mt-1.5">{'\u26A0'} This workspace is already open in another tab. Changes may overwrite each other.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Export reminder - always visible, icon-only on xs, full on sm+ */}
          <div className={`flex items-center gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-lg cursor-default ${showExportBreath ? 'export-breathe' : ''}`} style={{ opacity: showExportBreath ? undefined : 0.7 }}>
            <span className="text-xs shrink-0">💾</span>
            <span className="hidden sm:inline text-xs font-medium text-slate-500 whitespace-nowrap">Don't forget to export</span>
          </div>
        </div>

        <div className="relative flex items-center gap-0.5 sm:gap-1 shrink-0">
          {/* Firebase Sync Status Indicator */}
          <div
            className={`p-1.5 rounded-lg shrink-0 ${syncStatus === 'error' ? 'cursor-pointer hover:bg-red-50' : ''}`}
            title={
              syncStatus === 'synced' ? 'All changes saved to cloud - your data is backed up' :
              syncStatus === 'syncing' ? 'Saving your changes to the cloud...' :
              syncStatus === 'error' ? 'Could not save to cloud - click here to try again' :
              'Cloud sync is not active - your data is saved locally on this device'
            }
            onClick={() => {
              if (syncStatus === 'error' && isFirebaseConfigured()) {
                setSyncStatus('syncing');
                // Sync current project state to Firestore
                const projMeta = loadProjectMeta(activeProjectId);
                if (projMeta) {
                  saveProjectToFirestore(activeProjectId, projMeta).catch(() => {});
                }
                for (const ws of workspaces) {
                  saveWorkspaceToFirestore(activeProjectId, ws.id, { id: ws.id, name: ws.name || 'Workspace', nodes: ws.nodes || [], edges: ws.edges || [], groups: ws.groups || [], pins: ws.pins || [], images: ws.images || [], lastModified: Date.now() }).catch(() => {});
                }
                saveTasksToFirestore(activeProjectId, { tasks, taskGroups }).catch(() => {});
                saveUserMeta({ activeProjectId, defaultProjectId })
                  .then((success) => setSyncStatus(success ? 'synced' : 'error'))
                  .catch(() => setSyncStatus('error'));
              }
            }}
          >
            {syncStatus === 'synced' && <Cloud className="w-4 h-4 text-green-500" />}
            {syncStatus === 'syncing' && <Loader className="w-4 h-4 text-blue-500 animate-spin" />}
            {syncStatus === 'error' && <CloudOff className="w-4 h-4 text-red-400" />}
            {syncStatus === 'offline' && <CloudOff className="w-4 h-4 text-slate-300" />}
          </div>

          <div className="w-px h-5 sm:h-6 bg-slate-200 mx-0.5 sm:mx-1"></div>

          {/* Always-visible Undo/Redo buttons */}
          <button onClick={performUndo} disabled={!canUndo} className={`p-1.5 rounded-lg transition-colors ${!canUndo ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'}`} title="Undo">
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={performRedo} disabled={!canRedo} className={`p-1.5 rounded-lg transition-colors ${!canRedo ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'}`} title="Redo">
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="w-px h-5 sm:h-6 bg-slate-200 mx-0.5 sm:mx-1"></div>

          <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} className="hidden" />
          <input type="file" accept=".json" ref={fullBackupInputRef} onChange={importAllData} className="hidden" />
          <input type="file" accept=".json" ref={partialImportInputRef} onChange={handlePartialImportFile} className="hidden" />
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            title="More actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMoreMenu && (
            <>
            <div className="fixed inset-0 z-[99]" onClick={() => setShowMoreMenu(false)}></div>
            <div className="absolute top-full right-0 mt-2 w-52 sm:w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-[100] max-w-[calc(100vw-1rem)]">
              <button onClick={() => { disperseOverlappingNodes(); setShowMoreMenu(false); }} className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                <RefreshCw className="w-4 h-4 mr-2.5 text-indigo-500" /> Disperse Overlaps
              </button>
              <button onClick={() => { autoAlignWorkspace(); setShowMoreMenu(false); }} className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                <Sparkles className="w-4 h-4 mr-2.5 text-indigo-600" /> Auto-Align Canvas
              </button>
              <div className="h-px bg-slate-100 my-1 mx-3"></div>
              <button onClick={() => { createGroup(); setShowMoreMenu(false); }} className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50 transition-colors">
                <Layers className="w-4 h-4 mr-2.5" /> New Group
              </button>
              <button onClick={() => { addNode(undefined, undefined, null); setShowMoreMenu(false); }} className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50 transition-colors">
                <Plus className="w-4 h-4 mr-2.5" /> Add Card
              </button>
              <div className="h-px bg-slate-100 my-1 mx-3"></div>
              <button onClick={() => { exportAllData(); setShowMoreMenu(false); }} className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                <Download className="w-4 h-4 mr-2.5 text-blue-500" /> Export All Data
              </button>
              <button onClick={() => { fullBackupInputRef.current?.click(); setShowMoreMenu(false); }} className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                <Upload className="w-4 h-4 mr-2.5 text-green-500" /> Import All Data
              </button>
              <button onClick={() => { partialImportInputRef.current?.click(); setShowMoreMenu(false); }} className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                <ClipboardPaste className="w-4 h-4 mr-2.5 text-purple-500" /> Partial Import
              </button>
            </div>
            </>
          )}
        </div>
      </header>


      {/* --- Workspace Panel Layout --- */}
      <div className="flex-1 flex overflow-hidden w-full relative">
        
        {/* --- Left Sidebar Overlay backdrop (mobile only) --- */}
        {showSidebar && (
          <div 
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* --- Left Sidebar --- */}
        {showSidebar && (
          <aside className="w-[calc(100vw-3rem)] max-w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 z-40 animate-in slide-in-from-left duration-200 fixed md:relative inset-y-0 left-0 top-10 md:top-0 shadow-xl md:shadow-none overflow-y-auto">
            <div className="p-4 border-b border-slate-100">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center px-3 py-2 hover:bg-slate-100 text-slate-600 text-sm font-medium rounded-lg border border-slate-200 transition-colors" title="Import Map JSON">
                    <Upload className="w-4 h-4 mr-1.5" /> Import
                  </button>
                  <button onClick={exportData} className="flex-1 flex items-center justify-center px-3 py-2 hover:bg-slate-100 text-slate-600 text-sm font-medium rounded-lg border border-slate-200 transition-colors" title="Export Map JSON">
                    <Download className="w-4 h-4 mr-1.5" /> Export
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => partialImportInputRef.current?.click()} className="flex-1 flex items-center justify-center px-3 py-2 hover:bg-slate-100 text-slate-600 text-sm font-medium rounded-lg border border-slate-200 transition-colors" title="Partial Import (Insert into canvas)">
                    <ClipboardPaste className="w-4 h-4 mr-1.5" /> Partial
                  </button>
                </div>
                <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-0.5">
                  <button
                    onClick={() => setViewMode('canvas')}
                    title="Canvas View"
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'canvas' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <MonitorSpeaker className="w-3.5 h-3.5" /> Canvas
                  </button>
                  <button
                    onClick={() => setViewMode('outline')}
                    title="Outline Board View"
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'outline' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <LayoutList className="w-3.5 h-3.5" /> Outline
                  </button>
                </div>
                <button
                  onClick={() => setShowClonePanel(!showClonePanel)}
                  title="Clone Panel (C)"
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all mt-1.5 w-full ${showClonePanel ? 'bg-violet-100 text-violet-700 border border-violet-300' : 'bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}
                >
                  <Copy className="w-3.5 h-3.5" /> Show Clone Nodes
                </button>
                <button
                  onClick={() => setShowPinPanel(!showPinPanel)}
                  title="Pins"
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all mt-1.5 w-full ${showPinPanel ? 'bg-rose-100 text-rose-700 border border-rose-300' : 'bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}
                >
                  <MapPin className="w-3.5 h-3.5" /> Pins
                </button>
                <button
                  onClick={() => setTaskPanelMode(prev => prev === 'closed' ? 'panel' : 'closed')}
                  title="Tasks (T)"
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all mt-1.5 w-full ${taskPanelMode !== 'closed' ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}
                >
                  <ListTodo className="w-3.5 h-3.5" /> Tasks
                </button>
                <button
                  onClick={() => setShowReminderPanel(!showReminderPanel)}
                  title="Reminders (R)"
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all mt-1.5 w-full ${showReminderPanel ? 'bg-indigo-100 text-indigo-700 border border-indigo-300' : 'bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}
                >
                  <Bell className="w-3.5 h-3.5" /> Reminders
                </button>
                <button
                  onClick={() => setShowCardEditorPanel(!showCardEditorPanel)}
                  title="Card Editor (E)"
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all mt-1.5 w-full ${showCardEditorPanel ? 'bg-cyan-100 text-cyan-700 border border-cyan-300' : 'bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}
                >
                  <Pencil className="w-3.5 h-3.5" /> Card Editor
                </button>
              </div>
            </div>

            <div className="p-4 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-400 tracking-wider uppercase block mb-3">Mind Map Workspaces</span>
              <div className="flex flex-col gap-1 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                {workspaces.map(ws => (
                  <div 
                    key={ws.id} 
                    onClick={() => setActiveTab(ws.id)}
                    className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      activeTab === ws.id ? 'bg-indigo-50/80 text-indigo-900 font-semibold' : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FolderOpen className={`w-4 h-4 shrink-0 ${activeTab === ws.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                      {editingTab === ws.id ? (
                        <input autoFocus className="bg-transparent border-none outline-none w-full text-sm font-semibold" defaultValue={ws.name} onBlur={(e) => renameWorkspace(ws.id, e.target.value || 'Untitled')} onKeyDown={(e) => e.key === 'Enter' && renameWorkspace(ws.id, e.currentTarget.value || 'Untitled')} />
                      ) : (
                        <span className="text-sm truncate" onDoubleClick={() => { takeSnapshot(); setEditingTab(ws.id); }}>{ws.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); duplicateWorkspace(ws.id); }} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-200" title="Duplicate workspace">
                        <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-500" />
                      </button>
                      {workspaces.length > 1 && (
                        <button onClick={(e) => deleteWorkspace(ws.id, e)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-200">
                          <X className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <button onClick={addWorkspace} className="flex items-center justify-center p-2 rounded-lg border border-dashed border-slate-200 hover:border-indigo-300 text-xs font-semibold text-indigo-600 hover:bg-indigo-50/50 transition-all mt-1">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add New Workspace
                </button>
              </div>
            </div>


            <div className="p-4 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-400 tracking-wider uppercase block mb-3">Workspace Stats</span>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 cursor-pointer select-none" onClick={handleLogoTap}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500">Total Cards</span>
                  <span className="text-sm font-bold text-indigo-600">{stats.total}</span>
                </div>
              </div>
            </div>


            <div className="p-4 flex-1 flex flex-col min-h-0">
              <span className="text-xs font-bold text-slate-400 tracking-wider uppercase block mb-3">Nodes Directory Explorer</span>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                {nodes.length === 0 ? (
                  <div className="text-xs italic text-slate-400 py-4 text-center">No nodes created yet</div>
                ) : (
                  nodes.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => {
                        bringToFront(n.id);
                        setFocusedNodeId(n.id);
                        
                        const rect = workspaceRef.current.getBoundingClientRect();
                        const centerX = rect.width / 2;
                        const centerY = rect.height / 2;
                        
                        setTransform({
                          x: centerX - n.x * transform.scale - (getNodeDimensions(n).width * transform.scale) / 2,
                          y: centerY - n.y * transform.scale - (140 * transform.scale) / 2,
                          scale: transform.scale
                        });
                        
                        setTimeout(() => {
                          setFocusedNodeId(prev => prev === n.id ? null : prev);
                        }, 4000);
                      }}
                      className={`p-2 border rounded-lg cursor-pointer transition-all flex items-center justify-between text-xs font-semibold ${
                        focusedNodeId === n.id 
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-900 shadow-md ring-2 ring-indigo-500/20' 
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-100 hover:border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <div className={`w-2.5 h-2.5 rounded-full ${THEMES[n.theme]?.port || 'bg-amber-400'}`} />
                        <span className="truncate">{n.title || `Card #${n.id}`}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        )}


        {/* --- Main Workspace Canvas Area --- */}
        <main
          ref={workspaceRef}
          className={`${showClonePanel ? 'flex-1 min-w-0' : 'flex-1'} relative overflow-hidden ${showClonePanel ? 'bg-[#1a1a2e]' : 'bg-[#1e1e2e]'} touch-none text-slate-800 transition-all duration-300`}
          onPointerDown={handlePointerDownMain}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onWheel={handleWheel}
          onContextMenu={handleContextMenu}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleCanvasImageDrop}
          style={{ display: viewMode === 'canvas' ? undefined : 'none' }}
        >
          {/* Panning grid backdrop */}
          <div className="absolute inset-0 canvas-grid-clickable cursor-crosshair active:cursor-grabbing opacity-60" style={{
            backgroundImage: 'radial-gradient(#4a5568 1.5px, transparent 1.5px)',
            backgroundSize: `${24 * transform.scale}px ${24 * transform.scale}px`,
            backgroundPosition: `${transform.x}px ${transform.y}px`,
            transition: isAnimatingTransform ? 'background-size 250ms ease-out, background-position 250ms ease-out' : 'none'
          }} />

          {/* Canvas View Transform Layer */}
          <div 
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: '0 0', transition: isAnimatingTransform ? 'transform 250ms ease-out' : 'none' }}
          >
            
            {/* --- Render Phase Groups and Nested Subgroups --- */}
            {groups.map(group => {

              const theme = THEMES[group.theme] || THEMES.blue;
              const isGrpDragging = draggingGroup?.id === group.id;
              
              const coords = getLiveCoordinates(group, true);
              const displayX = coords.x;
              const displayY = coords.y;
              const displayW = group.width || 440;
              const displayH = group.height || 420;

              const isTargetHover = dragHoveredGroupId === group.id;

              return (
                <div
                  key={group.id}
                  className={`absolute rounded-xl border-2 pointer-events-auto group transition-shadow duration-150 cursor-grab active:cursor-grabbing ${theme.groupBg} ${
                    isGrpDragging ? 'shadow-2xl border-indigo-500 z-20' : 'z-0'
                  } ${isTargetHover ? 'ring-4 ring-indigo-500/30 border-indigo-500 border-solid bg-indigo-50/10' : 'border-dashed'} ${
                    connectHoverNodeId === group.id ? 'ring-2 ring-green-400 shadow-lg shadow-green-200/50' : ''
                  } ${selectedNodeIds.includes(group.id) ? 'ring-2 ring-indigo-500' : ''}`}
                  style={{ 
                    left: displayX, 
                    top: displayY, 
                    width: displayW,
                    height: displayH,
                    backgroundColor: theme.cardBg + '40'
                  }}
                  onPointerEnter={() => { if (connecting && connecting.sourceId !== group.id) setConnectHoverNodeId(group.id); }}
                  onPointerLeave={() => { if (connectHoverNodeId === group.id) setConnectHoverNodeId(null); }}
                  onPointerUp={(e) => {
                    if (connecting && connecting.sourceId !== group.id) {
                      e.stopPropagation();
                      const exists = edges.some(edge => edge.source === connecting.sourceId && edge.target === group.id);
                      if (!exists) {
                        takeSnapshot();
                        updateActiveWorkspace(ws => ({ edges: [...ws.edges, { id: `e-${Date.now()}`, source: connecting.sourceId, target: group.id, workspaceId: activeTab }] }));
                      }
                      setConnecting(null);
                      setConnectHoverNodeId(null);
                    }
                  }}
                  onPointerDown={(e) => {
                    if (e.target.tagName === 'INPUT' || e.target.closest('button')) return;
                    e.stopPropagation();
                    if (e.shiftKey) {
                      e.preventDefault();
                      setSelectedNodeIds(prev => 
                        prev.includes(group.id) ? prev.filter(id => id !== group.id) : [...prev, group.id]
                      );
                      return;
                    }
                    setFocusedGroupId(group.id);
                    setFocusedNodeId(null);
                    dragSnapshot.current = JSON.parse(JSON.stringify(stateRef.current));
                    setDraggingGroup({
                      id: group.id,
                      startX: e.clientX,
                      startY: e.clientY,
                      initialX: group.x,
                      initialY: group.y,
                      currentX: group.x,
                      currentY: group.y,
                      width: group.width || 440,
                      height: group.height || 420
                    });
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const rect = workspaceRef.current.getBoundingClientRect();
                    setGroupContextMenu({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      groupId: group.id
                    });
                    setContextMenu(null);
                    setNodeContextMenu(null);
                  }}
                >

                  {/* External floating label above group */}
                  <div 
                    className="absolute left-0 pointer-events-auto" 
                    style={{ top: '-32px' }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <input 
                      className="px-3 py-1 rounded-md font-bold text-xs tracking-wide uppercase border-0 outline-none"
                      style={{ backgroundColor: theme.cardBg, color: '#1e293b', minWidth: '60px', width: `${Math.max(60, (group.name || '').length * 8 + 24)}px` }}
                      value={group.name || ''}
                      onChange={(e) => updateGroup(group.id, { name: e.target.value })}
                    />
                  </div>

                  {/* Resize handle */}
                  <div 
                    className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-end justify-end p-0.5 z-30 pointer-events-auto"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      dragSnapshot.current = JSON.parse(JSON.stringify(stateRef.current));
                      setResizingGroup({
                        id: group.id,
                        startX: e.clientX,
                        startY: e.clientY,
                        initialWidth: group.width || 440,
                        initialHeight: group.height || 420
                      });
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" className="text-slate-400/80 hover:text-indigo-600 transition-colors">
                      <path d="M12,0 L0,12 M12,4 L4,12 M12,8 L8,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>

                  {/* Connection Ports - visible on hover */}
                  <div 
                    className={`absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full cursor-crosshair z-30 flex items-center justify-center ${connecting ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-all`}
                    onPointerDown={(e) => e.stopPropagation()} 
                    onPointerUp={(e) => { e.stopPropagation(); if (connecting) { if (connecting.sourceId !== group.id) { const exists = edges.some(edge => edge.source === connecting.sourceId && edge.target === group.id); if (!exists) { takeSnapshot(); updateActiveWorkspace(ws => ({ edges: [...ws.edges, { id: `e-${Date.now()}`, source: connecting.sourceId, target: group.id, workspaceId: activeTab }] })); } } setConnecting(null); setConnectHoverNodeId(null); } }}
                  >
                    <div className={`w-3 h-3 rounded-full border-2 border-white shadow ${theme.port}`} />
                  </div>
                  <div 
                    className={`absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full cursor-crosshair z-30 flex items-center justify-center ${connecting ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-all`}
                    onPointerDown={(e) => { e.stopPropagation(); const coords = getWorkspaceCoords(e); setConnecting({ sourceId: group.id, startX: displayX + displayW, startY: displayY + displayH / 2, currentX: coords.x, currentY: coords.y }); }}
                    onGotPointerCapture={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); }}
                  >
                    <div className={`w-3 h-3 rounded-full border-2 border-white shadow ${theme.port}`} />
                  </div>
                </div>
              );
            })}

            {/* --- Connecting Dynamic Paths --- */}
            <svg className="absolute overflow-visible w-full h-full z-30">
              <defs>
                {Object.entries(THEMES).map(([key, theme]) => (
                  <marker key={key} id={`arrow-${key}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <polygon points="0 0, 6 3, 0 6" fill={theme.line} />
                  </marker>
                ))}
              </defs>
              
              {edges.map(edge => {
                const startPos = getConnectionPoint(edge.source, true);
                const endPos = getConnectionPoint(edge.target, false);
                
                if (!startPos || !endPos) return null;

                const sourceNode = nodes.find(n => n.id === edge.source);
                const sourceImage = !sourceNode ? (activeWs?.images || []).find(i => i.id === edge.source) : null;
                const sourceGroup = (!sourceNode && !sourceImage) ? groups.find(g => g.id === edge.source) : null;
                const sourceThemeKey = sourceNode?.theme || sourceGroup?.theme || 'blue';
                const sourceTheme = THEMES[sourceThemeKey] || THEMES.blue;

                return (
                  <g key={edge.id} className="cursor-pointer group animate-in fade-in" onClick={(e) => { e.stopPropagation(); if (e.ctrlKey || e.metaKey) { removeEdge(edge.id); } }} style={{ pointerEvents: 'auto' }} title="Ctrl+Click to disconnect">
                    <path d={drawCurve(startPos.x, startPos.y, endPos.x, endPos.y)} stroke="transparent" strokeWidth={24} fill="none" />
                    <path d={drawCurve(startPos.x, startPos.y, endPos.x, endPos.y)} stroke={sourceTheme.line} strokeWidth={3} fill="none" markerEnd={`url(#arrow-${sourceThemeKey})`} className="transition-all duration-300 group-hover:stroke-red-500 group-hover:stroke-[4px]" />
                  </g>
                );
              })}
              
              {connecting && (() => {
                const sourceEntity = nodes.find(n => n.id === connecting.sourceId) || (activeWs?.images || []).find(i => i.id === connecting.sourceId) || groups.find(g => g.id === connecting.sourceId);
                const strokeColor = THEMES[sourceEntity?.theme || 'blue'].line;
                return (
                  <path d={drawCurve(connecting.startX, connecting.startY, connecting.currentX, connecting.currentY)} stroke={strokeColor} strokeWidth={3} strokeDasharray="8,6" fill="none" className="animate-[dash_1s_linear_infinite]" />
                );
              })()}
            </svg>


            {/* --- Canvas Image Objects --- */}
            {(activeWs?.images || []).map(img => {
              const imgX = draggingImage?.id === img.id ? draggingImage.currentX : img.x;
              const imgY = draggingImage?.id === img.id ? draggingImage.currentY : img.y;
              const imgW = img.width || 280;
              const imgH = img.height || 180;

              return (
                <div
                  key={img.id}
                  className={`absolute pointer-events-auto group rounded-lg border border-slate-300/60 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing ${selectedNodeIds.includes(img.id) ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
                  style={{
                    left: imgX,
                    top: imgY,
                    width: imgW,
                    height: imgH,
                    zIndex: draggingImage?.id === img.id ? 9999 : 40
                  }}
                  onPointerDown={(e) => {
                    if (e.target.closest('button')) return;
                    e.stopPropagation();
                    if (e.shiftKey) {
                      e.preventDefault();
                      setSelectedNodeIds(prev => 
                        prev.includes(img.id) ? prev.filter(id => id !== img.id) : [...prev, img.id]
                      );
                      return;
                    }
                    dragSnapshot.current = JSON.parse(JSON.stringify(stateRef.current));
                    setDraggingImage({
                      id: img.id,
                      startX: e.clientX,
                      startY: e.clientY,
                      initialX: img.x,
                      initialY: img.y,
                      currentX: img.x,
                      currentY: img.y
                    });
                  }}
                >
                  <img src={img.src} alt="Canvas image" className="w-full h-full object-cover" draggable={false} />
                  {/* Delete button on hover */}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteImage(img.id); }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="absolute top-1 right-1 p-1 bg-white/90 hover:bg-red-50 hover:text-red-500 text-slate-400 rounded shadow text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {/* Connection Ports */}
                  <div
                    className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full cursor-crosshair border-[3px] border-white z-30 shadow transition-all opacity-0 group-hover:opacity-100 bg-indigo-500 hover:bg-indigo-400"
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => {
                      e.stopPropagation();
                      if (connecting && connecting.sourceId !== img.id) {
                        const exists = edges.some(edge => edge.source === connecting.sourceId && edge.target === img.id);
                        if (!exists) {
                          takeSnapshot();
                          updateActiveWorkspace(ws => ({ edges: [...ws.edges, { id: `e-${Date.now()}`, source: connecting.sourceId, target: img.id, workspaceId: activeTab }] }));
                        }
                      }
                      setConnecting(null);
                    }}
                  />
                  <div
                    className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full cursor-crosshair border-[3px] border-white z-30 shadow transition-all opacity-0 group-hover:opacity-100 bg-indigo-500 hover:bg-indigo-400"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const coords = getWorkspaceCoords(e);
                      setConnecting({ sourceId: img.id, startX: img.x + imgW, startY: img.y + imgH / 2, currentX: coords.x, currentY: coords.y });
                    }}
                    onGotPointerCapture={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); }}
                  />
                </div>
              );
            })}


            {/* --- Nodes Layer --- */}
            {nodes.map((node, index) => {

              const theme = THEMES[node.theme] || THEMES.blue;
              const isDragging = draggingNode?.id === node.id;
              const nodeDims = getNodeDimensions(node);
              
              const coords = getLiveCoordinates(node, false);
              const displayX = coords.x;
              const displayY = coords.y;

              const isFocused = focusedNodeId === node.id;

              return (
                <div
                  key={node.id}
                  className={`absolute rounded-lg border shadow-sm pointer-events-auto group flex flex-col ${
                    isDragging ? 'shadow-lg scale-[1.02] z-[9999]' : 'transition-all duration-150'
                  } ${
                    isFocused ? 'ring-4 ring-indigo-500 animate-[pulse_1.5s_infinite]' : ''
                  } ${selectedNodeIds.includes(node.id) ? 'ring-2 ring-offset-1' : 'border-slate-200 hover:border-slate-300'} ${
                    connectHoverNodeId === node.id ? 'ring-2 ring-green-400 shadow-lg shadow-green-200/50' : ''
                  }`}
                  style={{ 
                    left: displayX, 
                    top: displayY, 
                    width: nodeDims.width,
                    ...(nodeDims.height >= MAX_CARD_HEIGHT ? { maxHeight: nodeDims.height, overflow: 'hidden' } : {}),
                    backgroundColor: theme.cardBg || '#bfdbfe',
                    padding: 12,
                    ...(selectedNodeIds.includes(node.id) ? { borderColor: theme.border || '#3b82f6' } : {}),
                    zIndex: isDragging ? 9999 : (isFocused ? 999 : 50 + index) 
                  }}
                  onPointerEnter={() => { if (connecting && connecting.sourceId !== node.id) setConnectHoverNodeId(node.id); }}
                  onPointerLeave={() => { if (connectHoverNodeId === node.id) setConnectHoverNodeId(null); }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const rect = workspaceRef.current.getBoundingClientRect();
                    setNodeContextMenu({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      nodeId: node.id
                    });
                    setContextMenu(null);
                  }}
                  onPointerDown={(e) => {
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.closest('button') || e.target.closest('select')) return;
                    e.stopPropagation();
                    if (e.shiftKey) {
                      e.preventDefault();
                      setSelectedNodeIds(prev => 
                        prev.includes(node.id) ? prev.filter(id => id !== node.id) : [...prev, node.id]
                      );
                      return;
                    }
                    nodeTapRef.current = { id: node.id, startX: e.clientX, startY: e.clientY, time: Date.now(), pointerType: e.pointerType };
                    dragSnapshot.current = JSON.parse(JSON.stringify(stateRef.current));
                    bringToFront(node.id);
                    setDraggingNode({ 
                      id: node.id, 
                      startX: e.clientX, 
                      startY: e.clientY, 
                      initialX: node.x, 
                      initialY: node.y,
                      currentX: node.x,
                      currentY: node.y
                    });
                    draggingNodeRef.current = {
                      id: node.id,
                      startX: e.clientX,
                      startY: e.clientY,
                      initialX: node.x,
                      initialY: node.y,
                      currentX: node.x,
                      currentY: node.y
                    };
                  }}
                  onPointerUp={(e) => {
                    // Handle connection drop on entire card
                    if (connecting && connecting.sourceId !== node.id) {
                      e.stopPropagation();
                      const exists = edges.some(edge => edge.source === connecting.sourceId && edge.target === node.id);
                      if (!exists) {
                        takeSnapshot();
                        updateActiveWorkspace(ws => ({ edges: [...ws.edges, { id: `e-${Date.now()}`, source: connecting.sourceId, target: node.id, workspaceId: activeTab }] }));
                      }
                      setConnecting(null);
                      setConnectHoverNodeId(null);
                      return;
                    }
                    if (nodeTapRef.current && nodeTapRef.current.id === node.id && nodeTapRef.current.pointerType === 'touch') {
                      const elapsed = Date.now() - nodeTapRef.current.time;
                      const moved = Math.hypot(e.clientX - nodeTapRef.current.startX, e.clientY - nodeTapRef.current.startY);
                      if (elapsed < 350 && moved < 10) {
                        setMobileSheet(node.id);
                      }
                    }
                    nodeTapRef.current = null;
                  }}
                >
                  {/* Title */}
                  {editingTextNode === `title-${node.id}` ? (
                    <textarea
                      autoFocus
                      className="bg-slate-50 font-bold focus:outline-none rounded px-1 w-full text-sm text-slate-800 placeholder-slate-400 resize-none min-h-[1.25rem] max-h-[2.75rem] overflow-hidden"
                      value={node.title || ''}
                      placeholder="Enter Title..."
                      rows={1}
                      onFocus={() => takeSnapshot()}
                      onChange={(e) => updateNode(node.id, { title: e.target.value })}
                      onBlur={() => setEditingTextNode(null)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setEditingTextNode(null); } }}
                      onPointerDown={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div
                      className="font-bold text-sm text-slate-800 px-1 rounded cursor-grab active:cursor-grabbing line-clamp-2 break-words min-h-[1.25rem]"
                      onClick={(e) => { e.stopPropagation(); if (editMode) setEditingTextNode(`title-${node.id}`); }}
                      onPointerDown={(e) => { if (editMode) e.stopPropagation(); }}
                      title={node.title || 'Enter Title...'}
                    >
                      {node.title || <span className="text-slate-400">Enter Title...</span>}
                    </div>
                  )}

                  {/* Content */}
                  {(node.content || editingTextNode === node.id) ? (
                    <div className="mt-2 flex-1 overflow-hidden" onPointerDown={(e) => { if (editMode) e.stopPropagation(); }}>
                      {editingTextNode === node.id ? (
                        <textarea 
                          autoFocus
                          onBlur={() => setEditingTextNode(null)}
                          className="w-full h-full min-h-[2rem] bg-transparent resize-none focus:outline-none text-slate-600 text-xs leading-relaxed placeholder-slate-400 custom-scrollbar" 
                          value={node.content || ''} 
                          onChange={(e) => updateNode(node.id, { content: e.target.value })} 
                          placeholder="Write notes or details..." 
                        />
                      ) : (
                        <div 
                          onClick={() => { if (editMode) { takeSnapshot(); setEditingTextNode(node.id); } }}
                          className={`w-full bg-transparent text-slate-600 text-xs leading-relaxed break-words ${nodeDims.height >= MAX_CARD_HEIGHT ? 'overflow-y-auto custom-scrollbar' : ''} ${editMode ? 'cursor-text' : 'cursor-default'}`}
                          style={{ ...(nodeDims.height >= MAX_CARD_HEIGHT ? { maxHeight: nodeDims.height - 80 } : {}), overflowWrap: 'break-word', wordBreak: 'break-word' }}
                          title="Click to edit content"
                        >
                          <MarkdownRenderer content={node.content} isZoomedIn={transform.scale >= MARKDOWN_ZOOM_THRESHOLD} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div 
                      className={`mt-1 ${editMode ? 'cursor-text' : 'cursor-default'}`}
                      onClick={(e) => { if (editMode) { e.stopPropagation(); takeSnapshot(); setEditingTextNode(node.id); } }}
                      onPointerDown={(e) => { if (editMode) e.stopPropagation(); }}
                    >
                      <span className="text-slate-400 italic text-xs">+ Add notes...</span>
                    </div>
                  )}

                  {/* Link Portal */}
                  {node.linkToTab && (
                    <button 
                      onClick={() => { const target = workspaces.find(w => w.id === node.linkToTab); if (target) setActiveTab(target.id); }}
                      onPointerDown={(e) => { if (editMode) e.stopPropagation(); }}
                      className="flex items-center justify-between px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-md border border-indigo-200/80 transition-all w-full mt-2"
                    >
                      <span className="flex items-center gap-1"><ExternalLink className="w-3 h-3 text-indigo-600" /> Portal</span>
                      <span className="text-indigo-900 font-extrabold max-w-[100px] truncate text-[10px]">{workspaces.find(w => w.id === node.linkToTab)?.name || 'Linked Map'}</span>
                    </button>
                  )}

                  {/* Clone indicator */}
                  {node.cloneSourceId && (
                    <div className="absolute bottom-2 right-2">
                      <Copy className="w-3 h-3 text-violet-400" />
                    </div>
                  )}

                  {/* Hover toolbar */}
                  <div className="absolute -top-8 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-md shadow border border-slate-200 px-1 py-0.5" onPointerDown={(e) => e.stopPropagation()}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setOpenLinkPicker(openLinkPicker === node.id ? null : node.id); setOpenColorPicker(null); }}
                      className={`p-1 hover:bg-slate-100 rounded text-slate-500 ${node.linkToTab ? 'text-indigo-600' : ''}`}
                      title="Link Portal"
                    >
                      <Link2 className="w-3 h-3" />
                    </button>
                    {openLinkPicker === node.id && (
                      <div className="absolute top-8 right-0 bg-white p-2 rounded-xl shadow-xl border border-slate-100 flex flex-col gap-1 z-50 pointer-events-auto min-w-[150px]" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[9px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">Tab Portal Link:</span>
                        <button onClick={() => { takeSnapshot(); updateNode(node.id, { linkToTab: null }); setOpenLinkPicker(null); }} className="w-full text-left px-2 py-1 text-xs font-semibold rounded hover:bg-slate-100 text-red-500">Disconnect Portal</button>
                        {workspaces.map(ws => (
                          <button key={ws.id} onClick={() => { takeSnapshot(); updateNode(node.id, { linkToTab: ws.id }); setOpenLinkPicker(null); }} className="w-full text-left px-2 py-1 text-xs font-semibold rounded hover:bg-slate-100 flex items-center justify-between text-slate-700">
                            <span>{ws.name}</span>
                            {node.linkToTab === ws.id && <Check className="w-3 h-3 text-indigo-600" />}
                          </button>
                        ))}
                      </div>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); setOpenColorPicker(openColorPicker === node.id ? null : node.id); setOpenLinkPicker(null); }} className="p-1 hover:bg-slate-100 rounded text-slate-500" title="Theme"><Palette className="w-3 h-3"/></button>
                    {openColorPicker === node.id && (
                      <div className="absolute top-8 right-0 bg-white p-2 rounded-xl shadow-xl border border-slate-100 flex gap-1.5 z-50 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                        {Object.keys(THEMES).map(colorKey => (
                          <button key={colorKey} onClick={() => { takeSnapshot(); updateNode(node.id, { theme: colorKey }); setOpenColorPicker(null); }} className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-transform hover:scale-110 ${THEMES[colorKey].port}`}>
                            {node.theme === colorKey && <Check className="w-3 h-3 text-white" />}
                          </button>
                        ))}
                      </div>
                    )}
                    <button onClick={() => deleteNode(node.id)} className="p-1 hover:bg-red-100 hover:text-red-600 rounded text-slate-400" title="Delete"><X className="w-3 h-3"/></button>
                  </div>

                  {/* Connection Ports - visible on hover */}
                  <div 
                    className={`absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full cursor-crosshair z-30 flex items-center justify-center ${connecting ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-all`}
                    onPointerDown={(e) => e.stopPropagation()} 
                    onPointerUp={(e) => { e.stopPropagation(); if (connecting && connecting.sourceId !== node.id) { const exists = edges.some(edge => edge.source === connecting.sourceId && edge.target === node.id); if (!exists) { takeSnapshot(); updateActiveWorkspace(ws => ({ edges: [...ws.edges, { id: `e-${Date.now()}`, source: connecting.sourceId, target: node.id, workspaceId: activeTab }] })); } } setConnecting(null); setConnectHoverNodeId(null); }}
                  >
                    <div className={`w-3 h-3 rounded-full border-2 border-white shadow ${theme.port}`} />
                  </div>
                  <div 
                    className={`absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full cursor-crosshair z-30 flex items-center justify-center ${connecting ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-all`}
                    onPointerDown={(e) => { e.stopPropagation(); bringToFront(node.id); const coords = getWorkspaceCoords(e); setConnecting({ sourceId: node.id, startX: node.x + nodeDims.width, startY: node.y + HEADER_CENTER_Y, currentX: coords.x, currentY: coords.y }); }}
                    onGotPointerCapture={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); }}
                  >
                    <div className={`w-3 h-3 rounded-full border-2 border-white shadow ${theme.port}`} />
                  </div>
                </div>
              );
            })}

            {/* --- Pins Layer --- */}
            {pinsVisible && (activeWs?.pins || []).filter(p => p.visibility_status).map(pin => {
              const isDraggingThis = draggingPin && draggingPin.id === pin.id;
              const displayX = isDraggingThis ? draggingPin.currentX : pin.canvas_position_x;
              const displayY = isDraggingThis ? draggingPin.currentY : pin.canvas_position_y;
              return (
              <div
                key={pin.id}
                className={`absolute pointer-events-auto z-[55] ${focusedPinId === pin.id ? 'animate-bounce' : ''} ${isDraggingThis ? 'cursor-grabbing' : 'cursor-pointer'}`}
                style={{
                  left: displayX,
                  top: displayY,
                  transform: `translate(-50%, -50%) scale(${1 / transform.scale})`,
                  transformOrigin: 'center center',
                }}
                onMouseEnter={() => setHoveredPinId(pin.id)}
                onMouseLeave={() => setHoveredPinId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (pinDraggedRef.current) { pinDraggedRef.current = false; return; }
                  setSelectedPinId(selectedPinId === pin.id ? null : pin.id);
                  setEditingPinOnCanvas(null);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (pinDraggedRef.current) { pinDraggedRef.current = false; return; }
                  setEditingPinOnCanvas(editingPinOnCanvas === pin.id ? null : pin.id);
                  setSelectedPinId(pin.id);
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (e.button !== 0) return;
                  setDraggingPin({
                    id: pin.id,
                    startX: e.clientX,
                    startY: e.clientY,
                    initialX: pin.canvas_position_x,
                    initialY: pin.canvas_position_y,
                    currentX: pin.canvas_position_x,
                    currentY: pin.canvas_position_y
                  });
                }}
                onGotPointerCapture={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); }}
              >
                {/* Selection ring */}
                {(selectedPinId === pin.id || editingPinOnCanvas === pin.id) && (
                  <div className="absolute inset-0 -m-1 rounded-full ring-2 ring-rose-400 ring-offset-1 pointer-events-none" />
                )}
                {/* Pin icon with dark outline */}
                <div className="relative flex items-center justify-center">
                  <span
                    className="text-2xl select-none"
                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5)) drop-shadow(0 0 1px rgba(0,0,0,0.3))' }}
                  >
                    {pin.icon}
                  </span>
                </div>

                {/* Tooltip on hover */}
                {hoveredPinId === pin.id && editingPinOnCanvas !== pin.id && !isDraggingThis && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap max-w-[150px] truncate pointer-events-none z-[100]">
                    <div className="font-semibold">{pin.name}</div>
                    {pin.note && <div className="text-slate-300 truncate">{pin.note}</div>}
                  </div>
                )}
              </div>
              );
            })}

            {/* --- Selection Box --- */}
            {selectionBox && (
              <div
                className="absolute border-2 border-blue-500 bg-blue-500/10 rounded-sm pointer-events-none z-[60]"
                style={{
                  left: Math.min(selectionBox.startX, selectionBox.endX),
                  top: Math.min(selectionBox.startY, selectionBox.endY),
                  width: Math.abs(selectionBox.endX - selectionBox.startX),
                  height: Math.abs(selectionBox.endY - selectionBox.startY),
                }}
              />
            )}
          </div>


          {/* --- Mini Map Panel --- */}
          <MiniMap
            nodes={nodes}
            groups={groups}
            images={activeWs?.images || []}
            pins={pinsVisible ? (activeWs?.pins || []).filter(p => p.visibility_status) : []}
            transform={transform}
            setTransform={setTransform}
            workspaceRef={workspaceRef}
            visible={showMiniMap}
            openedViaShortcut={miniMapOpenedViaShortcut}
          />

          {/* --- Bottom-Right Floating Zoom and Guides --- */}
          <div className={`absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 ${showTimer ? 'opacity-100' : 'opacity-50 hover:opacity-100'} transition-opacity duration-300`}>

            {/* Timer Panel - absolutely positioned above toolbar */}
            {showTimer && (
              <div className={`absolute bottom-full right-0 mb-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 p-3 min-w-[200px] ${timerDone ? 'animate-pulse ring-2 ring-orange-400' : ''}`}>
                {/* Timer Display */}
                <div className="text-center mb-2">
                  <span className={`text-2xl font-bold font-mono ${timerDone ? 'text-orange-600' : timerRunning ? 'text-indigo-700' : 'text-slate-700'}`}>
                    {formatTimerDisplay(timerSeconds)}
                  </span>
                  {timerDone && <div className="text-xs text-orange-600 font-semibold mt-1">Time is up!</div>}
                </div>

                {/* Preset Buttons */}
                {!timerRunning && !timerDone && (
                  <div className="flex flex-wrap gap-1 mb-2 justify-center">
                    {[5, 10, 15, 20, 30].map(min => (
                      <button key={min} onClick={() => startTimer(min)} className="px-2 py-1 text-[10px] font-bold bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 text-slate-600 rounded-md transition-colors">{min}m</button>
                    ))}
                  </div>
                )}

                {/* Custom Input */}
                {!timerRunning && !timerDone && (
                  <div className="flex items-center gap-1 mb-2">
                    <input
                      type="number"
                      min="1"
                      max="999"
                      placeholder="Min"
                      value={timerCustomMinutes}
                      onChange={(e) => setTimerCustomMinutes(e.target.value)}
                      className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    />
                    <button
                      onClick={() => { const m = parseInt(timerCustomMinutes); if (m > 0) { startTimer(m); setTimerCustomMinutes(''); } }}
                      className="px-2 py-1 text-xs font-semibold bg-indigo-500 hover:bg-indigo-600 text-white rounded-md transition-colors"
                    >Start</button>
                  </div>
                )}

                {/* Controls */}
                {timerRunning && (
                  <div className="flex gap-1 justify-center">
                    {!timerPaused ? (
                      <button onClick={pauseTimer} className="px-3 py-1 text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-md transition-colors">Pause</button>
                    ) : (
                      <button onClick={resumeTimer} className="px-3 py-1 text-xs font-semibold bg-green-100 hover:bg-green-200 text-green-800 rounded-md transition-colors">Resume</button>
                    )}
                    <button onClick={resetTimer} className="px-3 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors">Reset</button>
                  </div>
                )}

                {timerDone && (
                  <div className="flex justify-center">
                    <button onClick={resetTimer} className="px-3 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors">Dismiss</button>
                  </div>
                )}
              </div>
            )}

            {/* Single vertical button column */}
            <div className="flex flex-col items-center bg-white rounded-lg shadow-lg border border-slate-200 p-1 gap-0.5">
              <button
                onClick={() => {
                  setEditMode(prev => {
                    if (prev) setEditingTextNode(null);
                    return !prev;
                  });
                }}
                className={`p-1.5 sm:p-2 rounded-md transition-colors ${editMode ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}
                title="Edit Mode (M)"
              >
                {editMode ? <Pencil className="w-4 h-4 sm:w-5 sm:h-5" /> : <MousePointer className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
              <div className="h-px w-5 bg-slate-200 my-0.5" />
              <button
                onClick={() => { setShowTimer(prev => !prev); if (timerDone) setTimerDone(false); }}
                className={`p-1.5 sm:p-2 rounded-md transition-colors ${showTimer ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'} ${timerDone ? 'animate-pulse ring-2 ring-orange-400' : ''}`}
                title="Alarm/Timer (A)"
              >
                <Timer className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <div className="h-px w-5 bg-slate-200 my-0.5" />
              <button onClick={() => handleZoom(0.25)} className="p-1.5 sm:p-2 hover:bg-slate-100 text-slate-600 rounded-md transition-colors" title="Zoom In"><ZoomIn className="w-4 h-4 sm:w-5 sm:h-5"/></button>
              <button onClick={() => setTransform({x:0, y:0, scale:1})} className="p-1.5 sm:p-2 hover:bg-slate-100 text-slate-600 rounded-md transition-colors" title="Reset View"><Focus className="w-4 h-4 sm:w-5 sm:h-5"/></button>
              <button onClick={() => handleZoom(-0.25)} className="p-1.5 sm:p-2 hover:bg-slate-100 text-slate-600 rounded-md transition-colors" title="Zoom Out"><ZoomOut className="w-4 h-4 sm:w-5 sm:h-5"/></button>
              <div className="h-px w-5 bg-slate-200 my-0.5" />
              <button onClick={() => { setShowMiniMap(prev => !prev); setMiniMapOpenedViaShortcut(false); }} className={`p-1.5 sm:p-2 hover:bg-slate-100 rounded-md transition-colors ${showMiniMap ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600'}`} title="Toggle Mini Map (W)"><Map className="w-4 h-4 sm:w-5 sm:h-5"/></button>
            </div>
          </div>

          {/* --- Canvas Background Context Menu --- */}
          {contextMenu && (
            <div 
              className="absolute z-[200] bg-white border border-slate-200 rounded-xl shadow-xl py-2 min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
            >
              <button className="w-full text-left px-4 py-2 hover:bg-indigo-50 hover:text-indigo-900 text-sm font-semibold text-slate-700 flex items-center" onClick={() => { addNode(contextMenu.clientX, contextMenu.clientY, null); setContextMenu(null); }}>
                <Plus className="w-4 h-4 mr-2 text-indigo-600" /> Add Card Here
              </button>
              <button className="w-full text-left px-4 py-2 hover:bg-indigo-50 hover:text-indigo-900 text-sm font-semibold text-slate-700 flex items-center" onClick={() => { createGroup(contextMenu.clientX, contextMenu.clientY); setContextMenu(null); }}>
                <Layers className="w-4 h-4 mr-2 text-indigo-600" /> Create Group Here
              </button>
              <button className="w-full text-left px-4 py-2 hover:bg-rose-50 hover:text-rose-900 text-sm font-semibold text-slate-700 flex items-center" onClick={() => {
                const rect = workspaceRef.current.getBoundingClientRect();
                const canvasX = (contextMenu.clientX - rect.left - transform.x) / transform.scale;
                const canvasY = (contextMenu.clientY - rect.top - transform.y) / transform.scale;
                addPin(canvasX, canvasY);
                setContextMenu(null);
              }}>
                <MapPin className="w-4 h-4 mr-2 text-rose-600" /> Drop Pin Here
              </button>
              {localStorage.getItem('nexus-clipboard') && (
                <button className="w-full text-left px-4 py-2 hover:bg-indigo-50 hover:text-indigo-900 text-sm font-semibold text-slate-700 flex items-center" onClick={() => {
                  const rect = workspaceRef.current.getBoundingClientRect();
                  const pasteX = (contextMenu.clientX - rect.left - transform.x) / transform.scale;
                  const pasteY = (contextMenu.clientY - rect.top - transform.y) / transform.scale;
                  pasteNode(pasteX, pasteY);
                  setContextMenu(null);
                }}>
                  <ClipboardPaste className="w-4 h-4 mr-2 text-indigo-600" /> Paste Node Here
                </button>
              )}
              {localStorage.getItem('nexus-clipboard-group') && (
                <button className="w-full text-left px-4 py-2 hover:bg-indigo-50 hover:text-indigo-900 text-sm font-semibold text-slate-700 flex items-center" onClick={() => {
                  const rect = workspaceRef.current.getBoundingClientRect();
                  const pasteX = (contextMenu.clientX - rect.left - transform.x) / transform.scale;
                  const pasteY = (contextMenu.clientY - rect.top - transform.y) / transform.scale;
                  pasteGroup(pasteX, pasteY);
                  setContextMenu(null);
                }}>
                  <ClipboardPaste className="w-4 h-4 mr-2 text-indigo-600" /> Paste Group Here
                </button>
              )}
              <button className="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm font-semibold text-slate-700 flex items-center" onClick={() => { setTransform({ x: 0, y: 0, scale: 1 }); setContextMenu(null); }}>
                <Focus className="w-4 h-4 mr-2 text-slate-500" /> Reset View
              </button>
              <div className="h-px bg-slate-200 my-1 w-full" />
              <button className="w-full text-left px-4 py-2 hover:bg-red-50 text-sm font-semibold text-red-600 flex items-center" onClick={() => { setShowConfirmClear(true); setContextMenu(null); }}>
                <Trash2 className="w-4 h-4 mr-2 text-red-500" /> Clear Canvas
              </button>
            </div>
          )}


          {/* --- Card Specific Context Menu --- */}
          {nodeContextMenu && (
            <div 
              className="absolute z-[200] bg-white border border-slate-200 rounded-xl shadow-xl py-2 min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
              style={{ left: nodeContextMenu.x, top: nodeContextMenu.y }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
            >
              <div className="px-4 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Card Actions</div>
              
              <button className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-xs font-semibold text-slate-700 flex items-center" onClick={() => { bringToFront(nodeContextMenu.nodeId); setNodeContextMenu(null); }}>
                <ArrowUp className="w-3.5 h-3.5 mr-2 text-indigo-600" /> Bring to Front
              </button>
              <button className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-xs font-semibold text-slate-700 flex items-center" onClick={() => { sendToBack(nodeContextMenu.nodeId); setNodeContextMenu(null); }}>
                <ArrowDown className="w-3.5 h-3.5 mr-2 text-slate-500" /> Send to Back
              </button>
              <button className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-xs font-semibold text-slate-700 flex items-center" onClick={() => { copyNode(nodeContextMenu.nodeId); setNodeContextMenu(null); }}>
                <Copy className="w-3.5 h-3.5 mr-2 text-slate-500" /> Copy Node
              </button>
              <button className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-xs font-semibold text-slate-700 flex items-center" onClick={() => { cutNode(nodeContextMenu.nodeId); setNodeContextMenu(null); }}>
                <Scissors className="w-3.5 h-3.5 mr-2 text-slate-500" /> Cut Node
              </button>
              <button className="w-full text-left px-4 py-2 hover:bg-violet-50 text-xs font-semibold text-slate-700 flex items-center" onClick={() => { cloneNode(nodeContextMenu.nodeId); setNodeContextMenu(null); }}>
                <GitBranch className="w-3.5 h-3.5 mr-2 text-violet-500" /> Clone Node
              </button>
              <div className="relative">
                <button className="w-full text-left px-4 py-2 hover:bg-violet-50 text-xs font-semibold text-slate-700 flex items-center" onClick={() => { setCloneToTabMenu(cloneToTabMenu ? null : nodeContextMenu.nodeId); }}>
                  <GitBranch className="w-3.5 h-3.5 mr-2 text-violet-400" /> Clone to Tab...
                </button>
                {cloneToTabMenu === nodeContextMenu.nodeId && (
                  <div className="ml-4 mb-1 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                    {workspaces.filter(ws => ws.id !== activeTab).map(ws => (
                      <button
                        key={ws.id}
                        className="w-full text-left px-4 py-1.5 hover:bg-violet-50 text-[11px] font-medium text-slate-600 flex items-center"
                        onClick={() => { cloneNodeToWorkspace(nodeContextMenu.nodeId, ws.id); setCloneToTabMenu(null); setNodeContextMenu(null); }}
                      >
                        <ExternalLink className="w-3 h-3 mr-1.5 text-violet-400" /> {ws.name}
                      </button>
                    ))}
                    {workspaces.filter(ws => ws.id !== activeTab).length === 0 && (
                      <span className="block px-4 py-1.5 text-[11px] text-slate-400">No other tabs</span>
                    )}
                  </div>
                )}
              </div>
              <button className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-xs font-semibold text-slate-700 flex items-center" onClick={() => { duplicateNode(nodeContextMenu.nodeId); setNodeContextMenu(null); }}>
                <Copy className="w-3.5 h-3.5 mr-2 text-slate-500" /> Duplicate Card
              </button>
              <button className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-xs font-semibold text-slate-700 flex items-center" onClick={() => { disconnectNodeLinks(nodeContextMenu.nodeId); setNodeContextMenu(null); }}>
                <Link2 className="w-3.5 h-3.5 mr-2 text-slate-500" /> Break Connections
              </button>
              <button className="w-full text-left px-4 py-2 hover:bg-blue-50 text-xs font-semibold text-slate-700 flex items-center" onClick={() => { exportSelectedNodes([nodeContextMenu.nodeId]); setNodeContextMenu(null); }}>
                <Download className="w-3.5 h-3.5 mr-2 text-blue-500" /> Export Branch
              </button>
              
              <div className="h-px bg-slate-150 my-1 w-full" />
              
              <button className="w-full text-left px-4 py-2 hover:bg-red-50 text-xs font-semibold text-red-600 flex items-center" onClick={() => { deleteNode(nodeContextMenu.nodeId); setNodeContextMenu(null); }}>
                <Trash2 className="w-3.5 h-3.5 mr-2 text-red-500" /> Delete Card
              </button>
            </div>
          )}

          {/* --- Group Context Menu --- */}
          {groupContextMenu && (
            <div 
              className="absolute z-[200] bg-white border border-slate-200 rounded-xl shadow-xl py-2 min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
              style={{ left: groupContextMenu.x, top: groupContextMenu.y }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
            >
              <div className="px-4 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Group Actions</div>
              
              <button className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-xs font-semibold text-slate-700 flex items-center" onClick={() => { addNode(undefined, undefined, groupContextMenu.groupId); setGroupContextMenu(null); }}>
                <Plus className="w-3.5 h-3.5 mr-2 text-slate-500" /> Add Card
              </button>

              <div className="h-px bg-slate-150 my-1 w-full" />

              <div className="px-4 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Color</div>
              <div className="px-4 py-2 flex gap-1.5 flex-wrap">
                {Object.keys(THEMES).map(colorKey => (
                  <button key={colorKey} onClick={() => { takeSnapshot(); updateGroup(groupContextMenu.groupId, { theme: colorKey }); setGroupContextMenu(null); }} className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-transform hover:scale-110 ${THEMES[colorKey].port}`}>
                    {(() => { const g = groups.find(gr => gr.id === groupContextMenu.groupId); return g && g.theme === colorKey ? <Check className="w-3 h-3 text-white" /> : null; })()}
                  </button>
                ))}
              </div>

              <div className="h-px bg-slate-150 my-1 w-full" />

              <button className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-xs font-semibold text-slate-700 flex items-center" onClick={() => { copyGroup(groupContextMenu.groupId); setGroupContextMenu(null); }}>
                <Copy className="w-3.5 h-3.5 mr-2 text-slate-500" /> Copy Group
              </button>
              <button className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-xs font-semibold text-slate-700 flex items-center" onClick={() => { cutGroup(groupContextMenu.groupId); setGroupContextMenu(null); }}>
                <Scissors className="w-3.5 h-3.5 mr-2 text-slate-500" /> Cut Group
              </button>
              
              <div className="h-px bg-slate-150 my-1 w-full" />
              
              <button className="w-full text-left px-4 py-2 hover:bg-red-50 text-xs font-semibold text-red-600 flex items-center" onClick={() => { deleteGroup(groupContextMenu.groupId); setGroupContextMenu(null); }}>
                <Trash2 className="w-3.5 h-3.5 mr-2 text-red-500" /> Delete Group
              </button>
            </div>
          )}

          {/* --- Pin Edit Popover (rendered outside transform layer for z-index) --- */}
          {editingPinOnCanvas && (() => {
            const pin = (activeWs?.pins || []).find(p => p.id === editingPinOnCanvas);
            if (!pin || !workspaceRef.current) return null;
            const rect = workspaceRef.current.getBoundingClientRect();
            const screenX = pin.canvas_position_x * transform.scale + transform.x;
            const screenY = pin.canvas_position_y * transform.scale + transform.y;
            // Position popover below the pin
            const popoverLeft = Math.min(Math.max(screenX, 120), rect.width - 120);
            const popoverTop = screenY + 24;
            return (
              <div
                className="absolute inset-0 z-[10000]"
                onClick={() => setEditingPinOnCanvas(null)}
                onPointerDown={(e) => { if (e.target === e.currentTarget) setEditingPinOnCanvas(null); }}
              >
                <div
                  className="absolute bg-white border border-slate-200 rounded-xl shadow-2xl p-3 min-w-[220px]"
                  style={{ left: popoverLeft, top: popoverTop, transform: 'translateX(-50%)' }}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    value={pin.name}
                    onChange={(e) => updatePin(pin.id, { name: e.target.value })}
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded px-2 py-1 mb-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-300"
                    placeholder="Pin name"
                    autoFocus
                  />
                  <textarea
                    value={pin.note || ''}
                    onChange={(e) => updatePin(pin.id, { note: e.target.value })}
                    className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-1 mb-2 text-slate-600 placeholder-slate-400 resize-none focus:outline-none focus:ring-1 focus:ring-rose-300"
                    placeholder="Note (optional)"
                    rows={2}
                  />
                  <div className="mb-2">
                    <span className="text-[10px] text-slate-500 font-medium block mb-1">Icon:</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {PIN_ICONS.map(ic => (
                        <button
                          key={ic.value}
                          onClick={() => updatePin(pin.id, { icon: ic.value })}
                          className={`w-6 h-6 rounded flex items-center justify-center text-sm ${pin.icon === ic.value ? 'bg-slate-200 ring-1 ring-slate-400' : 'hover:bg-slate-100'}`}
                          title={ic.label}
                        >
                          {ic.value}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-end pt-1 border-t border-slate-100">
                    <button
                      onClick={() => { deletePin(pin.id); setEditingPinOnCanvas(null); setSelectedPinId(null); }}
                      className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-red-500 rounded transition-colors"
                      title="Delete pin"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </main>

        {/* --- Clone Panels (Three-Panel Split View) --- */}
        {showClonePanel && viewMode === 'canvas' && (() => {
          // Find all source nodes that have clones across ALL workspaces
          const allCloneSourceIds = new Set();
          workspaces.forEach(ws => {
            ws.nodes.forEach(n => {
              if (n.cloneSourceId) allCloneSourceIds.add(n.cloneSourceId);
            });
          });

          const sourceNodes = [];
          const seenSourceIds = new Set();
          workspaces.forEach(ws => {
            ws.nodes.forEach(n => {
              if (allCloneSourceIds.has(n.id) && !seenSourceIds.has(n.id)) {
                seenSourceIds.add(n.id);
                sourceNodes.push({ ...n, _workspaceId: ws.id, _workspaceName: ws.name });
              }
            });
          });

          // Get instances for the selected source from ALL workspaces
          const cloneInstances = [];
          if (selectedCloneSourceId) {
            workspaces.forEach(ws => {
              ws.nodes.forEach(n => {
                if (n.id === selectedCloneSourceId || n.cloneSourceId === selectedCloneSourceId) {
                  cloneInstances.push({ ...n, _workspaceId: ws.id, _workspaceName: ws.name, _edges: ws.edges });
                }
              });
            });
          }

          return (
            <>
              {/* Panel B: Clone List */}
              <div className="w-[250px] shrink-0 bg-[#16213e] border-l border-slate-700/50 flex flex-col overflow-hidden transition-all duration-300">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
                  <h3 className="text-sm font-bold text-slate-200">Clone Nodes</h3>
                  <button onClick={() => { setShowClonePanel(false); setSelectedCloneSourceId(null); }} className="p-1 hover:bg-slate-700/50 rounded text-slate-400 hover:text-slate-200 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-2">
                  {sourceNodes.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center mt-4">No clone nodes yet. Right-click a node and select "Clone Node" to create one.</p>
                  ) : (
                    sourceNodes.map(srcNode => {
                      const srcTheme = THEMES[srcNode.theme] || THEMES.blue;
                      const isSelected = selectedCloneSourceId === srcNode.id;
                      const totalClones = workspaces.reduce((count, ws) => count + ws.nodes.filter(n => n.cloneSourceId === srcNode.id).length, 0);
                      return (
                        <div
                          key={srcNode.id}
                          onClick={() => setSelectedCloneSourceId(srcNode.id)}
                          className={`px-3 py-2.5 rounded-lg cursor-pointer transition-all border-l-4 ${isSelected ? 'bg-slate-700/60 border-opacity-100' : 'bg-slate-800/40 hover:bg-slate-700/40 border-opacity-60'}`}
                          style={{ borderLeftColor: srcTheme.line, backgroundColor: isSelected ? undefined : `${srcTheme.line}10` }}
                        >
                          <span className="text-xs font-semibold text-slate-200 truncate block">{srcNode.title || `Node #${srcNode.id}`}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5 block">{totalClones} clone(s) &middot; {srcNode._workspaceName}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Panel C: Clone Locations */}
              <div className="w-[350px] shrink-0 bg-[#0f3460] border-l border-slate-700/50 flex flex-col overflow-hidden transition-all duration-300">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
                  <h3 className="text-sm font-bold text-slate-200">Clone Locations</h3>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-2">
                  {!selectedCloneSourceId ? (
                    <p className="text-xs text-slate-400 text-center mt-4">Click a clone node to see its locations</p>
                  ) : (
                    cloneInstances.map(instance => {
                      // Find ALL prev and next edges for this instance
                      const instanceEdges = instance._edges || [];
                      const prevEdges = instanceEdges.filter(e => e.target === instance.id);
                      const nextEdges = instanceEdges.filter(e => e.source === instance.id);
                      
                      // Find the workspace this instance belongs to
                      const instanceWs = workspaces.find(ws => ws.id === instance._workspaceId);
                      const wsNodes = instanceWs ? instanceWs.nodes : [];
                      const wsGroups = instanceWs ? instanceWs.groups : [];

                      const prevNodes = prevEdges.map(e => wsNodes.find(n => n.id === e.source)).filter(Boolean);
                      const nextNodes = nextEdges.map(e => wsNodes.find(n => n.id === e.target)).filter(Boolean);

                      const isOtherWorkspace = instance._workspaceId !== activeTab;

                      return (
                        <div
                          key={`${instance._workspaceId}-${instance.id}`}
                          onClick={() => {
                            if (isOtherWorkspace) {
                              // Navigate to other workspace and focus node
                              setActiveTab(instance._workspaceId);
                              setTimeout(() => {
                                if (workspaceRef.current) {
                                  const rect = workspaceRef.current.getBoundingClientRect();
                                  const centerX = rect.width / 2;
                                  const centerY = rect.height / 2;
                                  setTransform(prev => ({
                                    ...prev,
                                    x: centerX - instance.x * prev.scale - 170 * prev.scale,
                                    y: centerY - instance.y * prev.scale - 80 * prev.scale
                                  }));
                                }
                                setFocusedNodeId(instance.id);
                                setTimeout(() => setFocusedNodeId(null), 3000);
                              }, 100);
                            } else {
                              // Navigate within same workspace
                              if (workspaceRef.current) {
                                const rect = workspaceRef.current.getBoundingClientRect();
                                const centerX = rect.width / 2;
                                const centerY = rect.height / 2;
                                setTransform(prev => ({
                                  ...prev,
                                  x: centerX - instance.x * prev.scale - 170 * prev.scale,
                                  y: centerY - instance.y * prev.scale - 80 * prev.scale
                                }));
                              }
                              setFocusedNodeId(instance.id);
                              setTimeout(() => setFocusedNodeId(null), 3000);
                            }
                          }}
                          className="px-3 py-2.5 rounded-lg cursor-pointer bg-slate-800/40 hover:bg-slate-700/40 transition-all border border-slate-700/30 hover:border-slate-600/50"
                        >
                          <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
                            <span className="text-slate-200 font-bold truncate max-w-[140px]">{instance.title || `Node #${instance.id}`}</span>
                            <span className="text-[9px] text-slate-500 ml-auto">{instance.cloneSourceId ? 'Clone' : 'Source'}</span>
                          </div>
                          <div className="mt-1.5 flex flex-col gap-0.5">
                            {prevNodes.length > 0 ? prevNodes.map((pn, idx) => (
                              <div key={`prev-${prevEdges[idx].source}-${prevEdges[idx].target}-${idx}`} className="flex items-center gap-1 text-[10px]">
                                <span className="text-slate-500">from</span>
                                <span className="text-slate-400 truncate max-w-[120px]">{pn.title || `Node #${pn.id}`}</span>
                              </div>
                            )) : (
                              <div className="flex items-center gap-1 text-[10px]">
                                <span className="text-slate-500">from</span>
                                <span className="text-slate-500 italic">(start)</span>
                              </div>
                            )}
                            {nextNodes.length > 0 ? nextNodes.map((nn, idx) => (
                              <div key={`next-${nextEdges[idx].source}-${nextEdges[idx].target}-${idx}`} className="flex items-center gap-1 text-[10px]">
                                <span className="text-slate-500">to</span>
                                <span className="text-slate-400 truncate max-w-[120px]">{nn.title || `Node #${nn.id}`}</span>
                              </div>
                            )) : (
                              <div className="flex items-center gap-1 text-[10px]">
                                <span className="text-slate-500">to</span>
                                <span className="text-slate-500 italic">(end)</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            {isOtherWorkspace && <span className="text-[9px] text-violet-400 font-medium">Tab: {instance._workspaceName}</span>}
                            {!isOtherWorkspace && <span className="text-[9px] text-slate-500">{instance._workspaceName}</span>}
                            {instance.groupId && <span className="text-[9px] text-slate-500">in {wsGroups.find(g => g.id === instance.groupId)?.name || 'group'}</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          );
        })()}

        {/* --- Pin Panel --- */}
        {showPinPanel && viewMode === 'canvas' && (
          <PinPanel
            workspaces={workspaces}
            activeTab={activeTab}
            onNavigateToPin={navigateToPin}
            onUpdatePin={updatePin}
            onDeletePin={deletePin}
            onToggleVisibility={togglePinVisibility}
            onToggleAllVisibility={toggleAllPinsVisibility}
            showPanel={showPinPanel}
            onClose={() => setShowPinPanel(false)}
          />
        )}

        {/* --- Reminder Panel --- */}
        {showReminderPanel && viewMode === 'canvas' && (
          <ReminderPanel
            reminders={reminders}
            showPanel={showReminderPanel}
            onClose={() => setShowReminderPanel(false)}
            onAddReminder={(reminder) => { setReminders(prev => [...prev, { ...reminder, id: `r-${Date.now()}`, createdAt: Date.now(), lastShownAt: null, nextReminderAt: reminder.enabled ? Date.now() + reminder.frequency * 60000 : null }]); }}
            onUpdateReminder={(id, updates) => { setReminders(prev => prev.map(r => r.id === id ? { ...r, ...updates, nextReminderAt: updates.enabled === false ? null : (updates.frequency && updates.frequency !== r.frequency ? Date.now() + updates.frequency * 60000 : r.nextReminderAt) } : r)); }}
            onDeleteReminder={(id) => { setReminders(prev => prev.filter(r => r.id !== id)); }}
            onToggleReminder={(id) => { setReminders(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled, nextReminderAt: !r.enabled ? Date.now() + r.frequency * 60000 : null } : r)); }}
            onImportReminders={(imported) => { setReminders(prev => [...prev, ...imported.map(r => ({ ...r, id: `r-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, lastShownAt: null, nextReminderAt: r.enabled ? Date.now() + r.frequency * 60000 : null }))]); }}
            onExportReminders={() => {
              const exportData = { type: 'thoughtflow-reminder-collection', version: 1, name: 'My Reminders', reminders: reminders, createdAt: new Date().toISOString(), exportedAt: new Date().toISOString() };
              const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `thoughtflow-reminders-${new Date().toISOString().slice(0,10)}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
            onEnableAll={() => { setReminders(prev => prev.map(r => ({ ...r, enabled: true, nextReminderAt: Date.now() + r.frequency * 60000 }))); }}
            onDisableAll={() => { setReminders(prev => prev.map(r => ({ ...r, enabled: false, nextReminderAt: null }))); }}
          />
        )}

        {/* --- Card Editor Panel --- */}
        {showCardEditorPanel && viewMode === 'canvas' && (
          <CardEditorPanel
            selectedNode={cardEditorNode}
            onUpdateNode={(updates) => {
              if (cardEditorNode) {
                updateNode(cardEditorNode.id, updates);
              }
            }}
            onSnapshot={() => takeSnapshot()}
            onClose={() => setShowCardEditorPanel(false)}
          />
        )}

        {/* --- Full Task Manager (side panel / fullscreen) --- */}
        {taskPanelMode !== 'closed' && (
          <FullTaskManager
            tasks={tasks}
            showPanel={true}
            onClose={() => setTaskPanelMode('closed')}
            onAddTask={addTask}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onReorderTask={reorderTask}
            onStartLocationSelection={startLocationSelection}
            onNavigateToLocation={navigateToTaskLocation}
            onCancelLocationSelection={cancelLocationSelection}
            isSelectingLocation={isSelectingTaskLocation}
            selectingLocationForTaskId={selectingLocationForTaskId}
            workspaces={workspaces}
            taskGroups={taskGroups}
            onAddGroup={addTaskGroup}
            onRenameGroup={renameTaskGroup}
            onDeleteGroup={deleteTaskGroup}
            onUpdateGroupColor={updateTaskGroupColor}
            onReorderGroup={reorderTaskGroup}
            mode={taskPanelMode}
            onToggleFullscreen={() => setTaskPanelMode(prev => prev === 'fullscreen' ? 'panel' : 'fullscreen')}
          />
        )}

        {/* --- Outline Backlog Board View --- */}
        {viewMode === 'outline' && (
          <div className="flex-1 overflow-hidden flex flex-col bg-slate-50">
            <div className="px-3 sm:px-6 py-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 gap-2">
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-bold text-slate-800 truncate">Outline Backlog Board</h2>
                <p className="text-[10px] text-slate-400 font-medium hidden sm:block">Structured nested view — changes sync to canvas instantly</p>
              </div>
              <div className="flex gap-1.5 sm:gap-2 shrink-0">
                <button onClick={() => addNode()} className="flex items-center px-2 sm:px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow transition-all">
                  <Plus className="w-3.5 h-3.5 sm:mr-1" /><span className="hidden sm:inline"> Add Card</span>
                </button>
                <button onClick={() => createGroup()} className="flex items-center px-2 sm:px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-all">
                  <Layers className="w-3.5 h-3.5 sm:mr-1" /><span className="hidden sm:inline"> Add Group</span>
                </button>
              </div>
            </div>
            {outlineBoardContent}
          </div>
        )}
      </div>


      {/* --- Modals and Dialogues --- */}
      {showConfirmClear && (
        <div className="absolute inset-0 bg-slate-900/40 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Clear Current Canvas?</h3>
            <p className="text-slate-500 mb-6 text-xs leading-relaxed">This will permanently delete all nodes, groups and connections inside "{activeWs.name}".</p>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" onClick={() => setShowConfirmClear(false)}>Cancel</button>
              <button className="px-4 py-2 text-xs font-semibold bg-red-500 text-white hover:bg-red-600 rounded-lg shadow-sm transition-colors" onClick={clearAllNodes}>Clear Workspace</button>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="absolute inset-0 bg-slate-900/40 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-red-600 mb-1">Upload Issue</h3>
            <p className="text-slate-500 mb-6 text-xs leading-relaxed">{errorMessage}</p>
            <div className="flex justify-end">
              <button className="px-4 py-2 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors" onClick={() => setErrorMessage('')}>Close</button>
            </div>
          </div>
        </div>
      )}


      {/* --- Mobile Card Action Bottom Sheet --- */}
      {mobileSheet && (() => {
        const sheetNode = nodes.find(n => n.id === mobileSheet);
        if (!sheetNode) return null;
        const sheetTheme = THEMES[sheetNode.theme] || THEMES.blue;
        return (
          <div className="fixed inset-0 z-[300] flex flex-col justify-end" onClick={() => setMobileSheet(null)}>
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <div
              className="relative bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 animate-in slide-in-from-bottom duration-300 pb-safe"
              onClick={(e) => e.stopPropagation()}
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-slate-300" />
              </div>

              <div className={`mx-4 mt-2 mb-3 p-3 rounded-2xl border ${sheetTheme.groupHeader} ${sheetTheme.groupBg}`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-3 h-3 rounded-full ${sheetTheme.port}`} />
                  <span className={`font-bold text-sm flex-1 line-clamp-2 break-words ${sheetTheme.text}`}>{sheetNode.title || `Card #${sheetNode.id}`}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 px-4 pb-2">
                {[
                  { icon: <ArrowUp className="w-5 h-5" />, label: 'Bring Front', action: () => { bringToFront(mobileSheet); setMobileSheet(null); }, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
                  { icon: <ArrowDown className="w-5 h-5" />, label: 'Send Back', action: () => { sendToBack(mobileSheet); setMobileSheet(null); }, color: 'text-slate-600 bg-slate-50 border-slate-200' },
                  { icon: <Copy className="w-5 h-5" />, label: 'Duplicate', action: () => { duplicateNode(mobileSheet); setMobileSheet(null); }, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
                  { icon: <Link2 className="w-5 h-5" />, label: 'Disconnect', action: () => { disconnectNodeLinks(mobileSheet); setMobileSheet(null); }, color: 'text-amber-600 bg-amber-50 border-amber-200' },
                  { icon: <Palette className="w-5 h-5" />, label: 'Change Theme', action: () => { const themes = Object.keys(THEMES); const ci = themes.indexOf(sheetNode.theme); takeSnapshot(); updateNode(mobileSheet, { theme: themes[(ci + 1) % themes.length] }); }, color: 'text-purple-600 bg-purple-50 border-purple-200' },
                  { icon: <Trash2 className="w-5 h-5" />, label: 'Delete', action: () => { deleteNode(mobileSheet); setMobileSheet(null); }, color: 'text-red-600 bg-red-50 border-red-200' },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={item.action}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-2xl border font-semibold text-[11px] transition-all active:scale-95 ${item.color}`}
                  >
                    {item.icon}
                    <span className="leading-tight text-center">{item.label}</span>
                  </button>
                ))}
              </div>


              <div className="px-4 pb-4">
                <button onClick={() => setMobileSheet(null)} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-sm rounded-xl transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- Multi-Select Floating Action Bar --- */}
      {selectedNodeIds.length > 0 && (
        <div ref={selectionMenuRef} className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] flex flex-col items-center transition-opacity ${selectionMenuOpen ? 'opacity-100' : 'opacity-50 hover:opacity-75'}`}>
          {selectionMenuOpen && (
            <div className="mb-2 bg-white rounded-xl shadow-xl border border-slate-200 p-2 flex flex-col gap-1 min-w-[180px]">
              <button onClick={() => { takeSnapshot(); updateActiveWorkspace(ws => { const filtered = ws.nodes.filter(n => !selectedNodeIds.includes(n.id)); const filteredGroups = ws.groups.filter(g => !selectedNodeIds.includes(g.id)); const filteredImages = (ws.images || []).filter(img => !selectedNodeIds.includes(img.id)); const filteredEdges = ws.edges.filter(e => !selectedNodeIds.includes(e.source) && !selectedNodeIds.includes(e.target)); return { nodes: filtered, edges: filteredEdges, groups: computeLayout(filteredGroups, filtered), images: filteredImages }; }); setSelectedNodeIds([]); setSelectionMenuOpen(false); }} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full text-left">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
              <button onClick={() => { takeSnapshot(); const selectedNodes = nodes.filter(n => selectedNodeIds.includes(n.id)); const selectedEdges = edges.filter(e => selectedNodeIds.includes(e.source) && selectedNodeIds.includes(e.target)); const selectedImages = (activeWs?.images || []).filter(img => selectedNodeIds.includes(img.id)); let currentId = nextId; const idMap = {}; const newNodes = selectedNodes.map(n => { const newId = currentId.toString(); idMap[n.id] = newId; currentId++; return { ...n, id: newId, x: n.x + 40, y: n.y + 40, cloneSourceId: null, workspaceId: activeTab }; }); const newEdges = selectedEdges.map(e => ({ id: `e-${currentId++}`, source: idMap[e.source] || e.source, target: idMap[e.target] || e.target, workspaceId: activeTab })); const newImages = selectedImages.map(img => ({ ...img, id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, x: img.x + 40, y: img.y + 40, workspaceId: activeTab })); updateActiveWorkspace(ws => { const updatedNodes = [...ws.nodes, ...newNodes]; return { nodes: updatedNodes, edges: [...ws.edges, ...newEdges], groups: computeLayout(ws.groups, updatedNodes), images: [...(ws.images || []), ...newImages] }; }); setNextId(currentId); setSelectedNodeIds([...newNodes.map(n => n.id), ...newImages.map(img => img.id)]); setSelectionMenuOpen(false); }} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors w-full text-left">
                <Copy className="w-4 h-4" /> Duplicate
              </button>
              <button onClick={() => { exportSelectedNodes(selectedNodeIds); setSelectionMenuOpen(false); }} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors w-full text-left" id="export-selected-btn">
                <Download className="w-4 h-4" /> Export
              </button>
              <button onClick={() => {
                if (selectedNodeIds.length === 2) {
                  const [sourceId, targetId] = selectedNodeIds;
                  const exists = edges.some(e => (e.source === sourceId && e.target === targetId) || (e.source === targetId && e.target === sourceId));
                  if (!exists) {
                    takeSnapshot();
                    updateActiveWorkspace(ws => ({ edges: [...ws.edges, { id: `e-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, source: sourceId, target: targetId, workspaceId: activeTab }] }));
                    showToast('Connected');
                  } else {
                    showToast('Already connected');
                  }
                  setSelectedNodeIds([]);
                } else {
                  showToast('Select only 2 objects');
                }
                setSelectionMenuOpen(false);
              }} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors w-full text-left">
                <Link2 className="w-4 h-4" /> Link
              </button>
              <button onClick={() => {
                if (selectedNodeIds.length < 2) { setSelectionMenuOpen(false); return; }
                takeSnapshot();
                const selectedNodes = nodes.filter(n => selectedNodeIds.includes(n.id));
                const NODE_W = 280;
                const NODE_H = 160;
                const PADDING = 30;
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                selectedNodes.forEach(n => {
                  if (n.x < minX) minX = n.x;
                  if (n.y < minY) minY = n.y;
                  if (n.x + NODE_W > maxX) maxX = n.x + NODE_W;
                  if (n.y + NODE_H > maxY) maxY = n.y + NODE_H;
                });
                const groupX = minX - PADDING;
                const groupY = minY - PADDING - 40;
                const groupW = maxX - minX + PADDING * 2;
                const groupH = maxY - minY + PADDING * 2 + 40;
                const newGroupId = `g-${Date.now()}`;
                updateActiveWorkspace(ws => {
                  const updatedNodes = ws.nodes.map(n => selectedNodeIds.includes(n.id) ? { ...n, groupId: newGroupId } : n);
                  const newGroup = { id: newGroupId, name: 'New Group', x: groupX, y: groupY, width: groupW, height: groupH, theme: 'blue', parentGroupId: null };
                  const updatedGroups = [...ws.groups, newGroup];
                  return { nodes: updatedNodes, groups: computeLayout(updatedGroups, updatedNodes) };
                });
                setSelectedNodeIds([]);
                setSelectionMenuOpen(false);
              }} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition-colors w-full text-left">
                <Layers className="w-4 h-4" /> Group
              </button>
            </div>
          )}
          <div className="flex items-center gap-1.5 bg-white rounded-full shadow-xl border border-slate-200 min-w-[80px] py-1.5 px-3 cursor-pointer select-none" onClick={() => setSelectionMenuOpen(prev => !prev)}>
            <ChevronUp className="w-3 h-3 text-slate-400" />
            <span className="text-sm font-semibold text-slate-600">{selectedNodeIds.length} Selected</span>
            <button onClick={(e) => { e.stopPropagation(); setSelectedNodeIds([]); }} className="ml-1 p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors" title="Clear Selection">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* --- Secret Project Panel --- */}
      {showProjectPanel && renderProjectPanel(false)}

      {/* --- Timer Running Countdown (when panel closed) --- */}
      {timerRunning && !showTimer && (
        <div
          className={`fixed top-12 left-1/2 -translate-x-1/2 z-[51] hover:opacity-90 transition-opacity cursor-pointer bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-slate-200/50 px-2.5 py-1.5 flex items-center gap-1.5 ${timerPaused ? 'opacity-70' : 'opacity-50'}`}
          onClick={() => setShowTimer(true)}
          title="Click to open timer"
        >
          <Timer className={`w-3.5 h-3.5 ${timerPaused ? 'text-amber-500' : 'text-indigo-600'}`} />
          <span className={`text-sm font-mono font-semibold ${timerPaused ? 'text-amber-600' : 'text-slate-700'}`}>
            {(() => {
              const minutes = Math.ceil(timerSeconds / 60);
              return `${minutes.toString().padStart(2, '0')}m`;
            })()}
          </span>
          {timerPaused && (
            <span className="text-xs text-amber-500 font-medium">(paused)</span>
          )}
        </div>
      )}

      {/* --- Toast Notification --- */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[90] px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-full shadow-lg animate-in fade-in duration-200">
          {toastMessage}
        </div>
      )}

      {/* --- Timer Complete Notification --- */}
      {timerNotification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[90] animate-in slide-in-from-top fade-in duration-300">
          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-orange-200 px-4 py-3 flex items-center gap-3">
            <span className="text-xl">⏰</span>
            <span className="text-sm font-semibold text-orange-700">Timer Complete!</span>
            <button
              onClick={() => setTimerNotification(false)}
              className="p-1 hover:bg-orange-100 rounded-lg text-orange-400 hover:text-orange-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* --- Reminder Notification Toast --- */}
      {activeReminderNotification && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[85] animate-in slide-in-from-bottom fade-in duration-300 max-w-sm w-full mx-4">
          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-slate-200 px-4 py-3 flex items-start gap-3">
            <span className="text-2xl shrink-0">{activeReminderNotification.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">{activeReminderNotification.title}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{activeReminderNotification.content}</p>
            </div>
            <button
              onClick={dismissReminderNotification}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* --- Partial Import Placement Dialog --- */}
      {showPartialImportDialog && partialImportData && (
        <>
          <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm" onClick={() => { setShowPartialImportDialog(false); setPartialImportData(null); }} />
          <div className="fixed inset-0 z-[201] flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md mx-4 pointer-events-auto">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-800">Import Partial Map</h2>
                <button onClick={() => { setShowPartialImportDialog(false); setPartialImportData(null); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
                  <p className="font-medium text-slate-800 mb-1">Source: {partialImportData.metadata?.sourceWorkspace || 'Unknown'}</p>
                  <p>{partialImportData.metadata?.nodeCount || 0} nodes, {partialImportData.metadata?.edgeCount || 0} connections</p>
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-700 block mb-2">Placement</span>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { value: 'center', label: 'Add to center of canvas', always: true },
                      { value: 'separate-branch', label: 'Add as separate branch (right side)', always: true },
                      { value: 'inside-selected', label: 'Add below selected node', always: false },
                      { value: 'left', label: 'Insert left of selected node', always: false },
                      { value: 'right', label: 'Insert right of selected node', always: false },
                      { value: 'top', label: 'Insert above selected node', always: false },
                      { value: 'bottom', label: 'Insert below selected node', always: false },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setPartialImportPlacement(opt.value)}
                        disabled={!opt.always && !focusedNodeId}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                          partialImportPlacement === opt.value
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                            : !opt.always && !focusedNodeId
                              ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        {opt.label}
                        {!opt.always && !focusedNodeId && <span className="text-xs text-slate-400 ml-2">(select a node first)</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-100">
                <button onClick={() => { setShowPartialImportDialog(false); setPartialImportData(null); }} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                <button onClick={executePartialImport} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">Import</button>
              </div>
            </div>
          </div>
        </>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes dash { to { stroke-dashoffset: -14; } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #94a3b8; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .canvas-grid-clickable { pointer-events: auto !important; }
      `}} />
    </div>
  );
}
