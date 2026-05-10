import { Star, Quote } from 'lucide-react';

const TestimonialsSection = () => {
  const testimonials = [
    {
      name: 'Nguyễn Thị Lan',
      role: 'Giáo viên Toán - THCS',
      avatar: 'N',
      avatarGradient: 'from-blue-500 to-blue-600',
      rating: 5,
      text: 'Thế giới cổ tích đã thay đổi hoàn toàn cách tôi giảng dạy. Tài liệu phong phú, bài kiểm tra dễ tạo và học sinh yêu thích việc học hơn bao giờ hết.',
    },
    {
      name: 'Trần Minh Đức',
      role: 'Học sinh lớp 8',
      avatar: 'T',
      avatarGradient: 'from-purple-500 to-purple-600',
      rating: 5,
      text: 'Nhờ Thế giới cổ tích, tôi học Toán và Tiếng Anh hiệu quả hơn nhiều. Các trò chơi giáo dục giúp việc học trở nên vui vẻ và không còn nhàm chán.',
    },
    {
      name: 'Phạm Thị Hương',
      role: 'Phụ huynh học sinh',
      avatar: 'P',
      avatarGradient: 'from-green-500 to-green-600',
      rating: 5,
      text: 'Con tôi đã tiến bộ rất nhiều kể từ khi sử dụng Thế giới cổ tích. Tôi có thể theo dõi tiến độ học tập của con qua các báo cáo chi tiết.',
    },
  ];

  return (
    <section id="testimonials" className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Background Decorations */}
      <div className="absolute top-20 right-0 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-0 w-96 h-96 bg-gradient-to-br from-pink-200/30 to-orange-200/30 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Star className="w-4 h-4 fill-yellow-500" />
            Được tin tưởng bởi nhiều người
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Họ viên đang nói gì về Thế giới cổ tích
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Hàng nghìn học sinh và giáo viên đã tin tưởng sử dụng Thế giới cổ tích
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100"
            >
              {/* Quote Icon */}
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mb-6">
                <Quote className="w-6 h-6 text-white" />
              </div>

              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-gray-700 mb-6 leading-relaxed italic">
                "{testimonial.text}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${testimonial.avatarGradient} flex items-center justify-center text-white font-bold text-lg shadow-md`}>
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-bold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-600">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
