import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('LifeOS render error:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="fatalError" role="alert">
        <div className="card">
          <p className="eyebrow">LifeOS recovered safely</p>
          <h1>Something went wrong while showing this page.</h1>
          <p>Your saved browser data was not automatically deleted. Reload the app, or use Backup & Restore after it opens.</p>
          <button className="primaryBtn" type="button" onClick={() => window.location.reload()}>Reload LifeOS</button>
        </div>
      </main>
    );
  }
}
