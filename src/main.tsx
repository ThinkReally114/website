import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './theme/ThemeProvider';
import './i18n';
import './styles/tokens.css';
import './styles/base.css';

const container = document.getElementById('root');

if (container) {
  createRoot(container).render(
    <StrictMode>
      <ThemeProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </ThemeProvider>
    </StrictMode>
  );
}

document.addEventListener('contextmenu', (event) => event.preventDefault());
