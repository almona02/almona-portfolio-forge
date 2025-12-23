/**
 * Automated Beta Feedback Analysis & Alerting
 * 
 * Analyzes beta feedback for sentiment trends, common issues, and emerging patterns.
 * Generates automated alerts for critical issues.
 * 
 * Usage: npx ts-node scripts/analyze-beta-feedback.ts
 * 
 * @since Phase 2B: Dual-Output Engine (Week 3 - Day 13)
 */

import * as fs from 'fs';
import * as path from 'path';

interface BetaFeedback {
  id: string;
  testerId: string;
  feature: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comments?: string;
  issues: string[];
  suggestions: string[];
  timestamp: Date | string;
}

interface SentimentAnalysis {
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  averageRating: number;
  ratingChange: number;
  feedbackCount: number;
}

interface CommonIssue {
  issue: string;
  count: number;
  percentage: number;
  affectedFeatures: string[];
}

interface EmergingPattern {
  type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  affectedFeatures: string[];
  recommendations: string[];
}

interface Alert {
  id: string;
  type: 'sentiment' | 'issue' | 'pattern';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  details: string;
  actions: string[];
  createdAt: Date;
}

export class BetaFeedbackAnalyzer {
  private feedback: BetaFeedback[];
  
  constructor() {
    this.feedback = this.loadFeedback();
  }
  
  async analyzeAndAlert(): Promise<void> {
    console.log('=== BETA FEEDBACK ANALYSIS ===\n');
    
    // 1. Analyze sentiment trends
    const sentimentAnalysis = this.analyzeSentimentTrends();
    
    // 2. Identify common issues
    const commonIssues = this.identifyCommonIssues();
    
    // 3. Detect emerging patterns
    const emergingPatterns = this.detectEmergingPatterns();
    
    // 4. Generate alerts
    const alerts = this.generateAlerts(sentimentAnalysis, commonIssues, emergingPatterns);
    
    // 5. Send notifications
    if (alerts.length > 0) {
      await this.sendAlerts(alerts);
    }
    
    // 6. Generate report
    this.generateAnalysisReport(sentimentAnalysis, commonIssues, emergingPatterns, alerts);
  }
  
  private analyzeSentimentTrends(): SentimentAnalysis {
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentFeedback = this.feedback.filter(f => {
      const timestamp = typeof f.timestamp === 'string' ? new Date(f.timestamp) : f.timestamp;
      return timestamp > lastWeek;
    });
    
    if (recentFeedback.length === 0) {
      return { trend: 'insufficient_data', averageRating: 0, ratingChange: 0, feedbackCount: 0 };
    }
    
    // Calculate average rating
    const averageRating = recentFeedback.reduce((sum, f) => sum + f.rating, 0) / recentFeedback.length;
    
    // Calculate rating trend
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const olderFeedback = this.feedback.filter(f => {
      const timestamp = typeof f.timestamp === 'string' ? new Date(f.timestamp) : f.timestamp;
      return timestamp > twoWeeksAgo && timestamp <= lastWeek;
    });
    
    let ratingChange = 0;
    if (olderFeedback.length > 0) {
      const olderAverage = olderFeedback.reduce((sum, f) => sum + f.rating, 0) / olderFeedback.length;
      ratingChange = ((averageRating - olderAverage) / olderAverage) * 100;
    }
    
    // Determine trend
    let trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
    if (recentFeedback.length < 3) {
      trend = 'insufficient_data';
    } else if (ratingChange > 10) {
      trend = 'improving';
    } else if (ratingChange < -10) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }
    
    return {
      trend,
      averageRating,
      ratingChange,
      feedbackCount: recentFeedback.length
    };
  }
  
  private identifyCommonIssues(): CommonIssue[] {
    const issueFrequency: Record<string, number> = {};
    
    this.feedback.forEach(feedback => {
      feedback.issues.forEach(issue => {
        issueFrequency[issue] = (issueFrequency[issue] || 0) + 1;
      });
    });
    
    // Sort by frequency
    const sortedIssues = Object.entries(issueFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    return sortedIssues.map(([issue, count]) => ({
      issue,
      count,
      percentage: (count / this.feedback.length) * 100,
      affectedFeatures: this.getFeaturesForIssue(issue)
    }));
  }
  
  private detectEmergingPatterns(): EmergingPattern[] {
    const patterns: EmergingPattern[] = [];
    const last3Days = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    
    // Check for recent negative feedback spikes
    const recentNegative = this.feedback.filter(f => {
      const timestamp = typeof f.timestamp === 'string' ? new Date(f.timestamp) : f.timestamp;
      return timestamp > last3Days && f.rating <= 2;
    });
    
    if (recentNegative.length >= 3) {
      patterns.push({
        type: 'negative_feedback_spike',
        severity: 'high',
        description: `${recentNegative.length} negative ratings in last 3 days`,
        affectedFeatures: [...new Set(recentNegative.map(f => f.feature))],
        recommendations: ['Investigate recent changes', 'Contact affected testers']
      });
    }
    
    // Check for feature-specific issues
    const features = [...new Set(this.feedback.map(f => f.feature))];
    
    features.forEach(feature => {
      const featureFeedback = this.feedback.filter(f => f.feature === feature);
      const negativeFeatureFeedback = featureFeedback.filter(f => f.rating <= 2);
      
      if (negativeFeatureFeedback.length >= 2 && featureFeedback.length >= 5) {
        const negativeRate = negativeFeatureFeedback.length / featureFeedback.length;
        
        if (negativeRate > 0.3) {
          patterns.push({
            type: 'feature_specific_issues',
            severity: negativeRate > 0.5 ? 'high' : 'medium',
            description: `${(negativeRate * 100).toFixed(0)}% negative feedback for ${feature}`,
            affectedFeatures: [feature],
            recommendations: ['Review implementation', 'Consider temporary disable']
          });
        }
      }
    });
    
    return patterns;
  }
  
  private generateAlerts(
    sentiment: SentimentAnalysis,
    issues: CommonIssue[],
    patterns: EmergingPattern[]
  ): Alert[] {
    const alerts: Alert[] = [];
    
    // Alert for declining sentiment
    if (sentiment.trend === 'declining' && sentiment.feedbackCount >= 5) {
      alerts.push({
        id: `sentiment-decline-${Date.now()}`,
        type: 'sentiment',
        severity: 'high',
        title: 'Declining Beta Sentiment',
        description: `Average rating dropped by ${Math.abs(sentiment.ratingChange).toFixed(1)}%`,
        details: `Current average: ${sentiment.averageRating.toFixed(1)}/5`,
        actions: ['Review recent feedback', 'Contact testers for details'],
        createdAt: new Date()
      });
    }
    
    // Alert for critical issues
    const criticalIssues = issues.filter(i => i.percentage > 20);
    criticalIssues.forEach(issue => {
      alerts.push({
        id: `critical-issue-${issue.issue}-${Date.now()}`,
        type: 'issue',
        severity: 'high',
        title: `High Frequency Issue: ${issue.issue}`,
        description: `Affects ${issue.percentage.toFixed(1)}% of feedback`,
        details: `Reported ${issue.count} times`,
        actions: ['Investigate root cause', 'Plan fix for next release'],
        createdAt: new Date()
      });
    });
    
    // Alert for emerging patterns
    patterns.forEach(pattern => {
      alerts.push({
        id: `pattern-${pattern.type}-${Date.now()}`,
        type: 'pattern',
        severity: pattern.severity,
        title: pattern.description,
        description: `Emerging pattern detected`,
        details: `Type: ${pattern.type}, Severity: ${pattern.severity}`,
        actions: pattern.recommendations,
        createdAt: new Date()
      });
    });
    
    return alerts;
  }
  
  private async sendAlerts(alerts: Alert[]): Promise<void> {
    console.log(`Sending ${alerts.length} alerts...\n`);
    
    for (const alert of alerts) {
      console.log(`🔔 ${alert.severity.toUpperCase()}: ${alert.title}`);
      console.log(`   ${alert.description}`);
      console.log(`   Actions: ${alert.actions.join(', ')}`);
      console.log('');
      
      // Send to Slack/Teams/Email based on severity
      await this.sendNotification(alert);
    }
  }
  
  private async sendNotification(alert: Alert): Promise<void> {
    // Implement notification logic (Slack, email, etc.)
    console.log(`[Notification sent] ${alert.title}`);
  }
  
  private generateAnalysisReport(
    sentiment: SentimentAnalysis,
    issues: CommonIssue[],
    patterns: EmergingPattern[],
    alerts: Alert[]
  ): void {
    console.log('=== BETA FEEDBACK ANALYSIS REPORT ===\n');
    
    console.log('SENTIMENT ANALYSIS:');
    console.log(`  Trend: ${sentiment.trend}`);
    console.log(`  Average Rating: ${sentiment.averageRating.toFixed(1)}/5`);
    console.log(`  Rating Change: ${sentiment.ratingChange.toFixed(1)}%`);
    console.log(`  Feedback Count: ${sentiment.feedbackCount}`);
    
    console.log('\nTOP ISSUES:');
    issues.slice(0, 5).forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue.issue}: ${issue.count} reports (${issue.percentage.toFixed(1)}%)`);
    });
    
    console.log('\nEMERGING PATTERNS:');
    patterns.forEach(pattern => {
      console.log(`  • ${pattern.type}: ${pattern.description} (${pattern.severity})`);
    });
    
    console.log('\nALERTS GENERATED:');
    console.log(`  Total: ${alerts.length}`);
    console.log(`  High: ${alerts.filter(a => a.severity === 'high').length}`);
    console.log(`  Medium: ${alerts.filter(a => a.severity === 'medium').length}`);
    console.log(`  Low: ${alerts.filter(a => a.severity === 'low').length}`);
    
    // Export to JSON
    const report = {
      generatedAt: new Date().toISOString(),
      sentimentAnalysis: sentiment,
      topIssues: issues.slice(0, 10),
      emergingPatterns: patterns,
      alerts: alerts.map(a => ({
        ...a,
        createdAt: a.createdAt.toISOString()
      })),
      summary: {
        totalFeedback: this.feedback.length,
        averageRating: sentiment.averageRating,
        issueCount: issues.length,
        alertCount: alerts.length
      }
    };
    
    const reportPath = path.join(process.cwd(), 'beta-feedback-analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n✅ Report saved to ${reportPath}`);
  }
  
  private getFeaturesForIssue(issue: string): string[] {
    return [...new Set(
      this.feedback
        .filter(f => f.issues.includes(issue))
        .map(f => f.feature)
    )];
  }
  
  private loadFeedback(): BetaFeedback[] {
    // Load from database or file
    try {
      // Try loading from beta testing framework storage
      const feedbackPath = path.join(process.cwd(), 'beta-feedback.json');
      if (fs.existsSync(feedbackPath)) {
        const data = fs.readFileSync(feedbackPath, 'utf8');
        return JSON.parse(data);
      }
      
      // Try loading from beta testing report
      const reportPath = path.join(process.cwd(), 'beta-testing-report.json');
      if (fs.existsSync(reportPath)) {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        return report.recentFeedback || [];
      }
    } catch (error) {
      console.warn('Could not load feedback:', error);
    }
    
    return [];
  }
}

// Run analysis if executed directly
if (require.main === module) {
  const analyzer = new BetaFeedbackAnalyzer();
  analyzer.analyzeAndAlert().catch(console.error);
}

