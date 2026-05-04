import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/auth/Login/Login';
import Register from './components/auth/Register/Register';
import EventList from './components/events/EventList/EventList';
import MyRegistrations from './components/registrations/MyRegistrations/MyRegistrations';
import CreateEventForm from './components/events/CreateEventForm/CreateEventForm';
import Profile from './components/auth/Profile/Profile';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/events" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/events',
    element: (
      <ProtectedRoute>
        <EventList />
      </ProtectedRoute>
    ),
  },
  {
    path: '/my-registrations',
    element: (
      <ProtectedRoute>
        <MyRegistrations />
      </ProtectedRoute>
    ),
  },
  {
    path: '/events/create',
    element: (
      <ProtectedRoute>
        <CreateEventForm />
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <Profile />
      </ProtectedRoute>
    ),
  },
]);
