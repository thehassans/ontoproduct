/**
 * Designer Theme Config
 * Centralized tokens for the Buysial Designer workspace.
 * All colors, typography, spacing, and radii live here.
 * Change any value to instantly reflect across the entire designer UI.
 */

export const theme = {
  // ── Core Palette ──
  colors: {
    // Sidebar (dark navy/slate)
    sidebarBg: '#0f172a',
    sidebarText: '#94a3b8',
    sidebarTextActive: '#ffffff',
    sidebarItemActiveBg: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    sidebarBorder: 'rgba(255,255,255,0.06)',
    sidebarLogoGradient: 'linear-gradient(135deg, #f97316, #ea580c)',

    // Main area (clean white)
    mainBg: '#f8fafc',
    mainBorder: '#e2e8f0',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    cardShadow: '0 1px 3px rgba(0,0,0,0.04)',

    // Preview pane
    previewBg: '#f1f5f9',
    previewHeader: '#64748b',

    // Action button tints (matching screenshot)
    btnChangeImgBg: '#f0f9ff',
    btnChangeImgText: '#0284c7',
    btnChangeImgBorder: '#bae6fd',

    btnAddSubBg: '#fff7ed',
    btnAddSubText: '#c2410c',
    btnAddSubBorder: '#fed7aa',

    btnCopySubsBg: '#f0fdf4',
    btnCopySubsText: '#16a34a',
    btnCopySubsBorder: '#bbf7d0',

    btnNeutralBg: '#ffffff',
    btnNeutralText: '#475569',
    btnNeutralBorder: '#e2e8f0',

    btnUnpublishText: '#dc2626',
    btnDeleteText: '#dc2626',
    btnDeleteBg: '#fef2f2',
    btnDeleteBorder: '#fecaca',

    // Primary / CTA
    primaryBg: '#f97316',
    primaryHover: '#ea580c',
    primaryText: '#ffffff',

    // Status badges
    publishedBg: '#f0fdf4',
    publishedText: '#16a34a',
    unpublishedBg: '#fef2f2',
    unpublishedText: '#dc2626',

    // Text
    heading: '#1e293b',
    body: '#64748b',
    muted: '#94a3b8',
  },

  // ── Typography ──
  fonts: {
    base: 'Inter, system-ui, -apple-system, sans-serif',
    heading: 'Inter, system-ui, -apple-system, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },

  fontSizes: {
    xs: '11px',
    sm: '12px',
    md: '13px',
    base: '14px',
    lg: '15px',
    xl: '16px',
    '2xl': '20px',
    '3xl': '24px',
  },

  fontWeights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // ── Spacing ──
  spacing: {
    sidebarWidth: 240,
    previewMinWidth: 360,
    pagePadding: '24px 32px 40px',
    cardPadding: '16px 20px',
    cardGap: '12px',
    btnPadding: '6px 12px',
    btnRadius: 6,
    cardRadius: 12,
    inputRadius: 8,
  },

  // ── Shadows ──
  shadows: {
    sidebar: '4px 0 24px rgba(15, 23, 42, 0.08)',
    activeNav: '0 4px 12px rgba(37, 99, 235, 0.25)',
    card: '0 1px 3px rgba(0,0,0,0.04)',
    btn: '0 1px 2px rgba(0,0,0,0.05)',
    phone: '0 24px 48px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.08)',
  },

  // ── Transitions ──
  transitions: {
    fast: 'all 0.15s ease',
    normal: 'all 0.2s ease',
    slow: 'all 0.3s ease',
  },
};

// Convenience helpers for inline styles
export const t = theme;

/**
 * Inject CSS custom properties into the document root.
 * Call once at app mount (e.g. inside ThemeProvider).
 */
export function injectThemeCSS(customOverrides = {}) {
  const merged = { ...theme.colors, ...customOverrides };
  const root = document.documentElement;
  Object.entries(merged).forEach(([key, value]) => {
    root.style.setProperty(`--designer-${key}`, value);
  });
}

export default theme;
