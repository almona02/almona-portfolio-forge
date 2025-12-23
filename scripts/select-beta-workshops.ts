/**
 * Beta Workshop Selection Tool
 * 
 * Algorithmically selects the best workshops for beta testing based on
 * engagement, project volume, feedback history, and technical capability.
 * 
 * Usage: npx ts-node scripts/select-beta-workshops.ts
 * 
 * @since Phase 2B: Dual-Output Engine (Week 3 - Day 11)
 */

import * as fs from 'fs';
import * as path from 'path';

// Types
interface Workshop {
  id: string;
  name: string;
  email: string;
  phone?: string;
  metrics?: WorkshopMetrics;
  technicalProfile?: TechnicalProfile;
  supportProfile?: SupportProfile;
  contacts?: Contact[];
  timezone?: string;
}

interface WorkshopMetrics {
  activeDaysLastMonth?: number;
  projectsLastMonth?: number;
  featureUsage?: string[];
  feedbackCount?: number;
  errorRate?: number;
}

interface TechnicalProfile {
  hasCNC?: boolean;
  hasMultipleMachines?: boolean;
  usesDigitalWorkflow?: boolean;
  internetSpeed?: 'fast' | 'medium' | 'slow';
}

interface SupportProfile {
  preferredLanguage?: string;
  availableForVideoCalls?: boolean;
  preferredContactMethod?: 'email' | 'phone' | 'whatsapp';
  requiresTranslation?: boolean;
}

interface Contact {
  type: 'primary' | 'secondary';
  name?: string;
  email?: string;
  phone?: string;
}

interface ContactInfo {
  primaryContact?: Contact;
  email: string;
  phone?: string;
  preferredContactMethod: string;
  timezone: string;
}

interface BetaCandidate {
  workshop: Workshop;
  score: number;
  strengths: string[];
  considerations: string[];
  contactInfo: ContactInfo;
  readiness: 'high' | 'medium' | 'low';
}

export class BetaWorkshopSelector {
  private workshops: Workshop[];
  
  constructor() {
    this.workshops = this.loadWorkshops();
  }
  
  async selectBetaWorkshops(targetCount: number = 3): Promise<BetaCandidate[]> {
    console.log(`=== SELECTING ${targetCount} BETA WORKSHOPS ===\n`);
    
    // Score each workshop
    const candidates = this.workshops.map(workshop => {
      const score = this.calculateBetaScore(workshop);
      return {
        workshop,
        score,
        strengths: this.identifyStrengths(workshop),
        considerations: this.identifyConsiderations(workshop),
        contactInfo: this.getContactInfo(workshop),
        readiness: score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low'
      } as BetaCandidate;
    });
    
    // Sort by score (descending)
    candidates.sort((a, b) => b.score - a.score);
    
    // Select top candidates
    const selected = candidates.slice(0, targetCount);
    
    // Generate report
    this.generateSelectionReport(candidates, selected);
    
    return selected;
  }
  
  private calculateBetaScore(workshop: Workshop): number {
    let score = 0;
    
    // 1. Engagement (30 points)
    if (workshop.metrics?.activeDaysLastMonth) {
      score += Math.min(30, workshop.metrics.activeDaysLastMonth * 2); // 2 points per active day
    }
    
    // 2. Project Volume (20 points)
    if (workshop.metrics?.projectsLastMonth) {
      const projects = workshop.metrics.projectsLastMonth;
      if (projects >= 20) score += 20;
      else if (projects >= 10) score += 15;
      else if (projects >= 5) score += 10;
      else score += 5;
    }
    
    // 3. Feature Usage (15 points)
    if (workshop.metrics?.featureUsage) {
      const usesOptimization = workshop.metrics.featureUsage.includes('optimization');
      const usesDXFImport = workshop.metrics.featureUsage.includes('dxf_import');
      const usesCNCExport = workshop.metrics.featureUsage.includes('cnc_export');
      
      if (usesOptimization) score += 5;
      if (usesDXFImport) score += 5;
      if (usesCNCExport) score += 5;
    }
    
    // 4. Feedback History (15 points)
    if (workshop.metrics?.feedbackCount) {
      score += Math.min(15, workshop.metrics.feedbackCount * 3); // 3 points per feedback
    }
    
    // 5. Technical Capability (10 points)
    if (workshop.technicalProfile) {
      if (workshop.technicalProfile.hasCNC) score += 5;
      if (workshop.technicalProfile.hasMultipleMachines) score += 3;
      if (workshop.technicalProfile.usesDigitalWorkflow) score += 2;
    }
    
    // 6. Support Accessibility (10 points)
    if (workshop.supportProfile) {
      if (workshop.supportProfile.preferredLanguage === 'English' || 
          workshop.supportProfile.preferredLanguage === 'Arabic') {
        score += 5;
      }
      if (workshop.supportProfile.availableForVideoCalls) score += 5;
    }
    
    return Math.min(100, score);
  }
  
  private identifyStrengths(workshop: Workshop): string[] {
    const strengths: string[] = [];
    
    if (workshop.metrics?.activeDaysLastMonth && workshop.metrics.activeDaysLastMonth >= 20) {
      strengths.push('High engagement');
    }
    
    if (workshop.metrics?.projectsLastMonth && workshop.metrics.projectsLastMonth >= 10) {
      strengths.push('High project volume');
    }
    
    if (workshop.metrics?.featureUsage?.includes('optimization')) {
      strengths.push('Uses optimization engine');
    }
    
    if (workshop.metrics?.feedbackCount && workshop.metrics.feedbackCount >= 5) {
      strengths.push('Provides feedback');
    }
    
    if (workshop.technicalProfile?.hasCNC) {
      strengths.push('Has CNC capability');
    }
    
    return strengths;
  }
  
  private identifyConsiderations(workshop: Workshop): string[] {
    const considerations: string[] = [];
    
    if (!workshop.metrics || (workshop.metrics.activeDaysLastMonth || 0) < 5) {
      considerations.push('Low platform usage');
    }
    
    if (workshop.metrics?.errorRate && workshop.metrics.errorRate > 0.1) {
      considerations.push('High error rate');
    }
    
    if (workshop.supportProfile?.requiresTranslation) {
      considerations.push('May require translation');
    }
    
    if (workshop.technicalProfile?.internetSpeed === 'slow') {
      considerations.push('Slow internet connection');
    }
    
    return considerations;
  }
  
  private getContactInfo(workshop: Workshop): ContactInfo {
    return {
      primaryContact: workshop.contacts?.find(c => c.type === 'primary'),
      email: workshop.email,
      phone: workshop.phone,
      preferredContactMethod: workshop.supportProfile?.preferredContactMethod || 'email',
      timezone: workshop.timezone || 'UTC+2'
    };
  }
  
  private generateSelectionReport(allCandidates: BetaCandidate[], selected: BetaCandidate[]): void {
    console.log('=== BETA WORKSHOP SELECTION REPORT ===\n');
    
    console.log(`Total workshops considered: ${allCandidates.length}`);
    console.log(`Selected for beta: ${selected.length}`);
    console.log(`Selection rate: ${((selected.length / allCandidates.length) * 100).toFixed(1)}%\n`);
    
    // Selected workshops
    console.log('SELECTED WORKSHOPS:');
    selected.forEach((candidate, index) => {
      console.log(`\n${index + 1}. ${candidate.workshop.name}`);
      console.log(`   Score: ${candidate.score}/100`);
      console.log(`   Readiness: ${candidate.readiness.toUpperCase()}`);
      console.log(`   Projects/month: ${candidate.workshop.metrics?.projectsLastMonth || 0}`);
      console.log(`   Strengths: ${candidate.strengths.join(', ') || 'None'}`);
      if (candidate.considerations.length > 0) {
        console.log(`   Considerations: ${candidate.considerations.join(', ')}`);
      }
      console.log(`   Contact: ${candidate.contactInfo.primaryContact?.name || 'N/A'} (${candidate.contactInfo.email})`);
    });
    
    // Selection criteria summary
    console.log('\nSELECTION CRITERIA:');
    console.log('1. Engagement (active days) - 30 points');
    console.log('2. Project volume - 20 points');
    console.log('3. Feature usage - 15 points');
    console.log('4. Feedback history - 15 points');
    console.log('5. Technical capability - 10 points');
    console.log('6. Support accessibility - 10 points');
    
    // Distribution
    const highReadiness = selected.filter(s => s.readiness === 'high').length;
    const mediumReadiness = selected.filter(s => s.readiness === 'medium').length;
    const lowReadiness = selected.filter(s => s.readiness === 'low').length;
    
    console.log('\nREADINESS DISTRIBUTION:');
    console.log(`   High: ${highReadiness}`);
    console.log(`   Medium: ${mediumReadiness}`);
    console.log(`   Low: ${lowReadiness}`);
    
    // Next steps
    console.log('\nNEXT STEPS:');
    console.log('1. Contact selected workshops for consent');
    console.log('2. Schedule onboarding sessions');
    console.log('3. Enable beta features via FeatureFlagManager');
    console.log('4. Send welcome email with instructions');
    
    // Export to JSON
    const report = {
      generatedAt: new Date().toISOString(),
      selectionCriteria: {
        engagementWeight: 30,
        projectVolumeWeight: 20,
        featureUsageWeight: 15,
        feedbackHistoryWeight: 15,
        technicalCapabilityWeight: 10,
        supportAccessibilityWeight: 10
      },
      selectedWorkshops: selected.map(s => ({
        id: s.workshop.id,
        name: s.workshop.name,
        score: s.score,
        readiness: s.readiness,
        strengths: s.strengths,
        considerations: s.considerations,
        contactInfo: s.contactInfo
      })),
      allWorkshopsRanked: allCandidates.map(c => ({
        id: c.workshop.id,
        name: c.workshop.name,
        score: c.score,
        readiness: c.readiness
      }))
    };
    
    const reportPath = path.join(process.cwd(), 'beta-workshop-selection-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n✅ Report saved to ${reportPath}`);
  }
  
  private loadWorkshops(): Workshop[] {
    // This would typically load from your database
    // For now, return mock data that can be replaced with real data
    try {
      const dataPath = path.join(process.cwd(), 'data', 'workshops.json');
      if (fs.existsSync(dataPath)) {
        const data = fs.readFileSync(dataPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('Could not load workshops from file, using mock data:', error);
    }
    
    // Mock data for demonstration
    return [
      {
        id: 'workshop_001',
        name: 'Cairo Windows Co.',
        metrics: {
          activeDaysLastMonth: 25,
          projectsLastMonth: 15,
          featureUsage: ['optimization', 'dxf_import', 'cnc_export'],
          feedbackCount: 8,
          errorRate: 0.02
        },
        technicalProfile: {
          hasCNC: true,
          hasMultipleMachines: true,
          usesDigitalWorkflow: true,
          internetSpeed: 'fast'
        },
        supportProfile: {
          preferredLanguage: 'Arabic',
          availableForVideoCalls: true,
          preferredContactMethod: 'whatsapp'
        },
        email: 'contact@cairowindows.com',
        phone: '+201234567890',
        contacts: [{
          type: 'primary',
          name: 'Ahmed Mohamed',
          email: 'contact@cairowindows.com',
          phone: '+201234567890'
        }],
        timezone: 'Africa/Cairo'
      },
      {
        id: 'workshop_002',
        name: 'Emirates Aluminium',
        metrics: {
          activeDaysLastMonth: 28,
          projectsLastMonth: 22,
          featureUsage: ['optimization', 'dxf_import'],
          feedbackCount: 12,
          errorRate: 0.01
        },
        technicalProfile: {
          hasCNC: true,
          hasMultipleMachines: true,
          usesDigitalWorkflow: true,
          internetSpeed: 'fast'
        },
        supportProfile: {
          preferredLanguage: 'English',
          availableForVideoCalls: true,
          preferredContactMethod: 'email'
        },
        email: 'production@emiratesaluminium.ae',
        phone: '+971501234567',
        contacts: [{
          type: 'primary',
          name: 'Sarah Al-Mansoori',
          email: 'production@emiratesaluminium.ae',
          phone: '+971501234567'
        }],
        timezone: 'Asia/Dubai'
      },
      {
        id: 'workshop_003',
        name: 'Alexandria Profile Works',
        metrics: {
          activeDaysLastMonth: 18,
          projectsLastMonth: 8,
          featureUsage: ['optimization'],
          feedbackCount: 3,
          errorRate: 0.05
        },
        technicalProfile: {
          hasCNC: true,
          hasMultipleMachines: false,
          usesDigitalWorkflow: true,
          internetSpeed: 'medium'
        },
        supportProfile: {
          preferredLanguage: 'Arabic',
          availableForVideoCalls: false,
          preferredContactMethod: 'phone'
        },
        email: 'info@alexprofile.com',
        phone: '+2031234567',
        contacts: [{
          type: 'primary',
          name: 'Mohamed Hassan',
          email: 'info@alexprofile.com',
          phone: '+2031234567'
        }],
        timezone: 'Africa/Cairo'
      }
    ];
  }
}

// Run selection if executed directly
if (require.main === module) {
  const selector = new BetaWorkshopSelector();
  selector.selectBetaWorkshops(3).then(selected => {
    console.log('\n✅ Beta workshop selection complete');
    console.log(`Selected ${selected.length} workshops for beta testing`);
  }).catch(console.error);
}

