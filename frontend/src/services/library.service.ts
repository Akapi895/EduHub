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
    folder_id?: string;
  }) => api.post('/library', data),
  updateMaterial: (id: string, data: Record<string, unknown>) =>
    api.put(`/library/${id}`, data),
  deleteMaterial: (id: string) => api.delete(`/library/${id}`),

  // Folders
  getFolders: () => api.get('/library/folders'),
  getFolder: (id: string) => api.get(`/library/folders/${id}`),
  createFolder: (data: { name: string }) => api.post('/library/folders', data),
  deleteFolder: (id: string) => api.delete(`/library/folders/${id}`),

  // Copy / Share / Save
  copyMaterial: (id: string, data: { folder_id?: string }) =>
    api.post(`/library/${id}/copy`, data),
  shareMaterial: (id: string) => api.post(`/library/${id}/share`),
  saveMaterial: (id: string, data: { folder_id?: string }) =>
    api.post(`/library/${id}/save`, data),

  // View tracking
  recordView: (materialId: string, classId?: string) =>
    api.post(`/library/${materialId}/view`, { class_id: classId }),
};
