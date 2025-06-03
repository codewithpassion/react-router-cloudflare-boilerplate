# Specification: Add Resend for Magic Link Email Delivery

## Overview

Replace the current console.log-based magic link delivery with Resend email service to enable actual email delivery for user authentication.

## Current State Analysis

**Current Implementation:**
- Magic link authentication configured with `better-auth`
- `sendMagicLink` function only logs to console (`workers/auth.ts:34-42`)
- No actual email delivery mechanism
- Magic link URLs generated but not transmitted to users

**Issues:**
- Users cannot receive authentication emails
- Development-only implementation in production code
- No email templates or branding
- Missing email delivery error handling

## Requirements

### Functional Requirements
- Send magic link emails using Resend API
- Professional email templates with branding
- Support for both development and production environments
- Email delivery status tracking and error handling
- Rate limiting protection for email sending
- Email template localization support

### Non-Functional Requirements
- 99.9% email delivery reliability
- < 2 second email sending response time
- Secure API key management
- Proper error logging and monitoring
- GDPR/privacy compliance for email handling

## Technical Implementation

### 1. Dependencies

Add Resend SDK to project:

```json
{
  "dependencies": {
    "resend": "^3.0.0"
  }
}
```

### 2. Environment Configuration

**Required Environment Variables:**
```bash
# Resend Configuration
RESEND_API_KEY=re_xxx          # Resend API key
FROM_EMAIL=noreply@yourdomain.com  # Verified sender email
FROM_NAME="Your App Name"       # Sender display name

# Email Template Configuration (optional)
RESEND_TEMPLATE_ID=xxx         # Resend template ID (if using templates)
BRAND_LOGO_URL=https://...     # Logo for email templates
SUPPORT_EMAIL=support@yourdomain.com
```

**Wrangler Configuration:**
```toml
[env.production.vars]
FROM_EMAIL = "noreply@yourdomain.com"
FROM_NAME = "Your App Name"
BRAND_LOGO_URL = "https://yourdomain.com/logo.png"
SUPPORT_EMAIL = "support@yourdomain.com"

[env.staging.vars]
FROM_EMAIL = "noreply@staging.yourdomain.com"
FROM_NAME = "Your App Name (Staging)"
```

**Secrets (via Wrangler):**
```bash
wrangler secret put RESEND_API_KEY --env production
wrangler secret put RESEND_API_KEY --env staging
```

### 3. Email Service Implementation

**Create: `workers/services/email.ts`**

```typescript
import { Resend } from 'resend';
import type { AppType } from '../types';

export interface EmailService {
  sendMagicLink(params: {
    email: string;
    magicLink: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

export class ResendEmailService implements EmailService {
  private resend: Resend;
  private fromEmail: string;
  private fromName: string;
  private brandLogoUrl?: string;
  private supportEmail: string;

  constructor(env: AppType['Bindings']) {
    if (!env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }
    
    this.resend = new Resend(env.RESEND_API_KEY);
    this.fromEmail = env.FROM_EMAIL || 'noreply@example.com';
    this.fromName = env.FROM_NAME || 'Your App';
    this.brandLogoUrl = env.BRAND_LOGO_URL;
    this.supportEmail = env.SUPPORT_EMAIL || 'support@example.com';
  }

  async sendMagicLink(params: {
    email: string;
    magicLink: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [params.email],
        subject: 'Sign in to your account',
        html: this.generateEmailTemplate(params),
        text: this.generateTextTemplate(params),
        headers: {
          'X-Entity-Ref-ID': `magic-link-${Date.now()}`,
        },
        tags: [
          { name: 'category', value: 'authentication' },
          { name: 'type', value: 'magic-link' },
        ],
      });

      if (error) {
        console.error('Resend email error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private generateEmailTemplate(params: {
    email: string;
    magicLink: string;
    ipAddress?: string;
    userAgent?: string;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to your account</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${this.brandLogoUrl ? `<img src="${this.brandLogoUrl}" alt="${this.fromName}" style="height: 40px; margin-bottom: 20px;">` : ''}
  
  <h1 style="color: #2563eb; margin-bottom: 20px;">Sign in to your account</h1>
  
  <p>Hello,</p>
  
  <p>You requested to sign in to your account. Click the button below to securely access your account:</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${params.magicLink}" 
       style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
      Sign In Securely
    </a>
  </div>
  
  <p><strong>Important:</strong> This link will expire in 10 minutes and can only be used once.</p>
  
  <p>If you didn't request this sign-in, you can safely ignore this email.</p>
  
  ${params.ipAddress ? `<p style="font-size: 14px; color: #666; margin-top: 30px;">
    <strong>Security Info:</strong><br>
    IP Address: ${params.ipAddress}<br>
    ${params.userAgent ? `Device: ${params.userAgent.slice(0, 100)}...` : ''}
  </p>` : ''}
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  
  <p style="font-size: 12px; color: #999;">
    If you have trouble clicking the button, copy and paste this URL into your browser:<br>
    <a href="${params.magicLink}" style="color: #2563eb; word-break: break-all;">${params.magicLink}</a>
  </p>
  
  <p style="font-size: 12px; color: #999;">
    Need help? Contact us at <a href="mailto:${this.supportEmail}">${this.supportEmail}</a>
  </p>
</body>
</html>
    `.trim();
  }

  private generateTextTemplate(params: {
    email: string;
    magicLink: string;
    ipAddress?: string;
  }): string {
    return `
Sign in to your account

Hello,

You requested to sign in to your account. Use the link below to securely access your account:

${params.magicLink}

Important: This link will expire in 10 minutes and can only be used once.

If you didn't request this sign-in, you can safely ignore this email.

${params.ipAddress ? `\nSecurity Info:\nIP Address: ${params.ipAddress}` : ''}

Need help? Contact us at ${this.supportEmail}
    `.trim();
  }
}

// Development/Mock implementation
export class MockEmailService implements EmailService {
  async sendMagicLink(params: {
    email: string;
    magicLink: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log('📧 [MOCK EMAIL] Magic Link Email:', {
      to: params.email,
      magicLink: params.magicLink,
      timestamp: new Date().toISOString(),
    });
    
    return { 
      success: true, 
      messageId: `mock-${Date.now()}` 
    };
  }
}
```

### 4. Auth Integration

**Update: `workers/auth.ts`**

```typescript
import { ResendEmailService, MockEmailService } from './services/email';

export async function authFactory(env: AppType["Bindings"], request: Request) {
  // ... existing code ...
  
  // Initialize email service
  const emailService = env.RESEND_API_KEY 
    ? new ResendEmailService(env)
    : new MockEmailService();
  
  const auth = betterAuth({
    // ... existing config ...
    plugins: [
      magicLink({
        async sendMagicLink(data) {
          const result = await emailService.sendMagicLink({
            email: data.email,
            magicLink: data.url,
            ipAddress: request.headers.get('CF-Connecting-IP') || 
                      request.headers.get('X-Forwarded-For') || 
                      'unknown',
            userAgent: request.headers.get('User-Agent') || undefined,
          });
          
          if (!result.success) {
            console.error('Failed to send magic link email:', result.error);
            throw new Error('Failed to send verification email. Please try again.');
          }
          
          console.log('Magic link email sent successfully:', {
            email: data.email,
            messageId: result.messageId,
          });
        },
      }),
    ],
  });
  
  return auth;
}
```

### 5. Type Definitions

**Update: `workers/types.ts`**

```typescript
export interface AppType {
  Bindings: {
    // ... existing bindings ...
    RESEND_API_KEY: string;
    FROM_EMAIL: string;
    FROM_NAME: string;
    BRAND_LOGO_URL?: string;
    SUPPORT_EMAIL: string;
  };
}
```

### 6. Error Handling & User Experience

**Frontend Error Handling (`app/routes/login._index.tsx`):**

```typescript
// Enhanced error handling for email sending failures
const handleMagicLink = async (email: string) => {
  try {
    await authClient.signIn.magicLink({ email });
    toast.success('Check your email for a sign-in link!');
  } catch (error) {
    if (error.message.includes('Failed to send verification email')) {
      toast.error('Unable to send email. Please check your email address and try again.');
    } else if (error.status === 429) {
      toast.error('Too many attempts. Please wait before trying again.');
    } else {
      toast.error('Something went wrong. Please try again.');
    }
    console.error('Magic link error:', error);
  }
};
```

## Testing Strategy

### 1. Unit Tests

**Test: `workers/services/email.test.ts`**

```typescript
describe('ResendEmailService', () => {
  it('should send magic link email successfully');
  it('should handle Resend API errors gracefully');
  it('should include security information in email');
  it('should generate proper HTML and text templates');
  it('should validate required environment variables');
});

describe('MockEmailService', () => {
  it('should log email details in development');
  it('should return success response');
});
```

### 2. Integration Tests

- Test magic link flow end-to-end
- Verify email delivery in staging environment
- Test error scenarios and fallbacks
- Validate email templates render correctly

### 3. Manual Testing Checklist

- [ ] Magic link email received in inbox
- [ ] Email renders correctly across email clients
- [ ] Links work and authenticate users
- [ ] Error handling works for invalid emails
- [ ] Rate limiting functions properly
- [ ] Mobile email rendering
- [ ] Dark mode email rendering

## Security Considerations

### 1. API Key Security
- Store Resend API key as Cloudflare secret
- Use different API keys for staging/production
- Implement key rotation strategy
- Monitor API key usage

### 2. Email Security
- Validate email addresses before sending
- Implement rate limiting on email sending
- Log email sending attempts for monitoring
- Use proper DKIM/SPF records for domain

### 3. Privacy Compliance
- Include unsubscribe mechanism if required
- Log minimal PII in email logs
- Respect user privacy preferences
- Implement data retention policies

## Monitoring & Observability

### 1. Metrics to Track
- Email delivery success rate
- Email delivery latency
- Bounce/complaint rates
- API error rates
- User authentication conversion

### 2. Logging
- Email send attempts and results
- API errors and retries
- User feedback on email issues
- Rate limiting events

### 3. Alerts
- Email delivery failure rate > 5%
- Resend API errors
- High bounce rates
- Unusual sending patterns

## Deployment Plan

### Phase 1: Development Setup
1. Set up Resend account and verify domain
2. Implement email service with mock fallback
3. Add environment variables to development
4. Test locally with mock service

### Phase 2: Staging Deployment
1. Deploy to staging with Resend integration
2. Test end-to-end email flow
3. Validate email templates
4. Performance and error testing

### Phase 3: Production Deployment
1. Set up production Resend configuration
2. Deploy with feature flag for gradual rollout
3. Monitor email delivery metrics
4. Full rollout after validation

## Rollback Plan

### Immediate Rollback
- Revert to console.log implementation
- Disable email sending via environment variable
- Use mock service for all environments

### Data Considerations
- No data migration required
- Email logs can be preserved
- User sessions remain unaffected

## Success Criteria

- [ ] 99%+ email delivery success rate
- [ ] < 2 second email sending response time
- [ ] Professional email templates implemented
- [ ] Error handling and user feedback working
- [ ] Security best practices implemented
- [ ] Monitoring and alerting configured
- [ ] Documentation updated
- [ ] Team training completed

## Future Enhancements

1. **Email Templates**
   - Custom branded email templates
   - Multi-language support
   - Rich HTML layouts

2. **Advanced Features**
   - Email delivery analytics
   - A/B testing for email content
   - Custom sender domains
   - Email preference management

3. **Integration Improvements**
   - Webhook handling for delivery status
   - Automatic retry mechanisms
   - Email queue management
   - Batch email processing

## Dependencies

- Resend account and API access
- Domain verification for sending emails
- DNS configuration for DKIM/SPF
- Cloudflare secrets management
- Staging environment for testing

## Timeline Estimate

- **Setup & Development:** 2-3 days
- **Testing & Validation:** 1-2 days  
- **Staging Deployment:** 1 day
- **Production Deployment:** 1 day
- **Total:** 5-7 days

## Risk Assessment

**High Risk:**
- Email deliverability issues
- API rate limits or outages
- Incorrect email templates

**Medium Risk:**
- Environment variable misconfiguration
- DNS/domain verification issues
- User experience regression

**Low Risk:**
- Performance impact
- Cost overruns
- Integration complexity

## Conclusion

This implementation will replace the current development-only magic link system with a production-ready email delivery solution using Resend, ensuring users can actually receive and use magic links for authentication while maintaining security and providing excellent user experience.