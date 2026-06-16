import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PreviewBridge, MSG_TYPES } from './postMessageBridge.js';
import { API_BASE } from '../api.js';

/**
 * BuilderWorkspace
 * Split-pane visual editor. Left panel = controls. Right pane = iframe Live Preview.
 * All changes sync to the preview via postMessage instantly.
 */

const PREVIEW_PATH = '/theme-preview';

const fetchJSON = async (url, opts = {}) => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message);
  return data.data;
};

export default function BuilderWorkspace() {
  const iframeRef = useRef(null);
  const bridgeRef = useRef(null);
  const [themes, setThemes] = useState([]);
  const [layouts, setLayouts] = useState([]);
  const [activeThemeSlug, setActiveThemeSlug] = useState('');
  const [activeLayoutSlug, setActiveLayoutSlug] = useState('');
  const [theme, setTheme] = useState({ name: '', slug: '', tokens: [] });
  const [layout, setLayout] = useState({ name: '', slug: '', route: '', tree: [] });
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [sidebarTab, setSidebarTab] = useState('theme'); // theme | layout | components
  const [saving, setSaving] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);

  // Init bridge
  useEffect(() => {
    const bridge = new PreviewBridge(iframeRef);
    bridgeRef.current = bridge;

    bridge.on(MSG_TYPES.READY, () => {
      setPreviewReady(true);
      // Push current state once ready
      bridge.updateTheme(theme);
      bridge.updateLayout(layout);
    });

    bridge.on(MSG_TYPES.NODE_CLICKED, ({ nodeId }) => {
      setSelectedNodeId(nodeId);
      setSidebarTab('layout');
    });

    bridge.on(MSG_TYPES.INTERACTION, (payload) => {
      // eslint-disable-next-line no-console
      console.log('[Builder] Interaction from preview:', payload);
    });

    return () => bridge.destroy();
  }, []);

  // Fetch catalog
  useEffect(() => {
    fetchJSON(`${API_BASE}/theme-builder/themes?status=published`).then(setThemes).catch(() => {});
    fetchJSON(`${API_BASE}/theme-builder/layouts?status=published`).then(setLayouts).catch(() => {});
  }, []);

  // Load active theme
  useEffect(() => {
    if (!activeThemeSlug) return;
    fetchJSON(`${API_BASE}/theme-builder/themes/${activeThemeSlug}`)
      .then((t) => {
        setTheme(t);
        bridgeRef.current?.updateTheme(t);
      })
      .catch(() => {});
  }, [activeThemeSlug]);

  // Load active layout
  useEffect(() => {
    if (!activeLayoutSlug) return;
    fetchJSON(`${API_BASE}/theme-builder/layouts/${activeLayoutSlug}`)
      .then((l) => {
        setLayout(l);
        bridgeRef.current?.updateLayout(l);
      })
      .catch(() => {});
  }, [activeLayoutSlug]);

  // Push changes to preview whenever theme/layout changes locally
  const updateThemeTokens = useCallback((nextTokens) => {
    setTheme((prev) => {
      const next = { ...prev, tokens: nextTokens };
      bridgeRef.current?.updateTheme(next);
      return next;
    });
  }, []);

  const updateLayoutTree = useCallback((nextTree) => {
    setLayout((prev) => {
      const next = { ...prev, tree: nextTree };
      bridgeRef.current?.updateLayout(next);
      return next;
    });
  }, []);

  const updateNodeProp = useCallback((nodeId, key, value) => {
    setLayout((prev) => {
      const walk = (nodes) =>
        nodes.map((n) => {
          if (n.id === nodeId) {
            const props = n.props.map((p) =>
              p.key === key ? { ...p, value } : p
            );
            return { ...n, props };
          }
          if (n.children) return { ...n, children: walk(n.children) };
          return n;
        });
      const next = { ...prev, tree: walk(prev.tree || []) };
      bridgeRef.current?.updateLayout(next);
      return next;
    });
  }, []);

  const updateNodeStyles = useCallback((nodeId, stylesPatch) => {
    setLayout((prev) => {
      const walk = (nodes) =>
        nodes.map((n) => {
          if (n.id === nodeId) {
            return { ...n, styles: { ...n.styles, ...stylesPatch } };
          }
          if (n.children) return { ...n, children: walk(n.children) };
          return n;
        });
      const next = { ...prev, tree: walk(prev.tree || []) };
      bridgeRef.current?.updateLayout(next);
      return next;
    });
  }, []);

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await fetchJSON(`${API_BASE}/theme-builder/themes/${theme.slug}/draft`, {
        method: 'PATCH',
        body: JSON.stringify(theme),
      });
      await fetchJSON(`${API_BASE}/theme-builder/layouts/${layout.slug}/draft`, {
        method: 'PATCH',
        body: JSON.stringify(layout),
      });
      alert('Draft saved');
    } catch (e) {
      alert('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    try {
      await fetchJSON(`${API_BASE}/theme-builder/themes/${theme.slug}/publish`, {
        method: 'PATCH',
        body: JSON.stringify(theme),
      });
      await fetchJSON(`${API_BASE}/theme-builder/layouts/${layout.slug}/publish`, {
        method: 'PATCH',
        body: JSON.stringify(layout),
      });
      alert('Published');
    } catch (e) {
      alert('Publish failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedNode = (() => {
    const walk = (nodes) => {
      for (const n of nodes) {
        if (n.id === selectedNodeId) return n;
        if (n.children) {
          const found = walk(n.children);
          if (found) return found;
        }
      }
      return null;
    };
    return walk(layout.tree || []);
  })();

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* LEFT SIDEBAR */}
      <aside
        style={{
          width: 340,
          flexShrink: 0,
          borderRight: '1px solid #e5e7eb',
          background: '#f9fafb',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            background: '#fff',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Theme Builder</h2>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {['theme', 'layout', 'components'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSidebarTab(tab)}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  fontSize: 12,
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  background: sidebarTab === tab ? '#111827' : '#fff',
                  color: sidebarTab === tab ? '#fff' : '#374151',
                  cursor: 'pointer',
                }}
              >
                {tab[0].toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {sidebarTab === 'theme' && (
            <ThemePanel
              themes={themes}
              activeThemeSlug={activeThemeSlug}
              setActiveThemeSlug={setActiveThemeSlug}
              theme={theme}
              updateThemeTokens={updateThemeTokens}
            />
          )}
          {sidebarTab === 'layout' && (
            <LayoutPanel
              layouts={layouts}
              activeLayoutSlug={activeLayoutSlug}
              setActiveLayoutSlug={setActiveLayoutSlug}
              layout={layout}
              selectedNode={selectedNode}
              updateNodeProp={updateNodeProp}
              updateNodeStyles={updateNodeStyles}
            />
          )}
          {sidebarTab === 'components' && (
            <ComponentsPanel
              layout={layout}
              updateLayoutTree={updateLayoutTree}
            />
          )}
        </div>

        {/* Actions */}
        <div
          style={{
            padding: 16,
            borderTop: '1px solid #e5e7eb',
            background: '#fff',
            display: 'flex',
            gap: 8,
          }}
        >
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            style={{
              flex: 1,
              padding: '10px 0',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              background: '#fff',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={handlePublish}
            disabled={saving}
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              borderRadius: 6,
              background: '#111827',
              color: '#fff',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            Publish
          </button>
        </div>
      </aside>

      {/* RIGHT PREVIEW */}
      <main style={{ flex: 1, position: 'relative', background: '#f3f4f6' }}>
        {!previewReady && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <span style={{ color: '#6b7280' }}>Loading preview…</span>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={PREVIEW_PATH}
          title="Live Preview"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            background: '#fff',
          }}
          sandbox="allow-scripts allow-same-origin"
        />
      </main>
    </div>
  );
}

/* ---------- Sub-Panels ---------- */

function ThemePanel({ themes, activeThemeSlug, setActiveThemeSlug, theme, updateThemeTokens }) {
  const addToken = (type) => {
    const id = `token-${Date.now()}`;
    const defaults = {
      color: { id, type: 'color', value: '#000000', description: '' },
      typography: { id, type: 'typography', value: 'system-ui, sans-serif', description: '' },
      spacing: { id, type: 'spacing', value: '16px', description: '' },
      borderRadius: { id, type: 'borderRadius', value: '8px', description: '' },
      shadow: { id, type: 'shadow', value: '0 1px 3px rgba(0,0,0,0.1)', description: '' },
      breakpoint: { id, type: 'breakpoint', value: '768px', description: '' },
    };
    updateThemeTokens([...(theme.tokens || []), defaults[type]]);
  };

  const updateToken = (index, patch) => {
    const next = theme.tokens.map((t, i) => (i === index ? { ...t, ...patch } : t));
    updateThemeTokens(next);
  };

  const removeToken = (index) => {
    const next = theme.tokens.filter((_, i) => i !== index);
    updateThemeTokens(next);
  };

  return (
    <div>
      <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Theme</label>
      <select
        value={activeThemeSlug}
        onChange={(e) => setActiveThemeSlug(e.target.value)}
        style={{ width: '100%', marginTop: 6, padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
      >
        <option value="">Select theme…</option>
        {themes.map((t) => (
          <option key={t.slug} value={t.slug}>
            {t.name}
          </option>
        ))}
      </select>

      <div style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Tokens</label>
          <div style={{ display: 'flex', gap: 4 }}>
            {['color', 'spacing', 'borderRadius'].map((t) => (
              <button
                key={t}
                onClick={() => addToken(t)}
                style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}
              >
                + {t}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(theme.tokens || []).map((token, idx) => (
            <div key={token.id || idx} style={{ background: '#fff', padding: 10, borderRadius: 6, border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <input
                  value={token.id}
                  onChange={(e) => updateToken(idx, { id: e.target.value })}
                  style={{ flex: 1, fontSize: 12, padding: 4, border: '1px solid #e5e7eb', borderRadius: 4 }}
                  placeholder="token-id"
                />
                <button onClick={() => removeToken(idx)} style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                  ×
                </button>
              </div>
              {token.type === 'color' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="color"
                    value={token.value}
                    onChange={(e) => updateToken(idx, { value: e.target.value })}
                    style={{ width: 32, height: 32, padding: 0, border: 'none' }}
                  />
                  <input
                    value={token.value}
                    onChange={(e) => updateToken(idx, { value: e.target.value })}
                    style={{ flex: 1, fontSize: 12, padding: 4, border: '1px solid #e5e7eb', borderRadius: 4 }}
                  />
                </div>
              ) : (
                <input
                  value={token.value}
                  onChange={(e) => updateToken(idx, { value: e.target.value })}
                  style={{ width: '100%', fontSize: 12, padding: 4, border: '1px solid #e5e7eb', borderRadius: 4 }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LayoutPanel({ layouts, activeLayoutSlug, setActiveLayoutSlug, layout, selectedNode, updateNodeProp, updateNodeStyles }) {
  return (
    <div>
      <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Page Layout</label>
      <select
        value={activeLayoutSlug}
        onChange={(e) => setActiveLayoutSlug(e.target.value)}
        style={{ width: '100%', marginTop: 6, padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
      >
        <option value="">Select layout…</option>
        {layouts.map((l) => (
          <option key={l.slug} value={l.slug}>
            {l.name} ({l.route})
          </option>
        ))}
      </select>

      {selectedNode && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, marginBottom: 8 }}>
            Selected: <strong>{selectedNode.component}</strong>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(selectedNode.props || []).map((p) => (
              <div key={p.key}>
                <label style={{ fontSize: 11, color: '#9ca3af', textTransform: 'capitalize' }}>{p.key}</label>
                {p.type === 'color' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <input
                      type="color"
                      value={p.value}
                      onChange={(e) => updateNodeProp(selectedNode.id, p.key, e.target.value)}
                      style={{ width: 32, height: 32, padding: 0, border: 'none' }}
                    />
                    <input
                      value={p.value}
                      onChange={(e) => updateNodeProp(selectedNode.id, p.key, e.target.value)}
                      style={{ flex: 1, fontSize: 12, padding: 4, border: '1px solid #e5e7eb', borderRadius: 4 }}
                    />
                  </div>
                ) : p.type === 'select' && p.options ? (
                  <select
                    value={p.value}
                    onChange={(e) => updateNodeProp(selectedNode.id, p.key, e.target.value)}
                    style={{ width: '100%', marginTop: 4, padding: 6, borderRadius: 4, border: '1px solid #d1d5db' }}
                  >
                    {p.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={p.value}
                    onChange={(e) => updateNodeProp(selectedNode.id, p.key, e.target.value)}
                    style={{ width: '100%', marginTop: 4, padding: 6, borderRadius: 4, border: '1px solid #d1d5db', fontSize: 12 }}
                  />
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>Inline Styles</div>
            {['backgroundColor', 'color', 'padding', 'margin', 'fontSize', 'borderRadius'].map((k) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <label style={{ width: 100, fontSize: 11, color: '#6b7280' }}>{k}</label>
                <input
                  value={selectedNode.styles?.[k] || ''}
                  onChange={(e) => updateNodeStyles(selectedNode.id, { [k]: e.target.value })}
                  style={{ flex: 1, fontSize: 12, padding: 4, borderRadius: 4, border: '1px solid #e5e7eb' }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {!selectedNode && (
        <div style={{ marginTop: 20, color: '#9ca3af', fontSize: 12 }}>
          Click a component in the preview to edit its props.
        </div>
      )}
    </div>
  );
}

function ComponentsPanel({ layout, updateLayoutTree }) {
  const addNode = (component) => {
    const id = `${component}-${Date.now()}`;
    const presets = {
      Container: { component: 'Container', props: [] },
      Text: { component: 'Text', props: [{ key: 'content', type: 'string', value: 'New text block' }] },
      Heading: { component: 'Heading', props: [{ key: 'content', type: 'string', value: 'Heading' }, { key: 'level', type: 'select', value: 'h2', options: ['h1', 'h2', 'h3', 'h4'] }] },
      Button: { component: 'Button', props: [{ key: 'text', type: 'string', value: 'Click me' }] },
      Image: { component: 'Image', props: [{ key: 'src', type: 'image', value: '' }, { key: 'alt', type: 'string', value: '' }] },
      HeroBanner: { component: 'HeroBanner', props: [{ key: 'heading', type: 'string', value: 'Hero Title' }, { key: 'subheading', type: 'string', value: 'Subtitle' }, { key: 'ctaText', type: 'string', value: 'Shop Now' }] },
      ProductCard: { component: 'ProductCard', props: [{ key: 'title', type: 'string', value: 'Product' }, { key: 'price', type: 'string', value: '$0.00' }] },
      Spacer: { component: 'Spacer', props: [{ key: 'height', type: 'string', value: '16px' }] },
      FlexRow: { component: 'FlexRow', props: [{ key: 'gap', type: 'string', value: '12px' }] },
      FlexCol: { component: 'FlexCol', props: [{ key: 'gap', type: 'string', value: '8px' }] },
      Grid: { component: 'Grid', props: [{ key: 'columns', type: 'string', value: '3' }, { key: 'gap', type: 'string', value: '16px' }] },
    };
    const base = presets[component] || { component, props: [] };
    const node = { id, type: 'element', ...base, children: [], styles: {} };
    updateLayoutTree([...(layout.tree || []), node]);
  };

  const components = ['Container', 'Text', 'Heading', 'Button', 'Image', 'HeroBanner', 'ProductCard', 'Spacer', 'FlexRow', 'FlexCol', 'Grid'];

  return (
    <div>
      <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, marginBottom: 10 }}>Add Component</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {components.map((c) => (
          <button
            key={c}
            onClick={() => addNode(c)}
            style={{
              padding: '10px 0',
              fontSize: 12,
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              background: '#fff',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
