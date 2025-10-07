import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

  useEffect(() => {
    localStorage.setItem('notificationsEnabled', JSON.stringify(notificationsEnabled));
  }, [notificationsEnabled]);

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
