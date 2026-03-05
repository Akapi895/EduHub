import api from './api';

export const userService = {
  getProfile: () => api.get('/users/profile'),

  updateProfile: (data: { full_name?: string; avatar_url?: string; phone?: string; bio?: string }) =>
    api.put('/users/profile', data),

  changePassword: (data: { current_password: string; new_password: string }) =>
    api.put('/users/password', data),
};
