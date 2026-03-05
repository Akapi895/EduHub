import api from './api';

export const dashboardService = {
  getTeacherDashboard: () => api.get('/dashboard/teacher'),
  getStudentDashboard: () => api.get('/dashboard/student'),
};
