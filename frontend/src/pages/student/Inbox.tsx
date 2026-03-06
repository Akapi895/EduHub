import InboxPage from '@/components/chat/InboxPage';

export default function StudentInbox() {
  return (
    <InboxPage
      subtitle="Tin nhắn với giáo viên và bạn học"
      contactSearchPlaceholder="Tìm theo tên..."
      showContactRole
    />
  );
}
