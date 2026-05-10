import { BookMarked, Users, GraduationCap, ArrowRight } from 'lucide-react';

const HowItWorksSection = () => {
  const steps = [
    {
      step: '1',
      icon: BookMarked,
      title: 'Đăng ký tài khoản',
      description: 'Tạo tài khoản miễn phí chỉ trong vài giây với email của bạn',
      color: 'from-blue-500 to-blue-600',
    },
    {
      step: '2',
      icon: Users,
      title: 'Chọn vai trò',
      description: 'Đăng ký với tư cách học sinh hoặc giáo viên để có trải nghiệm phù hợp',
      color: 'from-purple-500 to-purple-600',
    },
    {
      step: '3',
      icon: GraduationCap,
      title: 'Bắt đầu học tập',
      description: 'Khám phá tài liệu, tham gia lớp học và bắt đầu hành trình kiến thức',
      color: 'from-green-500 to-green-600',
    },
  ];

  return (
    <section id="how-it-works" className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
      {/* Background Decorations */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-white rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium mb-4 backdrop-blur-sm">
            Đơn giản & Dễ dàng
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Chỉ 3 bước để bắt đầu
          </h2>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Thiết lập tài khoản và bắt đầu học tập chỉ trong vài phút
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connection Lines - Desktop Only */}
          <div className="hidden md:block absolute top-16 left-0 right-0 h-1">
            <div className="absolute left-[16%] right-[16%] h-full bg-white/30 rounded-full" />
          </div>

          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div 
                key={index} 
                className="relative animate-fade-in group"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 text-center border border-white/20 transition-all duration-300 hover:bg-white/20 hover:-translate-y-2">
                  {/* Step number badge */}
                  <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${step.color} rounded-full text-white font-bold text-2xl shadow-xl mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    {step.step}
                  </div>

                  <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${step.color} rounded-2xl mx-auto mb-6 shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-4">
                    {step.title}
                  </h3>
                  <p className="text-blue-100 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <button className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
            Bắt đầu ngay
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
