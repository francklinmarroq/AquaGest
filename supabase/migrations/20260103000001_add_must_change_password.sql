-- Add must_change_password field to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- Comment explaining the field
COMMENT ON COLUMN profiles.must_change_password IS 'When true, user must change password on next login';
