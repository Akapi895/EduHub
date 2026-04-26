import api from './api';
import type {
  GameCompleteRequest,
  GamePackageCreatePayload,
  GamePackageUpdatePayload,
  GameQuestionPayload,
  GameRuntimeAnswerRequest,
  GameRuntimeEventRequest,
  GameRuntimeTriggerRequest,
} from '@/types';

export const gameService = {
  getGameModules: () => api.get('/game-modules'),

  getClassGamePackages: (classId: string) => api.get(`/classes/${classId}/game-packages`),
  createClassGamePackage: (classId: string, data: GamePackageCreatePayload) =>
    api.post(`/classes/${classId}/game-packages`, data),

  getGamePackage: (packageId: string) => api.get(`/game-packages/${packageId}`),
  updateGamePackage: (packageId: string, data: GamePackageUpdatePayload) =>
    api.put(`/game-packages/${packageId}`, data),
  deleteGamePackage: (packageId: string) => api.delete(`/game-packages/${packageId}`),

  getGamePackageQuestions: (packageId: string) => api.get(`/game-packages/${packageId}/questions`),
  createGamePackageQuestion: (packageId: string, data: GameQuestionPayload) =>
    api.post(`/game-packages/${packageId}/questions`, data),
  updateGameQuestion: (questionId: string, data: Partial<GameQuestionPayload>) =>
    api.put(`/game-questions/${questionId}`, data),
  deleteGameQuestion: (questionId: string) => api.delete(`/game-questions/${questionId}`),

  getMyGamePackages: () => api.get('/game-packages/my-all'),
  getGamePackagePlay: (packageId: string) => api.get(`/game-packages/${packageId}/play`),
  startGamePackage: (packageId: string) => api.post(`/game-packages/${packageId}/start`),

  triggerRuntimeQuestion: (packageId: string, data: GameRuntimeTriggerRequest) =>
    api.post(`/game-packages/${packageId}/runtime/trigger`, data),
  submitRuntimeAnswer: (packageId: string, data: GameRuntimeAnswerRequest) =>
    api.post(`/game-packages/${packageId}/runtime/answers`, data),
  logRuntimeEvent: (packageId: string, data: GameRuntimeEventRequest) =>
    api.post(`/game-packages/${packageId}/runtime/events`, data),
  completeGamePackage: (packageId: string, data: GameCompleteRequest) =>
    api.post(`/game-packages/${packageId}/complete`, data),

  getGameAttempt: (attemptId: string) => api.get(`/game-attempts/${attemptId}`),
};
