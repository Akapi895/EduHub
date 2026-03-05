import api from './api';

export const libraryService = {
  getMaterials: (params?: Record<string, string>) =>
    api.get('/library', { params }),
  getMaterial: (id: string) => api.get(`/library/${id}`),
  createMaterial: (data: FormData) =>
    api.post('/library', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateMaterial: (id: string, data: Record<string, unknown>) =>
    api.put(`/library/${id}`, data),
  deleteMaterial: (id: string) => api.delete(`/library/${id}`),
};
