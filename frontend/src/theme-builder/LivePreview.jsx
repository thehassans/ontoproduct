import React, { useEffect, useRef, useState, useCallback } from 'react';
import SchemaRenderer from './SchemaRenderer.jsx';
import { PreviewHost, MSG_TYPES } from './postMessageBridge.js';

/**
 * LivePreview
 * Rendered inside an iframe. Receives theme/layout updates via postMessage
 * and renders the SchemaRenderer in real time without page reloads.
 */

export default function LivePreview() {
  const [theme, setTheme] = useState({ tokens: [] });
  const [layout, setLayout] = useState({ tree: [] });
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const hostRef = useRef(null);
  const rootRef = useRef(null);

  const highlightNode = useCallback((nodeId) => {
    if (!rootRef.current) return;
    const el = rootRef.current.querySelector(`[data-node-id="${nodeId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.outline = '2px solid #3b82f6';
      el.style.outlineOffset = '2px';
      setTimeout(() => {
        el.style.outline = '';
        el.style.outlineOffset = '';
      }, 1200);
    }
  }, []);

  useEffect(() => {
    const host = new PreviewHost();
    hostRef.current = host;

    host.on(MSG_TYPES.UPDATE_THEME, (payload) => {
      setTheme((prev) => ({ ...prev, ...payload }));
    });

    host.on(MSG_TYPES.UPDATE_LAYOUT, (payload) => {
      setLayout((prev) => ({ ...prev, ...payload }));
    });

    host.on(MSG_TYPES.UPDATE_NODE, ({ nodeId, patch }) => {
      setLayout((prev) => {
        const updateTree = (nodes) =>
          nodes.map((n) => {
            if (n.id === nodeId) return { ...n, ...patch };
            if (n.children) return { ...n, children: updateTree(n.children) };
            return n;
          });
        return { ...prev, tree: updateTree(prev.tree || []) };
      });
    });

    host.on(MSG_TYPES.SCROLL_TO_NODE, ({ nodeId }) => {
      highlightNode(nodeId);
    });

    host.on(MSG_TYPES.SELECT_NODE, ({ nodeId }) => {
      setSelectedNodeId(nodeId);
      highlightNode(nodeId);
    });

    // Notify parent that preview is ready
    host.notifyReady({ url: window.location.href });

    return () => host.destroy();
  }, [highlightNode]);

  const handleInteract = useCallback(
    (payload) => {
      hostRef.current?.notifyInteraction(payload);
    },
    []
  );

  const handleClick = useCallback((e) => {
    const el = e.target.closest('[data-node-id]');
    if (el) {
      const nodeId = el.getAttribute('data-node-id');
      const component = el.getAttribute('data-component');
      hostRef.current?.notifyNodeClicked(nodeId, component);
    }
  }, []);

  return (
    <div
      ref={rootRef}
      onClick={handleClick}
      style={{
        minHeight: '100vh',
        background: '#fff',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <SchemaRenderer
        layout={layout}
        theme={theme}
        onInteract={handleInteract}
      />
      {/* Selection overlay helper */}
      <style>{`
        [data-selected="true"] {
          outline: 2px dashed #3b82f6 !important;
          outline-offset: 2px !important;
        }
      `}</style>
    </div>
  );
}
