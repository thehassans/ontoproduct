import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { theme, injectThemeCSS } from './theme.config.js';

// ── Actions ──
const SET_PREVIEW_DATA = 'SET_PREVIEW_DATA';
const TOGGLE_CATEGORY_VISIBILITY = 'TOGGLE_CATEGORY_VISIBILITY';
const SET_ACTIVE_SECTION = 'SET_ACTIVE_SECTION';
const RELOAD_PREVIEW = 'RELOAD_PREVIEW';

// ── Initial State ──
const initialState = {
  activeSection: 'categories',
  previewData: {
    categories: [],
    banners: [],
    brands: [],
    headlines: {},
  },
  previewReloadKey: 0,
  isPreviewLoading: false,
};

// ── Reducer ──
function designerReducer(state, action) {
  switch (action.type) {
    case SET_PREVIEW_DATA:
      return { ...state, previewData: { ...state.previewData, ...action.payload } };
    case TOGGLE_CATEGORY_VISIBILITY:
      return {
        ...state,
        previewData: {
          ...state.previewData,
          categories: state.previewData.categories.map(cat =>
            cat._id === action.payload.id
              ? { ...cat, isPublished: action.payload.isPublished }
              : cat
          ),
        },
      };
    case SET_ACTIVE_SECTION:
      return { ...state, activeSection: action.payload };
    case RELOAD_PREVIEW:
      return { ...state, previewReloadKey: state.previewReloadKey + 1 };
    default:
      return state;
  }
}

// ── Context ──
const DesignerContext = createContext(null);

export function DesignerProvider({ children }) {
  const [state, dispatch] = useReducer(designerReducer, initialState);

  const setPreviewData = useCallback((data) => {
    dispatch({ type: SET_PREVIEW_DATA, payload: data });
  }, []);

  const toggleCategory = useCallback((id, isPublished) => {
    dispatch({ type: TOGGLE_CATEGORY_VISIBILITY, payload: { id, isPublished } });
  }, []);

  const setActiveSection = useCallback((section) => {
    dispatch({ type: SET_ACTIVE_SECTION, payload: section });
  }, []);

  const reloadPreview = useCallback(() => {
    dispatch({ type: RELOAD_PREVIEW });
  }, []);

  // Inject CSS variables on mount
  React.useEffect(() => {
    injectThemeCSS();
  }, []);

  const value = {
    theme,
    state,
    setPreviewData,
    toggleCategory,
    setActiveSection,
    reloadPreview,
  };

  return (
    <DesignerContext.Provider value={value}>
      {children}
    </DesignerContext.Provider>
  );
}

export function useDesigner() {
  const ctx = useContext(DesignerContext);
  if (!ctx) throw new Error('useDesigner must be used inside DesignerProvider');
  return ctx;
}

export default DesignerContext;
