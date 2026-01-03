/**
 * Hybrid Egyptian Maalem
 * 
 * Combines three layers for unbeatable intelligence:
 * - AI Layer: Language processing, pattern recognition
 * - Knowledge Layer: YOUR proprietary data (docs, code, market)
 * - Human Layer: Captured maalem wisdom (stories, tricks, warnings)
 */

import { HumanConversationEngine } from '@/lib/conversation/HumanConversationEngine';
import { EgyptianWorkshopNLP, type UserType } from '@/lib/nlp/EgyptianWorkshopNLP';
import { MaalemReasoningEngine } from '@/lib/reasoning/MaalemReasoningEngine';
import { MaalemTeachingEngine } from '@/lib/teaching/MaalemTeachingEngine';
import { DocumentationKnowledgeGraph } from './DocumentationKnowledgeGraph';
import { QuickStartYDT } from './QuickStartYDT';
import type { YDTAnswer } from './types';

export interface HybridResponse {
  answer: string;
  answerArabic: string;
  confidence: number;
  source: 'ai' | 'knowledge' | 'human' | 'hybrid';
  layers: {
    ai: string;
    knowledge: string;
    human: string;
  };
  reasoning?: string;
  reasoningArabic?: string;
  story?: string;
  warning?: string;
  practicalAdvice?: string;
}

export interface HybridContext {
  userId: string;
  question: string;
  userType: UserType;
  location: string;
  workshopContext?: {
    size?: 'small' | 'medium' | 'large';
    experience?: number;
    specialization?: string;
  };
}

/**
 * Hybrid Egyptian Maalem
 * 
 * The ultimate intelligence system combining:
 * - AI processing
 * - Proprietary knowledge
 * - Human maalem wisdom
 */
export class HybridEgyptianMaalem {
  private quickStartYDT: QuickStartYDT;
  private knowledgeGraph: DocumentationKnowledgeGraph;
  private workshopNLP: EgyptianWorkshopNLP;
  private reasoningEngine: MaalemReasoningEngine;
  private conversationEngine: HumanConversationEngine;
  private teachingEngine: MaalemTeachingEngine;
  private oralMemory: Map<string, { story?: string; trick?: string; warning?: string }> = new Map();

  constructor() {
    this.knowledgeGraph = new DocumentationKnowledgeGraph();
    this.quickStartYDT = new QuickStartYDT(this.knowledgeGraph);
    this.workshopNLP = new EgyptianWorkshopNLP();
    this.reasoningEngine = new MaalemReasoningEngine();
    this.conversationEngine = new HumanConversationEngine();
    this.teachingEngine = new MaalemTeachingEngine();
  }

  /**
   * Answer question using hybrid intelligence
   */
  async answer(context: HybridContext): Promise<HybridResponse> {
    const { userId, question, userType, location, workshopContext } = context;

    // 1. AI LAYER: Process question
    const aiAnswer = await this.processWithAI(question, userType, location);

    // 2. KNOWLEDGE LAYER: Query proprietary knowledge
    const knowledgeAnswer = await this.queryKnowledgeBase(question);

    // 3. HUMAN LAYER: Apply maalem reasoning
    const humanWisdom = await this.reasoningEngine.reasonWithMaalemWisdom({
      question,
      userType,
      location,
      workshopContext,
    });

    // 4. ORAL TRADITION: Check for relevant stories/tricks
    const oralWisdom = await this.getOralWisdom(question, location);

    // 5. CONVERSATION: Generate human-like response
    const conversationResponse = await this.conversationEngine.generateResponse(
      userId,
      question,
      knowledgeAnswer.answer,
      userType,
      location
    );

    // 6. COMBINE LAYERS
    const hybridAnswer = this.combineLayers(
      aiAnswer,
      knowledgeAnswer,
      humanWisdom,
      oralWisdom,
      conversationResponse
    );

    return {
      answer: hybridAnswer.technical,
      answerArabic: hybridAnswer.maalem,
      confidence: Math.max(aiAnswer.confidence, knowledgeAnswer.confidence, 0.9),
      source: 'hybrid',
      layers: {
        ai: aiAnswer.answer,
        knowledge: knowledgeAnswer.answer,
        human: humanWisdom.maalem,
      },
      reasoning: humanWisdom.technical,
      reasoningArabic: humanWisdom.maalem,
      story: humanWisdom.story || oralWisdom.story,
      warning: humanWisdom.warning,
      practicalAdvice: humanWisdom.practicalAdvice,
    };
  }

  /**
   * AI LAYER: Process with AI
   */
  private async processWithAI(
    question: string,
    _userType: UserType,
    _location: string
  ): Promise<YDTAnswer> {
    return this.quickStartYDT.answerQuestion(question);
  }

  /**
   * KNOWLEDGE LAYER: Query proprietary knowledge
   */
  private async queryKnowledgeBase(question: string): Promise<YDTAnswer> {
    const result = this.knowledgeGraph.query({
      type: 'system',
      keyword: this.extractKeywords(question),
      context: question,
    });

    if (result.matches.length > 0) {
      return {
        answer: result.matches[0].content,
        confidence: result.matches[0].confidence,
        source: result.matches[0].source,
        related: result.related,
        nextSteps: [],
        expertTip: undefined,
      };
    }

    return {
      answer: 'Knowledge not found',
      confidence: 0.5,
      source: 'Knowledge Base',
      related: [],
      nextSteps: [],
    };
  }

  /**
   * HUMAN LAYER: Get oral wisdom
   */
  private async getOralWisdom(question: string, _location: string): Promise<{
    story?: string;
    trick?: string;
    warning?: string;
  }> {
    // Query oral tradition memory
    const keywords = this.extractKeywords(question);
    const wisdom = this.oralMemory.get(keywords) || {};

    return {
      story: wisdom.story,
      trick: wisdom.trick,
      warning: wisdom.warning,
    };
  }

  /**
   * Combine all layers
   */
  private combineLayers(
    aiAnswer: YDTAnswer,
    knowledgeAnswer: YDTAnswer,
    humanWisdom: any,
    oralWisdom: any,
    conversationResponse: any
  ): {
    technical: string;
    maalem: string;
  } {
    // Prioritize: Knowledge > Human > AI
    let technical = knowledgeAnswer.answer;
    if (!technical || technical === 'Knowledge not found') {
      technical = aiAnswer.answer;
    }

    // Maalem version combines human wisdom with conversation style
    let maalem = humanWisdom.maalem;
    if (!maalem) {
      maalem = conversationResponse.responseArabic;
    }

    // Add story if available
    if (humanWisdom.story || oralWisdom.story) {
      maalem = `${maalem}. ${humanWisdom.story || oralWisdom.story}`;
    }

    // Add warning if available
    if (humanWisdom.warning) {
      maalem = `${maalem}. ⚠️ ${humanWisdom.warning}`;
    }

    // Add practical advice if available
    if (humanWisdom.practicalAdvice) {
      maalem = `${maalem}. 💡 ${humanWisdom.practicalAdvice}`;
    }

    return {
      technical,
      maalem,
    };
  }

  /**
   * Extract keywords
   */
  private extractKeywords(question: string): string {
    const stopWords = ['what', 'how', 'does', 'do', 'is', 'are', 'the', 'a', 'an'];
    const words = question.toLowerCase().split(/\s+/);
    const keywords = words.filter(
      (word) => word.length > 2 && !stopWords.includes(word) && !word.match(/^[^\w]+$/)
    );
    return keywords.join(' ');
  }

  /**
   * Teach user (uses MaalemTeachingEngine)
   */
  async teach(
    userId: string,
    topic: string
  ): Promise<{
    session: any;
    method: any;
  }> {
    const profile = this.teachingEngine.getStudentProfile(userId);
    const session = await this.teachingEngine.createTeachingSession(topic, profile.level, userId);

    const method = {
      explanation: `${session.theory.university}\n\n${session.practical.maalem}`,
      explanationArabic: `${session.theory.universityArabic}\n\n${session.practical.maalemArabic}`,
      examples: session.exercises.map((e) => e.question),
      examplesArabic: session.exercises.map((e) => e.questionArabic),
      analogies: session.tips,
      analogiesArabic: session.tips,
    };

    return { session, method };
  }

  /**
   * Learn from user (captures maalem wisdom)
   */
  async learnFromUser(
    _userId: string,
    _statement: string,
    _context: HybridContext
  ): Promise<{
    accepted: boolean;
    message: string;
    messageArabic: string;
  }> {
    // Would use LearningConversation to capture wisdom
    // For now, placeholder
    return {
      accepted: true,
      message: 'Thank you for sharing your knowledge',
      messageArabic: 'شكراً لمشاركة معرفتك',
    };
  }
}

