import { installMockApi } from './mockApi';
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Install mock API BEFORE app renders.
installMockApi();

createRoot(document.getElementById("root")!).render(<App />);
