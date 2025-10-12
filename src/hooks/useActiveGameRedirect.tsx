import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook that redirects users to their active game if they have one
 * Excludes game page itself to avoid redirect loops
 */
export const useActiveGameRedirect = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: activeGame } = useQuery({
    queryKey: ['activeGameRedirect', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
        
      if (error) {
        console.error('Error checking for active game:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!user,
    refetchInterval: (query) => {
      // Stop refetching if on game page or if game is not active
      const data = query.state.data;
      if (!data || location.pathname.startsWith('/game/')) {
        return false;
      }
      return 3000; // Check every 3 seconds otherwise
    },
  });

  useEffect(() => {
    // Don't redirect if already on game page or login/register pages
    const isOnGamePage = location.pathname.startsWith('/game/');
    const isOnAuthPage = ['/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname);
    
    // Only redirect if game is truly active (status === 'active')
    if (activeGame && activeGame.status === 'active' && !isOnGamePage && !isOnAuthPage) {
      console.log('Active game detected, redirecting to game page');
      navigate(`/game/${activeGame.id}`, { replace: true });
    }
  }, [activeGame, location.pathname, navigate]);

  return { activeGame };
};
