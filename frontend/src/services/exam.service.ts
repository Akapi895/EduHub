import api from './api';
import type { Answer } from '@/types';

export const examService = {
  getExam: (id: string) => api.get(`/exams/${id}`),
  updateExam: (id: string, data: Record<string, unknown>) =>
    api.put(`/exams/${id}`, data),
  deleteExam: (id: string) => api.delete(`/exams/${id}`),
  getQuestions: (examId: string) => api.get(`/exams/${examId}/questions`),
  createQuestion: (examId: string, data: Record<string, unknown>) =>
    api.post(`/exams/${examId}/questions`, data),
  updateQuestion: (questionId: string, data: Record<string, unknown>) =>
    api.put(`/questions/${questionId}`, data),
  deleteQuestion: (questionId: string) =>
    api.delete(`/questions/${questionId}`),
  startExam: (examId: string) => api.post(`/exams/${examId}/start`),
  submitExam: (examId: string, answers: Answer[]) =>
    api.post(`/exams/${examId}/submit`, { answers }),
  getSubmissions: (examId: string) =>
    api.get(`/exams/${examId}/submissions`),
  getSubmission: (submissionId: string) =>
    api.get(`/submissions/${submissionId}`),
};
