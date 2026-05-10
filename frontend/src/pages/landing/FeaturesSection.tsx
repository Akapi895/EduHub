import { BookMarked, Gamepad2, ClipboardCheck, Users, Sparkles, BarChart3 } from 'lucide-react';

const FeaturesSection = () => {
  const features = [
    {
      icon: BookMarked,
      title: 'Sách giáo khoa điện tử',
      description: 'Hàng nghìn sách giáo khoa với hình ảnh, video và nội dung tương tác sinh động',
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100',
    },
    {
      icon: Gamepad2,
      title: 'Trò chơi giáo dục',
      description: 'Học mà chơi với các trò chơi được thiết kế chuyên biệt cho từng môn học',
      gradient: 'from-purple-500 to-purple-600',
      bgGradient: 'from-purple-50 to-purple-100',
    },
    {
      icon: ClipboardCheck,
      title: 'Bài kiểm tra thông minh',
      description: 'Tạo và làm bài kiểm tra với các câu hỏi đa dạng, tự động chấm điểm',
      gradient: 'from-green-500 to-green-600',
      bgGradient: 'from-green-50 to-green-100',
    },
    {
      icon: Users,
      title: 'Quản lý lớp học',
      description: 'Giáo viên dễ dàng quản lý học sinh, giao bài tập và theo dõi tiến độ',
      gradient: 'from-orange-500 to-orange-600',
      bgGradient: 'from-orange-50 to-orange-100',
    },
    {
      icon: BarChart3,
      title: 'Thống kê & Phân tích',
      description: 'Biểu đồ trực quan, báo cáo chi tiết giúp hiểu rõ tiến độ học tập',
      gradient: 'from-pink-500 to-pink-600',
      bgGradient: 'from-pink-50 to-pink-100',
    },
    {
      icon: Sparkles,
      title: 'AI hỗ trợ học tập',
      description: 'Chatbot thông minh giải đáp thắc mắc 24/7 bằng công nghệ AI tiên tiến',
      gradient: 'from-cyan-500 to-cyan-600',
      bgGradient: 'from-cyan-50 to-cyan-100',
    },
  ];

  return (
    <section id="features" className="group relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-white via-blue-50 to-purple-50">
      {/* Background Decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-br from-pink-200/30 to-orange-200/30 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Tính năng nổi bật
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Vì sao chọn EduHub?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Mọi thứ bạn cần cho một nền tảng học tập hiện đại, tương tác và hiệu quả
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index} 
                className="group bg-white rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100"
              >
                <div className={`inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-2xl mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
                <div className={`mt-4 h-1 w-0 group-hover:w-full bg-gradient-to-r ${feature.gradient} rounded-full transition-all duration-500`} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
