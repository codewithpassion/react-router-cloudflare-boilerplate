import { Resend } from "resend";
import type { AppType } from "../types";

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
	private devMode: boolean;

	constructor(env: AppType["Bindings"]) {
		if (!env.RESEND_API_KEY) {
			throw new Error("RESEND_API_KEY environment variable is required");
		}

		this.resend = new Resend(env.RESEND_API_KEY);
		this.fromEmail = env.FROM_EMAIL || "noreply@example.com";
		this.fromName = env.FROM_NAME || "Your App";
		this.brandLogoUrl = env.BRAND_LOGO_URL;
		this.supportEmail = env.SUPPORT_EMAIL || "support@example.com";
		this.devMode = env.DEV_MODE === "true";
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
				subject: "Sign in to your account",
				html: this.generateEmailTemplate(params),
				text: this.generateTextTemplate(params),
				headers: {
					"X-Entity-Ref-ID": `magic-link-${Date.now()}`,
				},
				tags: [
					{ name: "category", value: "authentication" },
					{ name: "type", value: "magic-link" },
				],
			});

			if (error) {
				console.error("Resend email error:", error);
				return { success: false, error: error.message };
			}

			if (this.devMode) {
				console.log(`🔗 [DEV] Magic Link URL: ${params.magicLink}`);
			}

			return { success: true, messageId: data?.id };
		} catch (error) {
			console.error("Email sending failed:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
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
  ${this.brandLogoUrl ? `<img src="${this.brandLogoUrl}" alt="${this.fromName}" style="height: 40px; margin-bottom: 20px;">` : ""}
  
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
  
  ${
		params.ipAddress
			? `<p style="font-size: 14px; color: #666; margin-top: 30px;">
    <strong>Security Info:</strong><br>
    IP Address: ${params.ipAddress}<br>
    ${params.userAgent ? `Device: ${params.userAgent.slice(0, 100)}...` : ""}
  </p>`
			: ""
	}
  
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

${params.ipAddress ? `\nSecurity Info:\nIP Address: ${params.ipAddress}` : ""}

Need help? Contact us at ${this.supportEmail}
    `.trim();
	}
}

export class MockEmailService implements EmailService {
	async sendMagicLink(params: {
		email: string;
		magicLink: string;
	}): Promise<{ success: boolean; messageId?: string; error?: string }> {
		console.log("📧 [MOCK EMAIL] Magic Link Email:", {
			to: params.email,
			magicLink: params.magicLink,
			timestamp: new Date().toISOString(),
		});

		return {
			success: true,
			messageId: `mock-${Date.now()}`,
		};
	}
}
