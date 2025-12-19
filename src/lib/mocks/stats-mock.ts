// This provides a proper stats.js mock that handles both ESM and CommonJS

class Stats {
  private mode: number = 0;
  public dom: HTMLDivElement;

  constructor() {
    this.dom = document.createElement('div');
    this.dom.style.cssText = 'position:fixed;top:0;left:0;cursor:pointer;opacity:0.9;z-index:10000;display:none;';

    const panel = document.createElement('div');
    panel.style.cssText = 'padding:8px;background:#000;color:#0f0;font:12px monospace;';
    panel.textContent = 'Stats (mock)';
    this.dom.appendChild(panel);
  }

  showPanel(panel: number) {
    this.mode = panel;
    return this;
  }

  begin() {
    return this;
  }

  end() {
    return this;
  }

  update() {
    return this;
  }

  addPanel() {
    return this;
  }
}

// Export for ESM
export default Stats;
export { Stats };

// For CommonJS environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Stats;
  module.exports.default = Stats;
  module.exports.Stats = Stats;
}

// For global usage
if (typeof window !== 'undefined') {
  (window as any).Stats = Stats;
}

