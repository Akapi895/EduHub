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
  material_type: 'book' | 'exam' | 'video' | 'reference' | 'document' | 'interactive_book' | 'game_package';
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

export interface MaterialFileAccess {
  preview_kind: 'none' | 'pdf' | 'image' | 'video' | 'audio';
  preview_url?: string | null;
  download_url?: string | null;
  thumbnail_url?: string | null;
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

export type ContentPackageType = 'exam' | 'game';
export type ContentPackageStatus = 'draft' | 'published' | 'archived';
export type DifficultyBand =
  | 'recognition'
  | 'comprehension'
  | 'application_basic'
  | 'application_advanced';
export type PackageAttemptStatus =
  | 'in_progress'
  | 'submitted'
  | 'graded'
  | 'completed'
  | 'abandoned';
export type QuestionAttemptStatus =
  | 'presented'
  | 'answered'
  | 'pending_manual'
  | 'graded'
  | 'resolved';
export type QuestionSourceContext = 'exam_sequence' | 'game_trigger';
export type GameModuleStatus = 'draft' | 'active' | 'archived';
export type QuestionTypeValue =
  | 'single_choice'
  | 'multi_choice'
  | 'text'
  | 'image_upload'
  | 'matching';

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

export interface QuestionTextConfig {
  input_variant: 'short_text' | 'paragraph';
  grading_mode: 'exact_match' | 'normalized_exact' | 'keyword' | 'hybrid' | 'manual';
  min_length?: number | null;
  max_length?: number | null;
  case_sensitive?: boolean;
  accent_sensitive?: boolean;
  trim_whitespace?: boolean;
  ignore_punctuation?: boolean;
  manual_grading_required?: boolean;
  accepted_answers?: string[];
  keywords?: string[];
}

export interface QuestionAsset {
  id?: string;
  asset_type: string;
  url: string;
  order_index?: number;
}

export interface MatchingLeftItem {
  id: string;
  left_key?: string;
  content: string;
  correct_right_key?: string;
  order_index?: number;
}

export interface MatchingRightItem {
  id: string;
  right_key?: string;
  content: string;
  order_index?: number;
}

export interface MatchingAnswerInput {
  left_item_id: string;
  selected_right_key: string;
}

export interface Question {
  id: string;
  exam_id?: string;
  package_id?: string;
  question_bank_id?: string;
  type: QuestionTypeValue;
  content: string;
  instruction?: string;
  explanation?: string;
  difficulty_band?: DifficultyBand | null;
  points: number;
  required: boolean;
  order_index: number;
  options: QuestionOption[];
  matching_pairs?: MatchingPair[];
  matching_left_items?: MatchingLeftItem[];
  matching_right_items?: MatchingRightItem[];
  text_config?: QuestionTextConfig | null;
  assets?: QuestionAsset[];
  is_active?: boolean;
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

// ====== Game Packages ======
export interface GameModuleRegistryEntry {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  runtime_kind?: string;
  manifest_url: string;
  status?: GameModuleStatus;
  capability_config?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export interface ContentPackageAssignment {
  id: string;
  package_id: string;
  class_id: string;
  class_name?: string;
  assigned_by?: string;
  start_at?: string | null;
  end_at?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface GamePackageQuestionStats {
  total?: number;
  required_total?: number;
  by_difficulty_band?: Partial<Record<DifficultyBand, number>>;
  by_type?: Partial<Record<QuestionTypeValue, number>>;
  question_plan_preview?: {
    distribution_mode?: 'random' | 'progressive';
    total_questions?: number;
    level_count?: number;
    questions_per_level?: number[];
    capture_slots_by_level?: number[][];
    item_count_per_level?: number;
    time_limit_seconds?: number;
    target_scores_by_level?: number[];
  } | null;
  is_ready?: boolean;
}

export interface PackageAttemptTotals {
  questions_total?: number;
  questions_presented?: number;
  questions_answered?: number;
  questions_remaining?: number;
  questions_correct?: number;
  questions_incorrect?: number;
  correct_answers?: number;
  correct_count?: number;
  progress_percent?: number;
  score_total?: number;
  score_question?: number;
  score_context?: number;
  [key: string]: unknown;
}

export interface PackageQuestionAttempt {
  id: string;
  question_item_id?: string;
  source_context?: QuestionSourceContext;
  source_payload?: Record<string, unknown> | null;
  display_order?: number | null;
  difficulty_band_snapshot?: DifficultyBand | null;
  presented_at?: string;
  answered_at?: string | null;
  graded_at?: string | null;
  resolved_at?: string | null;
  pause_started_at?: string | null;
  pause_ended_at?: string | null;
  status?: QuestionAttemptStatus;
  is_correct?: boolean | null;
  score_awarded?: number | null;
  feedback_message?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PackageAttempt {
  id: string;
  package_id: string;
  user_id?: string;
  class_id?: string | null;
  attempt_index?: number;
  status?: PackageAttemptStatus;
  started_at?: string;
  submitted_at?: string | null;
  completed_at?: string | null;
  score_total?: number | null;
  score_question?: number | null;
  score_context?: number | null;
  summary_payload?: Record<string, unknown> | null;
  runtime_state?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
  totals?: PackageAttemptTotals | null;
  question_attempts?: PackageQuestionAttempt[];
}

export interface GamePackage {
  id: string;
  package_type?: ContentPackageType;
  title: string;
  description?: string | null;
  subject?: string | null;
  grade?: string | null;
  thumbnail_url?: string | null;
  status?: ContentPackageStatus;
  created_by?: string;
  version?: number;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
  class_id?: string;
  class_name?: string;
  assignment?: ContentPackageAssignment | null;
  assignments?: ContentPackageAssignment[];
  question_count?: number;
  question_stats?: GamePackageQuestionStats | null;
  question_stats_by_difficulty?: Partial<Record<DifficultyBand, number>>;
  game_module_id?: string;
  game_module?: GameModuleRegistryEntry | null;
  runtime_config?: Record<string, unknown> | null;
  scoring_config?: Record<string, unknown> | null;
  latest_attempt?: PackageAttempt | null;
  current_attempt?: PackageAttempt | null;
  can_play?: boolean;
  access_reason?: string | null;
}

export interface GamePackagePlayAccess {
  allowed: boolean;
  reason?: string | null;
}

export interface GamePackagePlayResponse {
  package: GamePackage;
  module?: GameModuleRegistryEntry | null;
  manifest_url?: string | null;
  entry?: string | null;
  runtime_config?: Record<string, unknown> | null;
  access?: GamePackagePlayAccess | null;
  current_attempt?: PackageAttempt | null;
}

export interface GameStartAttemptResponse {
  attempt_id: string;
  package_id: string;
  module?: GameModuleRegistryEntry | null;
  manifest_url?: string | null;
  entry?: string | null;
  runtime_config?: Record<string, unknown> | null;
  status?: PackageAttemptStatus;
  attempt?: PackageAttempt | null;
}

export interface RuntimeQuestionOption {
  id: string;
  option_key?: string;
  content: string;
  is_correct?: boolean;
  order_index?: number;
}

export interface RuntimeMatchingPair {
  id: string;
  left_text: string;
  right_text: string;
  correct_match?: string;
}

export interface GameRuntimeQuestion {
  id: string;
  package_id?: string;
  question_bank_id?: string;
  type: QuestionTypeValue;
  content: string;
  instruction?: string | null;
  explanation?: string | null;
  difficulty_band?: DifficultyBand | null;
  points?: number;
  required?: boolean;
  order_index?: number;
  options?: RuntimeQuestionOption[];
  matching_pairs?: RuntimeMatchingPair[];
  matching_left_items?: MatchingLeftItem[];
  matching_right_items?: MatchingRightItem[];
  text_config?: QuestionTextConfig | null;
  assets?: QuestionAsset[];
}

export interface GameRuntimeTriggerRequest {
  attempt_id: string;
  trigger_type: string;
  trigger_key: string;
  trigger_value: string;
  event_payload?: Record<string, unknown> | null;
}

export interface GameRuntimeTriggerAskResponse {
  action: 'ask_question';
  question_attempt: PackageQuestionAttempt;
  question: GameRuntimeQuestion;
  attempt_totals?: PackageAttemptTotals | null;
}

export interface GameRuntimeTriggerResumeResponse {
  action: 'resume';
  reason?: string | null;
  attempt_totals?: PackageAttemptTotals | null;
}

export type GameRuntimeTriggerResponse =
  | GameRuntimeTriggerAskResponse
  | GameRuntimeTriggerResumeResponse;

export interface GameRuntimeAnswerRequest {
  attempt_id: string;
  question_attempt_id: string;
  text_answer?: string;
  selected_option_ids?: string[];
  uploaded_image_url?: string;
  matching_answers?: MatchingAnswerInput[];
}

export interface GameRuntimeAnswerResponse {
  question_attempt_id: string;
  status?: QuestionAttemptStatus;
  is_correct?: boolean | null;
  score_awarded?: number | null;
  feedback_message?: string | null;
  attempt_totals?: PackageAttemptTotals | null;
  resume_payload?: Record<string, unknown> | null;
}

export interface GameRuntimeEventRequest {
  attempt_id: string;
  event_type: string;
  event_payload?: Record<string, unknown> | null;
}

export interface GameCompleteRequest {
  attempt_id: string;
  summary_payload: Record<string, unknown>;
  runtime_state?: Record<string, unknown> | null;
}

export interface GamePackageCreatePayload {
  title: string;
  description?: string;
  game_module_id: string;
  thumbnail_url?: string;
  runtime_config?: Record<string, unknown> | null;
}

export interface GamePackageUpdatePayload {
  title?: string;
  description?: string;
  thumbnail_url?: string;
  runtime_config?: Record<string, unknown> | null;
  status?: ContentPackageStatus;
}

export interface GameQuestionPayload {
  type: QuestionTypeValue;
  content: string;
  instruction?: string;
  explanation?: string;
  difficulty_band?: DifficultyBand | null;
  points: number;
  required: boolean;
  order_index: number;
  options?: Array<Pick<QuestionOption, 'content' | 'is_correct'>>;
  matching_pairs?: Array<{
    left_text: string;
    right_text: string;
    correct_match: string;
  }>;
  text_config?: QuestionTextConfig | null;
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
  | 'media'
  | 'slideshow'
  | 'interactive_video'
  | 'branching'
  | 'quiz'
  | 'hotspot_audio'
  | 'connect_the_dots'
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

export type InteractiveLayerType = 'text' | 'image' | 'video' | 'button' | 'hotspot' | 'question' | 'feedback';
export type VisibilityRuleTrigger =
  | 'always'
  | 'on_scene_enter'
  | 'after_delay'
  | 'after_time'
  | 'after_media_time'
  | 'after_media_end'
  | 'after_click'
  | 'after_choice'
  | 'after_event'
  | 'on_scene_state'
  | 'manual';

export interface VisibilityRule {
  trigger: VisibilityRuleTrigger;
  delay_seconds?: number;
  timecode?: number;
  choice_id?: string;
  interaction_id?: string;
  layer_id?: string;
  event_type?: string;
  state_key?: string;
  expected_value?: unknown;
}

export interface InteractiveLayer {
  id: string;
  type: InteractiveLayerType;
  x: number;
  y: number;
  width: number;
  height: number;
  z_index?: number;
  text?: string;
  url?: string;
  style?: Record<string, unknown>;
  visibility_rule?: VisibilityRule;
  action?: {
    type?: 'go_to_scene' | 'open_interaction' | 'play_audio' | 'reveal_layer';
    target_scene_id?: string;
    scene_id?: string;
    interaction_id?: string;
    audio_url?: string;
    target_layer_id?: string;
  };
}

export interface ConnectTheDotsPoint {
  id: string;
  label?: string;
  x: number;
  y: number;
  order: number;
}

export interface ConnectTheDotsContent {
  text?: string;
  image_url?: string;
  background_image_url?: string;
  points?: ConnectTheDotsPoint[];
  success_target_scene_id?: string;
  wrong_behavior?: 'stay_current_point' | 'restart_current_sequence' | 'restart_from_beginning';
  complete_score?: number;
  wrong_penalty?: number;
  layers?: InteractiveLayer[];
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

export interface InteractiveScoreSummary {
  attempted: number;
  correct: number;
  score: number;
  total_score: number;
  max_score: number;
  correct_count: number;
  wrong_count: number;
  retry_count: number;
  completed_scene_count: number;
  branch_history: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface InteractiveBookReportOverview {
  total_attempts: number;
  completed_attempts: number;
  in_progress_attempts: number;
  average_completion_percent: number;
  average_total_score: number;
  average_wrong_count: number;
  average_retry_count: number;
}

export interface InteractiveBookReportChoiceStat {
  choice_id: string;
  label?: string;
  count: number;
}

export interface InteractiveBookReportSceneStat {
  scene_id: string;
  scene_title: string;
  scene_type: InteractiveSceneType;
  entered_count: number;
  wrong_count: number;
  retry_count: number;
  completed_count: number;
  choice_counts: InteractiveBookReportChoiceStat[];
}

export interface InteractiveBookReportAttempt {
  attempt_id: string;
  student_id: string;
  student_name: string;
  student_email?: string | null;
  class_id?: string | null;
  class_name?: string | null;
  status: InteractiveAttemptStatus;
  current_scene_id?: string | null;
  completion_percent: number;
  score_summary: Record<string, unknown>;
  visited_scene_count: number;
  interaction_result_count: number;
  retry_history: Array<Record<string, unknown>>;
  branch_history: Array<Record<string, unknown>>;
  started_at?: string | null;
  last_seen_at?: string | null;
  completed_at?: string | null;
}

export interface InteractiveBookReportEvent {
  id: string;
  attempt_id: string;
  student_name?: string | null;
  scene_id?: string | null;
  event_type: string;
  payload?: Record<string, unknown> | null;
  created_at?: string | null;
}

export interface InteractiveBookReport {
  material_id: string;
  interactive_book_id: string;
  overview: InteractiveBookReportOverview;
  attempts: InteractiveBookReportAttempt[];
  scene_stats: InteractiveBookReportSceneStat[];
  recent_events: InteractiveBookReportEvent[];
}

export type FlowIssueSeverity = 'blocking' | 'warning';
export type FlowNodeStatus = 'reachable' | 'unreachable' | 'blocking' | 'loop';
export type FlowEdgeKind = 'next' | 'implicit_next' | 'choice' | 'interaction' | 'layer' | 'connect_the_dots';

export interface FlowValidationIssue {
  id: string;
  severity: FlowIssueSeverity;
  code: string;
  message: string;
  sceneId?: string;
  targetSceneId?: string;
}

export interface FlowGraphNode {
  id: string;
  title: string;
  type: InteractiveSceneType;
  status: FlowNodeStatus;
}

export interface FlowGraphEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  kind: FlowEdgeKind;
  valid: boolean;
}

export interface FlowValidationResult {
  blockingErrors: FlowValidationIssue[];
  warnings: FlowValidationIssue[];
  nodes: FlowGraphNode[];
  edges: FlowGraphEdge[];
  reachableSceneIds: string[];
  completionReachable: boolean;
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
