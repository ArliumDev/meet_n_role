import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/auth/Login/Login';
// import Register from './components/auth/Register/Register';
import EventList from './components/events/EventList/EventList';
// import EventDetail from './components/events/EventDetail/EventDetail';
// import MyRegistrations from './components/registrations/MyRegistrations/MyRegistrations';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/events" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  // {
  //   path: '/register',
  //   element: <Register />,
  // },
  {
    path: '/events',
    element: (
      <ProtectedRoute>
        <EventList />
      </ProtectedRoute>
    ),
  },
  // {
  //   path: '/events/:id',
  //   element: <EventDetail />,
  // },
  // {
  //   path: '/my-registrations',
  //   element: (
  //     <ProtectedRoute>
  //       <MyRegistrations />
  //     </ProtectedRoute>
  //   )
  // },
]);
