import type { Material } from '@/types';
import type { Role } from '@/utils/constants';

interface MaterialRouteOptions {
  classId?: string;
}

export function getMaterialRoute(
  material: Material,
  role: Role,
  options: MaterialRouteOptions = {}
): string {
  if (material.material_type === 'interactive_book') {
    if (role === 'teacher') {
      return `/teacher/interactive-books/${material.id}`;
    }

    const query = options.classId ? `?classId=${options.classId}` : '';
    return `/student/interactive-books/${material.id}${query}`;
  }

  if (role === 'teacher') {
    return `/teacher/library/${material.id}`;
  }

  return `/student/library/${material.id}`;
}
