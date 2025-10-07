-- Assign admin roles to existing users whose emails are in admin_emails
DO $$
DECLARE
  admin_user RECORD;
BEGIN
  FOR admin_user IN 
    SELECT u.id, u.email
    FROM auth.users u
    INNER JOIN public.admin_emails ae ON u.email = ae.email
  LOOP
    -- Insert admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Ensure user role exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user.id, 'user'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END $$;