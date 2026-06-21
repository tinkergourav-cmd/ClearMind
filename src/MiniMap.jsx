import React, { useState, useRef, useEffect, useCallback } from 'react';

// Theme color map for node/group rendering in mini map
const THEME_COLORS = {
  blue: '#3b82f6',
  green: '#10b981',
  pink: '#ec4899',
  yellow: '#eab308',
  purple: '#8b5cf6',
  orange: '#f97316',
  teal: '#14b8a6',
  rose: '#f43f5e',
  indigo: '#6366f1',
  slate: '#64748b',
};

const DEFAULT_WIDTH = 220;
const DEFAULT_HEIGHT = 160;
const MIN_WIDTH = 120;
const MIN_HEIGHT = 90;
const MAX_WIDTH = 400;
const MAX_HEIGHT = 300;
const PADDING = 40;
const ARROW_STEP = 50;

// Node dimensions used in the minimap rendering
const NODE_EXPANDED_WIDTH = 240;
const NODE_EXPANDED_HEIGHT = 120;

export default function MiniMap({
  nodes,
  groups,
  images,
  pins,
  transform,
  setTransform,
  workspaceRef,
  visible,
  openedViaShortcut,
}) {
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const [panelHeight, setPanelHeight] = useState(DEFAULT_HEIGHT);
  const [isHovered, setIsHovered] = useState(false);
  const [isNavigatingWithKeys, setIsNavigatingWithKeys] = useState(false);
  const [frameSelected, setFrameSelected] = useState(false);
  const [isDraggingFrame, setIsDraggingFrame] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef(null);
  const resizeStartRef = useRef(null);
  const containerRef = useRef(null);
  const transformRef = useRef(transform);

  // Keep transformRef in sync with the latest transform prop
  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  // Calculate world bounding box from all nodes and groups
  const getWorldBounds = useCallback(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let hasContent = false;

    nodes.forEach(node => {
      hasContent = true;
      const w = NODE_EXPANDED_WIDTH;
      const h = NODE_EXPANDED_HEIGHT;
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + w);
      maxY = Math.max(maxY, node.y + h);
    });

    groups.forEach(group => {
      hasContent = true;
      minX = Math.min(minX, group.x);
      minY = Math.min(minY, group.y);
      maxX = Math.max(maxX, group.x + (group.width || 300));
      maxY = Math.max(maxY, group.y + (group.height || 200));
    });

    (images || []).forEach(img => {
      hasContent = true;
      minX = Math.min(minX, img.x);
      minY = Math.min(minY, img.y);
      maxX = Math.max(maxX, img.x + (img.width || 280));
      maxY = Math.max(maxY, img.y + (img.height || 180));
    });

    (pins || []).forEach(pin => {
      hasContent = true;
      minX = Math.min(minX, pin.canvas_position_x);
      minY = Math.min(minY, pin.canvas_position_y);
      maxX = Math.max(maxX, pin.canvas_position_x);
      maxY = Math.max(maxY, pin.canvas_position_y);
    });

    if (!hasContent) {
      return { minX: -500, minY: -500, maxX: 500, maxY: 500 };
    }

    // Add padding
    return {
      minX: minX - PADDING,
      minY: minY - PADDING,
      maxX: maxX + PADDING,
      maxY: maxY + PADDING,
    };
  }, [nodes, groups, images, pins]);

  // Convert world coordinates to minimap coordinates
  const worldToMiniMap = useCallback((worldX, worldY, bounds) => {
    const worldWidth = bounds.maxX - bounds.minX;
    const worldHeight = bounds.maxY - bounds.minY;
    const scaleX = panelWidth / worldWidth;
    const scaleY = panelHeight / worldHeight;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (panelWidth - worldWidth * scale) / 2;
    const offsetY = (panelHeight - worldHeight * scale) / 2;
    return {
      x: (worldX - bounds.minX) * scale + offsetX,
      y: (worldY - bounds.minY) * scale + offsetY,
      scale,
    };
  }, [panelWidth, panelHeight]);

  // Convert minimap coordinates to world coordinates
  const miniMapToWorld = useCallback((mmX, mmY, bounds) => {
    const worldWidth = bounds.maxX - bounds.minX;
    const worldHeight = bounds.maxY - bounds.minY;
    const scaleX = panelWidth / worldWidth;
    const scaleY = panelHeight / worldHeight;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (panelWidth - worldWidth * scale) / 2;
    const offsetY = (panelHeight - worldHeight * scale) / 2;
    return {
      x: (mmX - offsetX) / scale + bounds.minX,
      y: (mmY - offsetY) / scale + bounds.minY,
    };
  }, [panelWidth, panelHeight]);

  // Get the viewport rectangle in minimap coordinates
  const getViewportRect = useCallback((bounds) => {
    if (!workspaceRef.current) return null;
    const container = workspaceRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Visible area in world coordinates
    const visibleLeft = -transform.x / transform.scale;
    const visibleTop = -transform.y / transform.scale;
    const visibleWidth = containerWidth / transform.scale;
    const visibleHeight = containerHeight / transform.scale;

    const topLeft = worldToMiniMap(visibleLeft, visibleTop, bounds);
    const bottomRight = worldToMiniMap(visibleLeft + visibleWidth, visibleTop + visibleHeight, bounds);

    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    };
  }, [transform, workspaceRef, worldToMiniMap]);

  // Click to navigate
  const handleMiniMapClick = useCallback((e) => {
    if (isDraggingFrame || isResizing) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mmX = e.clientX - rect.left;
    const mmY = e.clientY - rect.top;
    const bounds = getWorldBounds();
    const worldPoint = miniMapToWorld(mmX, mmY, bounds);

    if (!workspaceRef.current) return;
    const container = workspaceRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Deselect viewport frame when clicking the background
    setFrameSelected(false);

    setTransform(prev => ({
      ...prev,
      x: containerWidth / 2 - worldPoint.x * prev.scale,
      y: containerHeight / 2 - worldPoint.y * prev.scale,
    }));
  }, [isDraggingFrame, isResizing, getWorldBounds, miniMapToWorld, workspaceRef, setTransform]);

  // Drag frame to navigate
  const handleFrameMouseDown = useCallback((e) => {
    e.stopPropagation();
    setIsDraggingFrame(true);
    setFrameSelected(true);
    const currentTransform = transformRef.current;
    dragStartRef.current = { x: e.clientX, y: e.clientY, tx: currentTransform.x, ty: currentTransform.y, scale: currentTransform.scale };
  }, []);

  useEffect(() => {
    if (!isDraggingFrame) return;

    const handleMouseMove = (e) => {
      if (!dragStartRef.current) return;
      const bounds = getWorldBounds();
      const worldWidth = bounds.maxX - bounds.minX;
      const worldHeight = bounds.maxY - bounds.minY;
      const scaleX = panelWidth / worldWidth;
      const scaleY = panelHeight / worldHeight;
      const mmScale = Math.min(scaleX, scaleY);

      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      // Convert minimap delta to world delta, then to transform delta
      const worldDx = dx / mmScale;
      const worldDy = dy / mmScale;

      const currentTransform = transformRef.current;
      setTransform({
        ...currentTransform,
        x: dragStartRef.current.tx - worldDx * dragStartRef.current.scale,
        y: dragStartRef.current.ty - worldDy * dragStartRef.current.scale,
      });
    };

    const handleMouseUp = () => {
      setIsDraggingFrame(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingFrame, setTransform, getWorldBounds, panelWidth, panelHeight]);

  // Resize handle
  const handleResizeMouseDown = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    resizeStartRef.current = { x: e.clientX, y: e.clientY, w: panelWidth, h: panelHeight };
  }, [panelWidth, panelHeight]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      if (!resizeStartRef.current) return;
      const dx = e.clientX - resizeStartRef.current.x;
      const dy = e.clientY - resizeStartRef.current.y;
      setPanelWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, resizeStartRef.current.w + dx)));
      setPanelHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, resizeStartRef.current.h + dy)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Arrow key navigation when opened via shortcut and frame is selected
  useEffect(() => {
    if (!openedViaShortcut || !frameSelected || !visible) return;

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (!arrowKeys.includes(e.key)) return;

      e.preventDefault();
      e.stopImmediatePropagation();
      setIsNavigatingWithKeys(true);

      setTransform(prev => {
        let dx = 0, dy = 0;
        if (e.key === 'ArrowLeft') dx = ARROW_STEP * prev.scale;
        if (e.key === 'ArrowRight') dx = -ARROW_STEP * prev.scale;
        if (e.key === 'ArrowUp') dy = ARROW_STEP * prev.scale;
        if (e.key === 'ArrowDown') dy = -ARROW_STEP * prev.scale;
        return { ...prev, x: prev.x + dx, y: prev.y + dy };
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openedViaShortcut, frameSelected, visible, setTransform]);

  // Reset navigating with keys state on hover
  useEffect(() => {
    if (isHovered) {
      setIsNavigatingWithKeys(false);
    }
  }, [isHovered]);

  // Reset frameSelected when minimap is closed
  useEffect(() => {
    if (!visible) {
      setFrameSelected(false);
    }
  }, [visible]);

  if (!visible) return null;

  const bounds = getWorldBounds();
  const viewportRect = getViewportRect(bounds);

  // Compute opacity
  const opacity = isNavigatingWithKeys ? 0.5 : (isHovered || isDraggingFrame || isResizing) ? 1 : 0.5;

  return (
    <div
      ref={containerRef}
      className="absolute bottom-20 left-4 z-50 rounded-lg border border-slate-600 bg-slate-900 overflow-hidden select-none"
      style={{
        width: panelWidth,
        height: panelHeight,
        opacity,
        transition: 'opacity 0.2s',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleMiniMapClick}
    >
      {/* Render groups */}
      {groups.map(group => {
        const pos = worldToMiniMap(group.x, group.y, bounds);
        const endPos = worldToMiniMap(
          group.x + (group.width || 300),
          group.y + (group.height || 200),
          bounds
        );
        const color = THEME_COLORS[group.theme] || THEME_COLORS.blue;
        return (
          <div
            key={`g-${group.id}`}
            className="absolute rounded-sm pointer-events-none"
            style={{
              left: pos.x,
              top: pos.y,
              width: endPos.x - pos.x,
              height: endPos.y - pos.y,
              border: `1px solid ${color}`,
              backgroundColor: `${color}15`,
            }}
          />
        );
      })}

      {/* Render nodes */}
      {nodes.map(node => {
        const w = NODE_EXPANDED_WIDTH;
        const h = NODE_EXPANDED_HEIGHT;
        const pos = worldToMiniMap(node.x, node.y, bounds);
        const endPos = worldToMiniMap(node.x + w, node.y + h, bounds);
        const color = THEME_COLORS[node.theme] || THEME_COLORS.blue;
        return (
          <div
            key={`n-${node.id}`}
            className="absolute rounded-sm pointer-events-none"
            style={{
              left: pos.x,
              top: pos.y,
              width: Math.max(2, endPos.x - pos.x),
              height: Math.max(2, endPos.y - pos.y),
              backgroundColor: color,
              opacity: 0.8,
            }}
          />
        );
      })}

      {/* Render images */}
      {(images || []).map(img => {
        const pos = worldToMiniMap(img.x, img.y, bounds);
        const endPos = worldToMiniMap(img.x + (img.width || 280), img.y + (img.height || 180), bounds);
        return (
          <div
            key={`img-${img.id}`}
            className="absolute rounded-sm pointer-events-none"
            style={{
              left: pos.x,
              top: pos.y,
              width: Math.max(2, endPos.x - pos.x),
              height: Math.max(2, endPos.y - pos.y),
              backgroundColor: '#94a3b8',
              opacity: 0.6,
            }}
          />
        );
      })}

      {/* Render pins */}
      {(pins || []).map(pin => {
        const pos = worldToMiniMap(pin.canvas_position_x, pin.canvas_position_y, bounds);
        return (
          <div
            key={`pin-${pin.id}`}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: pos.x - 2,
              top: pos.y - 2,
              width: 4,
              height: 4,
              backgroundColor: pin.color,
              boxShadow: `0 0 2px ${pin.color}`,
            }}
          />
        );
      })}

      {/* Viewport frame */}
      {viewportRect && (
        <div
          className="absolute border-2 border-blue-400 rounded-sm cursor-move"
          style={{
            left: viewportRect.x,
            top: viewportRect.y,
            width: viewportRect.width,
            height: viewportRect.height,
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            pointerEvents: 'auto',
          }}
          onMouseDown={handleFrameMouseDown}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize"
        style={{ pointerEvents: 'auto' }}
        onMouseDown={handleResizeMouseDown}
        onClick={(e) => e.stopPropagation()}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" className="text-slate-500">
          <path d="M10 2L2 10M10 6L6 10M10 10L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
