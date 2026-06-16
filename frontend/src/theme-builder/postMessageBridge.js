/**
 * postMessageBridge
 * Bidirectional communication layer between Builder (parent) and Live Preview (iframe).
 * Uses a typed message protocol for security and clarity.
 */

export const MSG_TYPES = {
  // Parent -> Child
  UPDATE_THEME: 'TB::UPDATE_THEME',
  UPDATE_LAYOUT: 'TB::UPDATE_LAYOUT',
  UPDATE_NODE: 'TB::UPDATE_NODE',
  SCROLL_TO_NODE: 'TB::SCROLL_TO_NODE',
  SELECT_NODE: 'TB::SELECT_NODE',
  // Child -> Parent
  NODE_CLICKED: 'TB::NODE_CLICKED',
  NODE_HOVERED: 'TB::NODE_HOVERED',
  READY: 'TB::READY',
  INTERACTION: 'TB::INTERACTION',
  ERROR: 'TB::ERROR',
};

const TARGET_ORIGIN = '*';

export class PreviewBridge {
  constructor(iframeRef) {
    this.iframe = iframeRef;
    this.listeners = new Map();
    this._boundHandler = this._handleMessage.bind(this);
    window.addEventListener('message', this._boundHandler);
  }

  destroy() {
    window.removeEventListener('message', this._boundHandler);
    this.listeners.clear();
  }

  _handleMessage(event) {
    const { data } = event;
    if (!data || !data.type) return;
    if (!Object.values(MSG_TYPES).includes(data.type)) return;

    const cbs = this.listeners.get(data.type);
    if (cbs) cbs.forEach((cb) => cb(data.payload, event));
  }

  on(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(callback);
    return () => this.listeners.get(type)?.delete(callback);
  }

  post(type, payload) {
    const iframe = this.iframe?.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage({ type, payload }, TARGET_ORIGIN);
  }

  updateTheme(theme) {
    this.post(MSG_TYPES.UPDATE_THEME, theme);
  }

  updateLayout(layout) {
    this.post(MSG_TYPES.UPDATE_LAYOUT, layout);
  }

  updateNode(nodeId, patch) {
    this.post(MSG_TYPES.UPDATE_NODE, { nodeId, patch });
  }

  scrollToNode(nodeId) {
    this.post(MSG_TYPES.SCROLL_TO_NODE, { nodeId });
  }

  selectNode(nodeId) {
    this.post(MSG_TYPES.SELECT_NODE, { nodeId });
  }
}

export class PreviewHost {
  constructor() {
    this.listeners = new Map();
    this._boundHandler = this._handleMessage.bind(this);
    window.addEventListener('message', this._boundHandler);
  }

  destroy() {
    window.removeEventListener('message', this._boundHandler);
    this.listeners.clear();
  }

  _handleMessage(event) {
    const { data } = event;
    if (!data || !data.type) return;
    if (!Object.values(MSG_TYPES).includes(data.type)) return;

    const cbs = this.listeners.get(data.type);
    if (cbs) cbs.forEach((cb) => cb(data.payload, event));
  }

  on(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(callback);
    return () => this.listeners.get(type)?.delete(callback);
  }

  post(type, payload) {
    if (window.parent !== window) {
      window.parent.postMessage({ type, payload }, TARGET_ORIGIN);
    }
  }

  notifyReady(config) {
    this.post(MSG_TYPES.READY, config);
  }

  notifyInteraction(payload) {
    this.post(MSG_TYPES.INTERACTION, payload);
  }

  notifyError(error) {
    this.post(MSG_TYPES.ERROR, { message: error?.message || String(error) });
  }

  notifyNodeClicked(nodeId, component) {
    this.post(MSG_TYPES.NODE_CLICKED, { nodeId, component });
  }

  notifyNodeHovered(nodeId, component) {
    this.post(MSG_TYPES.NODE_HOVERED, { nodeId, component });
  }
}
