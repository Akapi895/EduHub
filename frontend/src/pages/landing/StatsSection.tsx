import { GraduationCap, Users, BookMarked, Trophy, TrendingUp, Award, Clock } from 'lucide-react';

const StatsSection = () => {
  const stats = [
    {
      icon: Users,
      value: '10,000+',
      label: 'Học sinh',
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      icon: GraduationCap,
      value: '500+',
      label: 'Giáo viên',
      gradient: 'from-purple-500 to-purple-600',
    },
    {
      icon: BookMarked,
      value: '1,000+',
      label: 'Tài liệu học tập',
      gradient: 'from-green-500 to-green-600',
    },
    {
      icon: Trophy,
      value: '95%',
      label: 'Tỷ lệ thành công',
      gradient: 'from-orange-500 to-orange-600',
    },
  ];

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div 
                key={index} 
                className="text-center p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br ${stat.gradient} rounded-2xl mb-4 shadow-lg`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">
                  {stat.value}
                </div>
                <div className="text-gray-600 font-medium">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
