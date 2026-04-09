import React, { useState, useMemo } from 'react';
import { useProjects, useSiteStats } from '../lib/hooks';
import { ProjectCard } from './ProjectCard';
import { Users, Search, ShoppingBag } from 'lucide-react';
import { Input } from './ui/input';
import { isFirebaseConfigured } from '../lib/firebase';

import { motion } from 'motion/react';

export function Gallery() {
  const { projects, loading } = useProjects();
  const { stats } = useSiteStats();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase().trim();
    return projects.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.description.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

  if (loading && isFirebaseConfigured) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-12"
    >
      {/* Storefront Hero Header */}
      <div className="relative bg-gradient-to-br from-primary/5 via-primary/10 to-transparent rounded-3xl p-8 md:p-12 overflow-hidden border border-primary/10">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex-1 space-y-6 text-center md:text-right">
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full text-primary font-medium text-sm shadow-sm border border-primary/10">
              <ShoppingBag className="w-4 h-4" />
              <span>متجرك المفضل للتسوق</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight">
              اكتشف أحدث <span className="text-primary">المنتجات</span> والمشاريع
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl leading-relaxed">
              تصفح مجموعتنا المميزة من المنتجات المختارة بعناية. تسوق الآن واستمتع بتجربة شراء فريدة ومباشرة.
            </p>
            
            <div className="relative max-w-xl w-full mx-auto md:mx-0 mt-8">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input 
                className="pr-12 h-14 text-lg bg-white/90 backdrop-blur-sm border-gray-200 focus:bg-white transition-all shadow-sm rounded-2xl"
                placeholder="ابحث عن منتج، مشروع، أو كلمة مفتاحية..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="hidden lg:flex flex-col gap-4">
            <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">إجمالي الزيارات</p>
                <p className="text-2xl font-black text-gray-900">{stats?.totalVisits || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Section */}
      <div>
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">المنتجات المتاحة</h2>
            <p className="text-gray-500 mt-1">عرض {filteredProjects.length} منتج</p>
          </div>
        </div>

        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {filteredProjects.map((project, idx) => (
              <ProjectCard key={project.id || idx} project={project} />
            ))}
          </div>
        ) : (
          <div className="text-center py-32 bg-white rounded-3xl border border-gray-100 border-dashed">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد منتجات حالياً'}
            </h3>
            <p className="text-gray-500 text-lg">
              {searchQuery ? 'جرب البحث بكلمات أخرى أو تصفح الأقسام.' : 'يرجى العودة لاحقاً لمشاهدة المنتجات الجديدة.'}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
