import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import FocusEnhancer from './FocusEnhancer';
import './styles.css';
import './agent-trace';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <FocusEnhancer />
  </StrictMode>
);
