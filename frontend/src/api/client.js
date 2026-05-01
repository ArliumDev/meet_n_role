const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getToken() {
  return localStorage.getItem('token');
}

async function request(method, path, body = null, auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Error desconocido' }));
    throw new Error(error.detail || 'Error en la petición');
  }

  return res.json();
}

// /users API calls

export const signIn = (username, password) => request('POST', '/account/sign_in', { username, password }, false);

export const signUp = (username, password) => request('POST', '/account/sign_up', { username, password }, false);

export const getMe = () => {
  console.log('Token en localStorage:', localStorage.getItem('token'));
  return request('GET', '/users/me', null, true);
};

export const getUser = (user_id) => request('GET', `/users/${user_id}`, null, true);

export const updateUser = (user_id, username = null, password = null) => {
  const body = {};
  if (username) body.username = username;
  if (password) body.password = password;
  return request('PATCH', `/users/${user_id}`, body, true);
};

export const deleteUser = (user_id) => request('DELETE', `/users/${user_id}`, null, true);

// /events API calls

export const getAllEvents = () => request('GET', '/events/get_all', null, true);

export const getEvent = (event_id) => request('GET', `/events/${event_id}`, null, true);

export const getEventPlayers = (event_id) => request('GET', `/events/${event_id}/players`, null, true);

export const createEvent = (title, description, date, max_players) => request('POST', '/events/create_event', { title, description, date, max_players }, true);

export const updateEvent = (event_id, updatedFields) => request('PATCH', `/events/${event_id}`, updatedFields, true);

export const deleteEvent = (event_id) => request('DELETE', `/events/${event_id}`, null, true);

// /registrations API calls

export const getMyRegistrations = () => request('GET', '/registrations/me', null, true);

export const registerToGame = (event_id) => request('POST', `/registrations/${event_id}/register`, null, true);

export const leaveGame = (event_id) => request('DELETE', `/registrations/${event_id}/unregister`, null, true);
