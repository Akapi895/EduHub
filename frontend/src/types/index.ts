import type { Role } from '@/utils/constants';

// ====== User ======
export interface User {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
}

// ====== Class ======
export interface Class {
  id: string;
  name: string;
  description: string;
  thumbnail_url?: string;
  teacher_id: string;
  teacher_name?: string;
  join_code: string;
  subject?: string;
  grade?: string;
  student_count?: number;
  material_count?: number;
  exam_count?: number;
  created_at: string;
}

export interface ClassStudent {
  id: string;
  student_id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  joined_at: string;
}

// ====== Chapter ======
export interface Chapter {
  id: string;
  class_id: string;
  name: string;
  order_index: number;
  materials: Material[];
  class_material_ids?: Record<string, string>;
  student_count?: number;
}

// ====== Material ======
export interface Folder {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  material_count: number;
}

export interface Material {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  file_url: string;
  material_type: 'book' | 'exam' | 'video' | 'reference' | 'document' | 'interactive_book';
  subject: string;
  grade: string;
  is_system: boolean;
  folder_id?: string;
  created_by: string;
  shared_by?: string;
  shared_by_name?: string;
  source_id?: string;
  created_at: string;
  view_count?: number;
  interactive_status?: 'draft' | 'published' | 'archived';
  manifest_version?: number;
  entry_scene_id?: string;
  estimated_duration?: number;
}

export interface MaterialViewStudent {
  student_id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  viewed: boolean;
  viewed_at?: string;
}

// ====== Exam ======
export interface Exam {
  id: string;
  class_id: string;
  class_name?: string;
  title: string;
  description: string;
  thumbnail_url: string;
  start_time: string;
  end_time: string;
  duration_minutes?: number;
  shuffle_questions?: boolean;
  max_attempts?: number;
  allow_review?: boolean;
  show_answers_policy?: string;
  status: 'upcoming' | 'open' | 'closed';
  created_by: string;
  created_at: string;
  question_count?: number;
  student_status?: 'not_started' | 'in_progress' | 'completed';
  best_score?: number | null;
}

// ====== Question ======
export interface QuestionOption {
  id: string;
  content: string;
  is_correct: boolean;
  order_index?: number;
}

export interface MatchingPair {
  id: string;
  left_text: string;
  right_text: string;
}

export interface Question {
  id: string;
  exam_id: string;
  type: 'single_choice' | 'multi_choice' | 'text' | 'image_upload' | 'matching';
  content: string;
  instruction?: string;
  points: number;
  required: boolean;
  order_index: number;
  options: QuestionOption[];
  matching_pairs?: MatchingPair[];
}

// ====== Submission ======
export interface Answer {
  question_id: string;
  text_answer?: string;
  selected_option_ids?: string[];
  uploaded_image_url?: string;
}

export interface Submission {
  id: string;
  exam_id: string;
  student_id: string;
  student_name?: string;
  started_at: string;
  submitted_at?: string;
  total_score?: number;
  status: 'in_progress' | 'submitted' | 'graded';
  answers?: SubmissionAnswer[];
}

export interface SubmissionAnswer {
  id: string;
  question_id: string;
  text_answer?: string;
  selected_option_ids?: string[];
  score?: number;
  correct_option_ids?: string[];
  correct_matches?: string[];
}

// ====== Messaging ======
export interface Conversation {
  id: string;
  participant: {
    id: string;
    full_name: string;
    avatar_url?: string;
    role: Role;
  };
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name?: string;
  content: string;
  file_url?: string;
  is_read?: boolean;
  created_at: string;
}

// ====== Interactive Books ======
export type InteractiveBookStatus = 'draft' | 'published' | 'archived';
export type InteractiveAttemptStatus = 'in_progress' | 'completed' | 'abandoned';
export type InteractiveSceneType =
  | 'timeline'
  | 'slideshow'
  | 'interactive_video'
  | 'branching'
  | 'quiz'
  | 'hotspot_audio'
  | 'mini_game'
  | 'vr_scene';
export type InteractiveTrigger =
  | 'on_enter'
  | 'timecode'
  | 'on_click'
  | 'on_choice'
  | 'on_complete';

export interface InteractiveAssetRef {
  id?: string;
  kind?: string;
  label?: string;
  url: string;
}

export interface InteractiveChoice {
  id: string;
  label: string;
  target_scene_id?: string;
  feedback?: string;
  feedback_image_url?: string;
  feedback_audio_url?: string;
  is_correct?: boolean;
  retry?: boolean;
  score_delta?: number;
}

export interface InteractiveInteraction {
  id?: string;
  type: string;
  trigger: InteractiveTrigger;
  timecode?: number;
  prompt?: string;
  target_scene_id?: string;
  choices?: InteractiveChoice[];
  data?: Record<string, unknown>;
}

export interface InteractiveScene {
  id: string;
  type: InteractiveSceneType;
  title?: string;
  assets?: InteractiveAssetRef[];
  content?: Record<string, unknown> | unknown[] | string | null;
  interactions?: InteractiveInteraction[];
  next?: unknown;
}

export interface InteractiveBookManifest {
  title?: string;
  entry_scene_id: string;
  scenes: InteractiveScene[];
  metadata?: Record<string, unknown>;
}

export interface InteractiveBookMeta {
  material_id: string;
  status: InteractiveBookStatus;
  manifest_version: number;
  entry_scene_id?: string;
  estimated_duration?: number;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InteractiveBookAttempt {
  id: string;
  interactive_book_id: string;
  student_id: string;
  class_id?: string | null;
  manifest_version: number;
  status: InteractiveAttemptStatus;
  current_scene_id?: string | null;
  state_snapshot?: Record<string, any> | null;
  completion_percent: number;
  score_summary?: Record<string, any> | null;
  started_at: string;
  last_seen_at: string;
  completed_at?: string | null;
}

export interface InteractiveBookBundle {
  material: Material;
  interactive_book: InteractiveBookMeta;
  manifest: InteractiveBookManifest;
  view: 'draft' | 'published';
}

export interface InteractiveBookAttemptBundle {
  material: Material;
  interactive_book: InteractiveBookMeta;
  manifest: InteractiveBookManifest;
  attempt: InteractiveBookAttempt;
  resume: boolean;
}
