import { useNavigate } from 'react-router-dom';
import { Sparkles, Star, CheckCircle2, ArrowRight, GraduationCap, Users, BookMarked, Trophy } from 'lucide-react';

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative flex items-center overflow-hidden bg-gradient-to-br from-white via-blue-50 to-purple-50 min-h-screen">
      {/* Animated Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating Gradient Orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-20 left-1/2 w-80 h-80 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Geometric Shapes */}
        <div className="absolute top-1/4 right-1/4 w-4 h-4 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-1/3 left-1/4 w-6 h-6 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 right-1/3 w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '2.5s' }} />
      </div>

      {/* Main Content Container */}
      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[calc(100vh-5rem)]">
          {/* Left Content */}
          <div className="flex flex-col justify-center text-center lg:text-left space-y-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-blue-100 text-primary px-4 py-2 rounded-full text-sm font-medium w-fit mx-auto lg:mx-0">
              <Sparkles className="w-4 h-4" />
              Nền tảng học tập hàng đầu
            </div>
            
            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight">
              Học tập thông minh cùng{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Thế giới cổ tích
                </span>
                <svg className="absolute -bottom-2 left-0 w-full" height="12" viewBox="0 0 200 12" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 8 Q50 2, 100 8 T200 8" stroke="url(#gradient)" strokeWidth="3" fill="none" strokeLinecap="round"/>
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="50%" stopColor="#9333ea" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-lg sm:text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Nền tảng học tập tương tác dành cho học sinh và giáo viên. Khám phá sách giáo khoa điện tử, trò chơi giáo dục và bài kiểm tra thông minh.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
              <button 
                onClick={() => navigate('/register')}
                className="px-8 py-4 bg-gradient-to-r from-primary to-blue-600 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Bắt đầu khám phá
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              {/* <button 
                className="px-8 py-4 bg-white text-primary font-bold rounded-2xl shadow-lg hover:shadow-xl border-2 border-primary/20 hover:border-primary/40 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Star className="w-5 h-5" />
                Xem demo
              </button> */}
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 justify-center lg:justify-start text-sm text-gray-600 pt-2">
              <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                <span className="font-medium">Không cần thẻ tín dụng</span>
              </div>
              <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                <span className="font-medium">Dùng thử miễn phí</span>
              </div>
            </div>
          </div>

          {/* Right - Feature Cards */}
          <div className="flex items-center justify-center lg:justify-end">
            <div className="relative w-full max-w-lg">
              {/* Main Card */}
              <div className="bg-white rounded-3xl shadow-2xl p-6 space-y-4 animate-fade-in">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Học tập tương tác</h3>
                    <p className="text-sm text-gray-500">Sách điện tử & trò chơi</p>
                  </div>
                </div>
                
                {/* Mini Feature Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4">
                    <BookMarked className="w-8 h-8 text-primary mb-2" />
                    <p className="font-semibold text-gray-900 text-sm">Sách giáo khoa</p>
                    <p className="text-xs text-gray-600">Đa phương tiện</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4">
                    <Trophy className="w-8 h-8 text-purple-600 mb-2" />
                    <p className="font-semibold text-gray-900 text-sm">Bài kiểm tra</p>
                    <p className="text-xs text-gray-600">Thông minh</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4">
                    <Users className="w-8 h-8 text-green-600 mb-2" />
                    <p className="font-semibold text-gray-900 text-sm">Lớp học</p>
                    <p className="text-xs text-gray-600">Quản lý dễ dàng</p>
                  </div>
                  <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-4">
                    <Sparkles className="w-8 h-8 text-pink-600 mb-2" />
                    <p className="font-semibold text-gray-900 text-sm">Trò chơi</p>
                    <p className="text-xs text-gray-600">Học mà chơi</p>
                  </div>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full blur-xl opacity-50" />
              <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full blur-xl opacity-50" />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:block animate-bounce">
        <div className="w-6 h-10 border-2 border-gray-400 rounded-full flex items-start justify-center p-2">
          <div className="w-1.5 h-3 bg-gray-400 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
