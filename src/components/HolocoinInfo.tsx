import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Info } from "lucide-react";

export const HolocoinInfo = () => {
  const { data: settings } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'currency_conversion')
        .single();
        
      if (error) throw error;
      return data.setting_value as { naira_per_holocoin: number; platform_fee_percentage: number };
    }
  });

  if (!settings) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Info className="w-4 h-4" />
      <span>
        1 Holocoin = ₦{settings.naira_per_holocoin}
      </span>
    </div>
  );
};
