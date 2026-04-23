import api from './api';
import type { InteractiveBookManifest } from '@/types';

export const interactiveBookService = {
  createBook: (data: {
    title: string;
    description?: string;
    thumbnail_url?: string;
    subject?: string;
    grade?: string;
    folder_id?: string;
    estimated_duration?: number;
    manifest: InteractiveBookManifest;
  }) => api.post('/interactive-books', data),

  updateDraft: (
    materialId: string,
    data: {
      title?: string;
      description?: string;
      thumbnail_url?: string;
      subject?: string;
      grade?: string;
      folder_id?: string;
      estimated_duration?: number;
      manifest?: InteractiveBookManifest;
    }
  ) => api.put(`/interactive-books/${materialId}/draft`, data),

  publishBook: (materialId: string) =>
    api.post(`/interactive-books/${materialId}/publish`),

  getBook: (materialId: string, view: 'draft' | 'published' = 'published') =>
    api.get(`/interactive-books/${materialId}`, { params: { view } }),

  getReport: (materialId: string) =>
    api.get(`/interactive-books/${materialId}/report`),

  startAttempt: (materialId: string, classId?: string) =>
    api.post(`/interactive-books/${materialId}/attempts/start`, { class_id: classId }),

  saveCheckpoint: (
    attemptId: string,
    data: {
      current_scene_id: string;
      state_snapshot: Record<string, unknown>;
      completion_percent: number;
      score_summary?: Record<string, unknown>;
    }
  ) => api.patch(`/interactive-book-attempts/${attemptId}/checkpoint`, data),

  logEvents: (
    attemptId: string,
    events: { scene_id?: string; event_type: string; payload?: Record<string, unknown> }[]
  ) => api.post(`/interactive-book-attempts/${attemptId}/events/batch`, { events }),

  completeAttempt: (
    attemptId: string,
    data: {
      current_scene_id?: string;
      state_snapshot: Record<string, unknown>;
      completion_percent: number;
      score_summary?: Record<string, unknown>;
    }
  ) => api.post(`/interactive-book-attempts/${attemptId}/complete`, data),
};
