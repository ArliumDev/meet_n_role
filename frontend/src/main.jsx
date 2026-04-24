import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Route, RouterProvider } from 'react-router-dom';
import { router } from './router.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import './index.css';
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
);
