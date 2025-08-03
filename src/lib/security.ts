import DOMPurify from 'dompurify';

// Input sanitization utilities
export const sanitizeInput = {
  // Sanitize HTML content
  html: (input: string): string => {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li'],
      ALLOWED_ATTR: []
    });
  },

  // Sanitize text input
  text: (input: string): string => {
    return input
      .replace(/[<>'"&]/g, (char) => {
        const entities: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return entities[char] || char;
      })
      .trim();
  },

  // Sanitize for use in URLs
  url: (input: string): string => {
    return encodeURIComponent(input);
  },

  // Sanitize SQL input (basic protection)
  sql: (input: string): string => {
    return input.replace(/['";\\]/g, '');
  }
};

// Security headers configuration
export const getSecurityHeaders = () => {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  };
};

// Content Security Policy
export const getCSPHeader = (nonce?: string) => {
  const nonceStr = nonce ? ` 'nonce-${nonce}'` : '';
  return `
    default-src 'self';
    script-src 'self'${nonceStr} 'unsafe-inline' https://www.google.com https://www.gstatic.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: https: blob:;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co;
    frame-src 'self' https://www.google.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    upgrade-insecure-requests;
  `.replace(/\s+/g, ' ').trim();
};

// Rate limiting configuration
export const rateLimitConfig = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many authentication attempts, please try again later'
  },
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests, please try again later'
  }
};

// Security event types for audit logging
export const SecurityEventTypes = {
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  PASSWORD_RESET: 'password_reset',
  ROLE_CHANGE: 'role_change',
  ACCOUNT_LOCKED: 'account_locked',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  XSS_ATTEMPT: 'xss_attempt',
  SQL_INJECTION_ATTEMPT: 'sql_injection_attempt',
  UNAUTHORIZED_ACCESS: 'unauthorized_access'
} as const;

// Detect suspicious patterns
export const detectSuspiciousActivity = (input: string): boolean => {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /union\s+select/i,
    /drop\s+table/i,
    /delete\s+from/i,
    /insert\s+into/i,
    /update\s+set/i,
    /'.*or.*'.*=/i
  ];

  return suspiciousPatterns.some(pattern => pattern.test(input));
};