import { useNavigate } from 'react-router-dom';
import { Sparkles, Heart, ArrowRight } from 'lucide-react';

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-10 left-10 w-40 h-40 bg-blue-500 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-60 h-60 bg-purple-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Geometric Shapes */}
      <div className="absolute top-10 right-1/4 w-4 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
      <div className="absolute bottom-20 left-1/4 w-6 h-6 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/3 right-1/6 w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '1.5s' }} />

      <div className="max-w-5xl mx-auto text-center relative z-10">
        {/* Icon */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl shadow-2xl animate-pulse">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
        </div>
        
        <h2 className="text-4xl sm:text-5xl font-bold mb-6">
          Sẵn sàng bắt đầu hành trình?
        </h2>
        
        <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
          Tham gia cùng hàng nghìn học sinh và giáo viên đang sử dụng EduHub để học tập hiệu quả hơn
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <button
            onClick={() => navigate('/register')}
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Đăng ký miễn phí
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/30 text-white font-bold rounded-2xl shadow-xl hover:bg-white/20 hover:shadow-2xl transition-all duration-300 flex items-center justify-center gap-2"
          >
            <Heart className="w-5 h-5" />
            Liên hệ hỗ trợ
          </button>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-blue-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            Miễn phí mãi mãi
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            Không cần thẻ tín dụng
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            Hỗ trợ 24/7
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
