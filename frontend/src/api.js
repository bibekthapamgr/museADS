/**
 * Axios client. The backend proxy lives at /api; the demo auth header
 * (X-User-Id) is stored in localStorage after the OAuth callback page.
 */
import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const userId = localStorage.getItem('meta_user_id');
  if (userId) config.headers['X-User-Id'] = userId;
  return config;
});

export const setUserId = (id) => localStorage.setItem('meta_user_id', id);
export const getUserId = () => localStorage.getItem('meta_user_id');
export const clearUserId = () => localStorage.removeItem('meta_user_id');
