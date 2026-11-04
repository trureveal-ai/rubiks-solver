import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('[ErrorBoundary]', error, info); }
  render() {
    if (this.state.error) return (
      <div style={{padding:40,color:'#fff',background:'#111',fontFamily:'monospace'}}>
        <h2 style={{color:'#ff4444'}}>Something crashed</h2>
        <pre style={{whiteSpace:'pre-wrap',color:'#ccc'}}>{this.state.error.message}</pre>
        <pre style={{whiteSpace:'pre-wrap',color:'#888',fontSize:12}}>{this.state.error.stack}</pre>
        <button onClick={()=>this.setState({error:null})} style={{marginTop:20,padding:'8px 20px',cursor:'pointer'}}>Retry</button>
      </div>
    );
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
