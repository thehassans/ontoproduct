/**
 * Theme Builder Module
 * --------------------
 * Schema-driven visual theme builder for the BuySial e-commerce platform.
 *
 * Exports:
 * - BuilderWorkspace: Split-pane visual editor (parent)
 * - LivePreview: iframe renderer (child)
 * - SchemaRenderer: Recursive JSON-to-React engine
 * - ComponentRegistry: Component name-to-React mapping
 * - PreviewBridge / PreviewHost / MSG_TYPES: postMessage protocol
 */

export { default as BuilderWorkspace } from './BuilderWorkspace.jsx';
export { default as LivePreview } from './LivePreview.jsx';
export { default as SchemaRenderer } from './SchemaRenderer.jsx';
export {
  COMPONENT_MAP,
  resolveComponent,
  injectTokens,
  toStyle,
} from './ComponentRegistry.js';
export {
  PreviewBridge,
  PreviewHost,
  MSG_TYPES,
} from './postMessageBridge.js';
