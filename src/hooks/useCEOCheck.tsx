import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export const useCEOCheck = () => {
  const { user } = useAuth();

  const { data: isCEO, isLoading } = useQuery({
    queryKey: ['is-ceo', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'ceo')
        .maybeSingle();

      if (error) {
        console.error('Error checking CEO status:', error);
        return false;
      }

      return !!data;
    },
    enabled: !!user?.id,
  });

  return { isCEO: !!isCEO, isLoading };
};
