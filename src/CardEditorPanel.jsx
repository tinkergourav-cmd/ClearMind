import React, { useState, useEffect, useRef } from 'react';
import { Pencil, X, Palette, Check, Eye, EyeOff } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

// Theme options matching the THEMES constant in App.jsx
const THEME_OPTIONS = [
  { key: 'blue', name: 'Ocean Blue', color: '#bfdbfe' },
  { key: 'green', name: 'Fresh Green', color: '#bbf7d0' },
  { key: 'pink', name: 'Soft Pink', color: '#fbcfe8' },
  { key: 'yellow', name: 'Sunny Yellow', color: '#fef08a' },
  { key: 'purple', name: 'Royal Purple', color: '#e9d5ff' },
  { key: 'orange', name: 'Warm Orange', color: '#fed7aa' },
  { key: 'teal', name: 'Cool Teal', color: '#99f6e4' },
  { key: 'rose', name: 'Rose Red', color: '#fecdd3' },
  { key: 'indigo', name: 'Deep Indigo', color: '#c7d2fe' },
  { key: 'slate', name: 'Neutral Slate', color: '#e2e8f0' },
];

export default function CardEditorPanel({ selectedNode, onUpdateNode, onSnapshot, onClose }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [theme, setTheme] = useState('blue');
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const themePickerRef = useRef(null);

  useEffect(() => {
    if (selectedNode) {
      setTitle(selectedNode.title || '');
      setContent(selectedNode.content || '');
      setTheme(selectedNode.theme || 'blue');
    } else {
      setTitle('');
      setContent('');
      setTheme('blue');
    }
    setShowPreview(false);
  }, [selectedNode?.id]);

  // Close theme picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (themePickerRef.current && !themePickerRef.current.contains(e.target)) {
        setShowThemePicker(false);
      }
    };
    if (showThemePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showThemePicker]);

  const currentThemeColor = THEME_OPTIONS.find((opt) => opt.key === theme)?.color || '#bfdbfe';

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    onUpdateNode({ title: newTitle });
  };

  const handleContentChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);
    onUpdateNode({ content: newContent });
  };

  const handleThemeChange = (newTheme) => {
    if (newTheme === theme) return;
    onSnapshot();
    setTheme(newTheme);
    onUpdateNode({ theme: newTheme });
  };

  return (
    <div className="w-[40vw] bg-white border-l border-slate-200 flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50 shrink-0 relative">
        <div className="flex items-center gap-2">
          <Pencil className="w-4 h-4 text-cyan-600" />
          <h3 className="text-sm font-bold text-slate-800">Card Editor</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {selectedNode && (
            <div ref={themePickerRef} className="relative">
              <button
                onClick={() => setShowThemePicker(!showThemePicker)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-slate-200 hover:border-slate-300 hover:bg-slate-100 transition-colors"
                title="Theme Color"
              >
                <div
                  className="w-4 h-4 rounded border border-slate-300/60 shadow-sm"
                  style={{ backgroundColor: currentThemeColor }}
                />
                <Palette className="w-3 h-3 text-slate-500" />
              </button>
              {showThemePicker && (
                <div className="absolute right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-3 w-[260px]">
                  <div className="grid grid-cols-5 gap-2">
                    {THEME_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => {
                          handleThemeChange(opt.key);
                          setShowThemePicker(false);
                        }}
                        className={`group relative flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all ${
                          theme === opt.key
                            ? 'border-cyan-400 bg-cyan-50/50 ring-1 ring-cyan-300'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                        title={opt.name}
                      >
                        <div
                          className="w-7 h-7 rounded-full border border-slate-300/60 flex items-center justify-center shadow-sm"
                          style={{ backgroundColor: opt.color }}
                        >
                          {theme === opt.key && (
                            <Check className="w-3.5 h-3.5 text-slate-700" />
                          )}
                        </div>
                        <span className="text-[9px] text-slate-500 truncate w-full text-center leading-tight">
                          {opt.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {selectedNode && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="p-1.5 rounded-md border border-slate-200 hover:border-slate-300 hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700"
              title={showPreview ? 'Hide Preview' : 'Show Preview'}
            >
              {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {!selectedNode ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-slate-400 italic text-center">
            Select a single card to edit
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-3">
          {/* Title */}
          <div className="shrink-0">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              onFocus={() => onSnapshot()}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-cyan-300 focus:border-cyan-300"
              placeholder="Card title..."
            />
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-h-0">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1 shrink-0">Content</label>
            <textarea
              value={content}
              onChange={handleContentChange}
              onFocus={() => onSnapshot()}
              className="w-full flex-1 text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 placeholder-slate-400 resize-none focus:outline-none focus:ring-1 focus:ring-cyan-300 focus:border-cyan-300 min-h-[120px]"
              placeholder="Write content here... (supports markdown)"
            />
          </div>



          {/* Markdown Preview */}
          {showPreview && content && (
            <div className="flex-1 flex flex-col min-h-0">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1 shrink-0">Preview</label>
              <div className="flex-1 border border-slate-200 rounded-lg p-3 bg-slate-50 text-xs text-slate-700 overflow-auto min-h-[120px]">
                <MarkdownRenderer content={content} isZoomedIn={true} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
