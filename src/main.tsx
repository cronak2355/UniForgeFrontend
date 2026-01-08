import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import App from './AppRoutes'
import './styles/main.css'
import './index.css'
import { JobProvider } from './AssetsEditor/context/JobContext';
import { JobNotification } from './AssetsEditor/components/JobNotification';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AuthProvider>
      <JobProvider>
        <App />
        <JobNotification />
      </JobProvider>
    </AuthProvider>
  </BrowserRouter>,
)
