import { create } from 'zustand';
import type { Class, Chapter, ClassStudent } from '@/types';

interface ClassState {
  classes: Class[];
  currentClass: Class | null;
  chapters: Chapter[];
  students: ClassStudent[];
  setClasses: (classes: Class[]) => void;
  setCurrentClass: (cls: Class | null) => void;
  setChapters: (chapters: Chapter[]) => void;
  setStudents: (students: ClassStudent[]) => void;
  addClass: (cls: Class) => void;
  removeClass: (id: string) => void;
}

export const useClassStore = create<ClassState>((set) => ({
  classes: [],
  currentClass: null,
  chapters: [],
  students: [],
  setClasses: (classes) => set({ classes }),
  setCurrentClass: (currentClass) => set({ currentClass }),
  setChapters: (chapters) => set({ chapters }),
  setStudents: (students) => set({ students }),
  addClass: (cls) =>
    set((state) => ({ classes: [...state.classes, cls] })),
  removeClass: (id) =>
    set((state) => ({
      classes: state.classes.filter((c) => c.id !== id),
    })),
}));
