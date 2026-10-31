import { Component } from 'react';

import { clearLocalState } from '../game/persistence.js';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Idle Sports crashed', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    if (window.confirm('Clear the local save and reload? This cannot be undone.')) {
      clearLocalState();
      window.location.reload();
    }
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="error-screen">
        <div className="panel error-panel">
          <p className="eyebrow">Something went wrong</p>
          <h1>The lab hit an error</h1>
          <p className="muted">
            Your save is still in this browser unless it is corrupt. Try reloading first. If the error persists, you can
            clear the local save and start fresh.
          </p>
          <div className="settings-actions">
            <button className="btn primary" onClick={this.handleReload}>Reload game</button>
            <button className="btn danger" onClick={this.handleReset}>Clear local save and reload</button>
          </div>
          <details className="error-details">
            <summary>Error details</summary>
            <pre>{String(this.state.error?.message || this.state.error)}</pre>
          </details>
        </div>
      </main>
    );
  }
}
