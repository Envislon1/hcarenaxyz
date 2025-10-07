import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useVersionCheck = () => {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    platform: string;
    version: string;
    downloadUrl: string;
  } | null>(null);

  // Check for files in storage buckets
  const { data: windowsFiles } = useQuery({
    queryKey: ['windows-downloads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .storage
        .from('windows-exe')
        .list('', { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });

      if (error) throw error;
      return data;
    },
    refetchInterval: 60000,
  });

  const { data: androidFiles } = useQuery({
    queryKey: ['android-downloads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .storage
        .from('android-apk')
        .list('', { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });

      if (error) throw error;
      return data;
    },
    refetchInterval: 60000,
  });

  useEffect(() => {
    // Only show download prompt for native apps (Capacitor)
    // Check if running in Capacitor native app
    const isCapacitor = !!(window as any).Capacitor;
    
    if (!isCapacitor) {
      // Don't show download prompt for web platforms
      return;
    }

    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    const isMobile = /Android/i.test(navigator.userAgent);
    const isWindows = /Windows/i.test(navigator.userAgent);

    if (isWindows && isDesktop && windowsFiles && windowsFiles.length > 0) {
      const latestFile = windowsFiles[0];
      const { data: publicUrl } = supabase.storage
        .from('windows-exe')
        .getPublicUrl(latestFile.name);
      
      setUpdateInfo({
        platform: 'windows',
        version: latestFile.metadata?.version || '1.0.0',
        downloadUrl: publicUrl.publicUrl,
      });
      setShowUpdatePrompt(true);
    } else if (isMobile && androidFiles && androidFiles.length > 0) {
      const latestFile = androidFiles[0];
      const { data: publicUrl } = supabase.storage
        .from('android-apk')
        .getPublicUrl(latestFile.name);
      
      setUpdateInfo({
        platform: 'android',
        version: latestFile.metadata?.version || '1.0.0',
        downloadUrl: publicUrl.publicUrl,
      });
      setShowUpdatePrompt(true);
    }
  }, [windowsFiles, androidFiles]);

  const dismissUpdate = () => {
    setShowUpdatePrompt(false);
  };

  return {
    showUpdatePrompt,
    updateInfo,
    dismissUpdate,
  };
};
