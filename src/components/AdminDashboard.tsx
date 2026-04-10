import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useProjects, useSettings } from '../lib/hooks';
import { Navigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Project, Inquiry } from '../types';
import { Plus, Trash2, Edit, Image as ImageIcon, X, Mail, Settings, UploadCloud, Save } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const LS_PROJECTS_KEY = 'gallery_projects';
const LS_INQUIRIES_KEY = 'gallery_inquiries';

export function AdminDashboard() {
  const { isAdmin, user } = useAuth();
  const isLocalMode = !isFirebaseConfigured;

  const { projects: hookProjects, loading } = useProjects();
  const { settings, saveSettings } = useSettings();
  const [localProjects, setLocalProjects] = useState<Project[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [activeTab, setActiveTab] = useState<'projects' | 'inquiries' | 'settings'>('projects');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings state
  const [whatsappNumber, setWhatsappNumber] = useState(settings.whatsappNumber);
  const [contactMessage, setContactMessage] = useState(settings.contactMessage);
  const [storeName, setStoreName] = useState(settings.storeName || 'متجري');
  const [heroTitle, setHeroTitle] = useState(settings.heroTitle || 'اكتشف أحدث المنتجات والمشاريع');
  const [heroSubtitle, setHeroSubtitle] = useState(settings.heroSubtitle || 'تصفح مجموعتنا المميزة من المنتجات المختارة بعناية. تسوق الآن واستمتع بتجربة شراء فريدة ومباشرة.');
  const [heroBackgroundImage, setHeroBackgroundImage] = useState(settings.heroBackgroundImage || '');
  const [isSettingsSaved, setIsSettingsSaved] = useState(false);
  const heroImageInputRef = useRef<HTMLInputElement>(null);

  const displayProjects = isLocalMode ? localProjects : hookProjects;

  useEffect(() => {
    setWhatsappNumber(settings.whatsappNumber);
    setContactMessage(settings.contactMessage);
    setStoreName(settings.storeName || 'متجري');
    setHeroTitle(settings.heroTitle || 'اكتشف أحدث المنتجات والمشاريع');
    setHeroSubtitle(settings.heroSubtitle || 'تصفح مجموعتنا المميزة من المنتجات المختارة بعناية. تسوق الآن واستمتع بتجربة شراء فريدة ومباشرة.');
    setHeroBackgroundImage(settings.heroBackgroundImage || '');
  }, [settings]);

  useEffect(() => {
    if (isLocalMode) {
      const stored = localStorage.getItem(LS_PROJECTS_KEY);
      if (stored) setLocalProjects(JSON.parse(stored));
      
      const storedInq = localStorage.getItem(LS_INQUIRIES_KEY);
      if (storedInq) setInquiries(JSON.parse(storedInq));
      return;
    }

    if (!isAdmin || !db) return;

    const q = query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const inqs: Inquiry[] = [];
      snapshot.forEach((doc) => {
        inqs.push({ id: doc.id, ...doc.data() } as Inquiry);
      });
      setInquiries(inqs);
    });

    return () => unsubscribe();
  }, [isAdmin, isLocalMode]);

  if (!isAdmin) {
    return <Navigate to="/" />;
  }

  const resetForm = () => {
    setName('');
    setDescription('');
    setPrice('');
    setQuantity('');
    setImages([]);
    setEditingProject(null);
    setIsFormOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEdit = (project: Project) => {
    setName(project.name);
    setDescription(project.description);
    setPrice(project.price.toString());
    setQuantity(project.quantity.toString());
    setImages(project.images || []);
    setEditingProject(project);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
      if (isLocalMode) {
        const updated = localProjects.filter(p => p.id !== id);
        setLocalProjects(updated);
        localStorage.setItem(LS_PROJECTS_KEY, JSON.stringify(updated));
        window.location.reload();
        return;
      }

      if (!db) return;
      try {
        await deleteDoc(doc(db, 'projects', id));
      } catch (error) {
        console.error("Error deleting project:", error);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Check if adding these files exceeds a reasonable local storage limit (rough estimate)
    if (isLocalMode && images.length + files.length > 5) {
      alert("في وضع التجربة المحلية، يفضل عدم رفع أكثر من 5 صور لتجنب امتلاء الذاكرة المؤقتة.");
      return;
    }

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    
    // Reset input so the same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const projectData = {
      name,
      description,
      price: Number(price),
      quantity: Number(quantity),
      images,
      ownerId: user?.uid || 'local',
    };

    if (isLocalMode) {
      let updated: Project[];
      if (editingProject && editingProject.id) {
        updated = localProjects.map(p => 
          p.id === editingProject.id ? { ...p, ...projectData } : p
        );
      } else {
        const newProj: Project = {
          ...projectData,
          id: Date.now().toString(),
          viewCount: 0,
          starCount: 0,
          createdAt: new Date().toISOString(),
        };
        updated = [newProj, ...localProjects];
      }
      
      try {
        localStorage.setItem(LS_PROJECTS_KEY, JSON.stringify(updated));
        setLocalProjects(updated);
        resetForm();
        window.location.reload(); // Refresh to sync with Gallery
      } catch (e) {
        alert("عذراً، مساحة التخزين المحلية ممتلئة بسبب حجم الصور الكبير. يرجى حذف بعض المنتجات أو استخدام صور بحجم أصغر.");
      }
      return;
    }

    if (!db) return;

    try {
      if (editingProject && editingProject.id) {
        await updateDoc(doc(db, 'projects', editingProject.id), projectData);
      } else {
        await addDoc(collection(db, 'projects'), {
          ...projectData,
          viewCount: 0,
          starCount: 0,
          createdAt: new Date().toISOString(),
        });
      }
      resetForm();
    } catch (error) {
      console.error("Error saving project:", error);
      alert("حدث خطأ أثناء الحفظ. تأكد من صحة البيانات.");
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings({
      whatsappNumber,
      contactMessage,
      storeName,
      heroTitle,
      heroSubtitle,
      heroBackgroundImage
    });
    setIsSettingsSaved(true);
    setTimeout(() => setIsSettingsSaved(false), 3000);
  };

  const handleHeroImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setHeroBackgroundImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    if (heroImageInputRef.current) heroImageInputRef.current.value = '';
  };

  return (
    <div className="space-y-8">
      {isLocalMode && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
          <strong>وضع التجربة المحلية:</strong> أنت الآن تستخدم التطبيق ببيانات محلية مؤقتة. الصور المرفوعة سيتم حفظها في متصفحك.
        </div>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">إدارة المتجر</h1>
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <Button 
            variant={activeTab === 'projects' ? 'default' : 'ghost'} 
            onClick={() => setActiveTab('projects')}
            className="gap-2"
          >
            <ImageIcon className="w-4 h-4" />
            المنتجات
          </Button>
          <Button 
            variant={activeTab === 'inquiries' ? 'default' : 'ghost'} 
            onClick={() => setActiveTab('inquiries')}
            className="gap-2"
          >
            <Mail className="w-4 h-4" />
            الطلبات والاستفسارات
            {inquiries.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {inquiries.length}
              </span>
            )}
          </Button>
          <Button 
            variant={activeTab === 'settings' ? 'default' : 'ghost'} 
            onClick={() => setActiveTab('settings')}
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            الإعدادات
          </Button>
        </div>
      </div>

      {activeTab === 'projects' && (
        <div className="space-y-8">
          <div className="flex justify-end">
            {!isFormOpen && (
              <Button onClick={() => setIsFormOpen(true)} className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-md">
                <Plus className="w-4 h-4" />
                إضافة منتج جديد
              </Button>
            )}
          </div>

          {isFormOpen && (
            <Card className="border-primary/20 shadow-lg">
              <CardHeader className="bg-gray-50/50 border-b">
                <CardTitle className="text-xl text-primary">{editingProject ? 'تعديل المنتج' : 'إضافة منتج جديد'}</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-base font-medium">اسم المنتج</Label>
                      <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="مثال: حذاء رياضي، ساعة يد..." className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price" className="text-base font-medium">السعر (ريال)</Label>
                      <Input id="price" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="0.00" className="h-11" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="description" className="text-base font-medium">وصف المنتج</Label>
                      <Textarea id="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="اكتب وصفاً جذاباً للمنتج ومميزاته..." className="resize-none" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity" className="text-base font-medium">الكمية المتوفرة في المخزون</Label>
                      <Input id="quantity" type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} required className="h-11" />
                    </div>
                    
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-base font-medium">صور المنتج</Label>
                      
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <UploadCloud className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-600 font-medium">اضغط هنا لاختيار الصور من جهازك</p>
                        <p className="text-xs text-gray-400 mt-1">يمكنك اختيار أكثر من صورة معاً (حدد عدة صور أو اسحبها هنا)</p>
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          multiple 
                          accept="image/*"
                          className="hidden"
                        />
                      </div>
                      
                      {images.length > 0 && (
                        <div className="flex gap-4 flex-wrap mt-4">
                          {images.map((img, idx) => (
                            <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-100 shadow-sm group">
                              <img src={img} alt="" className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                              <button 
                                type="button"
                                onClick={() => handleRemoveImage(idx)}
                                className="absolute top-1 right-1 bg-red-500/90 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-6 border-t">
                    <Button type="button" variant="outline" onClick={resetForm} className="px-6">إلغاء</Button>
                    <Button type="submit" className="px-8 bg-primary hover:bg-primary/90 text-white shadow-md">
                      {editingProject ? 'حفظ التعديلات' : 'نشر المنتج'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-gray-50 text-gray-600 border-b">
                  <tr>
                    <th className="p-4 font-medium">المنتج</th>
                    <th className="p-4 font-medium">السعر</th>
                    <th className="p-4 font-medium">المخزون</th>
                    <th className="p-4 font-medium">المشاهدات</th>
                    <th className="p-4 font-medium text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading && !isLocalMode ? (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">جاري التحميل...</td></tr>
                  ) : displayProjects.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">لا توجد منتجات مضافة</td></tr>
                  ) : (
                    displayProjects.map((project) => (
                      <tr key={project.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                              {project.images?.[0] ? (
                                <img src={project.images[0]} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <ImageIcon className="w-6 h-6 m-3 text-gray-400" />
                              )}
                            </div>
                            <span className="font-bold text-gray-900">{project.name}</span>
                          </div>
                        </td>
                        <td className="p-4 font-bold text-primary">{project.price} ريال</td>
                        <td className="p-4">
                          <Badge variant={project.quantity > 0 ? "outline" : "destructive"} className={project.quantity > 0 ? "bg-green-50 text-green-700 border-green-200" : ""}>
                            {project.quantity > 0 ? `${project.quantity} متوفر` : 'نفذت الكمية'}
                          </Badge>
                        </td>
                        <td className="p-4 text-gray-600">{project.viewCount || 0}</td>
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(project)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => project.id && handleDelete(project.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'inquiries' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {inquiries.length === 0 ? (
            <div className="col-span-full text-center py-20 bg-white rounded-xl border border-dashed border-gray-200">
              <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">لا توجد طلبات أو استفسارات جديدة حالياً</p>
            </div>
          ) : (
            inquiries.map((inq) => (
              <Card key={inq.id} className="hover:shadow-md transition-shadow border-t-4 border-t-primary">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="secondary" className="mb-2 bg-blue-50 text-blue-700">{inq.projectName}</Badge>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {format(new Date(inq.createdAt), 'dd/MM/yyyy HH:mm', { locale: ar })}
                    </span>
                  </div>
                  <CardTitle className="text-lg">{inq.userName}</CardTitle>
                  {inq.userEmail && (
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <Mail className="w-3 h-3" />
                      {inq.userEmail}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap border border-gray-100 leading-relaxed">
                    {inq.message}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <Card className="max-w-2xl mx-auto shadow-sm">
          <CardHeader>
            <CardTitle>إعدادات المتجر والتواصل</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="space-y-4 border-b pb-6">
                <h3 className="text-lg font-bold text-gray-900">الهوية البصرية للمتجر</h3>
                <div className="space-y-2">
                  <Label htmlFor="storeName" className="text-base font-medium">اسم المتجر</Label>
                  <Input 
                    id="storeName" 
                    value={storeName} 
                    onChange={(e) => setStoreName(e.target.value)} 
                    placeholder="مثال: متجري"
                    required 
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heroTitle" className="text-base font-medium">العنوان الرئيسي (في أعلى الصفحة)</Label>
                  <Input 
                    id="heroTitle" 
                    value={heroTitle} 
                    onChange={(e) => setHeroTitle(e.target.value)} 
                    placeholder="مثال: اكتشف أحدث المنتجات"
                    required 
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heroSubtitle" className="text-base font-medium">الوصف الفرعي</Label>
                  <Textarea 
                    id="heroSubtitle" 
                    rows={2} 
                    value={heroSubtitle} 
                    onChange={(e) => setHeroSubtitle(e.target.value)} 
                    required 
                    className="resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-medium">صورة الخلفية (اختياري)</Label>
                  <div className="flex items-center gap-4">
                    {heroBackgroundImage && (
                      <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-gray-200">
                        <img src={heroBackgroundImage} alt="Background" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => setHeroBackgroundImage('')}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => heroImageInputRef.current?.click()}
                      className="gap-2"
                    >
                      <ImageIcon className="w-4 h-4" />
                      {heroBackgroundImage ? 'تغيير الصورة' : 'اختيار صورة'}
                    </Button>
                    <input 
                      type="file" 
                      ref={heroImageInputRef}
                      onChange={handleHeroImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                  <p className="text-xs text-gray-500">صورة تظهر كخلفية للقسم العلوي في الصفحة الرئيسية لجذب الزبائن.</p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h3 className="text-lg font-bold text-gray-900">إعدادات التواصل</h3>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp" className="text-base font-medium">رقم الواتساب (لاستقبال الطلبات)</Label>
                  <Input 
                    id="whatsapp" 
                    value={whatsappNumber} 
                    onChange={(e) => setWhatsappNumber(e.target.value)} 
                    placeholder="مثال: 966500000000"
                    required 
                    className="h-11 text-left"
                    dir="ltr"
                  />
                  <p className="text-xs text-gray-500">سيتم توجيه العملاء لهذا الرقم عند الضغط على زر الشراء أو التواصل.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactMessage" className="text-base font-medium">رسالة الشراء/التواصل</Label>
                  <Textarea 
                    id="contactMessage" 
                    rows={3} 
                    value={contactMessage} 
                    onChange={(e) => setContactMessage(e.target.value)} 
                    required 
                    className="resize-none"
                  />
                  <p className="text-xs text-gray-500">النص الذي يظهر للعملاء لتشجيعهم على إتمام عملية الشراء.</p>
                </div>
              </div>
              <div className="flex items-center gap-4 pt-4 border-t">
                <Button type="submit" className="px-8">
                  <Save className="w-4 h-4 mr-2" />
                  حفظ الإعدادات
                </Button>
                {isSettingsSaved && <span className="text-green-600 text-sm font-medium bg-green-50 px-3 py-1 rounded-full">تم الحفظ بنجاح!</span>}
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
