/**
 * Beta Testing Framework
 * 
 * Comprehensive system for managing beta testers, collecting feedback,
 * and tracking metrics for feature evaluation.
 * 
 * @since Phase 2B: Dual-Output Engine (Week 2 - Day 9)
 */

export interface BetaTester {
  id: string;
  name: string;
  workshopId: string;
  features: string[];
  joinDate: Date;
  feedback: BetaFeedback[];
}

export interface BetaFeedback {
  id: string;
  testerId: string;
  feature: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comments?: string;
  issues: string[];
  suggestions: string[];
  timestamp: Date;
}

export interface BetaMetrics {
  feature: string;
  totalTests: number;
  averageRating: number;
  issueCount: number;
  suggestionCount: number;
  adoptionRate: number;
}

export class BetaTestingFramework {
  private testers: BetaTester[] = [];
  private feedback: BetaFeedback[] = [];
  
  constructor() {
    this.loadTesters();
    this.loadFeedback();
  }
  
  async enrollWorkshop(workshopId: string, features: string[]): Promise<BetaTester> {
    const workshop = await this.getWorkshopDetails(workshopId);
    
    const tester: BetaTester = {
      id: `tester-${Date.now()}`,
      name: workshop.name,
      workshopId,
      features,
      joinDate: new Date(),
      feedback: []
    };
    
    this.testers.push(tester);
    this.saveTesters();
    
    // Enable features for this workshop
    await this.enableFeaturesForWorkshop(workshopId, features);
    
    return tester;
  }
  
  async submitFeedback(feedback: Omit<BetaFeedback, 'id' | 'timestamp'>): Promise<void> {
    const newFeedback: BetaFeedback = {
      ...feedback,
      id: `feedback-${Date.now()}`,
      timestamp: new Date()
    };
    
    this.feedback.push(newFeedback);
    this.saveFeedback();
    
    // Add to tester's feedback history
    const tester = this.testers.find(t => t.id === feedback.testerId);
    if (tester) {
      tester.feedback.push(newFeedback);
      this.saveTesters();
    }
    
    // Notify development team
    await this.notifyTeam(newFeedback);
    
    // Check for critical issues
    if (feedback.rating <= 2) {
      await this.escalateCriticalFeedback(newFeedback);
    }
  }
  
  async collectUsageMetrics(): Promise<BetaMetrics[]> {
    const features = ['dual-output-preview', 'pattern-suggestions', 'enhanced-3d'];
    const metrics: BetaMetrics[] = [];
    
    for (const feature of features) {
      const featureFeedback = this.feedback.filter(f => f.feature === feature);
      const featureTesters = this.testers.filter(t => t.features.includes(feature));
      
      if (featureFeedback.length === 0) continue;
      
      const averageRating = featureFeedback.reduce((sum, f) => sum + f.rating, 0) / featureFeedback.length;
      const issueCount = featureFeedback.reduce((sum, f) => sum + f.issues.length, 0);
      const suggestionCount = featureFeedback.reduce((sum, f) => sum + f.suggestions.length, 0);
      const adoptionRate = featureTesters.length / this.testers.length;
      
      metrics.push({
        feature,
        totalTests: featureFeedback.length,
        averageRating,
        issueCount,
        suggestionCount,
        adoptionRate
      });
    }
    
    return metrics;
  }
  
  async generateBetaReport(): Promise<void> {
    const metrics = await this.collectUsageMetrics();
    const now = new Date();
    
    console.log('=== BETA TESTING REPORT ===\n');
    console.log(`Generated: ${now.toISOString()}`);
    console.log(`Total Testers: ${this.testers.length}`);
    console.log(`Total Feedback: ${this.feedback.length}\n`);
    
    // Metrics by feature
    console.log('FEATURE METRICS:');
    metrics.forEach(metric => {
      console.log(`\n${metric.feature}:`);
      console.log(`  Tests: ${metric.totalTests}`);
      console.log(`  Rating: ${metric.averageRating.toFixed(1)}/5`);
      console.log(`  Issues: ${metric.issueCount}`);
      console.log(`  Suggestions: ${metric.suggestionCount}`);
      console.log(`  Adoption: ${(metric.adoptionRate * 100).toFixed(1)}%`);
    });
    
    // Recent feedback
    console.log('\nRECENT FEEDBACK (Last 7 days):');
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentFeedback = this.feedback.filter(f => f.timestamp > oneWeekAgo);
    
    recentFeedback.forEach(feedback => {
      const tester = this.testers.find(t => t.id === feedback.testerId);
      console.log(`\n${tester?.name || 'Unknown tester'}:`);
      console.log(`  Feature: ${feedback.feature}`);
      console.log(`  Rating: ${'★'.repeat(feedback.rating)}${'☆'.repeat(5 - feedback.rating)}`);
      
      if (feedback.comments) {
        console.log(`  Comments: ${feedback.comments}`);
      }
      
      if (feedback.issues.length > 0) {
        console.log(`  Issues: ${feedback.issues.join(', ')}`);
      }
    });
    
    // Recommendations
    console.log('\nRECOMMENDATIONS:');
    metrics.forEach(metric => {
      if (metric.averageRating < 3) {
        console.log(`  • Improve ${metric.feature} (low rating: ${metric.averageRating.toFixed(1)})`);
      }
      
      if (metric.issueCount > 5) {
        console.log(`  • Address issues in ${metric.feature} (${metric.issueCount} issues reported)`);
      }
    });
    
    // Export to JSON
    const report = {
      generatedAt: now.toISOString(),
      summary: {
        totalTesters: this.testers.length,
        totalFeedback: this.feedback.length,
        durationDays: this.testers.length > 0 
          ? Math.floor((now.getTime() - Math.min(...this.testers.map(t => t.joinDate.getTime()))) / (1000 * 60 * 60 * 24))
          : 0
      },
      metrics,
      recentFeedback: recentFeedback.slice(0, 10).map(f => ({
        tester: this.testers.find(t => t.id === f.testerId)?.name,
        feature: f.feature,
        rating: f.rating,
        comments: f.comments,
        issues: f.issues
      }))
    };
    
    // In browser, use localStorage; in Node, use fs
    if (typeof window !== 'undefined') {
      localStorage.setItem('beta-testing-report', JSON.stringify(report));
      console.log('\n✅ Report saved to localStorage');
    } else {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const reportPath = path.join(process.cwd(), 'beta-testing-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n✅ Report saved to ${reportPath}`);
      } catch (error) {
        console.warn('Could not save report to file:', error);
      }
    }
  }
  
  private async getWorkshopDetails(workshopId: string): Promise<{ name: string }> {
    // This would typically fetch from your database
    return { name: `Workshop ${workshopId}` };
  }
  
  private async enableFeaturesForWorkshop(workshopId: string, _features: string[]): Promise<void> {
    console.log(`Enabling features for workshop ${workshopId}:`, _features);
    // This would update your feature flag system or database
    try {
      const { FeatureFlagManager } = await import('@/lib/featureFlags');
      FeatureFlagManager.enableForWorkshop(workshopId, 'DUAL_OUTPUT_BETA_ENABLED' as any);
    } catch (error) {
      console.warn('Could not import FeatureFlagManager:', error);
    }
  }
  
  private async notifyTeam(feedback: BetaFeedback): Promise<void> {
    // Send notification to Slack, email, etc.
    console.log(`New feedback received: ${feedback.feature} (${feedback.rating}/5)`);
  }
  
  private async escalateCriticalFeedback(feedback: BetaFeedback): Promise<void> {
    console.log(`🚨 CRITICAL FEEDBACK: ${feedback.feature} (${feedback.rating}/5)`);
    console.log(`Tester: ${feedback.testerId}`);
    console.log(`Issues: ${feedback.issues.join(', ')}`);
    // Escalate to development team lead
  }
  
  private loadTesters(): void {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('beta-testers');
      if (stored) {
        try {
          this.testers = JSON.parse(stored).map((t: any) => ({
            ...t,
            joinDate: new Date(t.joinDate),
            feedback: t.feedback.map((f: any) => ({
              ...f,
              timestamp: new Date(f.timestamp)
            }))
          }));
        } catch (error) {
          console.warn('Could not load testers:', error);
        }
      }
    }
  }
  
  private saveTesters(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('beta-testers', JSON.stringify(this.testers));
    }
  }
  
  private loadFeedback(): void {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('beta-feedback');
      if (stored) {
        try {
          this.feedback = JSON.parse(stored).map((f: any) => ({
            ...f,
            timestamp: new Date(f.timestamp)
          }));
        } catch (error) {
          console.warn('Could not load feedback:', error);
        }
      }
    }
  }
  
  private saveFeedback(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('beta-feedback', JSON.stringify(this.feedback));
    }
  }
}

// Export singleton instance
export const betaTestingFramework = new BetaTestingFramework();

