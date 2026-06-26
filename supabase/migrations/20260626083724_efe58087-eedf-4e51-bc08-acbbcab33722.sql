
-- Grant admin role to cat@eclectichive.com.
-- If the account exists now, insert immediately. Otherwise install a trigger
-- that auto-grants when she signs up / confirms her email.

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) = 'cat@eclectichive.com'
  AND u.email_confirmed_at IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.grant_admin_for_cat_eclectichive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND lower(NEW.email) = 'cat@eclectichive.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_cat ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_cat
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_admin_for_cat_eclectichive();

DROP TRIGGER IF EXISTS on_auth_user_confirmed_grant_cat ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_grant_cat
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_admin_for_cat_eclectichive();
