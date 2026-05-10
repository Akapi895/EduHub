import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, BookOpen } from 'lucide-react';

const LandingNavbar = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrollY > 50 
          ? 'bg-white/90 backdrop-blur-lg shadow-lg' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              EduHub
            </span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-700 hover:text-primary font-medium transition-colors">
              Tính năng
            </a>
            <a href="#how-it-works" className="text-gray-700 hover:text-primary font-medium transition-colors">
              Cách hoạt động
            </a>
            <a href="#testimonials" className="text-gray-700 hover:text-primary font-medium transition-colors">
              Đánh giá
            </a>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="px-5 py-2.5 text-primary font-semibold hover:bg-primary/10 rounded-xl transition-all"
            >
              Đăng nhập
            </button>
            <button 
              onClick={() => navigate('/register')}
              className="px-5 py-2.5 bg-primary text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all"
            >
              Đăng ký miễn phí
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg animate-slide-down">
          <div className="px-4 py-6 space-y-4">
            <a href="#features" className="block text-gray-700 hover:text-primary font-medium" onClick={() => setIsMenuOpen(false)}>
              Tính năng
            </a>
            <a href="#how-it-works" className="block text-gray-700 hover:text-primary font-medium" onClick={() => setIsMenuOpen(false)}>
              Cách hoạt động
            </a>
            <a href="#testimonials" className="block text-gray-700 hover:text-primary font-medium" onClick={() => setIsMenuOpen(false)}>
              Đánh giá
            </a>
            <div className="pt-4 space-y-3 border-t border-gray-100">
              <button 
                onClick={() => { navigate('/login'); setIsMenuOpen(false); }}
                className="w-full px-5 py-2.5 text-primary font-semibold hover:bg-primary/10 rounded-xl transition-all"
              >
                Đăng nhập
              </button>
              <button 
                onClick={() => { navigate('/register'); setIsMenuOpen(false); }}
                className="w-full px-5 py-2.5 bg-primary text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                Đăng ký miễn phí
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default LandingNavbar;
