export const API_BASE_URL = '/api/v1';

export const ROLES = {
  TEACHER: 'teacher',
  STUDENT: 'student',
  ADMIN: 'admin',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const MATERIAL_TYPES = {
  BOOK: 'book',
  EXAM: 'exam',
  VIDEO: 'video',
  REFERENCE: 'reference',
  DOCUMENT: 'document',
} as const;

export const QUESTION_TYPES = {
  SINGLE_CHOICE: 'single_choice',
  MULTI_CHOICE: 'multi_choice',
  TEXT: 'text',
  IMAGE_UPLOAD: 'image_upload',
  MATCHING: 'matching',
} as const;

export const EXAM_STATUS = {
  UPCOMING: 'upcoming',
  OPEN: 'open',
  CLOSED: 'closed',
} as const;

export const SUBMISSION_STATUS = {
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  GRADED: 'graded',
} as const;

export const SUBJECTS = [
  'Đọc',
  'Viết',
  'Nói và nghe',
  'Thực hành tiếng Việt',
] as const;

export const GRADES = ['Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9'] as const;
