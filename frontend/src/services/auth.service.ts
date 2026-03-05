import api from './api';

export const authService = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (data: { full_name: string; email: string; password: string; role: string }) =>
    api.post('/auth/register', data),

  getMe: () => api.get('/auth/me'),

  logout: () => api.post('/auth/logout'),
};
