import { createRoot } from 'react-dom/client';

import App from './App';
import './app.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Expected #root to exist.');
}

createRoot(root).render(<App />);
