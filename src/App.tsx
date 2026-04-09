import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Gallery } from './components/Gallery';
import { AdminDashboard } from './components/AdminDashboard';
import { loginWithGoogle, logout, isFirebaseConfigured } from './lib/firebase';
import { Button } from './components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './components/ui/dialog';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Store, Settings, LogIn, LogOut } from 'lucide-react';

function Navigation() {
  const { user, isAdmin, isLocalAdmin, loginLocalAdmin, logoutLocalAdmin } = useAuth();
  const isLocalMode = !isFirebaseConfigured;
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLocalLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginLocalAdmin(username, password)) {
      setIsLoginModalOpen(false);
      setUsername('');
      setPassword('');
      setLoginError('');
    } else {
      setLoginError('اسم المستخدم أو كلمة المرور غير صحيحة');
    }
  };

  const handleLogout = () => {
    if (isLocalAdmin) {
      logoutLocalAdmin();
    } else {
      logout();
    }
  };

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <Store className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 group-hover:text-primary transition-colors">متجري</h1>
                <p className="text-xs text-gray-500 font-medium">أفضل المنتجات بأفضل الأسعار</p>
              </div>
            </Link>
            
            <div className="flex items-center gap-4">
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="default" className="gap-2 font-bold shadow-sm rounded-xl h-11 px-6">
                    <Settings className="w-4 h-4" />
                    لوحة التحكم {isLocalAdmin && '(محلي)'}
                  </Button>
                </Link>
              )}
              {user || isLocalAdmin ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-600 hidden sm:inline-block bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                    {isLocalAdmin ? 'المدير' : user?.displayName}
                  </span>
                  <Button variant="outline" onClick={handleLogout} className="gap-2 rounded-xl h-11 border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200">
                    <LogOut className="w-4 h-4" />
                    خروج
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  className="gap-2 font-bold rounded-xl h-11 px-6 border-gray-200 hover:bg-gray-50"
                  onClick={() => setIsLoginModalOpen(true)}
                >
                  <LogIn className="w-4 h-4" />
                  تسجيل دخول الإدارة
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <Dialog open={isLoginModalOpen} onOpenChange={setIsLoginModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center mb-2">تسجيل دخول الإدارة</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLocalLogin} className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="font-bold">اسم المستخدم</Label>
              <Input 
                id="username" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required 
                className="h-12 bg-gray-50"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-bold">كلمة المرور</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className="h-12 bg-gray-50"
                dir="ltr"
              />
            </div>
            {loginError && <p className="text-sm font-bold text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">{loginError}</p>}
            <Button type="submit" className="w-full h-12 text-lg font-bold rounded-xl shadow-md">دخول للوحة التحكم</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50/50 font-sans" dir="rtl">
          <Navigation />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <Routes>
              <Route path="/" element={<Gallery />} />
              <Route path="/admin" element={<AdminDashboard />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}
