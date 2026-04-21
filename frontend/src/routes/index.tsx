import { Suspense, lazy, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Navigate, type RouteObject } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';

// Auth pages
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';

// Teacher pages
import TeacherDashboard from '@/pages/teacher/Dashboard';
import TeacherLibrary from '@/pages/teacher/Library';
import TeacherClasses from '@/pages/teacher/Classes';
import TeacherClassDetail from '@/pages/teacher/ClassDetail';
import TeacherExamDetail from '@/pages/teacher/ExamDetail';
import TeacherSubmissionReview from '@/pages/teacher/SubmissionReview';
import CreateExam from '@/pages/teacher/CreateExam';
import TeacherInbox from '@/pages/teacher/Inbox';
import TeacherSettings from '@/pages/teacher/Settings';
import MaterialDetail from '@/pages/teacher/MaterialDetail';

// Student pages
import StudentDashboard from '@/pages/student/Dashboard';
import StudentClasses from '@/pages/student/Classes';
import StudentClassDetail from '@/pages/student/ClassDetail';
import StudentExam from '@/pages/student/Exam';
import StudentExams from '@/pages/student/Exams';
import StudentLibrary from '@/pages/student/Library';
import StudentInbox from '@/pages/student/Inbox';
import StudentChatbot from '@/pages/student/Chatbot';
import StudentSettings from '@/pages/student/Settings';

import NotFound from '@/pages/NotFound';

const TeacherInteractiveBookEditor = lazy(() => import('@/pages/teacher/InteractiveBookEditor'));
const StudentInteractiveBook = lazy(() => import('@/pages/student/InteractiveBook'));

function withLazyShell(element: ReactNode) {
  return (
    <Suspense
      fallback={(
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
    >
      {element}
    </Suspense>
  );
}

export const routes: RouteObject[] = [
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/student/interactive-books/:id', element: withLazyShell(<StudentInteractiveBook />) },
  { path: '/student/interactive-books/:id/scenes/:sceneId', element: withLazyShell(<StudentInteractiveBook />) },
  {
    path: '/teacher',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <TeacherDashboard /> },
      { path: 'library', element: <Navigate to="/teacher/library/personal" replace /> },
      { path: 'library/system', element: <TeacherLibrary mode="system" /> },
      { path: 'library/personal', element: <TeacherLibrary mode="personal" /> },
      { path: 'library/:id', element: <MaterialDetail /> },
      { path: 'interactive-books/new', element: withLazyShell(<TeacherInteractiveBookEditor />) },
      { path: 'interactive-books/:id', element: withLazyShell(<TeacherInteractiveBookEditor />) },
      { path: 'classes', element: <TeacherClasses /> },
      { path: 'classes/:id', element: <TeacherClassDetail /> },
      { path: 'classes/:classId/exams/create', element: <CreateExam /> },
      { path: 'exams/:id', element: <TeacherExamDetail /> },
      { path: 'exams/:examId/submissions/:submissionId', element: <TeacherSubmissionReview /> },
      { path: 'inbox', element: <TeacherInbox /> },
      { path: 'settings', element: <TeacherSettings /> },
    ],
  },
  {
    path: '/student',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <StudentDashboard /> },
      { path: 'classes', element: <StudentClasses /> },
      { path: 'classes/:id', element: <StudentClassDetail /> },
      { path: 'library', element: <StudentLibrary /> },
      { path: 'library/:id', element: <MaterialDetail /> },
      { path: 'exam/:id', element: <StudentExam /> },
      { path: 'exams/:id', element: <StudentExam /> },
      { path: 'exams', element: <StudentExams /> },
      { path: 'inbox', element: <StudentInbox /> },
      { path: 'chatbot', element: <StudentChatbot /> },
      { path: 'settings', element: <StudentSettings /> },
    ],
  },
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <NotFound /> },
];
