import api from './api';

export const libraryService = {
  getMaterials: (params?: Record<string, string>) =>
    api.get('/library', { params }),
  getMaterial: (id: string) => api.get(`/library/${id}`),
  createMaterial: (data: {
    title: string;
    description?: string;
    thumbnail_url?: string;
    file_url?: string;
    material_type?: string;
    subject?: string;
    grade?: string;
    is_system?: boolean;
  }) => api.post('/library', data),
  updateMaterial: (id: string, data: Record<string, unknown>) =>
    api.put(`/library/${id}`, data),
  deleteMaterial: (id: string) => api.delete(`/library/${id}`),
};
