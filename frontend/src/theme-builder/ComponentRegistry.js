import React from 'react';

/**
 * ComponentRegistry
 * Maps schema component names to actual React components.
 * All components are generic and strictly respect injected JSON props.
 */

export const resolveToken = (tokenId, tokens) => {
  const t = tokens?.find((x) => x.id === tokenId);
  return t?.value ?? tokenId;
};

export const injectTokens = (obj, tokens) => {
  if (!obj || !tokens) return obj;
  if (typeof obj === 'string' && obj.startsWith('token:')) {
    return resolveToken(obj.slice(6), tokens);
  }
  if (Array.isArray(obj)) return obj.map((v) => injectTokens(v, tokens));
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, injectTokens(v, tokens)])
    );
  }
  return obj;
};

export const toStyle = (styles = {}, tokens = []) => {
  const s = injectTokens(styles, tokens);
  const map = {
    paddingX: 'paddingLeft',
    paddingY: 'paddingTop',
    marginX: 'marginLeft',
    marginY: 'marginTop',
  };
  const out = {};
  for (const [k, v] of Object.entries(s)) {
    if (map[k]) {
      out[map[k]] = v;
      if (k.endsWith('X')) out.paddingRight = v;
      if (k.endsWith('Y')) out.paddingBottom = v;
    } else {
      const cssKey = k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
      out[cssKey] = v;
    }
  }
  return out;
};

/* ---------- Generic Primitive Components ---------- */

const Container = ({ props = {}, styles = {}, tokens, children }) => (
  <div
    style={toStyle(styles, tokens)}
    className={props.className || ''}
    id={props.id || undefined}
  >
    {children}
  </div>
);

const Text = ({ props = {}, styles = {}, tokens }) => {
  const Tag = props.tag || 'p';
  return (
    <Tag style={toStyle(styles, tokens)} className={props.className || ''}>
      {props.content || ''}
    </Tag>
  );
};

const Heading = ({ props = {}, styles = {}, tokens }) => {
  const Tag = props.level || 'h2';
  return (
    <Tag style={toStyle(styles, tokens)} className={props.className || ''}>
      {props.content || ''}
    </Tag>
  );
};

const Button = ({ props = {}, styles = {}, tokens, onInteract }) => {
  const handleClick = () => {
    if (props.action && onInteract) {
      onInteract({ type: props.action, payload: props.actionPayload || {} });
    }
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      style={toStyle(styles, tokens)}
      className={props.className || ''}
    >
      {props.text || 'Button'}
    </button>
  );
};

const Image = ({ props = {}, styles = {}, tokens }) => (
  <img
    src={props.src || ''}
    alt={props.alt || ''}
    style={toStyle(styles, tokens)}
    className={props.className || ''}
    loading={props.lazy ? 'lazy' : 'eager'}
  />
);

const Link = ({ props = {}, styles = {}, tokens, children }) => (
  <a
    href={props.href || '#'}
    target={props.external ? '_blank' : undefined}
    rel={props.external ? 'noopener noreferrer' : undefined}
    style={toStyle(styles, tokens)}
    className={props.className || ''}
  >
    {children || props.label || 'Link'}
  </a>
);

/* ---------- E-Commerce Components ---------- */

const Header = ({ props = {}, styles = {}, tokens, children }) => (
  <header
    style={toStyle(styles, tokens)}
    className={`theme-header ${props.className || ''}`}
  >
    {children}
  </header>
);

const Footer = ({ props = {}, styles = {}, tokens, children }) => (
  <footer
    style={toStyle(styles, tokens)}
    className={`theme-footer ${props.className || ''}`}
  >
    {children}
  </footer>
);

const HeroBanner = ({ props = {}, styles = {}, tokens }) => (
  <section
    style={{
      ...toStyle(styles, tokens),
      backgroundImage: props.backgroundImage
        ? `url(${props.backgroundImage})`
        : undefined,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}
    className={`theme-hero ${props.className || ''}`}
  >
    <div className="theme-hero-content">
      {props.heading && <h1 style={{ margin: 0 }}>{props.heading}</h1>}
      {props.subheading && <p>{props.subheading}</p>}
      {props.ctaText && (
        <button
          type="button"
          style={{
            padding: '12px 24px',
            borderRadius: resolveToken('radius-md', tokens) || '6px',
            background: resolveToken('color-primary', tokens) || '#111',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {props.ctaText}
        </button>
      )}
    </div>
  </section>
);

const ProductGrid = ({ props = {}, styles = {}, tokens, children }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${props.columns || 4}, 1fr)`,
      gap: props.gap || '16px',
      ...toStyle(styles, tokens),
    }}
    className={props.className || ''}
  >
    {children}
  </div>
);

const ProductCard = ({ props = {}, styles = {}, tokens }) => (
  <div
    style={{
      border: '1px solid #eee',
      borderRadius: resolveToken('radius-md', tokens) || '8px',
      overflow: 'hidden',
      ...toStyle(styles, tokens),
    }}
    className={`theme-product-card ${props.className || ''}`}
  >
    {props.image && (
      <img
        src={props.image}
        alt={props.title || ''}
        style={{ width: '100%', height: '200px', objectFit: 'cover' }}
      />
    )}
    <div style={{ padding: '12px' }}>
      {props.title && (
        <h3 style={{ margin: '0 0 8px', fontSize: '16px' }}>{props.title}</h3>
      )}
      {props.price && (
        <p style={{ margin: 0, fontWeight: 600, color: resolveToken('color-primary', tokens) || '#111' }}>
          {props.price}
        </p>
      )}
      {props.badge && (
        <span
          style={{
            display: 'inline-block',
            marginTop: '8px',
            padding: '4px 8px',
            fontSize: '12px',
            borderRadius: '4px',
            background: resolveToken('color-secondary', tokens) || '#f5f5f5',
          }}
        >
          {props.badge}
        </span>
      )}
    </div>
  </div>
);

const Navbar = ({ props = {}, styles = {}, tokens, children }) => (
  <nav
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      ...toStyle(styles, tokens),
    }}
    className={`theme-navbar ${props.className || ''}`}
  >
    {children}
  </nav>
);

const Spacer = ({ props = {}, styles = {}, tokens }) => (
  <div
    style={{
      height: props.height || '16px',
      width: props.width || '100%',
      ...toStyle(styles, tokens),
    }}
  />
);

const FlexRow = ({ props = {}, styles = {}, tokens, children }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: props.alignItems || 'center',
      justifyContent: props.justifyContent || 'flex-start',
      gap: props.gap || '0px',
      flexWrap: props.wrap ? 'wrap' : 'nowrap',
      ...toStyle(styles, tokens),
    }}
    className={props.className || ''}
  >
    {children}
  </div>
);

const FlexCol = ({ props = {}, styles = {}, tokens, children }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: props.alignItems || 'stretch',
      justifyContent: props.justifyContent || 'flex-start',
      gap: props.gap || '0px',
      ...toStyle(styles, tokens),
    }}
    className={props.className || ''}
  >
    {children}
  </div>
);

const Grid = ({ props = {}, styles = {}, tokens, children }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: props.columns || 'repeat(3, 1fr)',
      gap: props.gap || '16px',
      ...toStyle(styles, tokens),
    }}
    className={props.className || ''}
  >
    {children}
  </div>
);

/* ---------- Registry ---------- */

export const COMPONENT_MAP = {
  Container,
  Text,
  Heading,
  Button,
  Image,
  Link,
  Header,
  Footer,
  HeroBanner,
  ProductGrid,
  ProductCard,
  Navbar,
  Spacer,
  FlexRow,
  FlexCol,
  Grid,
};

export const resolveComponent = (name) => COMPONENT_MAP[name] || Container;

export default COMPONENT_MAP;
