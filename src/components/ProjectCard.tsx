import React, { useState } from 'react';
import { Project } from '../types';
import { Card, CardContent, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import { Eye, Star, ShoppingCart } from 'lucide-react';
import { ProjectModal } from './ProjectModal';
import { motion } from 'motion/react';
import { Button } from './ui/button';

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="h-full"
    >
      <Card 
        className="flex flex-col h-full overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 border-gray-100 group bg-white"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="aspect-[4/3] relative overflow-hidden bg-gray-50">
          {project.images && project.images.length > 0 ? (
            <img 
              src={project.images[0]} 
              alt={project.name} 
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700 ease-out"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-gray-400">
              لا توجد صورة
            </div>
          )}
          
          {/* Overlays */}
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            {project.quantity === 0 && (
              <Badge variant="destructive" className="font-bold shadow-sm">نفذت الكمية</Badge>
            )}
            {project.quantity > 0 && project.quantity <= 5 && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 font-bold shadow-sm">كمية محدودة</Badge>
            )}
          </div>
          
          <div className="absolute top-3 left-3">
            <div className="bg-white/90 backdrop-blur-sm text-gray-900 font-black px-3 py-1.5 rounded-lg shadow-sm">
              {project.price} <span className="text-xs font-normal text-gray-500">ريال</span>
            </div>
          </div>
        </div>

        <CardContent className="p-5 flex-grow flex flex-col">
          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-primary transition-colors">{project.name}</h3>
          <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed flex-grow">{project.description}</p>
        </CardContent>

        <CardFooter className="p-5 pt-0 flex flex-col gap-4">
          <div className="flex justify-between items-center w-full text-gray-400 text-sm">
            <div className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              <span>{project.viewCount || 0}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-gray-600 font-medium">{project.starCount || 0}</span>
            </div>
          </div>
          
          <Button 
            className="w-full gap-2 font-bold shadow-sm group-hover:bg-primary/90 transition-colors"
            variant={project.quantity > 0 ? "default" : "secondary"}
            disabled={project.quantity === 0}
          >
            <ShoppingCart className="w-4 h-4" />
            {project.quantity > 0 ? 'عرض التفاصيل والشراء' : 'غير متوفر حالياً'}
          </Button>
        </CardFooter>
      </Card>

      {isModalOpen && (
        <ProjectModal 
          project={project} 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </motion.div>
  );
}
