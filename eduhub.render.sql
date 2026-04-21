--
-- PostgreSQL database dump
--

\restrict KR0LuDeFhuUc932aaMsoA3t8CjBTpvcdmaAA3075whgx5ceRqahDXWHXvqsB7Rc

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.questions DROP CONSTRAINT IF EXISTS questions_exam_id_fkey;
ALTER TABLE IF EXISTS ONLY public.question_options DROP CONSTRAINT IF EXISTS question_options_question_id_fkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;
ALTER TABLE IF EXISTS ONLY public.material_views DROP CONSTRAINT IF EXISTS material_views_student_id_fkey;
ALTER TABLE IF EXISTS ONLY public.material_views DROP CONSTRAINT IF EXISTS material_views_material_id_fkey;
ALTER TABLE IF EXISTS ONLY public.material_views DROP CONSTRAINT IF EXISTS material_views_class_id_fkey;
ALTER TABLE IF EXISTS ONLY public.matching_pairs DROP CONSTRAINT IF EXISTS matching_pairs_question_id_fkey;
ALTER TABLE IF EXISTS ONLY public.library_materials DROP CONSTRAINT IF EXISTS library_materials_source_id_fkey;
ALTER TABLE IF EXISTS ONLY public.library_materials DROP CONSTRAINT IF EXISTS library_materials_shared_by_fkey;
ALTER TABLE IF EXISTS ONLY public.library_materials DROP CONSTRAINT IF EXISTS library_materials_folder_id_fkey;
ALTER TABLE IF EXISTS ONLY public.library_materials DROP CONSTRAINT IF EXISTS library_materials_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.interactive_books DROP CONSTRAINT IF EXISTS interactive_books_material_id_fkey;
ALTER TABLE IF EXISTS ONLY public.interactive_books DROP CONSTRAINT IF EXISTS interactive_books_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.interactive_book_video_options DROP CONSTRAINT IF EXISTS interactive_book_video_options_interaction_id_fkey;
ALTER TABLE IF EXISTS ONLY public.interactive_book_video_interactions DROP CONSTRAINT IF EXISTS interactive_book_video_interactions_scene_id_fkey;
ALTER TABLE IF EXISTS ONLY public.interactive_book_transitions DROP CONSTRAINT IF EXISTS interactive_book_transitions_scene_id_fkey;
ALTER TABLE IF EXISTS ONLY public.interactive_book_scenes DROP CONSTRAINT IF EXISTS interactive_book_scenes_interactive_book_id_fkey;
ALTER TABLE IF EXISTS ONLY public.interactive_book_scenes DROP CONSTRAINT IF EXISTS interactive_book_scenes_background_media_id_fkey;
ALTER TABLE IF EXISTS ONLY public.interactive_book_scene_elements DROP CONSTRAINT IF EXISTS interactive_book_scene_elements_scene_id_fkey;
ALTER TABLE IF EXISTS ONLY public.interactive_book_scene_elements DROP CONSTRAINT IF EXISTS interactive_book_scene_elements_quiz_id_fkey;
ALTER TABLE IF EXISTS ONLY public.interactive_book_scene_elements DROP CONSTRAINT IF EXISTS interactive_book_scene_elements_media_id_fkey;
ALTER TABLE IF EXISTS ONLY public.interactive_book_scene_elements DROP CONSTRAINT IF EXISTS interactive_book_scene_elements_action_id_fkey;
ALTER TABLE IF EXISTS ONLY public.interactive_book_quizzes DROP CONSTRAINT IF EXISTS interactive_book_quizzes_interactive_book_id_fkey;
ALTER TABLE IF EXISTS ONLY public.interactive_book_quiz_options DROP CONSTRAINT IF EXISTS interactive_book_quiz_options_quiz_id_fkey;
ALTER TABLE IF EXISTS ONLY public.interactive_book_media DROP CONSTRAINT IF EXISTS interactive_book_media_interactive_book_id_fkey;
ALTER TABLE IF EXISTS ONLY public.interactive_book_events DROP CONSTRAINT IF EXISTS interactive_book_events_attempt_id_fkey;
ALTER TABLE IF EXISTS ONLY public.interactive_book_attempts DROP CONSTRAINT IF EXISTS interactive_book_attempts_student_id_fkey;
ALTER TABLE IF EXISTS ONLY public.interactive_book_attempts DROP CONSTRAINT IF EXISTS interactive_book_attempts_interactive_book_id_fkey;
ALTER TABLE IF EXISTS ONLY public.interactive_book_attempts DROP CONSTRAINT IF EXISTS interactive_book_attempts_class_id_fkey;
ALTER TABLE IF EXISTS ONLY public.interactive_book_actions DROP CONSTRAINT IF EXISTS interactive_book_actions_interactive_book_id_fkey;
ALTER TABLE IF EXISTS ONLY public.folders DROP CONSTRAINT IF EXISTS folders_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.exams DROP CONSTRAINT IF EXISTS exams_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.exams DROP CONSTRAINT IF EXISTS exams_class_id_fkey;
ALTER TABLE IF EXISTS ONLY public.exam_submissions DROP CONSTRAINT IF EXISTS exam_submissions_student_id_fkey;
ALTER TABLE IF EXISTS ONLY public.exam_submissions DROP CONSTRAINT IF EXISTS exam_submissions_exam_id_fkey;
ALTER TABLE IF EXISTS ONLY public.conversation_members DROP CONSTRAINT IF EXISTS conversation_members_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.conversation_members DROP CONSTRAINT IF EXISTS conversation_members_conversation_id_fkey;
ALTER TABLE IF EXISTS ONLY public.classes DROP CONSTRAINT IF EXISTS classes_teacher_id_fkey;
ALTER TABLE IF EXISTS ONLY public.class_students DROP CONSTRAINT IF EXISTS class_students_student_id_fkey;
ALTER TABLE IF EXISTS ONLY public.class_students DROP CONSTRAINT IF EXISTS class_students_class_id_fkey;
ALTER TABLE IF EXISTS ONLY public.class_materials DROP CONSTRAINT IF EXISTS class_materials_material_id_fkey;
ALTER TABLE IF EXISTS ONLY public.class_materials DROP CONSTRAINT IF EXISTS class_materials_class_id_fkey;
ALTER TABLE IF EXISTS ONLY public.class_materials DROP CONSTRAINT IF EXISTS class_materials_chapter_id_fkey;
ALTER TABLE IF EXISTS ONLY public.chapters DROP CONSTRAINT IF EXISTS chapters_class_id_fkey;
ALTER TABLE IF EXISTS ONLY public.answers DROP CONSTRAINT IF EXISTS answers_submission_id_fkey;
ALTER TABLE IF EXISTS ONLY public.answers DROP CONSTRAINT IF EXISTS answers_question_id_fkey;
ALTER TABLE IF EXISTS ONLY public.answers DROP CONSTRAINT IF EXISTS answers_graded_by_fkey;
ALTER TABLE IF EXISTS ONLY public.answer_options DROP CONSTRAINT IF EXISTS answer_options_option_id_fkey;
ALTER TABLE IF EXISTS ONLY public.answer_options DROP CONSTRAINT IF EXISTS answer_options_answer_id_fkey;
DROP INDEX IF EXISTS public.ix_users_email;
DROP INDEX IF EXISTS public.ix_interactive_book_video_options_interaction;
DROP INDEX IF EXISTS public.ix_interactive_book_video_interactions_scene;
DROP INDEX IF EXISTS public.ix_interactive_book_transitions_scene;
DROP INDEX IF EXISTS public.ix_interactive_book_scenes_book;
DROP INDEX IF EXISTS public.ix_interactive_book_scene_elements_scene;
DROP INDEX IF EXISTS public.ix_interactive_book_quizzes_book;
DROP INDEX IF EXISTS public.ix_interactive_book_media_book;
DROP INDEX IF EXISTS public.ix_interactive_book_events_attempt;
DROP INDEX IF EXISTS public.ix_interactive_book_attempts_student_book;
DROP INDEX IF EXISTS public.ix_interactive_book_actions_book;
DROP INDEX IF EXISTS public.ix_classes_join_code;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.material_views DROP CONSTRAINT IF EXISTS uq_material_student_view;
ALTER TABLE IF EXISTS ONLY public.interactive_book_scenes DROP CONSTRAINT IF EXISTS uq_interactive_book_scene_key;
ALTER TABLE IF EXISTS ONLY public.interactive_book_scene_elements DROP CONSTRAINT IF EXISTS uq_interactive_book_scene_element_key;
ALTER TABLE IF EXISTS ONLY public.interactive_book_quizzes DROP CONSTRAINT IF EXISTS uq_interactive_book_quiz_key;
ALTER TABLE IF EXISTS ONLY public.interactive_book_media DROP CONSTRAINT IF EXISTS uq_interactive_book_media_key;
ALTER TABLE IF EXISTS ONLY public.interactive_book_actions DROP CONSTRAINT IF EXISTS uq_interactive_book_action_key;
ALTER TABLE IF EXISTS ONLY public.questions DROP CONSTRAINT IF EXISTS questions_pkey;
ALTER TABLE IF EXISTS ONLY public.question_options DROP CONSTRAINT IF EXISTS question_options_pkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_pkey;
ALTER TABLE IF EXISTS ONLY public.material_views DROP CONSTRAINT IF EXISTS material_views_pkey;
ALTER TABLE IF EXISTS ONLY public.matching_pairs DROP CONSTRAINT IF EXISTS matching_pairs_pkey;
ALTER TABLE IF EXISTS ONLY public.library_materials DROP CONSTRAINT IF EXISTS library_materials_pkey;
ALTER TABLE IF EXISTS ONLY public.interactive_books DROP CONSTRAINT IF EXISTS interactive_books_pkey;
ALTER TABLE IF EXISTS ONLY public.interactive_books DROP CONSTRAINT IF EXISTS interactive_books_material_id_key;
ALTER TABLE IF EXISTS ONLY public.interactive_book_video_options DROP CONSTRAINT IF EXISTS interactive_book_video_options_pkey;
ALTER TABLE IF EXISTS ONLY public.interactive_book_video_interactions DROP CONSTRAINT IF EXISTS interactive_book_video_interactions_pkey;
ALTER TABLE IF EXISTS ONLY public.interactive_book_transitions DROP CONSTRAINT IF EXISTS interactive_book_transitions_pkey;
ALTER TABLE IF EXISTS ONLY public.interactive_book_scenes DROP CONSTRAINT IF EXISTS interactive_book_scenes_pkey;
ALTER TABLE IF EXISTS ONLY public.interactive_book_scene_elements DROP CONSTRAINT IF EXISTS interactive_book_scene_elements_pkey;
ALTER TABLE IF EXISTS ONLY public.interactive_book_quizzes DROP CONSTRAINT IF EXISTS interactive_book_quizzes_pkey;
ALTER TABLE IF EXISTS ONLY public.interactive_book_quiz_options DROP CONSTRAINT IF EXISTS interactive_book_quiz_options_pkey;
ALTER TABLE IF EXISTS ONLY public.interactive_book_media DROP CONSTRAINT IF EXISTS interactive_book_media_pkey;
ALTER TABLE IF EXISTS ONLY public.interactive_book_events DROP CONSTRAINT IF EXISTS interactive_book_events_pkey;
ALTER TABLE IF EXISTS ONLY public.interactive_book_attempts DROP CONSTRAINT IF EXISTS interactive_book_attempts_pkey;
ALTER TABLE IF EXISTS ONLY public.interactive_book_actions DROP CONSTRAINT IF EXISTS interactive_book_actions_pkey;
ALTER TABLE IF EXISTS ONLY public.folders DROP CONSTRAINT IF EXISTS folders_pkey;
ALTER TABLE IF EXISTS ONLY public.exams DROP CONSTRAINT IF EXISTS exams_pkey;
ALTER TABLE IF EXISTS ONLY public.exam_submissions DROP CONSTRAINT IF EXISTS exam_submissions_pkey;
ALTER TABLE IF EXISTS ONLY public.conversations DROP CONSTRAINT IF EXISTS conversations_pkey;
ALTER TABLE IF EXISTS ONLY public.conversation_members DROP CONSTRAINT IF EXISTS conversation_members_pkey;
ALTER TABLE IF EXISTS ONLY public.classes DROP CONSTRAINT IF EXISTS classes_pkey;
ALTER TABLE IF EXISTS ONLY public.class_students DROP CONSTRAINT IF EXISTS class_students_pkey;
ALTER TABLE IF EXISTS ONLY public.class_materials DROP CONSTRAINT IF EXISTS class_materials_pkey;
ALTER TABLE IF EXISTS ONLY public.chapters DROP CONSTRAINT IF EXISTS chapters_pkey;
ALTER TABLE IF EXISTS ONLY public.answers DROP CONSTRAINT IF EXISTS answers_pkey;
ALTER TABLE IF EXISTS ONLY public.answer_options DROP CONSTRAINT IF EXISTS answer_options_pkey;
ALTER TABLE IF EXISTS ONLY public.alembic_version DROP CONSTRAINT IF EXISTS alembic_version_pkc;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.questions;
DROP TABLE IF EXISTS public.question_options;
DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.messages;
DROP TABLE IF EXISTS public.material_views;
DROP TABLE IF EXISTS public.matching_pairs;
DROP TABLE IF EXISTS public.library_materials;
DROP TABLE IF EXISTS public.interactive_books;
DROP TABLE IF EXISTS public.interactive_book_video_options;
DROP TABLE IF EXISTS public.interactive_book_video_interactions;
DROP TABLE IF EXISTS public.interactive_book_transitions;
DROP TABLE IF EXISTS public.interactive_book_scenes;
DROP TABLE IF EXISTS public.interactive_book_scene_elements;
DROP TABLE IF EXISTS public.interactive_book_quizzes;
DROP TABLE IF EXISTS public.interactive_book_quiz_options;
DROP TABLE IF EXISTS public.interactive_book_media;
DROP TABLE IF EXISTS public.interactive_book_events;
DROP TABLE IF EXISTS public.interactive_book_attempts;
DROP TABLE IF EXISTS public.interactive_book_actions;
DROP TABLE IF EXISTS public.folders;
DROP TABLE IF EXISTS public.exams;
DROP TABLE IF EXISTS public.exam_submissions;
DROP TABLE IF EXISTS public.conversations;
DROP TABLE IF EXISTS public.conversation_members;
DROP TABLE IF EXISTS public.classes;
DROP TABLE IF EXISTS public.class_students;
DROP TABLE IF EXISTS public.class_materials;
DROP TABLE IF EXISTS public.chapters;
DROP TABLE IF EXISTS public.answers;
DROP TABLE IF EXISTS public.answer_options;
DROP TABLE IF EXISTS public.alembic_version;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: answer_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.answer_options (
    id character varying NOT NULL,
    answer_id character varying NOT NULL,
    option_id character varying NOT NULL
);


--
-- Name: answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.answers (
    id character varying NOT NULL,
    submission_id character varying NOT NULL,
    question_id character varying NOT NULL,
    text_answer character varying,
    uploaded_image_url character varying,
    score double precision,
    graded_by character varying,
    graded_at timestamp without time zone
);


--
-- Name: chapters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chapters (
    id character varying NOT NULL,
    class_id character varying NOT NULL,
    name character varying NOT NULL,
    order_index integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: class_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_materials (
    id character varying NOT NULL,
    class_id character varying NOT NULL,
    material_id character varying NOT NULL,
    chapter_id character varying,
    assigned_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: class_students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_students (
    id character varying NOT NULL,
    class_id character varying NOT NULL,
    student_id character varying NOT NULL,
    joined_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: classes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.classes (
    id character varying NOT NULL,
    name character varying NOT NULL,
    description character varying,
    thumbnail_url character varying,
    teacher_id character varying NOT NULL,
    join_code character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: conversation_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_members (
    id character varying NOT NULL,
    conversation_id character varying NOT NULL,
    user_id character varying NOT NULL
);


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: exam_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_submissions (
    id character varying NOT NULL,
    exam_id character varying NOT NULL,
    student_id character varying NOT NULL,
    started_at timestamp without time zone DEFAULT now() NOT NULL,
    submitted_at timestamp without time zone,
    total_score double precision,
    status character varying NOT NULL
);


--
-- Name: exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exams (
    id character varying NOT NULL,
    class_id character varying NOT NULL,
    title character varying NOT NULL,
    description character varying,
    thumbnail_url character varying,
    start_time timestamp without time zone,
    end_time timestamp without time zone,
    duration_minutes integer,
    shuffle_questions boolean NOT NULL,
    max_attempts integer NOT NULL,
    allow_review boolean NOT NULL,
    show_answers_policy character varying NOT NULL,
    status character varying NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: folders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.folders (
    id character varying NOT NULL,
    name character varying NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: interactive_book_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interactive_book_actions (
    id character varying NOT NULL,
    interactive_book_id character varying NOT NULL,
    action_key character varying,
    action_type character varying NOT NULL,
    config_json jsonb,
    order_index integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: interactive_book_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interactive_book_attempts (
    id character varying NOT NULL,
    interactive_book_id character varying NOT NULL,
    student_id character varying NOT NULL,
    class_id character varying,
    manifest_version integer NOT NULL,
    manifest_snapshot jsonb,
    status character varying NOT NULL,
    current_scene_id character varying,
    state_snapshot jsonb,
    completion_percent double precision NOT NULL,
    score_summary jsonb,
    started_at timestamp without time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp without time zone DEFAULT now() NOT NULL,
    completed_at timestamp without time zone
);


--
-- Name: interactive_book_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interactive_book_events (
    id character varying NOT NULL,
    attempt_id character varying NOT NULL,
    scene_id character varying,
    event_type character varying NOT NULL,
    payload jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: interactive_book_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interactive_book_media (
    id character varying NOT NULL,
    interactive_book_id character varying NOT NULL,
    media_key character varying,
    media_type character varying NOT NULL,
    url character varying NOT NULL,
    thumbnail_url character varying,
    duration double precision,
    metadata_json jsonb,
    order_index integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: interactive_book_quiz_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interactive_book_quiz_options (
    id character varying NOT NULL,
    quiz_id character varying NOT NULL,
    option_key character varying,
    content character varying NOT NULL,
    is_correct boolean DEFAULT false NOT NULL,
    order_index integer DEFAULT 0 NOT NULL,
    feedback character varying,
    feedback_audio_url character varying,
    correct_action_key character varying,
    wrong_action_key character varying,
    next_scene_key character varying,
    retry boolean DEFAULT false NOT NULL,
    score_delta double precision,
    config_json jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: interactive_book_quizzes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interactive_book_quizzes (
    id character varying NOT NULL,
    interactive_book_id character varying NOT NULL,
    quiz_key character varying,
    question character varying NOT NULL,
    quiz_type character varying DEFAULT 'multiple_choice'::character varying NOT NULL,
    config_json jsonb,
    order_index integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: interactive_book_scene_elements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interactive_book_scene_elements (
    id character varying NOT NULL,
    scene_id character varying NOT NULL,
    element_key character varying,
    element_type character varying NOT NULL,
    media_id character varying,
    quiz_id character varying,
    action_id character varying,
    order_index integer DEFAULT 0 NOT NULL,
    config_json jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: interactive_book_scenes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interactive_book_scenes (
    id character varying NOT NULL,
    interactive_book_id character varying NOT NULL,
    scene_key character varying NOT NULL,
    title character varying,
    scene_type character varying NOT NULL,
    order_index integer DEFAULT 0 NOT NULL,
    background_media_id character varying,
    auto_play boolean DEFAULT false NOT NULL,
    content_json jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: interactive_book_transitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interactive_book_transitions (
    id character varying NOT NULL,
    scene_id character varying NOT NULL,
    trigger_type character varying NOT NULL,
    condition_json jsonb,
    next_scene_key character varying,
    action_key character varying,
    order_index integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: interactive_book_video_interactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interactive_book_video_interactions (
    id character varying NOT NULL,
    scene_id character varying NOT NULL,
    interaction_key character varying,
    "timestamp" double precision NOT NULL,
    prompt character varying,
    config_json jsonb,
    order_index integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: interactive_book_video_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interactive_book_video_options (
    id character varying NOT NULL,
    interaction_id character varying NOT NULL,
    option_key character varying,
    label character varying NOT NULL,
    next_scene_key character varying,
    is_correct boolean,
    retry boolean DEFAULT false NOT NULL,
    order_index integer DEFAULT 0 NOT NULL,
    feedback character varying,
    feedback_audio_url character varying,
    action_key character varying,
    score_delta double precision,
    config_json jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: interactive_books; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interactive_books (
    id character varying NOT NULL,
    material_id character varying NOT NULL,
    status character varying NOT NULL,
    draft_manifest jsonb,
    published_manifest jsonb,
    manifest_version integer NOT NULL,
    entry_scene_id character varying,
    estimated_duration integer,
    created_by character varying NOT NULL,
    published_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: library_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.library_materials (
    id character varying NOT NULL,
    title character varying NOT NULL,
    description character varying,
    thumbnail_url character varying,
    file_url character varying,
    material_type character varying NOT NULL,
    subject character varying,
    grade character varying,
    is_system boolean NOT NULL,
    folder_id character varying,
    created_by character varying NOT NULL,
    shared_by character varying,
    source_id character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: matching_pairs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matching_pairs (
    id character varying NOT NULL,
    question_id character varying NOT NULL,
    left_text character varying NOT NULL,
    right_text character varying NOT NULL,
    correct_match character varying NOT NULL
);


--
-- Name: material_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.material_views (
    id character varying NOT NULL,
    material_id character varying NOT NULL,
    student_id character varying NOT NULL,
    class_id character varying,
    viewed_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id character varying NOT NULL,
    conversation_id character varying NOT NULL,
    sender_id character varying NOT NULL,
    content character varying,
    file_url character varying,
    is_read boolean NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id character varying NOT NULL,
    user_id character varying NOT NULL,
    type character varying NOT NULL,
    title character varying NOT NULL,
    content character varying NOT NULL,
    link character varying,
    is_read boolean NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: question_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_options (
    id character varying NOT NULL,
    question_id character varying NOT NULL,
    content character varying NOT NULL,
    is_correct boolean NOT NULL
);


--
-- Name: questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questions (
    id character varying NOT NULL,
    exam_id character varying NOT NULL,
    type character varying NOT NULL,
    content character varying NOT NULL,
    instruction character varying,
    points integer NOT NULL,
    required boolean NOT NULL,
    order_index integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying NOT NULL,
    full_name character varying NOT NULL,
    email character varying NOT NULL,
    password_hash character varying NOT NULL,
    role character varying NOT NULL,
    avatar_url character varying,
    phone character varying,
    bio character varying,
    is_active boolean NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alembic_version (version_num) FROM stdin;
5d8ab4f3d129
\.


--
-- Data for Name: answer_options; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.answer_options (id, answer_id, option_id) FROM stdin;
\.


--
-- Data for Name: answers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.answers (id, submission_id, question_id, text_answer, uploaded_image_url, score, graded_by, graded_at) FROM stdin;
\.


--
-- Data for Name: chapters; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chapters (id, class_id, name, order_index, created_at) FROM stdin;
9a750ec1-9fd8-4a95-b250-87f3e282f3e5	0da2f70b-4fb8-439f-98c8-bbc82899fa13	Ch??ng 1 - S?ch t??ng t?c	0	2026-04-18 16:37:49.480185
3f094a22-edcd-4487-8131-49dee82f385c	a558417d-380f-40a6-aa0d-c7daebc20272	Chương 1 - Demo	0	2026-04-20 14:48:23.753416
\.


--
-- Data for Name: class_materials; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.class_materials (id, class_id, material_id, chapter_id, assigned_at) FROM stdin;
afa9ce7e-1096-4da0-9f4d-7ca29a57dec6	0da2f70b-4fb8-439f-98c8-bbc82899fa13	bb7e621c-3dab-4f26-b291-36ad8c32d56b	9a750ec1-9fd8-4a95-b250-87f3e282f3e5	2026-04-18 16:37:49.480185
\.


--
-- Data for Name: class_students; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.class_students (id, class_id, student_id, joined_at) FROM stdin;
e76cba42-a50d-4b77-9ed2-be7e5d5f7dbb	0da2f70b-4fb8-439f-98c8-bbc82899fa13	dfd94943-ea95-4316-b5bf-0d3cd704b120	2026-04-18 16:37:49.480185
535c7790-cb0b-4268-aafc-9e860e7e395c	a558417d-380f-40a6-aa0d-c7daebc20272	dfd94943-ea95-4316-b5bf-0d3cd704b120	2026-04-20 14:49:13.443078
\.


--
-- Data for Name: classes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.classes (id, name, description, thumbnail_url, teacher_id, join_code, created_at, updated_at) FROM stdin;
0da2f70b-4fb8-439f-98c8-bbc82899fa13	L?p demo s?ch t??ng t?c	L?p d?ng ?? test t?m th?i c?c t?nh n?ng s?ch t??ng t?c	\N	a41b8a54-b01e-4d53-ba95-2db48c948008	IBTEST	2026-04-18 16:37:49.480185	2026-04-18 16:37:49.480185
a558417d-380f-40a6-aa0d-c7daebc20272	Lớp 6 nào đó	kệ đi test slide thôi	https://res.cloudinary.com/dxesd2zjo/image/upload/v1776696446/eduhub/thumbnails/file_gospfo.png	a41b8a54-b01e-4d53-ba95-2db48c948008	AP0W6Y	2026-04-20 14:47:26.571354	2026-04-20 14:47:26.571354
\.


--
-- Data for Name: conversation_members; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.conversation_members (id, conversation_id, user_id) FROM stdin;
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.conversations (id, created_at) FROM stdin;
\.


--
-- Data for Name: exam_submissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.exam_submissions (id, exam_id, student_id, started_at, submitted_at, total_score, status) FROM stdin;
\.


--
-- Data for Name: exams; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.exams (id, class_id, title, description, thumbnail_url, start_time, end_time, duration_minutes, shuffle_questions, max_attempts, allow_review, show_answers_policy, status, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: folders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.folders (id, name, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: interactive_book_actions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.interactive_book_actions (id, interactive_book_id, action_key, action_type, config_json, order_index, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: interactive_book_attempts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.interactive_book_attempts (id, interactive_book_id, student_id, class_id, manifest_version, manifest_snapshot, status, current_scene_id, state_snapshot, completion_percent, score_summary, started_at, last_seen_at, completed_at) FROM stdin;
915ccfe8-3f21-490e-937d-2584c7c404ac	d79d3fef-c71a-4f30-b1f5-8a29944814d9	dfd94943-ea95-4316-b5bf-0d3cd704b120	0da2f70b-4fb8-439f-98c8-bbc82899fa13	4	{"title": "Sách tương tác mới", "scenes": [{"id": "timeline", "next": null, "type": "timeline", "title": "Tổng quan câu chuyện", "assets": [], "content": {"text": "Đây là trang tổng quan. Giáo viên có thể chỉnh từng sự kiện ở cột bên trái, còn thẻ timeline sẽ tự đồng bộ theo thứ tự các sự kiện.", "cards": [{"id": "card-scene-interactive-video", "title": "Video tương tác mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529070/eduhub/interactive-books/file_khfmjk.jpg", "description": "Mô tả ngắn cho cảnh video này.", "order_index": 1, "target_scene_id": "scene-interactive-video"}, {"id": "card-scene-quiz", "title": "Câu hỏi mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529086/eduhub/interactive-books/file_gnqn9y.jpg", "description": "Câu hỏi để củng cố nội dung vừa học.", "order_index": 2, "target_scene_id": "scene-quiz"}, {"id": "card-scene-branching", "title": "Cảnh rẽ nhánh mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529188/eduhub/interactive-books/file_ncx3lw.jpg", "description": "Đưa ra các hướng lựa chọn để người học quyết định.", "order_index": 3, "target_scene_id": "scene-branching"}], "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776528554/eduhub/interactive-books/file_qjkc85.jpg", "sync_from_scenes": true}, "interactions": []}, {"id": "scene-interactive-video", "next": null, "type": "interactive_video", "title": "Gặp gỡ", "assets": [], "content": {"text": "là ý trời", "autoplay": false, "video_url": "https://res.cloudinary.com/dxesd2zjo/video/upload/v1776529268/eduhub/interactive-books/file_k99oa9.mp4", "poster_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529070/eduhub/interactive-books/file_khfmjk.jpg"}, "interactions": []}, {"id": "scene-quiz", "next": null, "type": "quiz", "title": "Câu hỏi mới", "assets": [], "content": {"text": "Câu hỏi để củng cố nội dung vừa học.", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529086/eduhub/interactive-books/file_gnqn9y.jpg", "background_audio_url": ""}, "interactions": [{"id": "scene-quiz-quiz", "data": {}, "type": "quiz", "prompt": "Nhập câu hỏi cho cảnh này", "choices": [{"id": "scene-quiz-choice-1", "label": "Đáp án đúng", "retry": false, "feedback": "Đúng", "is_correct": true, "score_delta": null, "target_scene_id": null, "feedback_audio_url": null, "feedback_image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529107/eduhub/interactive-books/file_sbz4zo.jpg"}, {"id": "scene-quiz-choice-2", "label": "Đáp án sai", "retry": true, "feedback": "worng boi", "is_correct": false, "score_delta": 1.0, "target_scene_id": null, "feedback_audio_url": null, "feedback_image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529139/eduhub/interactive-books/file_nf0u0h.jpg"}], "trigger": "on_enter", "timecode": null, "target_scene_id": null}]}, {"id": "scene-branching", "next": null, "type": "branching", "title": "bạn bị ngu không", "assets": [], "content": {"text": "tôi có ngu hay không", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529188/eduhub/interactive-books/file_ncx3lw.jpg", "background_audio_url": ""}, "interactions": [{"id": "scene-branching-branch", "data": {"wrong_feedback_message": "tôi có ngu", "correct_feedback_message": "tôi chưa kịp ngu"}, "type": "branching_prompt", "prompt": "b ngu à", "choices": [{"id": "scene-branching-choice-1", "label": "không", "retry": true, "feedback": "Chưa phù hợp, hãy cân nhắc lại.", "is_correct": false, "score_delta": null, "target_scene_id": null, "feedback_audio_url": null, "feedback_image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529239/eduhub/interactive-books/file_n6ykf1.jpg"}, {"id": "scene-branching-choice-2", "label": "đúng", "retry": false, "feedback": "Lựa chọn hợp lý.", "is_correct": true, "score_delta": 1.0, "target_scene_id": null, "feedback_audio_url": null, "feedback_image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529248/eduhub/interactive-books/file_obumyi.jpg"}], "trigger": "on_enter", "timecode": null, "target_scene_id": null}]}], "metadata": {"theme": "storytelling", "sync_timeline_cards": true}, "entry_scene_id": "timeline"}	in_progress	timeline	{"derived_score": {"score": 0, "correct": 0, "attempted": 0, "max_score": 0, "retry_count": 0, "total_score": 0, "wrong_count": 0, "correct_count": 0, "branch_history": [], "completed_scene_count": 1}, "retry_history": [], "branch_history": [], "media_progress": {}, "visited_scenes": ["timeline"], "interaction_results": []}	0	{"score": 0.0, "correct": 0, "attempted": 0, "max_score": 0.0, "retry_count": 0, "total_score": 0.0, "wrong_count": 0, "correct_count": 0, "branch_history": [], "completed_scene_count": 1}	2026-04-21 01:39:39.497336	2026-04-21 01:39:39.497336	\N
42f0e859-8e2d-4c4e-abe1-fb5503246a95	d79d3fef-c71a-4f30-b1f5-8a29944814d9	dfd94943-ea95-4316-b5bf-0d3cd704b120	0da2f70b-4fb8-439f-98c8-bbc82899fa13	4	{"title": "Sách tương tác mới", "scenes": [{"id": "timeline", "next": null, "type": "timeline", "title": "Tổng quan câu chuyện", "assets": [], "content": {"text": "Đây là trang tổng quan. Giáo viên có thể chỉnh từng sự kiện ở cột bên trái, còn thẻ timeline sẽ tự đồng bộ theo thứ tự các sự kiện.", "cards": [{"id": "card-scene-interactive-video", "title": "Video tương tác mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529070/eduhub/interactive-books/file_khfmjk.jpg", "description": "Mô tả ngắn cho cảnh video này.", "order_index": 1, "target_scene_id": "scene-interactive-video"}, {"id": "card-scene-quiz", "title": "Câu hỏi mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529086/eduhub/interactive-books/file_gnqn9y.jpg", "description": "Câu hỏi để củng cố nội dung vừa học.", "order_index": 2, "target_scene_id": "scene-quiz"}, {"id": "card-scene-branching", "title": "Cảnh rẽ nhánh mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529188/eduhub/interactive-books/file_ncx3lw.jpg", "description": "Đưa ra các hướng lựa chọn để người học quyết định.", "order_index": 3, "target_scene_id": "scene-branching"}], "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776528554/eduhub/interactive-books/file_qjkc85.jpg", "sync_from_scenes": true}, "interactions": []}, {"id": "scene-interactive-video", "next": null, "type": "interactive_video", "title": "Gặp gỡ", "assets": [], "content": {"text": "là ý trời", "autoplay": false, "video_url": "https://res.cloudinary.com/dxesd2zjo/video/upload/v1776529268/eduhub/interactive-books/file_k99oa9.mp4", "poster_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529070/eduhub/interactive-books/file_khfmjk.jpg"}, "interactions": []}, {"id": "scene-quiz", "next": null, "type": "quiz", "title": "Câu hỏi mới", "assets": [], "content": {"text": "Câu hỏi để củng cố nội dung vừa học.", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529086/eduhub/interactive-books/file_gnqn9y.jpg", "background_audio_url": ""}, "interactions": [{"id": "scene-quiz-quiz", "data": {}, "type": "quiz", "prompt": "Nhập câu hỏi cho cảnh này", "choices": [{"id": "scene-quiz-choice-1", "label": "Đáp án đúng", "retry": false, "feedback": "Đúng", "is_correct": true, "score_delta": null, "target_scene_id": null, "feedback_audio_url": null, "feedback_image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529107/eduhub/interactive-books/file_sbz4zo.jpg"}, {"id": "scene-quiz-choice-2", "label": "Đáp án sai", "retry": true, "feedback": "worng boi", "is_correct": false, "score_delta": 1.0, "target_scene_id": null, "feedback_audio_url": null, "feedback_image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529139/eduhub/interactive-books/file_nf0u0h.jpg"}], "trigger": "on_enter", "timecode": null, "target_scene_id": null}]}, {"id": "scene-branching", "next": null, "type": "branching", "title": "bạn bị ngu không", "assets": [], "content": {"text": "tôi có ngu hay không", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529188/eduhub/interactive-books/file_ncx3lw.jpg", "background_audio_url": ""}, "interactions": [{"id": "scene-branching-branch", "data": {"wrong_feedback_message": "tôi có ngu", "correct_feedback_message": "tôi chưa kịp ngu"}, "type": "branching_prompt", "prompt": "b ngu à", "choices": [{"id": "scene-branching-choice-1", "label": "không", "retry": true, "feedback": "Chưa phù hợp, hãy cân nhắc lại.", "is_correct": false, "score_delta": null, "target_scene_id": null, "feedback_audio_url": null, "feedback_image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529239/eduhub/interactive-books/file_n6ykf1.jpg"}, {"id": "scene-branching-choice-2", "label": "đúng", "retry": false, "feedback": "Lựa chọn hợp lý.", "is_correct": true, "score_delta": 1.0, "target_scene_id": null, "feedback_audio_url": null, "feedback_image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529248/eduhub/interactive-books/file_obumyi.jpg"}], "trigger": "on_enter", "timecode": null, "target_scene_id": null}]}], "metadata": {"theme": "storytelling", "sync_timeline_cards": true}, "entry_scene_id": "timeline"}	completed	scene-branching	{"derived_score": {"score": 4.0, "correct": 3, "attempted": 5, "max_score": 2.0, "retry_count": 0, "total_score": 4.0, "wrong_count": 2, "correct_count": 3, "branch_history": [{"at": "2026-04-21T01:39:42.742Z", "reason": "default_next", "to_scene_id": "scene-interactive-video", "from_scene_id": "timeline"}, {"at": "2026-04-21T01:39:52.044Z", "reason": "default_next", "to_scene_id": "scene-quiz", "from_scene_id": "scene-interactive-video"}, {"at": "2026-04-21T01:39:58.155Z", "reason": "interaction_continue", "to_scene_id": "scene-branching", "from_scene_id": "scene-quiz", "interaction_id": "scene-quiz-quiz"}, {"at": "2026-04-21T01:40:58.465Z", "reason": "default_next", "to_scene_id": "scene-quiz", "from_scene_id": "scene-interactive-video"}, {"at": "2026-04-21T01:41:02.672Z", "reason": "interaction_continue", "to_scene_id": "scene-branching", "from_scene_id": "scene-quiz", "interaction_id": "scene-quiz-quiz"}], "completed_scene_count": 4}, "retry_history": [], "branch_history": [{"at": "2026-04-21T01:39:42.742Z", "reason": "default_next", "to_scene_id": "scene-interactive-video", "from_scene_id": "timeline"}, {"at": "2026-04-21T01:39:52.044Z", "reason": "default_next", "to_scene_id": "scene-quiz", "from_scene_id": "scene-interactive-video"}, {"at": "2026-04-21T01:39:58.155Z", "reason": "interaction_continue", "to_scene_id": "scene-branching", "from_scene_id": "scene-quiz", "interaction_id": "scene-quiz-quiz"}, {"at": "2026-04-21T01:40:58.465Z", "reason": "default_next", "to_scene_id": "scene-quiz", "from_scene_id": "scene-interactive-video"}, {"at": "2026-04-21T01:41:02.672Z", "reason": "interaction_continue", "to_scene_id": "scene-branching", "from_scene_id": "scene-quiz", "interaction_id": "scene-quiz-quiz"}], "media_progress": {"scene-quiz": {"handled_interaction_ids": ["scene-quiz-quiz"]}, "scene-branching": {"handled_interaction_ids": ["scene-branching-branch"]}}, "visited_scenes": ["timeline", "scene-interactive-video", "scene-quiz", "scene-branching"], "interaction_results": [{"at": "2026-04-21T01:39:53.889Z", "scene_id": "scene-quiz", "choice_id": "scene-quiz-choice-1", "is_correct": true, "interaction_id": "scene-quiz-quiz"}, {"at": "2026-04-21T01:40:00.838Z", "scene_id": "scene-branching", "choice_id": "scene-branching-choice-1", "is_correct": false, "interaction_id": "scene-branching-branch"}, {"at": "2026-04-21T01:40:41.418Z", "scene_id": "scene-quiz", "choice_id": "scene-quiz-choice-2", "is_correct": false, "interaction_id": "scene-quiz-quiz"}, {"at": "2026-04-21T01:41:00.048Z", "scene_id": "scene-quiz", "choice_id": "scene-quiz-choice-1", "is_correct": true, "interaction_id": "scene-quiz-quiz"}, {"at": "2026-04-21T01:41:06.338Z", "scene_id": "scene-branching", "choice_id": "scene-branching-choice-2", "is_correct": true, "interaction_id": "scene-branching-branch"}]}	100	{"score": 4.0, "correct": 3, "attempted": 5, "max_score": 2.0, "retry_count": 0, "total_score": 4.0, "wrong_count": 2, "correct_count": 3, "branch_history": [{"at": "2026-04-21T01:39:42.742Z", "reason": "default_next", "to_scene_id": "scene-interactive-video", "from_scene_id": "timeline"}, {"at": "2026-04-21T01:39:52.044Z", "reason": "default_next", "to_scene_id": "scene-quiz", "from_scene_id": "scene-interactive-video"}, {"at": "2026-04-21T01:39:58.155Z", "reason": "interaction_continue", "to_scene_id": "scene-branching", "from_scene_id": "scene-quiz", "interaction_id": "scene-quiz-quiz"}, {"at": "2026-04-21T01:40:58.465Z", "reason": "default_next", "to_scene_id": "scene-quiz", "from_scene_id": "scene-interactive-video"}, {"at": "2026-04-21T01:41:02.672Z", "reason": "interaction_continue", "to_scene_id": "scene-branching", "from_scene_id": "scene-quiz", "interaction_id": "scene-quiz-quiz"}], "completed_scene_count": 4}	2026-04-21 01:39:39.497039	2026-04-21 08:41:09.416854	2026-04-21 08:41:09.416862
4fcd63d4-fa18-4f7d-a606-c17642e37f8c	69ec02b5-5e30-489f-812f-cbf979da050e	dfd94943-ea95-4316-b5bf-0d3cd704b120	\N	1	{"title": "Câu bé thông minh", "scenes": [{"id": "timeline", "next": null, "type": "timeline", "title": "Tổng quan câu chuyện", "assets": [], "content": {"text": "Tiếp theo đây, bạn sẽ được tìm hiểu câu chuyện \\"Cậu bé thông minh\\". Hãy cùng mình hoàn thiện câu truyện nhé!", "cards": [{"id": "card-scene-media", "title": "Nội dung mới", "image_url": "", "description": "Mô tả ngắn cho nội dung này.", "order_index": 1, "target_scene_id": "scene-media"}, {"id": "card-scene-media-1", "title": "Nội dung mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740005/eduhub/interactive-books/file_rvgokl.jpg", "description": "Mô tả ngắn cho nội dung này.", "order_index": 2, "target_scene_id": "scene-media-1"}, {"id": "card-scene-media-2", "title": "Nội dung mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740053/eduhub/interactive-books/file_xitcs1.jpg", "description": "Mô tả ngắn cho nội dung này.", "order_index": 3, "target_scene_id": "scene-media-2"}, {"id": "card-scene-media-3", "title": "Nội dung mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740133/eduhub/interactive-books/file_i4dxaf.jpg", "description": "Mô tả ngắn cho nội dung này.", "order_index": 4, "target_scene_id": "scene-media-3"}, {"id": "card-scene-media-4", "title": "Nội dung mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740173/eduhub/interactive-books/file_vqpkkx.jpg", "description": "Mô tả ngắn cho nội dung này.", "order_index": 5, "target_scene_id": "scene-media-4"}, {"id": "card-scene-media-5", "title": "Nội dung mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740667/eduhub/interactive-books/file_ko5ohc.jpg", "description": "Mô tả ngắn cho nội dung này.", "order_index": 6, "target_scene_id": "scene-media-5"}], "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776739863/eduhub/interactive-books/file_sx35dg.jpg", "sync_from_scenes": true}, "interactions": []}, {"id": "scene-media", "next": null, "type": "media", "title": "Giới thiệu câu chuyện", "assets": [], "content": {"text": "Nỗi lo âu của vua quan", "autoplay": true, "image_url": "", "video_url": "https://res.cloudinary.com/dxesd2zjo/video/upload/v1776739604/eduhub/interactive-books/file_vbch5l.mp4", "media_kind": "video", "poster_url": "", "question_enabled": false, "background_audio_url": ""}, "interactions": []}, {"id": "scene-media-1", "next": null, "type": "media", "title": "Gặp gỡ", "assets": [], "content": {"text": "Ông quan gặp gỡ hai bố con nọ", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740005/eduhub/interactive-books/file_rvgokl.jpg", "video_url": "", "media_kind": "image", "poster_url": "", "question_enabled": false, "background_audio_url": "https://res.cloudinary.com/dxesd2zjo/video/upload/v1776740009/eduhub/interactive-books/file_yp7oo7.mp3"}, "interactions": []}, {"id": "scene-media-2", "next": null, "type": "media", "title": "đặt câu hỏi", "assets": [], "content": {"text": "Ông quan đặt câu hỏi cho hai cha con", "layers": [{"x": 13.508620689655173, "y": 13.660273175586685, "id": "layer-text-1776740056160-1", "text": "Này, lão kia! Trâu của lão cày một ngày được mấy đường?", "type": "text", "width": 30, "height": 14, "z_index": 1, "visibility_rule": {"trigger": "after_media_time"}}], "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740053/eduhub/interactive-books/file_xitcs1.jpg", "video_url": "", "media_kind": "image", "poster_url": "", "question_enabled": false, "background_audio_url": "https://res.cloudinary.com/dxesd2zjo/video/upload/v1776740103/eduhub/interactive-books/file_addekc.mp3"}, "interactions": []}, {"id": "scene-media-3", "next": null, "type": "media", "title": "Ông bố ấp úng", "assets": [], "content": {"text": "Đây quả là một câu hỏi khó cho hai cha con", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740133/eduhub/interactive-books/file_i4dxaf.jpg", "video_url": "", "media_kind": "image", "poster_url": "", "question_enabled": false, "background_audio_url": ""}, "interactions": []}, {"id": "scene-media-4", "next": null, "type": "media", "title": "Câu hỏi cho bạn", "assets": [], "content": {"text": "Cùng trả lời câu hỏi nhé", "layers": [{"x": 5.606324031435211, "y": 17.108560730214318, "id": "layer-text-1776740195715-1", "text": "Theo bạn, trâu nhà tôi cày một ngày được mấy đường?", "type": "text", "width": 26, "height": 14, "z_index": 1, "visibility_rule": {"trigger": "always"}}], "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740173/eduhub/interactive-books/file_vqpkkx.jpg", "video_url": "", "media_kind": "image", "poster_url": "", "question_enabled": true, "background_audio_url": "https://res.cloudinary.com/dxesd2zjo/video/upload/v1776740277/eduhub/interactive-books/file_zfk8lz.mp3", "question_interaction_id": "scene-media-4-question"}, "interactions": [{"id": "scene-media-4-question", "data": {"wrong_feedback_message": "Chưa đúng đâu, hãy thử lại nhé.", "correct_feedback_message": "Chính  xác, bạn giỏi lắm!"}, "type": "multiple_choice", "prompt": "Theo bạn, trâu nhà tôi cày một ngày được mấy đường?", "choices": [{"id": "scene-media-4-choice-1", "label": "Dạ bẩm quan... Trâu nhà tôi 1 ngày cày được 100 đường.", "retry": true, "feedback": "Chưa đúng đâu, hãy thử lại nhé.", "is_correct": false, "score_delta": null, "target_scene_id": null, "feedback_audio_url": null, "feedback_image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740471/eduhub/interactive-books/file_estqv3.jpg"}, {"id": "scene-media-4-choice-2", "label": "Dạ bẩm quan, vậy cho con hỏi ngựa của ngài 1 ngày đi được mấy bước?", "retry": false, "feedback": "Chính  xác, bạn giỏi lắm!", "is_correct": true, "score_delta": 1.0, "target_scene_id": null, "feedback_audio_url": null, "feedback_image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740595/eduhub/interactive-books/file_jwjk0g.jpg"}], "trigger": "on_enter", "timecode": null, "target_scene_id": null}]}, {"id": "scene-media-5", "next": null, "type": "media", "title": "Nội dung mới", "assets": [], "content": {"text": "Mô tả ngắn cho nội dung này.", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740667/eduhub/interactive-books/file_ko5ohc.jpg", "video_url": "", "media_kind": "image", "poster_url": "", "question_enabled": false, "background_audio_url": "https://res.cloudinary.com/dxesd2zjo/video/upload/v1776740697/eduhub/interactive-books/file_qa3chr.mp3"}, "interactions": []}], "metadata": {"theme": "storytelling", "sync_timeline_cards": true}, "entry_scene_id": "timeline"}	completed	scene-media-5	{"derived_score": {"score": 1.0, "correct": 1, "attempted": 2, "max_score": 1.0, "retry_count": 1, "total_score": 1.0, "wrong_count": 1, "correct_count": 1, "branch_history": [{"at": "2026-04-21T03:07:11.764Z", "reason": "timeline_card_click", "card_id": "card-scene-media", "to_scene_id": "scene-media", "from_scene_id": "timeline"}, {"at": "2026-04-21T03:07:28.854Z", "reason": "default_next", "to_scene_id": "scene-media-1", "from_scene_id": "scene-media"}, {"at": "2026-04-21T03:10:05.924Z", "reason": "default_next", "to_scene_id": "scene-media-2", "from_scene_id": "scene-media-1"}, {"at": "2026-04-21T03:10:09.943Z", "reason": "default_next", "to_scene_id": "scene-media-3", "from_scene_id": "scene-media-2"}, {"at": "2026-04-21T03:10:10.809Z", "reason": "default_next", "to_scene_id": "scene-media-4", "from_scene_id": "scene-media-3"}, {"at": "2026-04-21T03:10:32.176Z", "reason": "interaction_continue", "to_scene_id": "scene-media-5", "from_scene_id": "scene-media-4", "interaction_id": "scene-media-4-question"}], "completed_scene_count": 7}, "retry_history": [{"at": "2026-04-21T03:10:28.351Z", "scene_id": "scene-media-4", "interaction_id": "scene-media-4-question"}], "branch_history": [{"at": "2026-04-21T03:07:11.764Z", "reason": "timeline_card_click", "card_id": "card-scene-media", "to_scene_id": "scene-media", "from_scene_id": "timeline"}, {"at": "2026-04-21T03:07:28.854Z", "reason": "default_next", "to_scene_id": "scene-media-1", "from_scene_id": "scene-media"}, {"at": "2026-04-21T03:10:05.924Z", "reason": "default_next", "to_scene_id": "scene-media-2", "from_scene_id": "scene-media-1"}, {"at": "2026-04-21T03:10:09.943Z", "reason": "default_next", "to_scene_id": "scene-media-3", "from_scene_id": "scene-media-2"}, {"at": "2026-04-21T03:10:10.809Z", "reason": "default_next", "to_scene_id": "scene-media-4", "from_scene_id": "scene-media-3"}, {"at": "2026-04-21T03:10:32.176Z", "reason": "interaction_continue", "to_scene_id": "scene-media-5", "from_scene_id": "scene-media-4", "interaction_id": "scene-media-4-question"}], "media_progress": {"scene-media": {"ended_at": "2026-04-21T03:07:25.654Z", "current_time": 10.12, "media_completed_at": "2026-04-21T03:07:25.654Z", "scene_media_completed": true}, "scene-media-4": {"ended_at": "2026-04-21T03:10:14.746Z", "media_completed_at": "2026-04-21T03:10:14.749Z", "scene_media_completed": true, "handled_interaction_ids": ["scene-media-4-question"]}, "scene-media-5": {"ended_at": "2026-04-21T03:11:36.221Z", "media_completed_at": "2026-04-21T03:11:36.221Z", "scene_media_completed": true}}, "visited_scenes": ["timeline", "scene-media", "scene-media-1", "scene-media-2", "scene-media-3", "scene-media-4", "scene-media-5"], "interaction_results": [{"at": "2026-04-21T03:10:19.424Z", "scene_id": "scene-media-4", "choice_id": "scene-media-4-choice-1", "is_correct": false, "interaction_id": "scene-media-4-question"}, {"at": "2026-04-21T03:10:29.393Z", "scene_id": "scene-media-4", "choice_id": "scene-media-4-choice-2", "is_correct": true, "interaction_id": "scene-media-4-question"}]}	100	{"score": 1.0, "correct": 1, "attempted": 2, "max_score": 1.0, "retry_count": 1, "total_score": 1.0, "wrong_count": 1, "correct_count": 1, "branch_history": [{"at": "2026-04-21T03:07:11.764Z", "reason": "timeline_card_click", "card_id": "card-scene-media", "to_scene_id": "scene-media", "from_scene_id": "timeline"}, {"at": "2026-04-21T03:07:28.854Z", "reason": "default_next", "to_scene_id": "scene-media-1", "from_scene_id": "scene-media"}, {"at": "2026-04-21T03:10:05.924Z", "reason": "default_next", "to_scene_id": "scene-media-2", "from_scene_id": "scene-media-1"}, {"at": "2026-04-21T03:10:09.943Z", "reason": "default_next", "to_scene_id": "scene-media-3", "from_scene_id": "scene-media-2"}, {"at": "2026-04-21T03:10:10.809Z", "reason": "default_next", "to_scene_id": "scene-media-4", "from_scene_id": "scene-media-3"}, {"at": "2026-04-21T03:10:32.176Z", "reason": "interaction_continue", "to_scene_id": "scene-media-5", "from_scene_id": "scene-media-4", "interaction_id": "scene-media-4-question"}], "completed_scene_count": 7}	2026-04-21 03:07:07.8822	2026-04-21 10:11:42.294504	2026-04-21 10:11:42.294509
fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	69ec02b5-5e30-489f-812f-cbf979da050e	dfd94943-ea95-4316-b5bf-0d3cd704b120	\N	1	{"title": "Câu bé thông minh", "scenes": [{"id": "timeline", "next": null, "type": "timeline", "title": "Tổng quan câu chuyện", "assets": [], "content": {"text": "Tiếp theo đây, bạn sẽ được tìm hiểu câu chuyện \\"Cậu bé thông minh\\". Hãy cùng mình hoàn thiện câu truyện nhé!", "cards": [{"id": "card-scene-media", "title": "Nội dung mới", "image_url": "", "description": "Mô tả ngắn cho nội dung này.", "order_index": 1, "target_scene_id": "scene-media"}, {"id": "card-scene-media-1", "title": "Nội dung mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740005/eduhub/interactive-books/file_rvgokl.jpg", "description": "Mô tả ngắn cho nội dung này.", "order_index": 2, "target_scene_id": "scene-media-1"}, {"id": "card-scene-media-2", "title": "Nội dung mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740053/eduhub/interactive-books/file_xitcs1.jpg", "description": "Mô tả ngắn cho nội dung này.", "order_index": 3, "target_scene_id": "scene-media-2"}, {"id": "card-scene-media-3", "title": "Nội dung mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740133/eduhub/interactive-books/file_i4dxaf.jpg", "description": "Mô tả ngắn cho nội dung này.", "order_index": 4, "target_scene_id": "scene-media-3"}, {"id": "card-scene-media-4", "title": "Nội dung mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740173/eduhub/interactive-books/file_vqpkkx.jpg", "description": "Mô tả ngắn cho nội dung này.", "order_index": 5, "target_scene_id": "scene-media-4"}, {"id": "card-scene-media-5", "title": "Nội dung mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740667/eduhub/interactive-books/file_ko5ohc.jpg", "description": "Mô tả ngắn cho nội dung này.", "order_index": 6, "target_scene_id": "scene-media-5"}], "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776739863/eduhub/interactive-books/file_sx35dg.jpg", "sync_from_scenes": true}, "interactions": []}, {"id": "scene-media", "next": null, "type": "media", "title": "Giới thiệu câu chuyện", "assets": [], "content": {"text": "Nỗi lo âu của vua quan", "autoplay": true, "image_url": "", "video_url": "https://res.cloudinary.com/dxesd2zjo/video/upload/v1776739604/eduhub/interactive-books/file_vbch5l.mp4", "media_kind": "video", "poster_url": "", "question_enabled": false, "background_audio_url": ""}, "interactions": []}, {"id": "scene-media-1", "next": null, "type": "media", "title": "Gặp gỡ", "assets": [], "content": {"text": "Ông quan gặp gỡ hai bố con nọ", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740005/eduhub/interactive-books/file_rvgokl.jpg", "video_url": "", "media_kind": "image", "poster_url": "", "question_enabled": false, "background_audio_url": "https://res.cloudinary.com/dxesd2zjo/video/upload/v1776740009/eduhub/interactive-books/file_yp7oo7.mp3"}, "interactions": []}, {"id": "scene-media-2", "next": null, "type": "media", "title": "đặt câu hỏi", "assets": [], "content": {"text": "Ông quan đặt câu hỏi cho hai cha con", "layers": [{"x": 13.508620689655173, "y": 13.660273175586685, "id": "layer-text-1776740056160-1", "text": "Này, lão kia! Trâu của lão cày một ngày được mấy đường?", "type": "text", "width": 30, "height": 14, "z_index": 1, "visibility_rule": {"trigger": "after_media_time"}}], "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740053/eduhub/interactive-books/file_xitcs1.jpg", "video_url": "", "media_kind": "image", "poster_url": "", "question_enabled": false, "background_audio_url": "https://res.cloudinary.com/dxesd2zjo/video/upload/v1776740103/eduhub/interactive-books/file_addekc.mp3"}, "interactions": []}, {"id": "scene-media-3", "next": null, "type": "media", "title": "Ông bố ấp úng", "assets": [], "content": {"text": "Đây quả là một câu hỏi khó cho hai cha con", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740133/eduhub/interactive-books/file_i4dxaf.jpg", "video_url": "", "media_kind": "image", "poster_url": "", "question_enabled": false, "background_audio_url": ""}, "interactions": []}, {"id": "scene-media-4", "next": null, "type": "media", "title": "Câu hỏi cho bạn", "assets": [], "content": {"text": "Cùng trả lời câu hỏi nhé", "layers": [{"x": 5.606324031435211, "y": 17.108560730214318, "id": "layer-text-1776740195715-1", "text": "Theo bạn, trâu nhà tôi cày một ngày được mấy đường?", "type": "text", "width": 26, "height": 14, "z_index": 1, "visibility_rule": {"trigger": "always"}}], "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740173/eduhub/interactive-books/file_vqpkkx.jpg", "video_url": "", "media_kind": "image", "poster_url": "", "question_enabled": true, "background_audio_url": "https://res.cloudinary.com/dxesd2zjo/video/upload/v1776740277/eduhub/interactive-books/file_zfk8lz.mp3", "question_interaction_id": "scene-media-4-question"}, "interactions": [{"id": "scene-media-4-question", "data": {"wrong_feedback_message": "Chưa đúng đâu, hãy thử lại nhé.", "correct_feedback_message": "Chính  xác, bạn giỏi lắm!"}, "type": "multiple_choice", "prompt": "Theo bạn, trâu nhà tôi cày một ngày được mấy đường?", "choices": [{"id": "scene-media-4-choice-1", "label": "Dạ bẩm quan... Trâu nhà tôi 1 ngày cày được 100 đường.", "retry": true, "feedback": "Chưa đúng đâu, hãy thử lại nhé.", "is_correct": false, "score_delta": null, "target_scene_id": null, "feedback_audio_url": null, "feedback_image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740471/eduhub/interactive-books/file_estqv3.jpg"}, {"id": "scene-media-4-choice-2", "label": "Dạ bẩm quan, vậy cho con hỏi ngựa của ngài 1 ngày đi được mấy bước?", "retry": false, "feedback": "Chính  xác, bạn giỏi lắm!", "is_correct": true, "score_delta": 1.0, "target_scene_id": null, "feedback_audio_url": null, "feedback_image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740595/eduhub/interactive-books/file_jwjk0g.jpg"}], "trigger": "on_enter", "timecode": null, "target_scene_id": null}]}, {"id": "scene-media-5", "next": null, "type": "media", "title": "Nội dung mới", "assets": [], "content": {"text": "Mô tả ngắn cho nội dung này.", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740667/eduhub/interactive-books/file_ko5ohc.jpg", "video_url": "", "media_kind": "image", "poster_url": "", "question_enabled": false, "background_audio_url": "https://res.cloudinary.com/dxesd2zjo/video/upload/v1776740697/eduhub/interactive-books/file_qa3chr.mp3"}, "interactions": []}], "metadata": {"theme": "storytelling", "sync_timeline_cards": true}, "entry_scene_id": "timeline"}	completed	scene-media-5	{"derived_score": {"score": 0.0, "correct": 0, "attempted": 1, "max_score": 1.0, "retry_count": 0, "total_score": 0.0, "wrong_count": 1, "correct_count": 0, "branch_history": [{"at": "2026-04-21T03:11:52.587Z", "reason": "timeline_card_click", "card_id": "card-scene-media", "to_scene_id": "scene-media", "from_scene_id": "timeline"}, {"at": "2026-04-21T03:11:53.883Z", "reason": "default_next", "to_scene_id": "scene-media-1", "from_scene_id": "scene-media"}, {"at": "2026-04-21T03:12:08.030Z", "reason": "default_next", "to_scene_id": "scene-media-2", "from_scene_id": "scene-media-1"}, {"at": "2026-04-21T03:12:16.367Z", "reason": "default_next", "to_scene_id": "scene-media-3", "from_scene_id": "scene-media-2"}, {"at": "2026-04-21T03:12:21.457Z", "reason": "default_next", "to_scene_id": "scene-media-4", "from_scene_id": "scene-media-3"}, {"at": "2026-04-21T03:12:36.202Z", "reason": "default_next", "to_scene_id": "scene-media-5", "from_scene_id": "scene-media-4"}], "completed_scene_count": 7}, "retry_history": [], "branch_history": [{"at": "2026-04-21T03:11:52.587Z", "reason": "timeline_card_click", "card_id": "card-scene-media", "to_scene_id": "scene-media", "from_scene_id": "timeline"}, {"at": "2026-04-21T03:11:53.883Z", "reason": "default_next", "to_scene_id": "scene-media-1", "from_scene_id": "scene-media"}, {"at": "2026-04-21T03:12:08.030Z", "reason": "default_next", "to_scene_id": "scene-media-2", "from_scene_id": "scene-media-1"}, {"at": "2026-04-21T03:12:16.367Z", "reason": "default_next", "to_scene_id": "scene-media-3", "from_scene_id": "scene-media-2"}, {"at": "2026-04-21T03:12:21.457Z", "reason": "default_next", "to_scene_id": "scene-media-4", "from_scene_id": "scene-media-3"}, {"at": "2026-04-21T03:12:36.202Z", "reason": "default_next", "to_scene_id": "scene-media-5", "from_scene_id": "scene-media-4"}], "media_progress": {"scene-media-2": {"ended_at": "2026-04-21T03:12:14.291Z", "media_completed_at": "2026-04-21T03:12:14.291Z", "scene_media_completed": true}, "scene-media-4": {"ended_at": "2026-04-21T03:12:32.467Z", "media_completed_at": "2026-04-21T03:12:32.467Z", "scene_media_completed": true, "handled_interaction_ids": ["scene-media-4-question"]}}, "visited_scenes": ["timeline", "scene-media", "scene-media-1", "scene-media-2", "scene-media-3", "scene-media-4", "scene-media-5"], "interaction_results": [{"at": "2026-04-21T03:12:26.278Z", "scene_id": "scene-media-4", "choice_id": "scene-media-4-choice-1", "is_correct": false, "interaction_id": "scene-media-4-question"}]}	100	{"score": 0.0, "correct": 0, "attempted": 1, "max_score": 1.0, "retry_count": 0, "total_score": 0.0, "wrong_count": 1, "correct_count": 0, "branch_history": [{"at": "2026-04-21T03:11:52.587Z", "reason": "timeline_card_click", "card_id": "card-scene-media", "to_scene_id": "scene-media", "from_scene_id": "timeline"}, {"at": "2026-04-21T03:11:53.883Z", "reason": "default_next", "to_scene_id": "scene-media-1", "from_scene_id": "scene-media"}, {"at": "2026-04-21T03:12:08.030Z", "reason": "default_next", "to_scene_id": "scene-media-2", "from_scene_id": "scene-media-1"}, {"at": "2026-04-21T03:12:16.367Z", "reason": "default_next", "to_scene_id": "scene-media-3", "from_scene_id": "scene-media-2"}, {"at": "2026-04-21T03:12:21.457Z", "reason": "default_next", "to_scene_id": "scene-media-4", "from_scene_id": "scene-media-3"}, {"at": "2026-04-21T03:12:36.202Z", "reason": "default_next", "to_scene_id": "scene-media-5", "from_scene_id": "scene-media-4"}], "completed_scene_count": 7}	2026-04-21 03:07:07.881317	2026-04-21 10:12:38.287641	2026-04-21 10:12:38.287649
\.


--
-- Data for Name: interactive_book_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.interactive_book_events (id, attempt_id, scene_id, event_type, payload, created_at) FROM stdin;
8863a83d-55e8-44ca-bbb4-6fef80f8b865	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media-5	scene_entered	{"scene_type": "media"}	2026-04-21 03:11:42.097149
09077dc5-4646-44d9-be79-12603f2b02f4	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media-5	background_audio_started	{"reason": "auto", "trigger": "on_enter"}	2026-04-21 03:11:42.097149
0620565f-1d3c-44e2-8406-281e9c8fff43	42f0e859-8e2d-4c4e-abe1-fb5503246a95	timeline	scene_entered	{"scene_type": "timeline"}	2026-04-21 01:39:39.546698
1ca0ad40-0604-4fea-9103-ce45cfe0b356	42f0e859-8e2d-4c4e-abe1-fb5503246a95	timeline	scene_entered	{"scene_type": "timeline"}	2026-04-21 01:39:49.567383
b4dcc5d2-9468-4356-8ebf-22596d42fc34	42f0e859-8e2d-4c4e-abe1-fb5503246a95	scene-interactive-video	scene_transition	{"to": "scene-interactive-video", "from": "timeline", "reason": "default_next"}	2026-04-21 01:39:49.567383
e42aed3f-c1a5-4753-938c-c2a98c11c3c3	42f0e859-8e2d-4c4e-abe1-fb5503246a95	scene-interactive-video	scene_entered	{"scene_type": "interactive_video"}	2026-04-21 01:39:49.567383
73467c44-a8b4-4e75-b397-3fdaa0fbdc31	42f0e859-8e2d-4c4e-abe1-fb5503246a95	scene-quiz	scene_transition	{"to": "scene-quiz", "from": "scene-interactive-video", "reason": "default_next"}	2026-04-21 01:39:59.563284
d6e9078e-501b-48a5-8b0a-a7fb3c6a4d1e	42f0e859-8e2d-4c4e-abe1-fb5503246a95	scene-quiz	scene_entered	{"scene_type": "quiz"}	2026-04-21 01:39:59.563284
0711daa4-3d7a-4ffe-9054-b313cf895f42	42f0e859-8e2d-4c4e-abe1-fb5503246a95	scene-quiz	choice_selected	{"correct": true, "choice_id": "scene-quiz-choice-1", "interaction_id": "scene-quiz-quiz"}	2026-04-21 01:39:59.563284
32ab904d-fa52-44cb-9c57-32e0a14c90b5	42f0e859-8e2d-4c4e-abe1-fb5503246a95	scene-quiz	answer_correct	{"choice_id": "scene-quiz-choice-1", "score_delta": 1, "interaction_id": "scene-quiz-quiz"}	2026-04-21 01:39:59.563284
42258661-8955-4e3e-96f7-6c8e29f2170e	42f0e859-8e2d-4c4e-abe1-fb5503246a95	scene-branching	scene_transition	{"to": "scene-branching", "from": "scene-quiz", "reason": "interaction_continue", "interaction_id": "scene-quiz-quiz"}	2026-04-21 01:39:59.563284
bf5b06e9-f530-432f-8a84-5b5754058084	42f0e859-8e2d-4c4e-abe1-fb5503246a95	scene-branching	scene_entered	{"scene_type": "branching"}	2026-04-21 01:39:59.563284
2005df28-73f3-4322-80a8-0febe856f999	42f0e859-8e2d-4c4e-abe1-fb5503246a95	scene-branching	choice_selected	{"correct": false, "choice_id": "scene-branching-choice-1", "interaction_id": "scene-branching-branch"}	2026-04-21 01:40:09.561996
49e5d843-a92a-495f-ade5-e5fd99086933	42f0e859-8e2d-4c4e-abe1-fb5503246a95	scene-branching	answer_wrong	{"choice_id": "scene-branching-choice-1", "score_delta": 0, "interaction_id": "scene-branching-branch"}	2026-04-21 01:40:09.561996
b7719db9-3da5-4c5c-b0fd-b70644e50d02	42f0e859-8e2d-4c4e-abe1-fb5503246a95	scene-quiz	scene_backtrack	{"to": "scene-quiz"}	2026-04-21 01:40:39.561553
6fff5f1b-4555-4303-a3c8-e9090d87840b	42f0e859-8e2d-4c4e-abe1-fb5503246a95	scene-quiz	scene_entered	{"scene_type": "quiz"}	2026-04-21 01:40:39.561553
99ee65f9-d602-4af9-9396-545618df30df	42f0e859-8e2d-4c4e-abe1-fb5503246a95	scene-quiz	choice_selected	{"correct": false, "choice_id": "scene-quiz-choice-2", "interaction_id": "scene-quiz-quiz"}	2026-04-21 01:40:49.547808
cb29bb94-1a3c-41e1-aa5e-44f0292e8612	42f0e859-8e2d-4c4e-abe1-fb5503246a95	scene-quiz	answer_wrong	{"choice_id": "scene-quiz-choice-2", "score_delta": 1, "interaction_id": "scene-quiz-quiz"}	2026-04-21 01:40:49.547808
11126bf4-ce52-4e14-b2ae-394be32bdc86	42f0e859-8e2d-4c4e-abe1-fb5503246a95	scene-interactive-video	scene_backtrack	{"to": "scene-interactive-video"}	2026-04-21 01:40:59.550929
2163b9ef-cf5c-4424-89a1-d698f6522622	42f0e859-8e2d-4c4e-abe1-fb5503246a95	scene-interactive-video	scene_entered	{"scene_type": "interactive_video"}	2026-04-21 01:40:59.550929
91389996-f1f2-4829-9417-b0ffbc885a7b	42f0e859-8e2d-4c4e-abe1-fb5503246a95	scene-quiz	scene_transition	{"to": "scene-quiz", "from": "scene-interactive-video", "reason": "default_next"}	2026-04-21 01:40:59.550929
91aac070-2683-48f0-92c1-fb9894bd0afe	42f0e859-8e2d-4c4e-abe1-fb5503246a95	scene-quiz	scene_entered	{"scene_type": "quiz"}	2026-04-21 01:40:59.550929
63876cfd-c13f-4a16-a472-3b6e6773a79c	42f0e859-8e2d-4c4e-abe1-fb5503246a95	scene-quiz	choice_selected	{"correct": true, "choice_id": "scene-quiz-choice-1", "interaction_id": "scene-quiz-quiz"}	2026-04-21 01:41:09.442789
64d92fd9-5394-4193-8341-70253fb15198	42f0e859-8e2d-4c4e-abe1-fb5503246a95	scene-quiz	answer_correct	{"choice_id": "scene-quiz-choice-1", "score_delta": 1, "interaction_id": "scene-quiz-quiz"}	2026-04-21 01:41:09.442789
13d305b9-d0e2-420f-b729-61288fae38bb	42f0e859-8e2d-4c4e-abe1-fb5503246a95	scene-branching	scene_transition	{"to": "scene-branching", "from": "scene-quiz", "reason": "interaction_continue", "interaction_id": "scene-quiz-quiz"}	2026-04-21 01:41:09.442789
5ff24e99-a0ad-4e67-8ff8-b2d3b569936f	42f0e859-8e2d-4c4e-abe1-fb5503246a95	scene-branching	scene_entered	{"scene_type": "branching"}	2026-04-21 01:41:09.442789
0fe52313-0fe8-45da-b656-76c622884f73	42f0e859-8e2d-4c4e-abe1-fb5503246a95	scene-branching	choice_selected	{"correct": true, "choice_id": "scene-branching-choice-2", "interaction_id": "scene-branching-branch"}	2026-04-21 01:41:09.442789
8417eab2-24e9-4af8-ae4e-722f67ad5c97	42f0e859-8e2d-4c4e-abe1-fb5503246a95	scene-branching	answer_correct	{"choice_id": "scene-branching-choice-2", "score_delta": 1, "interaction_id": "scene-branching-branch"}	2026-04-21 01:41:09.442789
835a9014-6415-4bee-bbd2-15acaa20254f	42f0e859-8e2d-4c4e-abe1-fb5503246a95	scene-branching	book_completed	{"title": "Sách tương tác mới", "retry_count": 0, "total_score": 4, "wrong_count": 2, "completion_percent": 100}	2026-04-21 01:41:09.442789
7877350e-7c61-4035-a40d-e4d518662c8a	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	timeline	scene_entered	{"scene_type": "timeline"}	2026-04-21 03:07:08.065439
b833c56e-5842-4a92-99e1-34f88a48d1d2	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	timeline	scene_entered	{"scene_type": "timeline"}	2026-04-21 03:07:14.467447
9dfcb8e9-08c8-400e-b3b9-147d150432a9	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media	scene_transition	{"to": "scene-media", "from": "timeline", "reason": "timeline_card_click", "card_id": "card-scene-media"}	2026-04-21 03:07:14.467447
a7b2544f-6759-4e02-b2ca-fb3106fa8f83	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media	scene_entered	{"scene_type": "media"}	2026-04-21 03:07:14.467447
8d6dbaf4-e49d-4e5c-99ac-4d3ad1cf0b06	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media	resume_from_local	{"saved_at": "2026-04-21T03:07:11.772Z"}	2026-04-21 03:07:15.407795
606b78c9-199a-4e4a-9c70-d251932cf9b0	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media	scene_entered	{"scene_type": "media"}	2026-04-21 03:07:25.410664
65e15305-dd8e-4b8c-8a98-f1497adbdeea	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media	video_ended	{"scene_id": "scene-media"}	2026-04-21 03:07:35.404877
6c78d5c8-8922-4865-a240-63133c08ad6b	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media-1	scene_transition	{"to": "scene-media-1", "from": "scene-media", "reason": "default_next"}	2026-04-21 03:07:35.404877
478a8a71-00ea-4749-ada0-425fdd61b0be	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media-1	scene_entered	{"scene_type": "media"}	2026-04-21 03:07:35.404877
c5d9d171-c257-472f-a9dc-2512489d8dcd	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media-2	scene_transition	{"to": "scene-media-2", "from": "scene-media-1", "reason": "default_next"}	2026-04-21 03:10:15.419193
593249cc-f460-4c40-93c5-05d16561d3af	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media-2	scene_entered	{"scene_type": "media"}	2026-04-21 03:10:15.419193
f9d4e2e1-2ff8-4057-ad14-5b87b38d0eaf	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media-5	scene_entered	{"scene_type": "media"}	2026-04-21 03:11:16.935084
0985b88b-06d2-42ce-9fd7-467fced32728	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media-3	scene_transition	{"to": "scene-media-3", "from": "scene-media-2", "reason": "default_next"}	2026-04-21 03:10:15.419193
613ac495-58ee-4169-8cab-20d0443dea26	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media-3	scene_entered	{"scene_type": "media"}	2026-04-21 03:10:15.419193
ccfb86b8-014f-45d9-8b42-b0e9073aa565	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media-4	scene_transition	{"to": "scene-media-4", "from": "scene-media-3", "reason": "default_next"}	2026-04-21 03:10:15.419193
1aa9c80f-d6ca-42f2-afe0-15520f8715fa	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media-4	scene_entered	{"scene_type": "media"}	2026-04-21 03:10:15.419193
8ffae5f3-38c0-4aa5-969e-510812c1f0b8	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media-4	interaction_opened_after_media	{"interaction_id": "scene-media-4-question"}	2026-04-21 03:10:15.419193
40799328-0eeb-4756-b692-8fdfbb7f6079	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media-5	resume_from_local	{"saved_at": "2026-04-21T03:10:56.913Z"}	2026-04-21 03:11:05.925129
68acdd34-1183-47b0-bf28-5218c9aa3e2c	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media-5	scene_entered	{"scene_type": "media"}	2026-04-21 03:11:16.908594
30ec60df-e3a6-40dd-8cd3-05332507b193	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media-4	choice_selected	{"correct": false, "choice_id": "scene-media-4-choice-1", "interaction_id": "scene-media-4-question"}	2026-04-21 03:10:25.42192
beb85870-230d-4bc9-934f-a4f1847c2a8f	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media-4	answer_wrong	{"choice_id": "scene-media-4-choice-1", "score_delta": 0, "interaction_id": "scene-media-4-question"}	2026-04-21 03:10:25.42192
3b727e4f-5e3a-4abe-ae99-65942d6b827c	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media-4	retry_clicked	{"at": "2026-04-21T03:10:28.351Z", "scene_id": "scene-media-4", "interaction_id": "scene-media-4-question"}	2026-04-21 03:10:35.433547
8da8214e-b4ce-4bca-929c-81c632c82a58	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media-4	choice_selected	{"correct": true, "choice_id": "scene-media-4-choice-2", "interaction_id": "scene-media-4-question"}	2026-04-21 03:10:35.433547
62c97083-8d16-4404-ad85-ca2c699a20a1	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media-4	answer_correct	{"choice_id": "scene-media-4-choice-2", "score_delta": 1, "interaction_id": "scene-media-4-question"}	2026-04-21 03:10:35.433547
bf3af32e-36c8-4e13-b882-b1c2fe469284	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media-5	scene_transition	{"to": "scene-media-5", "from": "scene-media-4", "reason": "interaction_continue", "interaction_id": "scene-media-4-question"}	2026-04-21 03:10:35.433547
fef0dc28-e72a-473f-a5f2-3a226be53ad4	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media-5	scene_entered	{"scene_type": "media"}	2026-04-21 03:10:35.433547
68dcf110-7fc2-40ec-af5a-15590f13d7cd	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media-5	scene_entered	{"scene_type": "media"}	2026-04-21 03:10:56.925968
4d7baace-a2e1-488e-8fac-48b146d40a3f	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media-5	scene_entered	{"scene_type": "media"}	2026-04-21 03:11:05.924955
2dd0ba36-045b-4025-8279-80862bb4e594	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media-5	resume_from_local	{"saved_at": "2026-04-21T03:11:16.924Z"}	2026-04-21 03:11:32.955038
5a026ce0-8909-4f46-8630-e7e8ecec4cd6	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media-5	scene_entered	{"scene_type": "media"}	2026-04-21 03:11:42.315023
e46f0a8f-a819-4d9b-b6e2-e1ce770052b4	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media-5	background_audio_started	{"reason": "auto", "trigger": "on_enter"}	2026-04-21 03:11:42.315023
e406ff24-9951-4bdc-a73f-850a6668257a	4fcd63d4-fa18-4f7d-a606-c17642e37f8c	scene-media-5	book_completed	{"title": "Câu bé thông minh", "retry_count": 1, "total_score": 1, "wrong_count": 1, "completion_percent": 100}	2026-04-21 03:11:42.315023
5dfc2c9e-1503-407c-b09d-829c61a38df4	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	timeline	resume_from_local	{"saved_at": "2026-04-21T03:07:08.058Z"}	2026-04-21 03:11:48.542656
af776678-2105-4428-a32f-f00007d7fee5	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	timeline	scene_entered	{"scene_type": "timeline"}	2026-04-21 03:11:58.439676
173eb4a2-a7e3-43dd-9b8e-d95d738502ce	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media	scene_transition	{"to": "scene-media", "from": "timeline", "reason": "timeline_card_click", "card_id": "card-scene-media"}	2026-04-21 03:11:58.439676
31634fbf-c796-4624-a144-250f50591656	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media	scene_entered	{"scene_type": "media"}	2026-04-21 03:11:58.439676
de63c5dd-5f1e-46cc-bcfc-3920bcf196c5	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media-1	scene_transition	{"to": "scene-media-1", "from": "scene-media", "reason": "default_next"}	2026-04-21 03:11:58.439676
a4d7485e-f5ec-4587-adb0-e57b5816157d	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media-1	scene_entered	{"scene_type": "media"}	2026-04-21 03:11:58.439676
d19a990b-c47a-4b9a-b301-8affd9350808	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media-1	background_audio_started	{"reason": "auto", "trigger": "on_enter"}	2026-04-21 03:11:58.439676
d02c5546-e5af-48ef-8fbf-34c8f7db5815	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	timeline	scene_entered	{"scene_type": "timeline"}	2026-04-21 03:11:58.46785
648e2b3a-6bd0-4ba0-8d5b-42bb31fde8d2	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media	scene_transition	{"to": "scene-media", "from": "timeline", "reason": "timeline_card_click", "card_id": "card-scene-media"}	2026-04-21 03:11:58.46785
b612bb34-f550-4279-9fff-c05bd342424d	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media	scene_entered	{"scene_type": "media"}	2026-04-21 03:11:58.46785
cb773281-c6d8-4fad-8126-e7bf9480741c	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media-1	scene_transition	{"to": "scene-media-1", "from": "scene-media", "reason": "default_next"}	2026-04-21 03:11:58.46785
01a58743-3842-4d2a-bc20-71bf7bc832a9	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media-1	scene_entered	{"scene_type": "media"}	2026-04-21 03:11:58.46785
23b31a88-6ce4-4f7a-a7c0-f7940ceb0844	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media-1	background_audio_started	{"reason": "auto", "trigger": "on_enter"}	2026-04-21 03:11:58.46785
b5418db0-58ba-4e96-acfb-ae775087af69	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media-1	scene_entered	{"scene_type": "media"}	2026-04-21 03:11:58.46785
c5c7430d-4bdc-4276-9fef-f4c69821ea12	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media-1	background_audio_started	{"reason": "auto", "trigger": "on_enter"}	2026-04-21 03:11:58.46785
6d72125f-7831-4f8b-a9ac-fa972c0f0575	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media-1	scene_entered	{"scene_type": "media"}	2026-04-21 03:12:10.245621
1dccd81f-1d2d-46e8-90ae-15eaaae25871	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media-1	background_audio_started	{"reason": "auto", "trigger": "on_enter"}	2026-04-21 03:12:10.245621
f5995fdc-db4d-4714-8939-ef953d014dc3	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media-2	scene_transition	{"to": "scene-media-2", "from": "scene-media-1", "reason": "default_next"}	2026-04-21 03:12:10.245621
888b3cea-79bd-478a-87d4-494a9e010bc4	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media-2	scene_entered	{"scene_type": "media"}	2026-04-21 03:12:10.245621
6525a68e-d0d6-42d8-be55-2306cda8e305	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media-2	background_audio_started	{"reason": "auto", "trigger": "on_enter"}	2026-04-21 03:12:10.245621
d1c7b433-887a-4522-b11f-3d4defd8e3b4	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media-2	scene_entered	{"scene_type": "media"}	2026-04-21 03:12:20.255874
bf593f0b-4566-4d4b-b2ce-bb0504efb826	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media-2	background_audio_started	{"reason": "auto", "trigger": "on_enter"}	2026-04-21 03:12:20.255874
ded562e5-1d71-489f-90cf-9c70d91dcb01	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media-3	scene_transition	{"to": "scene-media-3", "from": "scene-media-2", "reason": "default_next"}	2026-04-21 03:12:20.255874
540d78a3-efa6-4125-9a19-9b18fa171cec	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media-3	scene_entered	{"scene_type": "media"}	2026-04-21 03:12:20.255874
0cd3f4db-342c-433e-b639-793becbb583f	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media-4	scene_transition	{"to": "scene-media-4", "from": "scene-media-3", "reason": "default_next"}	2026-04-21 03:12:29.445274
ca9a35a5-8ed3-4cd0-80d5-039dde9c3857	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media-4	scene_entered	{"scene_type": "media"}	2026-04-21 03:12:29.445274
cc5d4661-bb03-4718-8921-13ab8cd0d2ba	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media-4	background_audio_started	{"reason": "auto", "trigger": "on_enter"}	2026-04-21 03:12:29.445274
2c76a738-0a73-435b-9755-fbe38bbfd6bb	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media-4	interaction_opened_after_media	{"interaction_id": "scene-media-4-question"}	2026-04-21 03:12:29.445274
064944d1-9833-4c61-a091-838ead1816f5	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media-4	choice_selected	{"correct": false, "choice_id": "scene-media-4-choice-1", "interaction_id": "scene-media-4-question"}	2026-04-21 03:12:29.445274
579746d2-9c6b-4071-a2b5-fdb24272c039	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media-4	answer_wrong	{"choice_id": "scene-media-4-choice-1", "score_delta": 0, "interaction_id": "scene-media-4-question"}	2026-04-21 03:12:29.445274
1ed61a4e-e7af-43df-bf1d-466df729a93e	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media-4	scene_entered	{"scene_type": "media"}	2026-04-21 03:12:38.315485
4a509f83-2a19-47d2-b546-0a386ea8e54f	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media-4	background_audio_started	{"reason": "auto", "trigger": "on_enter"}	2026-04-21 03:12:38.315485
0a06d4d4-cb6b-4bde-9850-050aa28e27a2	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media-5	scene_transition	{"to": "scene-media-5", "from": "scene-media-4", "reason": "default_next"}	2026-04-21 03:12:38.315485
c1cfdc5e-5e99-484e-af3b-82ecd6d38899	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media-5	scene_entered	{"scene_type": "media"}	2026-04-21 03:12:38.315485
2aeef513-8346-4f56-9d01-4b49cf1e299d	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media-5	background_audio_started	{"reason": "auto", "trigger": "on_enter"}	2026-04-21 03:12:38.315485
67c7e7fc-cd72-45a3-ab18-9723b55ce52b	fbd6c71a-f8f3-4bec-8bfd-a004721df3ea	scene-media-5	book_completed	{"title": "Câu bé thông minh", "retry_count": 0, "total_score": 0, "wrong_count": 1, "completion_percent": 100}	2026-04-21 03:12:38.315485
\.


--
-- Data for Name: interactive_book_media; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.interactive_book_media (id, interactive_book_id, media_key, media_type, url, thumbnail_url, duration, metadata_json, order_index, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: interactive_book_quiz_options; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.interactive_book_quiz_options (id, quiz_id, option_key, content, is_correct, order_index, feedback, feedback_audio_url, correct_action_key, wrong_action_key, next_scene_key, retry, score_delta, config_json, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: interactive_book_quizzes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.interactive_book_quizzes (id, interactive_book_id, quiz_key, question, quiz_type, config_json, order_index, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: interactive_book_scene_elements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.interactive_book_scene_elements (id, scene_id, element_key, element_type, media_id, quiz_id, action_id, order_index, config_json, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: interactive_book_scenes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.interactive_book_scenes (id, interactive_book_id, scene_key, title, scene_type, order_index, background_media_id, auto_play, content_json, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: interactive_book_transitions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.interactive_book_transitions (id, scene_id, trigger_type, condition_json, next_scene_key, action_key, order_index, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: interactive_book_video_interactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.interactive_book_video_interactions (id, scene_id, interaction_key, "timestamp", prompt, config_json, order_index, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: interactive_book_video_options; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.interactive_book_video_options (id, interaction_id, option_key, label, next_scene_key, is_correct, retry, order_index, feedback, feedback_audio_url, action_key, score_delta, config_json, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: interactive_books; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.interactive_books (id, material_id, status, draft_manifest, published_manifest, manifest_version, entry_scene_id, estimated_duration, created_by, published_at, created_at, updated_at) FROM stdin;
d79d3fef-c71a-4f30-b1f5-8a29944814d9	bb7e621c-3dab-4f26-b291-36ad8c32d56b	published	{"title": "Sách tương tác mới", "scenes": [{"id": "timeline", "next": null, "type": "timeline", "title": "Tổng quan câu chuyện", "assets": [], "content": {"text": "Đây là trang tổng quan. Giáo viên có thể chỉnh từng sự kiện ở cột bên trái, còn thẻ timeline sẽ tự đồng bộ theo thứ tự các sự kiện.", "cards": [{"id": "card-scene-interactive-video", "title": "Video tương tác mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529070/eduhub/interactive-books/file_khfmjk.jpg", "description": "Mô tả ngắn cho cảnh video này.", "order_index": 1, "target_scene_id": "scene-interactive-video"}, {"id": "card-scene-quiz", "title": "Câu hỏi mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529086/eduhub/interactive-books/file_gnqn9y.jpg", "description": "Câu hỏi để củng cố nội dung vừa học.", "order_index": 2, "target_scene_id": "scene-quiz"}, {"id": "card-scene-branching", "title": "Cảnh rẽ nhánh mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529188/eduhub/interactive-books/file_ncx3lw.jpg", "description": "Đưa ra các hướng lựa chọn để người học quyết định.", "order_index": 3, "target_scene_id": "scene-branching"}], "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776528554/eduhub/interactive-books/file_qjkc85.jpg", "sync_from_scenes": true}, "interactions": []}, {"id": "scene-interactive-video", "next": null, "type": "interactive_video", "title": "Gặp gỡ", "assets": [], "content": {"text": "là ý trời", "autoplay": false, "video_url": "https://res.cloudinary.com/dxesd2zjo/video/upload/v1776529268/eduhub/interactive-books/file_k99oa9.mp4", "poster_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529070/eduhub/interactive-books/file_khfmjk.jpg"}, "interactions": []}, {"id": "scene-quiz", "next": null, "type": "quiz", "title": "Câu hỏi mới", "assets": [], "content": {"text": "Câu hỏi để củng cố nội dung vừa học.", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529086/eduhub/interactive-books/file_gnqn9y.jpg", "background_audio_url": ""}, "interactions": [{"id": "scene-quiz-quiz", "data": {}, "type": "quiz", "prompt": "Nhập câu hỏi cho cảnh này", "choices": [{"id": "scene-quiz-choice-1", "label": "Đáp án đúng", "retry": false, "feedback": "Đúng", "is_correct": true, "score_delta": null, "target_scene_id": null, "feedback_audio_url": null, "feedback_image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529107/eduhub/interactive-books/file_sbz4zo.jpg"}, {"id": "scene-quiz-choice-2", "label": "Đáp án sai", "retry": true, "feedback": "worng boi", "is_correct": false, "score_delta": 1.0, "target_scene_id": null, "feedback_audio_url": null, "feedback_image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529139/eduhub/interactive-books/file_nf0u0h.jpg"}], "trigger": "on_enter", "timecode": null, "target_scene_id": null}]}, {"id": "scene-branching", "next": null, "type": "branching", "title": "bạn bị ngu không", "assets": [], "content": {"text": "tôi có ngu hay không", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529188/eduhub/interactive-books/file_ncx3lw.jpg", "background_audio_url": ""}, "interactions": [{"id": "scene-branching-branch", "data": {"wrong_feedback_message": "tôi có ngu", "correct_feedback_message": "tôi chưa kịp ngu"}, "type": "branching_prompt", "prompt": "b ngu à", "choices": [{"id": "scene-branching-choice-1", "label": "không", "retry": true, "feedback": "Chưa phù hợp, hãy cân nhắc lại.", "is_correct": false, "score_delta": null, "target_scene_id": null, "feedback_audio_url": null, "feedback_image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529239/eduhub/interactive-books/file_n6ykf1.jpg"}, {"id": "scene-branching-choice-2", "label": "đúng", "retry": false, "feedback": "Lựa chọn hợp lý.", "is_correct": true, "score_delta": 1.0, "target_scene_id": null, "feedback_audio_url": null, "feedback_image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529248/eduhub/interactive-books/file_obumyi.jpg"}], "trigger": "on_enter", "timecode": null, "target_scene_id": null}]}], "metadata": {"theme": "storytelling", "sync_timeline_cards": true}, "entry_scene_id": "timeline"}	{"title": "Sách tương tác mới", "scenes": [{"id": "timeline", "next": null, "type": "timeline", "title": "Tổng quan câu chuyện", "assets": [], "content": {"text": "Đây là trang tổng quan. Giáo viên có thể chỉnh từng sự kiện ở cột bên trái, còn thẻ timeline sẽ tự đồng bộ theo thứ tự các sự kiện.", "cards": [{"id": "card-scene-interactive-video", "title": "Video tương tác mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529070/eduhub/interactive-books/file_khfmjk.jpg", "description": "Mô tả ngắn cho cảnh video này.", "order_index": 1, "target_scene_id": "scene-interactive-video"}, {"id": "card-scene-quiz", "title": "Câu hỏi mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529086/eduhub/interactive-books/file_gnqn9y.jpg", "description": "Câu hỏi để củng cố nội dung vừa học.", "order_index": 2, "target_scene_id": "scene-quiz"}, {"id": "card-scene-branching", "title": "Cảnh rẽ nhánh mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529188/eduhub/interactive-books/file_ncx3lw.jpg", "description": "Đưa ra các hướng lựa chọn để người học quyết định.", "order_index": 3, "target_scene_id": "scene-branching"}], "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776528554/eduhub/interactive-books/file_qjkc85.jpg", "sync_from_scenes": true}, "interactions": []}, {"id": "scene-interactive-video", "next": null, "type": "interactive_video", "title": "Gặp gỡ", "assets": [], "content": {"text": "là ý trời", "autoplay": false, "video_url": "https://res.cloudinary.com/dxesd2zjo/video/upload/v1776529268/eduhub/interactive-books/file_k99oa9.mp4", "poster_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529070/eduhub/interactive-books/file_khfmjk.jpg"}, "interactions": []}, {"id": "scene-quiz", "next": null, "type": "quiz", "title": "Câu hỏi mới", "assets": [], "content": {"text": "Câu hỏi để củng cố nội dung vừa học.", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529086/eduhub/interactive-books/file_gnqn9y.jpg", "background_audio_url": ""}, "interactions": [{"id": "scene-quiz-quiz", "data": {}, "type": "quiz", "prompt": "Nhập câu hỏi cho cảnh này", "choices": [{"id": "scene-quiz-choice-1", "label": "Đáp án đúng", "retry": false, "feedback": "Đúng", "is_correct": true, "score_delta": null, "target_scene_id": null, "feedback_audio_url": null, "feedback_image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529107/eduhub/interactive-books/file_sbz4zo.jpg"}, {"id": "scene-quiz-choice-2", "label": "Đáp án sai", "retry": true, "feedback": "worng boi", "is_correct": false, "score_delta": 1.0, "target_scene_id": null, "feedback_audio_url": null, "feedback_image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529139/eduhub/interactive-books/file_nf0u0h.jpg"}], "trigger": "on_enter", "timecode": null, "target_scene_id": null}]}, {"id": "scene-branching", "next": null, "type": "branching", "title": "bạn bị ngu không", "assets": [], "content": {"text": "tôi có ngu hay không", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529188/eduhub/interactive-books/file_ncx3lw.jpg", "background_audio_url": ""}, "interactions": [{"id": "scene-branching-branch", "data": {"wrong_feedback_message": "tôi có ngu", "correct_feedback_message": "tôi chưa kịp ngu"}, "type": "branching_prompt", "prompt": "b ngu à", "choices": [{"id": "scene-branching-choice-1", "label": "không", "retry": true, "feedback": "Chưa phù hợp, hãy cân nhắc lại.", "is_correct": false, "score_delta": null, "target_scene_id": null, "feedback_audio_url": null, "feedback_image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529239/eduhub/interactive-books/file_n6ykf1.jpg"}, {"id": "scene-branching-choice-2", "label": "đúng", "retry": false, "feedback": "Lựa chọn hợp lý.", "is_correct": true, "score_delta": 1.0, "target_scene_id": null, "feedback_audio_url": null, "feedback_image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529248/eduhub/interactive-books/file_obumyi.jpg"}], "trigger": "on_enter", "timecode": null, "target_scene_id": null}]}], "metadata": {"theme": "storytelling", "sync_timeline_cards": true}, "entry_scene_id": "timeline"}	4	timeline	10	a41b8a54-b01e-4d53-ba95-2db48c948008	2026-04-18 23:33:15.169255	2026-04-18 16:21:17.212717	2026-04-18 16:33:15.160166
69ec02b5-5e30-489f-812f-cbf979da050e	a3f244fc-5c0b-48de-b614-c9ae86178250	published	{"title": "Câu bé thông minh", "scenes": [{"id": "timeline", "next": null, "type": "timeline", "title": "Tổng quan câu chuyện", "assets": [], "content": {"text": "Tiếp theo đây, bạn sẽ được tìm hiểu câu chuyện \\"Cậu bé thông minh\\". Hãy cùng mình hoàn thiện câu truyện nhé!", "cards": [{"id": "card-scene-media", "title": "Nội dung mới", "image_url": "", "description": "Mô tả ngắn cho nội dung này.", "order_index": 1, "target_scene_id": "scene-media"}, {"id": "card-scene-media-1", "title": "Nội dung mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740005/eduhub/interactive-books/file_rvgokl.jpg", "description": "Mô tả ngắn cho nội dung này.", "order_index": 2, "target_scene_id": "scene-media-1"}, {"id": "card-scene-media-2", "title": "Nội dung mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740053/eduhub/interactive-books/file_xitcs1.jpg", "description": "Mô tả ngắn cho nội dung này.", "order_index": 3, "target_scene_id": "scene-media-2"}, {"id": "card-scene-media-3", "title": "Nội dung mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740133/eduhub/interactive-books/file_i4dxaf.jpg", "description": "Mô tả ngắn cho nội dung này.", "order_index": 4, "target_scene_id": "scene-media-3"}, {"id": "card-scene-media-4", "title": "Nội dung mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740173/eduhub/interactive-books/file_vqpkkx.jpg", "description": "Mô tả ngắn cho nội dung này.", "order_index": 5, "target_scene_id": "scene-media-4"}, {"id": "card-scene-media-5", "title": "Nội dung mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740667/eduhub/interactive-books/file_ko5ohc.jpg", "description": "Mô tả ngắn cho nội dung này.", "order_index": 6, "target_scene_id": "scene-media-5"}], "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776739863/eduhub/interactive-books/file_sx35dg.jpg", "sync_from_scenes": true}, "interactions": []}, {"id": "scene-media", "next": null, "type": "media", "title": "Giới thiệu câu chuyện", "assets": [], "content": {"text": "Nỗi lo âu của vua quan", "autoplay": true, "image_url": "", "video_url": "https://res.cloudinary.com/dxesd2zjo/video/upload/v1776739604/eduhub/interactive-books/file_vbch5l.mp4", "media_kind": "video", "poster_url": "", "question_enabled": false, "background_audio_url": ""}, "interactions": []}, {"id": "scene-media-1", "next": null, "type": "media", "title": "Gặp gỡ", "assets": [], "content": {"text": "Ông quan gặp gỡ hai bố con nọ", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740005/eduhub/interactive-books/file_rvgokl.jpg", "video_url": "", "media_kind": "image", "poster_url": "", "question_enabled": false, "background_audio_url": "https://res.cloudinary.com/dxesd2zjo/video/upload/v1776740009/eduhub/interactive-books/file_yp7oo7.mp3"}, "interactions": []}, {"id": "scene-media-2", "next": null, "type": "media", "title": "đặt câu hỏi", "assets": [], "content": {"text": "Ông quan đặt câu hỏi cho hai cha con", "layers": [{"x": 13.508620689655173, "y": 13.660273175586685, "id": "layer-text-1776740056160-1", "text": "Này, lão kia! Trâu của lão cày một ngày được mấy đường?", "type": "text", "width": 30, "height": 14, "z_index": 1, "visibility_rule": {"trigger": "after_media_time"}}], "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740053/eduhub/interactive-books/file_xitcs1.jpg", "video_url": "", "media_kind": "image", "poster_url": "", "question_enabled": false, "background_audio_url": "https://res.cloudinary.com/dxesd2zjo/video/upload/v1776740103/eduhub/interactive-books/file_addekc.mp3"}, "interactions": []}, {"id": "scene-media-3", "next": null, "type": "media", "title": "Ông bố ấp úng", "assets": [], "content": {"text": "Đây quả là một câu hỏi khó cho hai cha con", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740133/eduhub/interactive-books/file_i4dxaf.jpg", "video_url": "", "media_kind": "image", "poster_url": "", "question_enabled": false, "background_audio_url": ""}, "interactions": []}, {"id": "scene-media-4", "next": null, "type": "media", "title": "Câu hỏi cho bạn", "assets": [], "content": {"text": "Cùng trả lời câu hỏi nhé", "layers": [{"x": 5.606324031435211, "y": 17.108560730214318, "id": "layer-text-1776740195715-1", "text": "Theo bạn, trâu nhà tôi cày một ngày được mấy đường?", "type": "text", "width": 26, "height": 14, "z_index": 1, "visibility_rule": {"trigger": "always"}}], "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740173/eduhub/interactive-books/file_vqpkkx.jpg", "video_url": "", "media_kind": "image", "poster_url": "", "question_enabled": true, "background_audio_url": "https://res.cloudinary.com/dxesd2zjo/video/upload/v1776740277/eduhub/interactive-books/file_zfk8lz.mp3", "question_interaction_id": "scene-media-4-question"}, "interactions": [{"id": "scene-media-4-question", "data": {"wrong_feedback_message": "Chưa đúng đâu, hãy thử lại nhé.", "correct_feedback_message": "Chính  xác, bạn giỏi lắm!"}, "type": "multiple_choice", "prompt": "Theo bạn, trâu nhà tôi cày một ngày được mấy đường?", "choices": [{"id": "scene-media-4-choice-1", "label": "Dạ bẩm quan... Trâu nhà tôi 1 ngày cày được 100 đường.", "retry": true, "feedback": "Chưa đúng đâu, hãy thử lại nhé.", "is_correct": false, "score_delta": null, "target_scene_id": null, "feedback_audio_url": null, "feedback_image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740471/eduhub/interactive-books/file_estqv3.jpg"}, {"id": "scene-media-4-choice-2", "label": "Dạ bẩm quan, vậy cho con hỏi ngựa của ngài 1 ngày đi được mấy bước?", "retry": false, "feedback": "Chính  xác, bạn giỏi lắm!", "is_correct": true, "score_delta": 1.0, "target_scene_id": null, "feedback_audio_url": null, "feedback_image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740595/eduhub/interactive-books/file_jwjk0g.jpg"}], "trigger": "on_enter", "timecode": null, "target_scene_id": null}]}, {"id": "scene-media-5", "next": null, "type": "media", "title": "Khen bạn nhỏ nè", "assets": [], "content": {"text": "", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740667/eduhub/interactive-books/file_ko5ohc.jpg", "video_url": "", "media_kind": "image", "poster_url": "", "question_enabled": false, "background_audio_url": "https://res.cloudinary.com/dxesd2zjo/video/upload/v1776740697/eduhub/interactive-books/file_qa3chr.mp3"}, "interactions": []}], "metadata": {"theme": "storytelling", "sync_timeline_cards": true}, "entry_scene_id": "timeline"}	{"title": "Câu bé thông minh", "scenes": [{"id": "timeline", "next": null, "type": "timeline", "title": "Tổng quan câu chuyện", "assets": [], "content": {"text": "Tiếp theo đây, bạn sẽ được tìm hiểu câu chuyện \\"Cậu bé thông minh\\". Hãy cùng mình hoàn thiện câu truyện nhé!", "cards": [{"id": "card-scene-media", "title": "Nội dung mới", "image_url": "", "description": "Mô tả ngắn cho nội dung này.", "order_index": 1, "target_scene_id": "scene-media"}, {"id": "card-scene-media-1", "title": "Nội dung mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740005/eduhub/interactive-books/file_rvgokl.jpg", "description": "Mô tả ngắn cho nội dung này.", "order_index": 2, "target_scene_id": "scene-media-1"}, {"id": "card-scene-media-2", "title": "Nội dung mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740053/eduhub/interactive-books/file_xitcs1.jpg", "description": "Mô tả ngắn cho nội dung này.", "order_index": 3, "target_scene_id": "scene-media-2"}, {"id": "card-scene-media-3", "title": "Nội dung mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740133/eduhub/interactive-books/file_i4dxaf.jpg", "description": "Mô tả ngắn cho nội dung này.", "order_index": 4, "target_scene_id": "scene-media-3"}, {"id": "card-scene-media-4", "title": "Nội dung mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740173/eduhub/interactive-books/file_vqpkkx.jpg", "description": "Mô tả ngắn cho nội dung này.", "order_index": 5, "target_scene_id": "scene-media-4"}, {"id": "card-scene-media-5", "title": "Nội dung mới", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740667/eduhub/interactive-books/file_ko5ohc.jpg", "description": "Mô tả ngắn cho nội dung này.", "order_index": 6, "target_scene_id": "scene-media-5"}], "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776739863/eduhub/interactive-books/file_sx35dg.jpg", "sync_from_scenes": true}, "interactions": []}, {"id": "scene-media", "next": null, "type": "media", "title": "Giới thiệu câu chuyện", "assets": [], "content": {"text": "Nỗi lo âu của vua quan", "autoplay": true, "image_url": "", "video_url": "https://res.cloudinary.com/dxesd2zjo/video/upload/v1776739604/eduhub/interactive-books/file_vbch5l.mp4", "media_kind": "video", "poster_url": "", "question_enabled": false, "background_audio_url": ""}, "interactions": []}, {"id": "scene-media-1", "next": null, "type": "media", "title": "Gặp gỡ", "assets": [], "content": {"text": "Ông quan gặp gỡ hai bố con nọ", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740005/eduhub/interactive-books/file_rvgokl.jpg", "video_url": "", "media_kind": "image", "poster_url": "", "question_enabled": false, "background_audio_url": "https://res.cloudinary.com/dxesd2zjo/video/upload/v1776740009/eduhub/interactive-books/file_yp7oo7.mp3"}, "interactions": []}, {"id": "scene-media-2", "next": null, "type": "media", "title": "đặt câu hỏi", "assets": [], "content": {"text": "Ông quan đặt câu hỏi cho hai cha con", "layers": [{"x": 13.508620689655173, "y": 13.660273175586685, "id": "layer-text-1776740056160-1", "text": "Này, lão kia! Trâu của lão cày một ngày được mấy đường?", "type": "text", "width": 30, "height": 14, "z_index": 1, "visibility_rule": {"trigger": "after_media_time"}}], "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740053/eduhub/interactive-books/file_xitcs1.jpg", "video_url": "", "media_kind": "image", "poster_url": "", "question_enabled": false, "background_audio_url": "https://res.cloudinary.com/dxesd2zjo/video/upload/v1776740103/eduhub/interactive-books/file_addekc.mp3"}, "interactions": []}, {"id": "scene-media-3", "next": null, "type": "media", "title": "Ông bố ấp úng", "assets": [], "content": {"text": "Đây quả là một câu hỏi khó cho hai cha con", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740133/eduhub/interactive-books/file_i4dxaf.jpg", "video_url": "", "media_kind": "image", "poster_url": "", "question_enabled": false, "background_audio_url": ""}, "interactions": []}, {"id": "scene-media-4", "next": null, "type": "media", "title": "Câu hỏi cho bạn", "assets": [], "content": {"text": "Cùng trả lời câu hỏi nhé", "layers": [{"x": 5.606324031435211, "y": 17.108560730214318, "id": "layer-text-1776740195715-1", "text": "Theo bạn, trâu nhà tôi cày một ngày được mấy đường?", "type": "text", "width": 26, "height": 14, "z_index": 1, "visibility_rule": {"trigger": "always"}}], "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740173/eduhub/interactive-books/file_vqpkkx.jpg", "video_url": "", "media_kind": "image", "poster_url": "", "question_enabled": true, "background_audio_url": "https://res.cloudinary.com/dxesd2zjo/video/upload/v1776740277/eduhub/interactive-books/file_zfk8lz.mp3", "question_interaction_id": "scene-media-4-question"}, "interactions": [{"id": "scene-media-4-question", "data": {"wrong_feedback_message": "Chưa đúng đâu, hãy thử lại nhé.", "correct_feedback_message": "Chính  xác, bạn giỏi lắm!"}, "type": "multiple_choice", "prompt": "Theo bạn, trâu nhà tôi cày một ngày được mấy đường?", "choices": [{"id": "scene-media-4-choice-1", "label": "Dạ bẩm quan... Trâu nhà tôi 1 ngày cày được 100 đường.", "retry": true, "feedback": "Chưa đúng đâu, hãy thử lại nhé.", "is_correct": false, "score_delta": null, "target_scene_id": null, "feedback_audio_url": null, "feedback_image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740471/eduhub/interactive-books/file_estqv3.jpg"}, {"id": "scene-media-4-choice-2", "label": "Dạ bẩm quan, vậy cho con hỏi ngựa của ngài 1 ngày đi được mấy bước?", "retry": false, "feedback": "Chính  xác, bạn giỏi lắm!", "is_correct": true, "score_delta": 1.0, "target_scene_id": null, "feedback_audio_url": null, "feedback_image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740595/eduhub/interactive-books/file_jwjk0g.jpg"}], "trigger": "on_enter", "timecode": null, "target_scene_id": null}]}, {"id": "scene-media-5", "next": null, "type": "media", "title": "Khen bạn nhỏ nè", "assets": [], "content": {"text": "", "image_url": "https://res.cloudinary.com/dxesd2zjo/image/upload/v1776740667/eduhub/interactive-books/file_ko5ohc.jpg", "video_url": "", "media_kind": "image", "poster_url": "", "question_enabled": false, "background_audio_url": "https://res.cloudinary.com/dxesd2zjo/video/upload/v1776740697/eduhub/interactive-books/file_qa3chr.mp3"}, "interactions": []}], "metadata": {"theme": "storytelling", "sync_timeline_cards": true}, "entry_scene_id": "timeline"}	3	timeline	10	a41b8a54-b01e-4d53-ba95-2db48c948008	2026-04-21 10:15:23.862127	2026-04-21 03:05:28.508467	2026-04-21 03:15:23.853136
\.


--
-- Data for Name: library_materials; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.library_materials (id, title, description, thumbnail_url, file_url, material_type, subject, grade, is_system, folder_id, created_by, shared_by, source_id, created_at) FROM stdin;
bb7e621c-3dab-4f26-b291-36ad8c32d56b	Sách tương tác mới	\N	https://res.cloudinary.com/dxesd2zjo/image/upload/v1776529988/eduhub/thumbnails/file_uclspj.jpg	\N	interactive_book	Đọc	Lop 6	t	\N	a41b8a54-b01e-4d53-ba95-2db48c948008	\N	\N	2026-04-18 16:21:17.212717
a3f244fc-5c0b-48de-b614-c9ae86178250	Câu bé thông minh	Câu truyện kể về sự tài trí của một cậu bé thôn quê, hãy cùng tìm hiểu nhé!	https://res.cloudinary.com/dxesd2zjo/image/upload/v1776739560/eduhub/thumbnails/file_ntv8uv.jpg	\N	interactive_book	Đọc	Lớp 6	t	\N	a41b8a54-b01e-4d53-ba95-2db48c948008	\N	\N	2026-04-21 03:05:28.508467
\.


--
-- Data for Name: matching_pairs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.matching_pairs (id, question_id, left_text, right_text, correct_match) FROM stdin;
\.


--
-- Data for Name: material_views; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.material_views (id, material_id, student_id, class_id, viewed_at) FROM stdin;
1e65cca4-df9a-4f0e-9a24-c794a97b3e0d	bb7e621c-3dab-4f26-b291-36ad8c32d56b	dfd94943-ea95-4316-b5bf-0d3cd704b120	0da2f70b-4fb8-439f-98c8-bbc82899fa13	2026-04-21 01:39:39.17692
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.messages (id, conversation_id, sender_id, content, file_url, is_read, created_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, type, title, content, link, is_read, created_at) FROM stdin;
\.


--
-- Data for Name: question_options; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.question_options (id, question_id, content, is_correct) FROM stdin;
\.


--
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.questions (id, exam_id, type, content, instruction, points, required, order_index, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, full_name, email, password_hash, role, avatar_url, phone, bio, is_active, created_at, updated_at) FROM stdin;
a41b8a54-b01e-4d53-ba95-2db48c948008	Demo Teacher	demo.teacher@example.com	$2b$12$5jfRY6Cf9hjmVnvAgIDRUecuKVcv3D1rdGqxwT0VG8l3UIdJE3QBO	teacher	\N	\N	\N	t	2026-04-18 07:42:36.314385	2026-04-18 09:38:51.340439
dfd94943-ea95-4316-b5bf-0d3cd704b120	Demo Student	demo.student@example.com	$2b$12$AkyGTnTg3fcxDScxGx1DZuUl3wQE6c8jd6UbEXiWXuK8TPlATKxBq	student	\N	\N	\N	t	2026-04-18 07:42:36.650535	2026-04-18 09:38:51.548559
\.


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: answer_options answer_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answer_options
    ADD CONSTRAINT answer_options_pkey PRIMARY KEY (id);


--
-- Name: answers answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_pkey PRIMARY KEY (id);


--
-- Name: chapters chapters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_pkey PRIMARY KEY (id);


--
-- Name: class_materials class_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_materials
    ADD CONSTRAINT class_materials_pkey PRIMARY KEY (id);


--
-- Name: class_students class_students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_students
    ADD CONSTRAINT class_students_pkey PRIMARY KEY (id);


--
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id);


--
-- Name: conversation_members conversation_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_members
    ADD CONSTRAINT conversation_members_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: exam_submissions exam_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_submissions
    ADD CONSTRAINT exam_submissions_pkey PRIMARY KEY (id);


--
-- Name: exams exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_pkey PRIMARY KEY (id);


--
-- Name: folders folders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_pkey PRIMARY KEY (id);


--
-- Name: interactive_book_actions interactive_book_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_actions
    ADD CONSTRAINT interactive_book_actions_pkey PRIMARY KEY (id);


--
-- Name: interactive_book_attempts interactive_book_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_attempts
    ADD CONSTRAINT interactive_book_attempts_pkey PRIMARY KEY (id);


--
-- Name: interactive_book_events interactive_book_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_events
    ADD CONSTRAINT interactive_book_events_pkey PRIMARY KEY (id);


--
-- Name: interactive_book_media interactive_book_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_media
    ADD CONSTRAINT interactive_book_media_pkey PRIMARY KEY (id);


--
-- Name: interactive_book_quiz_options interactive_book_quiz_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_quiz_options
    ADD CONSTRAINT interactive_book_quiz_options_pkey PRIMARY KEY (id);


--
-- Name: interactive_book_quizzes interactive_book_quizzes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_quizzes
    ADD CONSTRAINT interactive_book_quizzes_pkey PRIMARY KEY (id);


--
-- Name: interactive_book_scene_elements interactive_book_scene_elements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_scene_elements
    ADD CONSTRAINT interactive_book_scene_elements_pkey PRIMARY KEY (id);


--
-- Name: interactive_book_scenes interactive_book_scenes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_scenes
    ADD CONSTRAINT interactive_book_scenes_pkey PRIMARY KEY (id);


--
-- Name: interactive_book_transitions interactive_book_transitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_transitions
    ADD CONSTRAINT interactive_book_transitions_pkey PRIMARY KEY (id);


--
-- Name: interactive_book_video_interactions interactive_book_video_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_video_interactions
    ADD CONSTRAINT interactive_book_video_interactions_pkey PRIMARY KEY (id);


--
-- Name: interactive_book_video_options interactive_book_video_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_video_options
    ADD CONSTRAINT interactive_book_video_options_pkey PRIMARY KEY (id);


--
-- Name: interactive_books interactive_books_material_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_books
    ADD CONSTRAINT interactive_books_material_id_key UNIQUE (material_id);


--
-- Name: interactive_books interactive_books_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_books
    ADD CONSTRAINT interactive_books_pkey PRIMARY KEY (id);


--
-- Name: library_materials library_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_materials
    ADD CONSTRAINT library_materials_pkey PRIMARY KEY (id);


--
-- Name: matching_pairs matching_pairs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matching_pairs
    ADD CONSTRAINT matching_pairs_pkey PRIMARY KEY (id);


--
-- Name: material_views material_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_views
    ADD CONSTRAINT material_views_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: question_options question_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_options
    ADD CONSTRAINT question_options_pkey PRIMARY KEY (id);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: interactive_book_actions uq_interactive_book_action_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_actions
    ADD CONSTRAINT uq_interactive_book_action_key UNIQUE (interactive_book_id, action_key);


--
-- Name: interactive_book_media uq_interactive_book_media_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_media
    ADD CONSTRAINT uq_interactive_book_media_key UNIQUE (interactive_book_id, media_key);


--
-- Name: interactive_book_quizzes uq_interactive_book_quiz_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_quizzes
    ADD CONSTRAINT uq_interactive_book_quiz_key UNIQUE (interactive_book_id, quiz_key);


--
-- Name: interactive_book_scene_elements uq_interactive_book_scene_element_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_scene_elements
    ADD CONSTRAINT uq_interactive_book_scene_element_key UNIQUE (scene_id, element_key);


--
-- Name: interactive_book_scenes uq_interactive_book_scene_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_scenes
    ADD CONSTRAINT uq_interactive_book_scene_key UNIQUE (interactive_book_id, scene_key);


--
-- Name: material_views uq_material_student_view; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_views
    ADD CONSTRAINT uq_material_student_view UNIQUE (material_id, student_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_classes_join_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_classes_join_code ON public.classes USING btree (join_code);


--
-- Name: ix_interactive_book_actions_book; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_interactive_book_actions_book ON public.interactive_book_actions USING btree (interactive_book_id, order_index);


--
-- Name: ix_interactive_book_attempts_student_book; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_interactive_book_attempts_student_book ON public.interactive_book_attempts USING btree (student_id, interactive_book_id);


--
-- Name: ix_interactive_book_events_attempt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_interactive_book_events_attempt ON public.interactive_book_events USING btree (attempt_id, created_at);


--
-- Name: ix_interactive_book_media_book; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_interactive_book_media_book ON public.interactive_book_media USING btree (interactive_book_id, order_index);


--
-- Name: ix_interactive_book_quizzes_book; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_interactive_book_quizzes_book ON public.interactive_book_quizzes USING btree (interactive_book_id, order_index);


--
-- Name: ix_interactive_book_scene_elements_scene; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_interactive_book_scene_elements_scene ON public.interactive_book_scene_elements USING btree (scene_id, order_index);


--
-- Name: ix_interactive_book_scenes_book; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_interactive_book_scenes_book ON public.interactive_book_scenes USING btree (interactive_book_id, order_index);


--
-- Name: ix_interactive_book_transitions_scene; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_interactive_book_transitions_scene ON public.interactive_book_transitions USING btree (scene_id, order_index);


--
-- Name: ix_interactive_book_video_interactions_scene; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_interactive_book_video_interactions_scene ON public.interactive_book_video_interactions USING btree (scene_id, order_index);


--
-- Name: ix_interactive_book_video_options_interaction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_interactive_book_video_options_interaction ON public.interactive_book_video_options USING btree (interaction_id, order_index);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: answer_options answer_options_answer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answer_options
    ADD CONSTRAINT answer_options_answer_id_fkey FOREIGN KEY (answer_id) REFERENCES public.answers(id);


--
-- Name: answer_options answer_options_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answer_options
    ADD CONSTRAINT answer_options_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.question_options(id);


--
-- Name: answers answers_graded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES public.users(id);


--
-- Name: answers answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id);


--
-- Name: answers answers_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.exam_submissions(id);


--
-- Name: chapters chapters_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- Name: class_materials class_materials_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_materials
    ADD CONSTRAINT class_materials_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id);


--
-- Name: class_materials class_materials_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_materials
    ADD CONSTRAINT class_materials_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- Name: class_materials class_materials_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_materials
    ADD CONSTRAINT class_materials_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.library_materials(id);


--
-- Name: class_students class_students_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_students
    ADD CONSTRAINT class_students_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- Name: class_students class_students_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_students
    ADD CONSTRAINT class_students_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id);


--
-- Name: classes classes_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id);


--
-- Name: conversation_members conversation_members_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_members
    ADD CONSTRAINT conversation_members_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id);


--
-- Name: conversation_members conversation_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_members
    ADD CONSTRAINT conversation_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: exam_submissions exam_submissions_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_submissions
    ADD CONSTRAINT exam_submissions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id);


--
-- Name: exam_submissions exam_submissions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_submissions
    ADD CONSTRAINT exam_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id);


--
-- Name: exams exams_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- Name: exams exams_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: folders folders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: interactive_book_actions interactive_book_actions_interactive_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_actions
    ADD CONSTRAINT interactive_book_actions_interactive_book_id_fkey FOREIGN KEY (interactive_book_id) REFERENCES public.interactive_books(id) ON DELETE CASCADE;


--
-- Name: interactive_book_attempts interactive_book_attempts_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_attempts
    ADD CONSTRAINT interactive_book_attempts_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL;


--
-- Name: interactive_book_attempts interactive_book_attempts_interactive_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_attempts
    ADD CONSTRAINT interactive_book_attempts_interactive_book_id_fkey FOREIGN KEY (interactive_book_id) REFERENCES public.interactive_books(id) ON DELETE CASCADE;


--
-- Name: interactive_book_attempts interactive_book_attempts_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_attempts
    ADD CONSTRAINT interactive_book_attempts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id);


--
-- Name: interactive_book_events interactive_book_events_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_events
    ADD CONSTRAINT interactive_book_events_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.interactive_book_attempts(id) ON DELETE CASCADE;


--
-- Name: interactive_book_media interactive_book_media_interactive_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_media
    ADD CONSTRAINT interactive_book_media_interactive_book_id_fkey FOREIGN KEY (interactive_book_id) REFERENCES public.interactive_books(id) ON DELETE CASCADE;


--
-- Name: interactive_book_quiz_options interactive_book_quiz_options_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_quiz_options
    ADD CONSTRAINT interactive_book_quiz_options_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.interactive_book_quizzes(id) ON DELETE CASCADE;


--
-- Name: interactive_book_quizzes interactive_book_quizzes_interactive_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_quizzes
    ADD CONSTRAINT interactive_book_quizzes_interactive_book_id_fkey FOREIGN KEY (interactive_book_id) REFERENCES public.interactive_books(id) ON DELETE CASCADE;


--
-- Name: interactive_book_scene_elements interactive_book_scene_elements_action_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_scene_elements
    ADD CONSTRAINT interactive_book_scene_elements_action_id_fkey FOREIGN KEY (action_id) REFERENCES public.interactive_book_actions(id) ON DELETE SET NULL;


--
-- Name: interactive_book_scene_elements interactive_book_scene_elements_media_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_scene_elements
    ADD CONSTRAINT interactive_book_scene_elements_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.interactive_book_media(id) ON DELETE SET NULL;


--
-- Name: interactive_book_scene_elements interactive_book_scene_elements_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_scene_elements
    ADD CONSTRAINT interactive_book_scene_elements_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.interactive_book_quizzes(id) ON DELETE SET NULL;


--
-- Name: interactive_book_scene_elements interactive_book_scene_elements_scene_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_scene_elements
    ADD CONSTRAINT interactive_book_scene_elements_scene_id_fkey FOREIGN KEY (scene_id) REFERENCES public.interactive_book_scenes(id) ON DELETE CASCADE;


--
-- Name: interactive_book_scenes interactive_book_scenes_background_media_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_scenes
    ADD CONSTRAINT interactive_book_scenes_background_media_id_fkey FOREIGN KEY (background_media_id) REFERENCES public.interactive_book_media(id) ON DELETE SET NULL;


--
-- Name: interactive_book_scenes interactive_book_scenes_interactive_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_scenes
    ADD CONSTRAINT interactive_book_scenes_interactive_book_id_fkey FOREIGN KEY (interactive_book_id) REFERENCES public.interactive_books(id) ON DELETE CASCADE;


--
-- Name: interactive_book_transitions interactive_book_transitions_scene_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_transitions
    ADD CONSTRAINT interactive_book_transitions_scene_id_fkey FOREIGN KEY (scene_id) REFERENCES public.interactive_book_scenes(id) ON DELETE CASCADE;


--
-- Name: interactive_book_video_interactions interactive_book_video_interactions_scene_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_video_interactions
    ADD CONSTRAINT interactive_book_video_interactions_scene_id_fkey FOREIGN KEY (scene_id) REFERENCES public.interactive_book_scenes(id) ON DELETE CASCADE;


--
-- Name: interactive_book_video_options interactive_book_video_options_interaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_book_video_options
    ADD CONSTRAINT interactive_book_video_options_interaction_id_fkey FOREIGN KEY (interaction_id) REFERENCES public.interactive_book_video_interactions(id) ON DELETE CASCADE;


--
-- Name: interactive_books interactive_books_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_books
    ADD CONSTRAINT interactive_books_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: interactive_books interactive_books_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactive_books
    ADD CONSTRAINT interactive_books_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.library_materials(id) ON DELETE CASCADE;


--
-- Name: library_materials library_materials_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_materials
    ADD CONSTRAINT library_materials_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: library_materials library_materials_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_materials
    ADD CONSTRAINT library_materials_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.folders(id);


--
-- Name: library_materials library_materials_shared_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_materials
    ADD CONSTRAINT library_materials_shared_by_fkey FOREIGN KEY (shared_by) REFERENCES public.users(id);


--
-- Name: library_materials library_materials_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_materials
    ADD CONSTRAINT library_materials_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.library_materials(id) ON DELETE CASCADE;


--
-- Name: matching_pairs matching_pairs_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matching_pairs
    ADD CONSTRAINT matching_pairs_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id);


--
-- Name: material_views material_views_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_views
    ADD CONSTRAINT material_views_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: material_views material_views_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_views
    ADD CONSTRAINT material_views_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.library_materials(id) ON DELETE CASCADE;


--
-- Name: material_views material_views_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_views
    ADD CONSTRAINT material_views_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id);


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id);


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: question_options question_options_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_options
    ADD CONSTRAINT question_options_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id);


--
-- Name: questions questions_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id);


--
-- PostgreSQL database dump complete
--

\unrestrict KR0LuDeFhuUc932aaMsoA3t8CjBTpvcdmaAA3075whgx5ceRqahDXWHXvqsB7Rc

