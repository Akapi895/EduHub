function normalizeLocalApiUrl(rawUrl: string) {
  if (typeof window === 'undefined') {
    return rawUrl.replace(/\/$/, '');
  }

  try {
    const parsedUrl = new URL(rawUrl);
    const isLocalApiHost = ['localhost', '127.0.0.1'].includes(parsedUrl.hostname);
    const isLocalFrontendHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

    if (isLocalApiHost && isLocalFrontendHost) {
      parsedUrl.hostname = window.location.hostname;
    }

    return parsedUrl.toString().replace(/\/$/, '');
  } catch {
    return rawUrl.replace(/\/$/, '');
  }
}

function resolveApiBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_URL?.trim();

  if (configuredUrl) {
    return normalizeLocalApiUrl(configuredUrl);
  }

  if (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }

  return '';
}

export const API_BASE_URL = `${resolveApiBaseUrl()}/api/v1`;

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
  INTERACTIVE_BOOK: 'interactive_book',
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

export const INTERACTIVE_SCENE_TYPES = {
  MEDIA: 'media',
  SLIDESHOW: 'slideshow',
  INTERACTIVE_VIDEO: 'interactive_video',
  BRANCHING: 'branching',
  QUIZ: 'quiz',
  HOTSPOT_AUDIO: 'hotspot_audio',
  MINI_GAME: 'mini_game',
  VR_SCENE: 'vr_scene',
} as const;

export const INTERACTIVE_TRIGGERS = {
  ON_ENTER: 'on_enter',
  TIMECODE: 'timecode',
  ON_CLICK: 'on_click',
  ON_CHOICE: 'on_choice',
  ON_COMPLETE: 'on_complete',
} as const;
