import { BookOpen, Twitter, Facebook, Instagram, Github } from 'lucide-react';

const LandingFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">EduHub</span>
            </div>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Nền tảng học tập thông minh, kết nối học sinh và giáo viên trong hành trình tri thức.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Sản phẩm */}
          <div>
            <h4 className="font-bold text-white mb-4">Sản phẩm</h4>
            <ul className="space-y-3">
              <li><a href="#features" className="hover:text-white transition-colors">Tính năng</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Bảng giá</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Demo</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Cập nhật</a></li>
            </ul>
          </div>

          {/* Hỗ trợ */}
          <div>
            <h4 className="font-bold text-white mb-4">Hỗ trợ</h4>
            <ul className="space-y-3">
              <li><a href="#" className="hover:text-white transition-colors">Trung tâm trợ giúp</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Liên hệ</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Câu hỏi thường gặp</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Hướng dẫn sử dụng</a></li>
            </ul>
          </div>

          {/* Pháp lý */}
          <div>
            <h4 className="font-bold text-white mb-4">Pháp lý</h4>
            <ul className="space-y-3">
              <li><a href="#" className="hover:text-white transition-colors">Điều khoản dịch vụ</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Chính sách bảo mật</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Chính sách cookie</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Giấy phép</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-400 text-sm">
              © {currentYear} EduHub. Bảo lưu mọi quyền.
            </p>
            <p className="text-gray-400 text-sm flex items-center gap-1">
              Được tạo với <span className="text-red-500">♥</span> dành cho cộng đồng học tập
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
