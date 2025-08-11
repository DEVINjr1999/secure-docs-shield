-- Enable pgcrypto for digest() used in verify_security_answers
CREATE EXTENSION IF NOT EXISTS pgcrypto;