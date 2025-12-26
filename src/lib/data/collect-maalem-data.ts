/**
 * Maalem Data Collection System
 * 
 * System to collect real workshop wisdom:
 * - Record 10+ real workshop conversations
 * - Interview 5+ veteran maalems
 * - Build dialect dictionary
 * - Capture problem-solving stories
 * - Document supplier networks
 * - Collect workshop tricks
 */

export interface WorkshopConversation {
  id: string;
  workshopId: string;
  workshopName: string;
  location: string;
  date: string;
  participants: Array<{
    name: string;
    role: 'maalem' | 'operator' | 'owner' | 'engineer';
    experience: number; // years
  }>;
  transcript: ConversationLine[];
  topics: string[];
  wisdom: ExtractedWisdom[];
}

export interface ConversationLine {
  speaker: string;
  role: 'maalem' | 'operator' | 'owner' | 'engineer';
  message: string;
  timestamp: number;
  context?: string;
}

export interface ExtractedWisdom {
  type: 'trick' | 'warning' | 'advice' | 'story' | 'supplier_info' | 'material_advice';
  content: string;
  contentArabic: string;
  confidence: number;
  verified: boolean;
  verifiedBy?: string[];
  applicableScenarios: string[];
}

export interface MaalemInterview {
  id: string;
  maalemName: string;
  location: string;
  experience: number; // years
  specialization: string;
  date: string;
  questions: InterviewQuestion[];
  wisdom: ExtractedWisdom[];
}

export interface InterviewQuestion {
  question: string;
  questionArabic: string;
  answer: string;
  answerArabic: string;
  category: 'technique' | 'material' | 'pricing' | 'supplier' | 'workshop_management';
}

export interface DialectEntry {
  term: string;
  meaning: string;
  meaningArabic: string;
  region: 'cairo' | 'alexandria' | 'upper_egypt' | 'delta' | 'suez';
  context: string;
  examples: string[];
}

export interface ProblemSolvingStory {
  id: string;
  problem: string;
  problemArabic: string;
  solution: string;
  solutionArabic: string;
  workshop: string;
  location: string;
  maalem: string;
  outcome: string;
  outcomeArabic: string;
  lessons: string[];
  lessonsArabic: string[];
}

export interface SupplierNetwork {
  supplierName: string;
  location: string;
  materials: string[];
  reputation: 'high' | 'medium' | 'low' | 'mixed';
  paymentTerms: string;
  deliveryTime: string;
  quality: 'high' | 'medium' | 'low';
  priceRange: 'expensive' | 'moderate' | 'cheap';
  notes: string;
  notesArabic: string;
  verified: boolean;
}

export interface WorkshopTrick {
  id: string;
  trick: string;
  trickArabic: string;
  category: 'cutting' | 'welding' | 'assembly' | 'material' | 'pricing' | 'quality';
  whenToUse: string;
  whenToUseArabic: string;
  whenNotToUse: string;
  whenNotToUseArabic: string;
  source: string; // maalem name
  location: string;
  verified: boolean;
}

/**
 * Maalem Data Collection System
 */
export class MaalemDataCollector {
  private conversations: WorkshopConversation[] = [];
  private interviews: MaalemInterview[] = [];
  private dialectDictionary: DialectEntry[] = [];
  private stories: ProblemSolvingStory[] = [];
  private suppliers: SupplierNetwork[] = [];
  private tricks: WorkshopTrick[] = [];

  /**
   * Record workshop conversation
   */
  async recordConversation(conversation: WorkshopConversation): Promise<void> {
    this.conversations.push(conversation);

    // Extract wisdom from conversation
    const wisdom = this.extractWisdomFromConversation(conversation);
    conversation.wisdom = wisdom;

    // Extract dialect terms
    this.extractDialectTerms(conversation);

    // Extract stories
    this.extractStories(conversation);
  }

  /**
   * Record maalem interview
   */
  async recordInterview(interview: MaalemInterview): Promise<void> {
    this.interviews.push(interview);

    // Extract wisdom from interview
    const wisdom = this.extractWisdomFromInterview(interview);
    interview.wisdom = wisdom;
  }

  /**
   * Extract wisdom from conversation
   */
  private extractWisdomFromConversation(conversation: WorkshopConversation): ExtractedWisdom[] {
    const wisdom: ExtractedWisdom[] = [];

    for (const line of conversation.transcript) {
      if (line.role === 'maalem') {
        // Detect wisdom type
        if (line.message.includes('خد بالك') || line.message.includes('احذر')) {
          wisdom.push({
            type: 'warning',
            content: line.message,
            contentArabic: line.message,
            confidence: 0.8,
            verified: false,
            applicableScenarios: [conversation.topics.join(', ')],
          });
        } else if (line.message.includes('جرب') || line.message.includes('استخدم')) {
          wisdom.push({
            type: 'trick',
            content: line.message,
            contentArabic: line.message,
            confidence: 0.8,
            verified: false,
            applicableScenarios: [conversation.topics.join(', ')],
          });
        } else if (line.message.includes('سر المهنة') || line.message.includes('من الخبرة')) {
          wisdom.push({
            type: 'advice',
            content: line.message,
            contentArabic: line.message,
            confidence: 0.9,
            verified: false,
            applicableScenarios: [conversation.topics.join(', ')],
          });
        }
      }
    }

    return wisdom;
  }

  /**
   * Extract wisdom from interview
   */
  private extractWisdomFromInterview(interview: MaalemInterview): ExtractedWisdom[] {
    const wisdom: ExtractedWisdom[] = [];

    for (const question of interview.questions) {
      if (question.category === 'technique' || question.category === 'material') {
        wisdom.push({
          type: 'advice',
          content: question.answer,
          contentArabic: question.answerArabic,
          confidence: 0.9,
          verified: true,
          verifiedBy: [interview.maalemName],
          applicableScenarios: [question.category],
        });
      } else if (question.category === 'supplier') {
        wisdom.push({
          type: 'supplier_info',
          content: question.answer,
          contentArabic: question.answerArabic,
          confidence: 0.85,
          verified: true,
          verifiedBy: [interview.maalemName],
          applicableScenarios: ['supplier_selection'],
        });
      }
    }

    return wisdom;
  }

  /**
   * Extract dialect terms
   */
  private extractDialectTerms(conversation: WorkshopConversation): void {
    for (const line of conversation.transcript) {
      // Detect regional terms
      const terms = this.detectDialectTerms(line.message, conversation.location);

      for (const term of terms) {
        if (!this.dialectDictionary.find((d) => d.term === term.term && d.region === term.region)) {
          this.dialectDictionary.push(term);
        }
      }
    }
  }

  /**
   * Detect dialect terms in message
   */
  private detectDialectTerms(message: string, location: string): DialectEntry[] {
    const terms: DialectEntry[] = [];

    // Cairo terms
    if (location.toLowerCase().includes('cairo')) {
      if (message.includes('إيه')) {
        terms.push({
          term: 'إيه',
          meaning: 'what',
          meaningArabic: 'ما',
          region: 'cairo',
          context: 'question',
          examples: ['إيه المشكلة؟'],
        });
      }
    }

    // Alexandria terms
    if (location.toLowerCase().includes('alexandria')) {
      if (message.includes('إزيك')) {
        terms.push({
          term: 'إزيك',
          meaning: 'how are you',
          meaningArabic: 'كيف حالك',
          region: 'alexandria',
          context: 'greeting',
          examples: ['إزيك يا باشا'],
        });
      }
    }

    return terms;
  }

  /**
   * Extract stories from conversation
   */
  private extractStories(conversation: WorkshopConversation): void {
    for (const line of conversation.transcript) {
      if (line.role === 'maalem' && line.message.includes('كان') && line.message.includes('جرب')) {
        // Potential story
        const story = this.parseStory(line.message, conversation);
        if (story) {
          this.stories.push(story);
        }
      }
    }
  }

  /**
   * Parse story from message
   */
  private parseStory(message: string, conversation: WorkshopConversation): ProblemSolvingStory | null {
    // Simple story detection
    if (message.includes('كان') && message.includes('جرب') && message.includes('قعد')) {
      return {
        id: `story_${Date.now()}`,
        problem: 'Extracted from conversation',
        problemArabic: 'مستخرج من المحادثة',
        solution: message,
        solutionArabic: message,
        workshop: conversation.workshopName,
        location: conversation.location,
        maalem: conversation.participants.find((p) => p.role === 'maalem')?.name || 'Unknown',
        outcome: 'Success',
        outcomeArabic: 'نجح',
        lessons: ['Extracted lesson'],
        lessonsArabic: ['درس مستخرج'],
      };
    }

    return null;
  }

  /**
   * Add supplier to network
   */
  async addSupplier(supplier: SupplierNetwork): Promise<void> {
    this.suppliers.push(supplier);
  }

  /**
   * Add workshop trick
   */
  async addTrick(trick: WorkshopTrick): Promise<void> {
    this.tricks.push(trick);
  }

  /**
   * Get all collected data
   */
  getAllData(): {
    conversations: WorkshopConversation[];
    interviews: MaalemInterview[];
    dialectDictionary: DialectEntry[];
    stories: ProblemSolvingStory[];
    suppliers: SupplierNetwork[];
    tricks: WorkshopTrick[];
  } {
    return {
      conversations: this.conversations,
      interviews: this.interviews,
      dialectDictionary: this.dialectDictionary,
      stories: this.stories,
      suppliers: this.suppliers,
      tricks: this.tricks,
    };
  }

  /**
   * Export data for YDT
   */
  async exportForYDT(): Promise<{
    wisdom: ExtractedWisdom[];
    dialect: DialectEntry[];
    stories: ProblemSolvingStory[];
    suppliers: SupplierNetwork[];
    tricks: WorkshopTrick[];
  }> {
    // Collect all wisdom
    const allWisdom: ExtractedWisdom[] = [];

    for (const conversation of this.conversations) {
      allWisdom.push(...conversation.wisdom);
    }

    for (const interview of this.interviews) {
      allWisdom.push(...interview.wisdom);
    }

    return {
      wisdom: allWisdom,
      dialect: this.dialectDictionary,
      stories: this.stories,
      suppliers: this.suppliers,
      tricks: this.tricks,
    };
  }
}


