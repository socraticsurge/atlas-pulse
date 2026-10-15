import { Component } from 'react';

/** Keeps a rendering error in one article from taking down the whole app. */
export default class ReaderErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err) { console.error('[ArticleReader]', err); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="article-reader-panel visible" style={{ width: this.props.width }}>
          <div className="empty-state" style={{ padding: '60px 32px', textAlign: 'center' }}>
            <p style={{ marginBottom: 16 }}>Something went wrong displaying this article.</p>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { this.setState({ hasError: false }); this.props.onClose(); }}
            >
              Close
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
