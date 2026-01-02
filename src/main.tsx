import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// エラーハンドリングの改善
const rootElement = document.getElementById('root');
if (!rootElement) {
  document.body.innerHTML = `
    <div style="padding: 20px; color: red; font-family: monospace;">
      <h1>エラーが発生しました</h1>
      <p>Root element not found</p>
      <p>ブラウザのコンソールを確認してください。</p>
    </div>
  `;
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error('Failed to render app:', error);
    rootElement.innerHTML = `
      <div style="padding: 20px; color: red; font-family: monospace; background: #2a1f1a; color: #ffa500;">
        <h1>エラーが発生しました</h1>
        <pre>${error instanceof Error ? error.message : String(error)}</pre>
        <p>ブラウザのコンソールを確認してください。</p>
      </div>
    `;
  }
}

