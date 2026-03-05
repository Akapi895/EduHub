import api from './api';

export const classService = {
  getClasses: () => api.get('/classes'),
  getClass: (id: string) => api.get(`/classes/${id}`),
  createClass: (data: { name: string; description: string; thumbnail_url?: string }) =>
    api.post('/classes', data),
  updateClass: (id: string, data: Record<string, unknown>) =>
    api.put(`/classes/${id}`, data),
  deleteClass: (id: string) => api.delete(`/classes/${id}`),
  joinClass: (join_code: string) => api.post('/classes/join', { join_code }),
  getStudents: (classId: string) => api.get(`/classes/${classId}/students`),
  removeStudent: (classId: string, studentId: string) =>
    api.delete(`/classes/${classId}/students/${studentId}`),
  getChapters: (classId: string) => api.get(`/classes/${classId}/chapters`),
  createChapter: (classId: string, data: { name: string }) =>
    api.post(`/classes/${classId}/chapters`, data),
  getMaterials: (classId: string) => api.get(`/classes/${classId}/materials`),
  addMaterial: (classId: string, data: { material_id: string; chapter_id: string }) =>
    api.post(`/classes/${classId}/materials`, data),
  removeMaterial: (classId: string, classMaterialId: string) =>
    api.delete(`/classes/${classId}/materials/${classMaterialId}`),
  deleteChapter: (classId: string, chapterId: string) =>
    api.delete(`/classes/${classId}/chapters/${chapterId}`),
  getExams: (classId: string) => api.get(`/classes/${classId}/exams`),
  createExam: (classId: string, data: Record<string, unknown>) =>
    api.post(`/classes/${classId}/exams`, data),
};
