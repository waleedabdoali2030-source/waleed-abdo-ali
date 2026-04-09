import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  isLocalAdmin: boolean;
  loginLocalAdmin: (user: string, pass: string) => boolean;
  logoutLocalAdmin: () => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  isAdmin: false, 
  loading: true,
  isLocalAdmin: false,
  loginLocalAdmin: () => false,
  logoutLocalAdmin: () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLocalAdmin, setIsLocalAdmin] = useState(false);

  useEffect(() => {
    // Check local admin state
    setIsLocalAdmin(localStorage.getItem('local_admin') === 'true');

    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginLocalAdmin = (username: string, pass: string) => {
    if (username === 'kamal' && pass === 'kamal2026') {
      localStorage.setItem('local_admin', 'true');
      setIsLocalAdmin(true);
      return true;
    }
    return false;
  };

  const logoutLocalAdmin = () => {
    localStorage.removeItem('local_admin');
    setIsLocalAdmin(false);
  };

  const isAdmin = user?.email === 'waleedabdoali2030@gmail.com' || isLocalAdmin;

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, isLocalAdmin, loginLocalAdmin, logoutLocalAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};
