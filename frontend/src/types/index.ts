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
  material_type: 'book' | 'exam' | 'video' | 'reference' | 'document';
  subject: string;
  grade: string;
  is_system: boolean;
  folder_id?: string;
  created_by: string;
  created_at: string;
}

// ====== Exam ======
export interface Exam {
  id: string;
  class_id: string;
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
