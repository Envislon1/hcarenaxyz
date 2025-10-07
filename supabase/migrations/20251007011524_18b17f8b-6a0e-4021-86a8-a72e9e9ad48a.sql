-- 1. Create trigger to auto-assign admin role when email is added to admin_emails
CREATE OR REPLACE FUNCTION public.sync_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When an email is added to admin_emails, grant admin role to that user
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT au.id, 'admin'::app_role
    FROM auth.users au
    WHERE au.email = NEW.email
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  -- When an email is removed from admin_emails, revoke admin role
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.user_roles
    WHERE user_id IN (
      SELECT au.id
      FROM auth.users au
      WHERE au.email = OLD.email
    )
    AND role = 'admin'::app_role;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER sync_admin_role_trigger
AFTER INSERT OR DELETE ON public.admin_emails
FOR EACH ROW
EXECUTE FUNCTION public.sync_admin_role();

-- 2. Auto-cleanup triggers for temporary tables after game completion
CREATE OR REPLACE FUNCTION public.cleanup_game_temp_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a game is completed, canceled, or ends in draw, delete related temporary data
  IF NEW.status IN ('completed', 'cancelled', 'draw') AND OLD.status = 'active' THEN
    DELETE FROM public.takeback_requests WHERE game_id = NEW.id;
    DELETE FROM public.draw_offers WHERE game_id = NEW.id;
    DELETE FROM public.rematch_offers WHERE original_game_id = NEW.id AND status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER cleanup_game_temp_data_trigger
AFTER UPDATE ON public.games
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_game_temp_data();

-- 3. Create storage buckets for app downloads with versioning
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('windows-exe', 'windows-exe', true, 524288000, ARRAY['application/x-msdownload', 'application/x-exe', 'application/octet-stream']),
  ('android-apk', 'android-apk', true, 524288000, ARRAY['application/vnd.android.package-archive', 'application/octet-stream'])
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to download buckets
CREATE POLICY "Public can download Windows exe"
ON storage.objects FOR SELECT
USING (bucket_id = 'windows-exe');

CREATE POLICY "Public can download Android APK"
ON storage.objects FOR SELECT
USING (bucket_id = 'android-apk');

-- Admins can upload to buckets
CREATE POLICY "Admins can upload Windows exe"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'windows-exe' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can upload Android APK"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'android-apk' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete Windows exe"
ON storage.objects FOR DELETE
USING (bucket_id = 'windows-exe' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete Android APK"
ON storage.objects FOR DELETE
USING (bucket_id = 'android-apk' AND has_role(auth.uid(), 'admin'::app_role));