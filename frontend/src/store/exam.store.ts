import { create } from 'zustand';
import type { Exam, Question, Submission } from '@/types';

interface ExamState {
  exams: Exam[];
  currentExam: Exam | null;
  questions: Question[];
  submissions: Submission[];
  setExams: (exams: Exam[]) => void;
  setCurrentExam: (exam: Exam | null) => void;
  setQuestions: (questions: Question[]) => void;
  setSubmissions: (submissions: Submission[]) => void;
  addQuestion: (q: Question) => void;
  updateQuestion: (id: string, data: Partial<Question>) => void;
  removeQuestion: (id: string) => void;
}

export const useExamStore = create<ExamState>((set) => ({
  exams: [],
  currentExam: null,
  questions: [],
  submissions: [],
  setExams: (exams) => set({ exams }),
  setCurrentExam: (currentExam) => set({ currentExam }),
  setQuestions: (questions) => set({ questions }),
  setSubmissions: (submissions) => set({ submissions }),
  addQuestion: (q) =>
    set((state) => ({ questions: [...state.questions, q] })),
  updateQuestion: (id, data) =>
    set((state) => ({
      questions: state.questions.map((q) =>
        q.id === id ? { ...q, ...data } : q
      ),
    })),
  removeQuestion: (id) =>
    set((state) => ({
      questions: state.questions.filter((q) => q.id !== id),
    })),
}));
