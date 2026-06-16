import React, { memo, useCallback, useMemo } from 'react';
import { resolveComponent } from './ComponentRegistry.js';

/**
 * SchemaRenderer
 * Recursively parses the JSON layout tree and renders actual React components.
 * Optimized with memoization to prevent unnecessary re-renders.
 */

const resolveToken = (val, tokens = []) => {
  if (typeof val === 'string' && val.startsWith('token:')) {
    const id = val.slice(6);
    const t = tokens.find((x) => x.id === id);
    return t?.value ?? val;
  }
  return val;
};

const parseProps = (propsArray = [], tokens = []) => {
  const out = {};
  for (const p of propsArray) {
    if (p?.key) {
      out[p.key] = resolveToken(p.value, tokens);
    }
  }
  return out;
};

const NodeRenderer = memo(({ node, tokens, depth = 0, onInteract }) => {
  const Component = resolveComponent(node?.component || 'Container');
  const parsedProps = useMemo(
    () => parseProps(node?.props, tokens),
    [node?.props, tokens]
  );
  const parsedStyles = useMemo(
    () => resolveToken(node?.styles, tokens) || {},
    [node?.styles, tokens]
  );

  const handleInteract = useCallback(
    (payload) => onInteract?.(payload),
    [onInteract]
  );

  if (node?.visibility === false) return null;

  const childNodes = node?.children || [];

  return (
    <div data-node-id={node?.id} data-component={node?.component} style={{ display: 'contents' }}>
      <Component
        props={parsedProps}
        styles={parsedStyles}
        tokens={tokens}
        onInteract={handleInteract}
      >
        {childNodes.map((child) => (
          <NodeRenderer
            key={child.id || `${depth}-${Math.random()}`}
            node={child}
            tokens={tokens}
            depth={depth + 1}
            onInteract={onInteract}
          />
        ))}
      </Component>
    </div>
  );
});

NodeRenderer.displayName = 'NodeRenderer';

const GlobalStyles = memo(({ tokens }) => {
  const css = useMemo(() => {
    const vars = (tokens || [])
      .map((t) => {
        const name = `--tb-${t.id}`;
        return `${name}: ${t.value};`;
      })
      .join('\n  ');
    return `
      :root {
        ${vars}
      }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: var(--tb-font-body, system-ui, sans-serif); }
    `;
  }, [tokens]);

  return <style>{css}</style>;
});

GlobalStyles.displayName = 'GlobalStyles';

const SchemaRenderer = memo(({ layout, theme, onInteract }) => {
  const tokens = useMemo(() => theme?.tokens || [], [theme]);
  const tree = useMemo(() => layout?.tree || [], [layout]);

  return (
    <>
      <GlobalStyles tokens={tokens} />
      {tree.map((node) => (
        <NodeRenderer
          key={node.id}
          node={node}
          tokens={tokens}
          onInteract={onInteract}
        />
      ))}
    </>
  );
});

SchemaRenderer.displayName = 'SchemaRenderer';

export default SchemaRenderer;
