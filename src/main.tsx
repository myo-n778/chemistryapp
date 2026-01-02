import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} catch (error) {
  console.error('Failed to render app:', error);
  document.body.innerHTML = `
    <div style="padding: 20px; color: red; font-family: monospace;">
      <h1>エラーが発生しました</h1>
      <pre>${error instanceof Error ? error.message : String(error)}</pre>
      <p>ブラウザのコンソールを確認してください。</p>
    </div>
  `;
}

