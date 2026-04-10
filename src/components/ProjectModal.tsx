import React, { useEffect, useState } from 'react';
import { Project, Comment } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Eye, Star, MessageCircle, Send, Phone, Mail, ShoppingCart, ShieldCheck, Truck, ChevronRight, ChevronLeft } from 'lucide-react';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { doc, updateDoc, increment, collection, addDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { useSettings } from '../lib/hooks';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const LS_COMMENTS_KEY = 'gallery_comments';
const LS_INQUIRIES_KEY = 'gallery_inquiries';
const LS_PROJECTS_KEY = 'gallery_projects';

interface ProjectModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectModal({ project, isOpen, onClose }: ProjectModalProps) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [hasStarred, setHasStarred] = useState(false);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [localViewCount, setLocalViewCount] = useState(project.viewCount || 0);
  const [localStarCount, setLocalStarCount] = useState(project.starCount || 0);

  // Inquiry form state
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [isInquirySent, setIsInquirySent] = useState(false);

  useEffect(() => {
    if (!isOpen || !project.id) return;

    if (!isFirebaseConfigured) {
      // Local storage fallback for views
      const storedProjects = JSON.parse(localStorage.getItem(LS_PROJECTS_KEY) || '[]');
      const pIdx = storedProjects.findIndex((p: Project) => p.id === project.id);
      if (pIdx >= 0) {
        storedProjects[pIdx].viewCount = (storedProjects[pIdx].viewCount || 0) + 1;
        localStorage.setItem(LS_PROJECTS_KEY, JSON.stringify(storedProjects));
        setLocalViewCount(storedProjects[pIdx].viewCount);
        setLocalStarCount(storedProjects[pIdx].starCount || 0);
      }

      // Local storage fallback for comments
      const storedComments = JSON.parse(localStorage.getItem(LS_COMMENTS_KEY) || '[]');
      const projComments = storedComments.filter((c: Comment) => c.projectId === project.id);
      setComments(projComments.sort((a: Comment, b: Comment) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      return;
    }

    if (!db) return;

    // Increment view count
    const projectRef = doc(db, 'projects', project.id);
    updateDoc(projectRef, { viewCount: increment(1) }).catch(console.error);

    // Fetch comments
    const q = query(
      collection(db, 'comments'),
      where('projectId', '==', project.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const comms: Comment[] = [];
      snapshot.forEach((doc) => {
        comms.push({ id: doc.id, ...doc.data() } as Comment);
      });
      setComments(comms);
    });

    return () => unsubscribe();
  }, [isOpen, project.id]);

  const handleStar = async () => {
    if (!project.id || hasStarred) return;
    
    if (!isFirebaseConfigured) {
      const storedProjects = JSON.parse(localStorage.getItem(LS_PROJECTS_KEY) || '[]');
      const pIdx = storedProjects.findIndex((p: Project) => p.id === project.id);
      if (pIdx >= 0) {
        storedProjects[pIdx].starCount = (storedProjects[pIdx].starCount || 0) + 1;
        localStorage.setItem(LS_PROJECTS_KEY, JSON.stringify(storedProjects));
        setLocalStarCount(storedProjects[pIdx].starCount);
        setHasStarred(true);
      }
      return;
    }

    if (!db) return;
    try {
      const projectRef = doc(db, 'projects', project.id);
      await updateDoc(projectRef, { starCount: increment(1) });
      setHasStarred(true);
    } catch (error) {
      console.error("Error starring project:", error);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !project.id) return;

    const author = user?.displayName || commentAuthor.trim() || 'زائر';
    const commentData = {
      projectId: project.id,
      text: newComment.trim(),
      authorName: author,
      createdAt: new Date().toISOString()
    };

    if (!isFirebaseConfigured) {
      const storedComments = JSON.parse(localStorage.getItem(LS_COMMENTS_KEY) || '[]');
      const newC = { ...commentData, id: Date.now().toString() };
      const updated = [newC, ...storedComments];
      localStorage.setItem(LS_COMMENTS_KEY, JSON.stringify(updated));
      setComments([newC, ...comments]);
      setNewComment('');
      setCommentAuthor('');
      return;
    }

    if (!db) return;
    try {
      await addDoc(collection(db, 'comments'), commentData);
      setNewComment('');
      setCommentAuthor('');
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handleSendInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryName.trim() || !inquiryMessage.trim() || !project.id) return;

    const inquiryData = {
      projectId: project.id,
      projectName: project.name,
      userName: inquiryName.trim(),
      userEmail: inquiryEmail.trim(),
      message: inquiryMessage.trim(),
      createdAt: new Date().toISOString()
    };

    if (!isFirebaseConfigured) {
      const storedInquiries = JSON.parse(localStorage.getItem(LS_INQUIRIES_KEY) || '[]');
      const updated = [{ ...inquiryData, id: Date.now().toString() }, ...storedInquiries];
      localStorage.setItem(LS_INQUIRIES_KEY, JSON.stringify(updated));
      setIsInquirySent(true);
      setInquiryName('');
      setInquiryEmail('');
      setInquiryMessage('');
      return;
    }

    if (!db) return;
    try {
      await addDoc(collection(db, 'inquiries'), inquiryData);
      setIsInquirySent(true);
      setInquiryName('');
      setInquiryEmail('');
      setInquiryMessage('');
    } catch (error) {
      console.error("Error sending inquiry:", error);
    }
  };

  const whatsappLink = `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(`مرحباً، أريد شراء: ${project.name}\nالسعر: ${project.price} ريال`)}`;

  const handleNextImage = () => {
    if (project.images && project.images.length > 0) {
      setCurrentImageIdx((prev) => (prev + 1) % project.images!.length);
    }
  };

  const handlePrevImage = () => {
    if (project.images && project.images.length > 0) {
      setCurrentImageIdx((prev) => (prev - 1 + project.images!.length) % project.images!.length);
    }
  };

  const displayViewCount = isFirebaseConfigured ? project.viewCount + 1 : localViewCount;
  const displayStarCount = isFirebaseConfigured ? project.starCount + (hasStarred ? 1 : 0) : localStarCount;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-6xl max-h-[95vh] overflow-y-auto p-0 border-0 bg-gray-50" dir="rtl">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          
          {/* 1. Images Section (Top Right on Desktop, Top on Mobile) */}
          <div className="lg:col-span-7 bg-white p-6 md:p-8 border-b lg:border-b-0 border-gray-100">
            <div className="aspect-square md:aspect-[4/3] relative overflow-hidden rounded-2xl bg-gray-100 border border-gray-200 mb-4 group shadow-inner">
              {project.images && project.images.length > 0 ? (
                <>
                  <img 
                    src={project.images[currentImageIdx]} 
                    alt={project.name} 
                    className="object-contain w-full h-full transition-opacity duration-500"
                    referrerPolicy="no-referrer"
                  />
                  {project.images.length > 1 && (
                    <>
                      <button 
                        onClick={handlePrevImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 hover:bg-white backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0 text-gray-800 hover:text-primary"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                      <button 
                        onClick={handleNextImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 hover:bg-white backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all transform -translate-x-4 group-hover:translate-x-0 text-gray-800 hover:text-primary"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-sm font-medium tracking-widest">
                        {currentImageIdx + 1} / {project.images.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center w-full h-full text-gray-400">
                  لا توجد صورة
                </div>
              )}
            </div>
            
            {project.images && project.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-4 pt-2 scrollbar-hide snap-x">
                {project.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIdx(idx)}
                    className={`flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border-2 transition-all duration-300 snap-center ${currentImageIdx === idx ? 'border-primary ring-4 ring-primary/20 scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'}`}
                  >
                    <img src={img} alt="" className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Buy & Info Section (Left on Desktop, Middle on Mobile) */}
          <div className="lg:col-span-5 bg-gray-50 p-6 md:p-8 lg:border-r border-gray-100 lg:row-span-2">
            <div className="sticky top-8 space-y-8">
              
              {/* Product Header */}
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h1 className="text-3xl font-black text-gray-900 leading-tight">{project.name}</h1>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
                  <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="font-bold text-gray-900">{displayStarCount}</span>
                    <span>تقييم</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                    <Eye className="w-4 h-4 text-blue-500" />
                    <span className="font-bold text-gray-900">{displayViewCount}</span>
                    <span>مشاهدة</span>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-6">
                  <div className="text-sm text-gray-500 mb-1">السعر</div>
                  <div className="text-4xl font-black text-primary">
                    {project.price} <span className="text-xl font-medium text-gray-500">ريال</span>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
                    <span className="text-gray-600 font-medium">حالة التوفر</span>
                    {project.quantity > 0 ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1 text-sm">
                        متوفر ({project.quantity} قطع)
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="px-3 py-1 text-sm">نفذت الكمية</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {project.quantity > 0 && settings.whatsappNumber ? (
                  <a 
                    href={whatsappLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-full h-14 text-lg font-bold shadow-lg shadow-green-500/20 rounded-xl gap-2 bg-green-600 hover:bg-green-700 text-white transition-colors"
                  >
                    <MessageCircle className="w-6 h-6" />
                    شراء الآن عبر واتساب
                  </a>
                ) : (
                  <Button 
                    className="w-full h-14 text-lg font-bold rounded-xl gap-2 bg-gray-200 text-gray-500 hover:bg-gray-200 cursor-not-allowed"
                    disabled
                  >
                    <ShoppingCart className="w-5 h-5" /> 
                    {project.quantity === 0 ? 'غير متوفر حالياً' : 'رقم التواصل غير متوفر'}
                  </Button>
                )}
                
                <div className="grid grid-cols-2 gap-3">
                  {settings.whatsappNumber ? (
                    <a 
                      href={`tel:${settings.whatsappNumber}`}
                      className="inline-flex items-center justify-center h-12 font-bold rounded-xl gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      اتصال هاتفي
                    </a>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="h-12 font-bold rounded-xl gap-2 border-gray-300 text-gray-400 cursor-not-allowed"
                      disabled
                    >
                      <Phone className="w-4 h-4" /> غير متوفر
                    </Button>
                  )}

                  <Button 
                    variant="outline" 
                    className="h-12 font-bold rounded-xl gap-2 border-gray-300 hover:bg-gray-50 text-gray-700"
                    onClick={handleStar}
                    disabled={hasStarred}
                  >
                    <Star className={`w-4 h-4 ${hasStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    {hasStarred ? 'تم التقييم' : 'أعجبني'}
                  </Button>
                </div>
              </div>

              {settings.contactMessage && (
                <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl mt-4">
                  <p className="text-sm text-blue-800 leading-relaxed text-center font-medium">
                    {settings.contactMessage}
                  </p>
                  {settings.whatsappNumber && (
                    <div className="flex items-center justify-center gap-2 text-blue-600 mt-3 pt-3 border-t border-blue-100/50">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm font-bold font-mono" dir="ltr">{settings.whatsappNumber}</span>
                    </div>
                  )}
                </div>
              )}
              {!settings.contactMessage && settings.whatsappNumber && (
                <div className="flex items-center justify-center gap-2 text-gray-500 mt-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm font-bold font-mono" dir="ltr">{settings.whatsappNumber}</span>
                </div>
              )}

              {/* Trust Badges */}
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-200">
                <div className="flex flex-col items-center text-center gap-2 p-4 bg-white rounded-xl border border-gray-100">
                  <ShieldCheck className="w-8 h-8 text-green-500" />
                  <span className="text-sm font-medium text-gray-700">دفع آمن وموثوق</span>
                </div>
                <div className="flex flex-col items-center text-center gap-2 p-4 bg-white rounded-xl border border-gray-100">
                  <Truck className="w-8 h-8 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700">توصيل سريع</span>
                </div>
              </div>

              {/* Inquiry Form */}
              <Card className="border-0 shadow-none bg-transparent mt-8">
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-xl flex items-center gap-2 text-gray-900">
                    <Mail className="w-5 h-5 text-primary" />
                    لديك استفسار؟
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                  {isInquirySent ? (
                    <div className="text-center py-8 bg-white rounded-2xl border border-green-100">
                      <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Send className="w-6 h-6" />
                      </div>
                      <h4 className="text-lg font-bold text-green-900">تم الإرسال بنجاح!</h4>
                      <p className="text-sm text-gray-600 mt-1">سنتواصل معك قريباً.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleSendInquiry} className="space-y-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                      <div className="space-y-2">
                        <Input 
                          value={inquiryName}
                          onChange={(e) => setInquiryName(e.target.value)}
                          placeholder="الاسم الكريم"
                          required
                          className="bg-gray-50 border-transparent focus:bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Textarea 
                          value={inquiryMessage}
                          onChange={(e) => setInquiryMessage(e.target.value)}
                          placeholder="اكتب استفسارك هنا..."
                          rows={3}
                          required
                          className="bg-gray-50 border-transparent focus:bg-white resize-none"
                        />
                      </div>
                      <Button type="submit" variant="secondary" className="w-full font-bold">
                        إرسال الاستفسار
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>

            </div>
          </div>

          {/* 3. Description & Comments Section (Bottom Right on Desktop, Bottom on Mobile) */}
          <div className="lg:col-span-7 bg-white p-6 md:p-8">
            {/* Description Section */}
            <div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">تفاصيل المنتج</h3>
              <p className="text-gray-600 whitespace-pre-wrap leading-loose text-lg">
                {project.description}
              </p>
            </div>

            {/* Comments Section */}
            <div className="mt-12 pt-8 border-t border-gray-100">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-900">
                <MessageCircle className="w-6 h-6 text-primary" />
                آراء العملاء ({comments.length})
              </h3>
              
              <form onSubmit={handleAddComment} className="space-y-4 mb-8 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                {!user && (
                  <Input 
                    value={commentAuthor}
                    onChange={(e) => setCommentAuthor(e.target.value)}
                    placeholder="الاسم (اختياري)"
                    className="bg-gray-50 border-transparent focus:bg-white h-12"
                  />
                )}
                <div className="flex gap-3">
                  <Input 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="شاركنا رأيك في هذا المنتج..."
                    className="flex-1 bg-gray-50 border-transparent focus:bg-white h-12"
                  />
                  <Button type="submit" disabled={!newComment.trim()} className="px-8 h-12 rounded-xl">
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </form>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-sm">
                          {comment.authorName.charAt(0)}
                        </div>
                        <span className="font-bold text-gray-900">{comment.authorName}</span>
                      </div>
                      <span className="text-sm text-gray-400">
                        {format(new Date(comment.createdAt), 'dd/MM/yyyy', { locale: ar })}
                      </span>
                    </div>
                    <p className="text-gray-600 leading-relaxed mr-10">{comment.text}</p>
                  </div>
                ))}
                {comments.length === 0 && (
                  <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-gray-500 text-lg">لا توجد تقييمات بعد. كن أول من يشارك رأيه!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}

