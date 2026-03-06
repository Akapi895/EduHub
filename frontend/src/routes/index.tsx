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
import StudentInbox from '@/pages/student/Inbox';
import StudentChatbot from '@/pages/student/Chatbot';
import StudentSettings from '@/pages/student/Settings';

import NotFound from '@/pages/NotFound';

export const routes: RouteObject[] = [
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
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
      { path: 'classes', element: <TeacherClasses /> },
      { path: 'classes/:id', element: <TeacherClassDetail /> },
      { path: 'classes/:classId/exams/create', element: <CreateExam /> },
      { path: 'exams/:id', element: <TeacherExamDetail /> },
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
      { path: 'exam/:id', element: <StudentExam /> },
      { path: 'exams', element: <StudentExams /> },
      { path: 'inbox', element: <StudentInbox /> },
      { path: 'chatbot', element: <StudentChatbot /> },
      { path: 'settings', element: <StudentSettings /> },
    ],
  },
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <NotFound /> },
];
