/**
 * Beta Invitation System
 * 
 * Sends professional HTML email invitations to selected beta workshops.
 * Includes templates for invitation, onboarding, and reminder emails.
 * 
 * Usage: npx ts-node scripts/send-beta-invitations.ts
 * 
 * @since Phase 2B: Dual-Output Engine (Week 3 - Day 11)
 */

import * as fs from 'fs';
import * as path from 'path';

interface Workshop {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface EmailTemplate {
  subject: string;
  html: string;
}

export class BetaInvitationSystem {
  private readonly emailTemplates = {
    invitation: (workshop: Workshop): EmailTemplate => ({
      subject: `You're invited to test Almona's new 3D Visualization + Production Data feature!`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; }
    .feature { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #667eea; }
    .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    ul { padding-left: 20px; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Exclusive Beta Invitation</h1>
      <p>Experience the future of window manufacturing</p>
    </div>
    
    <div class="content">
      <h2>Dear ${workshop.name},</h2>
      
      <p>We're excited to invite you to be among the first to test our revolutionary new feature:</p>
      
      <div class="feature">
        <h3>🔮 Smart 3D Visualizations + 99.8% Production Data</h3>
        <p>For the first time, get beautiful 3D previews for customers alongside your trusted 99.8% accurate production data - all from a single calculation.</p>
      </div>
      
      <h3>What You'll Get:</h3>
      <ul>
        <li><strong>85% Accurate 3D Previews</strong> - Show customers realistic visualizations</li>
        <li><strong>99.8% Production Data</strong> - Same trusted accuracy for manufacturing</li>
        <li><strong>Pattern Intelligence</strong> - Egyptian window patterns with authentic details</li>
        <li><strong>Real-time Validation</strong> - Catch design errors before production</li>
      </ul>
      
      <h3>Beta Timeline:</h3>
      <p><strong>Week 1</strong> (Now): Try the new features at your own pace<br>
      <strong>Week 2</strong>: Join our feedback session (optional)<br>
      <strong>Week 3</strong>: Features become available to all workshops</p>
      
      <div style="text-align: center; margin: 40px 0;">
        <a href="https://app.almona.com/beta/enable" class="cta-button">👉 Enable Beta Features Now</a>
        <p style="font-size: 12px; color: #666; margin-top: 10px;">
          Or copy this link: https://app.almona.com/beta/enable
        </p>
      </div>
      
      <h3>Support During Beta:</h3>
      <p>We're here to help you succeed:</p>
      <ul>
        <li>📞 Dedicated support line: +201234567890</li>
        <li>📧 Email: beta-support@almona.com</li>
        <li>💬 WhatsApp group for beta testers</li>
        <li>🎥 Video tutorials and documentation</li>
      </ul>
      
      <p>As a thank you for participating, you'll receive 3 months of premium features for free after the beta concludes.</p>
      
      <p>Best regards,<br>
      <strong>Mohamed Hassan</strong><br>
      CEO, Almona Industrial Solutions</p>
    </div>
    
    <div class="footer">
      <p>Almona Industrial Solutions · Transforming Window Manufacturing</p>
      <p>This is a beta invitation for ${workshop.name} only. Please do not forward.</p>
    </div>
  </div>
</body>
</html>
      `
    }),
    
    onboarding: (workshop: Workshop): EmailTemplate => ({
      subject: `Welcome to the Beta! Getting Started Guide`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #667eea; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; }
    .step { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #667eea; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to the Beta!</h1>
    </div>
    <div class="content">
      <h2>Dear ${workshop.name},</h2>
      <p>Thank you for joining our beta program. Here's how to get started:</p>
      
      <div class="step">
        <h3>Step 1: Enable Beta Features</h3>
        <p>Go to Settings → Beta Features and enable "Dual-Output Preview"</p>
      </div>
      
      <div class="step">
        <h3>Step 2: Create Your First Project</h3>
        <p>Start a new window project and select a pattern from the library</p>
      </div>
      
      <div class="step">
        <h3>Step 3: Explore 3D Preview</h3>
        <p>Click "Enhanced Preview" to see the 3D visualization alongside production data</p>
      </div>
      
      <p>Need help? Contact us at beta-support@almona.com</p>
    </div>
  </div>
</body>
</html>
      `
    }),
    
    reminder: (workshop: Workshop): EmailTemplate => ({
      subject: `Reminder: Your Beta Access is Activated`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #667eea; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Beta Access Reminder</h1>
    </div>
    <div class="content">
      <h2>Dear ${workshop.name},</h2>
      <p>Just a friendly reminder that your beta access is active! Try the new features and share your feedback.</p>
      <p><a href="https://app.almona.com/beta">Access Beta Features</a></p>
    </div>
  </div>
</body>
</html>
      `
    })
  };
  
  async sendInvitation(workshop: Workshop): Promise<boolean> {
    try {
      const template = this.emailTemplates.invitation(workshop);
      
      // Send email using your email service (SendGrid, etc.)
      await this.sendEmail(workshop.email, template.subject, template.html);
      
      // Log the invitation
      console.log(`✅ Invitation sent to ${workshop.name} (${workshop.email})`);
      
      // Update workshop record
      await this.markWorkshopInvited(workshop.id);
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to send invitation to ${workshop.name}:`, error);
      return false;
    }
  }
  
  async sendBatchInvitations(workshops: Workshop[]): Promise<void> {
    console.log(`Sending beta invitations to ${workshops.length} workshops...\n`);
    
    const results = await Promise.allSettled(
      workshops.map(workshop => this.sendInvitation(workshop))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled' && (r as PromiseFulfilledResult<boolean>).value).length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`\n📊 Invitation Results:`);
    console.log(`   Successful: ${successful}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Success rate: ${((successful / workshops.length) * 100).toFixed(1)}%`);
    
    // Save results
    const report = {
      generatedAt: new Date().toISOString(),
      total: workshops.length,
      successful,
      failed,
      workshops: workshops.map((w, i) => ({
        id: w.id,
        name: w.name,
        email: w.email,
        status: results[i].status === 'fulfilled' && (results[i] as PromiseFulfilledResult<boolean>).value ? 'sent' : 'failed'
      }))
    };
    
    const reportPath = path.join(process.cwd(), 'beta-invitation-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✅ Results saved to ${reportPath}`);
  }
  
  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    // Implement your email sending logic here
    // Example with SendGrid:
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    const msg = {
      to,
      from: 'beta@almona.com',
      subject,
      html
    };
    
    await sgMail.send(msg);
    */
    
    // For now, just log (in production, this would actually send)
    console.log(`[Email] To: ${to}, Subject: ${subject}`);
    
    // Optionally save email to file for testing
    if (process.env.SAVE_EMAILS === 'true') {
      const emailDir = path.join(process.cwd(), 'emails');
      if (!fs.existsSync(emailDir)) {
        fs.mkdirSync(emailDir, { recursive: true });
      }
      const emailPath = path.join(emailDir, `${to.replace('@', '_at_')}_${Date.now()}.html`);
      fs.writeFileSync(emailPath, html);
      console.log(`  Email saved to ${emailPath}`);
    }
  }
  
  private async markWorkshopInvited(workshopId: string): Promise<void> {
    // Update workshop record in database
    console.log(`  Marked workshop ${workshopId} as invited`);
  }
}

// Send invitations to selected workshops
if (require.main === module) {
  // Load selected workshops from selection report
  const selectionReportPath = path.join(process.cwd(), 'beta-workshop-selection-report.json');
  
  if (!fs.existsSync(selectionReportPath)) {
    console.error('❌ Beta workshop selection report not found. Run select-beta-workshops.ts first.');
    process.exit(1);
  }
  
  const selectionReport = JSON.parse(fs.readFileSync(selectionReportPath, 'utf8'));
  const selectedWorkshops = selectionReport.selectedWorkshops.map((w: any) => ({
    id: w.id,
    name: w.name || `Workshop ${w.id}`,
    email: w.contactInfo?.email || `contact@${w.id}.com`
  }));
  
  const invitations = new BetaInvitationSystem();
  invitations.sendBatchInvitations(selectedWorkshops).catch(console.error);
}

