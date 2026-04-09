import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, setDoc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { Project, SiteStat, SiteSettings } from '../types';

// Local storage fallback keys
const LS_PROJECTS_KEY = 'gallery_projects';
const LS_STATS_KEY = 'gallery_stats';
const LS_SETTINGS_KEY = 'gallery_settings';

export function useSettings() {
  const [settings, setSettings] = useState<SiteSettings>({
    whatsappNumber: '966500000000',
    contactMessage: 'يمكنك التواصل مباشرة مع صاحب المشروع عبر الواتساب للاستفسار السريع أو الشراء.'
  });

  useEffect(() => {
    const stored = localStorage.getItem(LS_SETTINGS_KEY);
    if (stored) {
      setSettings(JSON.parse(stored));
    }
  }, []);

  const saveSettings = (newSettings: SiteSettings) => {
    setSettings(newSettings);
    localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(newSettings));
  };

  return { settings, saveSettings };
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      // Fallback to local storage
      const localProjects = localStorage.getItem(LS_PROJECTS_KEY);
      if (localProjects) {
        setProjects(JSON.parse(localProjects));
      } else {
        // Add some dummy data for preview
        const dummyProjects: Project[] = [
          {
            id: '1',
            name: 'مشروع تجريبي 1',
            description: 'هذا وصف لمشروع تجريبي يظهر عند عدم اتصال قاعدة البيانات.',
            price: 150,
            quantity: 5,
            ownerId: 'local',
            viewCount: 12,
            starCount: 3,
            createdAt: new Date().toISOString(),
            images: ['https://picsum.photos/seed/project1/800/600']
          }
        ];
        setProjects(dummyProjects);
        localStorage.setItem(LS_PROJECTS_KEY, JSON.stringify(dummyProjects));
      }
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projs: Project[] = [];
      snapshot.forEach((doc) => {
        projs.push({ id: doc.id, ...doc.data() } as Project);
      });
      setProjects(projs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching projects:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { projects, loading };
}

export function useSiteStats() {
  const [stats, setStats] = useState<SiteStat | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      // Fallback to local storage
      const localStats = localStorage.getItem(LS_STATS_KEY);
      if (localStats) {
        const parsed = JSON.parse(localStats);
        parsed.totalVisits += 1;
        setStats(parsed);
        localStorage.setItem(LS_STATS_KEY, JSON.stringify(parsed));
      } else {
        const initialStats = { totalVisits: 1 };
        setStats(initialStats);
        localStorage.setItem(LS_STATS_KEY, JSON.stringify(initialStats));
      }
      return;
    }

    const statRef = doc(db, 'site_stats', 'global');
    
    // Increment on load
    const incrementStats = async () => {
      try {
        const docSnap = await getDoc(statRef);
        if (docSnap.exists()) {
          await updateDoc(statRef, { totalVisits: increment(1) });
        }
      } catch (error) {
        console.error("Error incrementing stats:", error);
      }
    };
    incrementStats();

    const unsubscribe = onSnapshot(statRef, (docSnap) => {
      if (docSnap.exists()) {
        setStats({ id: docSnap.id, ...docSnap.data() } as SiteStat);
      }
    });

    return () => unsubscribe();
  }, []);

  return { stats };
}
