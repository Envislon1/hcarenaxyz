import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface NotificationContextType {
  notificationsEnabled: boolean;
  toggleNotifications: () => void;
  playSound: (soundPath: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem('notificationsEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
      
      // Load from database if user is logged in
      if (session?.user?.id) {
        supabase
          .from('profiles')
          .select('notifications_enabled')
          .eq('id', session.user.id)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              setNotificationsEnabled(data.notifications_enabled ?? true);
              localStorage.setItem('notificationsEnabled', JSON.stringify(data.notifications_enabled ?? true));
            }
          });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
      
      // Load from database when user logs in
      if (session?.user?.id) {
        supabase
          .from('profiles')
          .select('notifications_enabled')
          .eq('id', session.user.id)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              setNotificationsEnabled(data.notifications_enabled ?? true);
              localStorage.setItem('notificationsEnabled', JSON.stringify(data.notifications_enabled ?? true));
            }
          });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Save to both localStorage and database
  useEffect(() => {
    localStorage.setItem('notificationsEnabled', JSON.stringify(notificationsEnabled));
    
    if (userId) {
      supabase
        .from('profiles')
        .update({ notifications_enabled: notificationsEnabled })
        .eq('id', userId)
        .then(({ error }) => {
          if (error) console.error('Error updating notification preference:', error);
        });
    }
  }, [notificationsEnabled, userId]);

  const toggleNotifications = () => {
    setNotificationsEnabled(prev => !prev);
  };

  const playSound = (soundPath: string) => {
    if (notificationsEnabled) {
      const audio = new Audio(soundPath);
      audio.play().catch(err => console.error('Error playing sound:', err));
    }
  };

  return (
    <NotificationContext.Provider 
      value={{ 
        notificationsEnabled, 
        toggleNotifications,
        playSound 
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
