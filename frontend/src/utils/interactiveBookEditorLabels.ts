export type EditorStepKey = 'general' | 'scenes' | 'workspace' | 'review';

export interface EditorStepDefinition {
  key: EditorStepKey;
  label: string;
  shortLabel: string;
  description: string;
}

export const INTERACTIVE_BOOK_EDITOR_STEPS: EditorStepDefinition[] = [
  {
    key: 'general',
    label: 'Thông tin sách',
    shortLabel: 'Thông tin',
    description: 'Khai báo tên sách, ảnh bìa, môn học và thông tin cơ bản.',
  },
  {
    key: 'scenes',
    label: 'Dàn cảnh',
    shortLabel: 'Dàn cảnh',
    description: 'Sắp xếp các cảnh, chọn cảnh bắt đầu và dựng khung bài học.',
  },
  {
    key: 'workspace',
    label: 'Soạn nội dung',
    shortLabel: 'Soạn nội dung',
    description: 'Chỉnh nội dung, phương tiện, tương tác và lớp hiển thị của từng cảnh.',
  },
  {
    key: 'review',
    label: 'Kiểm tra và phát hành',
    shortLabel: 'Kiểm tra',
    description: 'Rà lỗi, xem thử, chỉnh nâng cao và phát hành cho học sinh.',
  },
];

export const FRIENDLY_INTERACTIVE_BOOK_LABELS = {
  canvasLayers: 'Lớp nội dung trên màn hình',
  zIndex: 'Lớp trên/dưới',
  visibilityRule: 'Khi nào xuất hiện?',
  nextAction: 'Hành động tiếp theo',
  flowSafety: 'Kiểm tra luồng học',
  blockingErrors: 'Lỗi cần sửa trước khi phát hành',
  warnings: 'Lưu ý nên kiểm tra',
  advancedEditor: 'Chỉnh sửa nâng cao',
} as const;
