-- Enable leaked password protection in auth settings
UPDATE auth.config 
SET enable_password_breach_check = true;