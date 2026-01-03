/**
 * Human Conversation Engine
 * 
 * Manages natural, human-like conversations with:
 * - Personality system
 * - Conversation memory
 * - Emotion detection
 * - Egyptian conversation styles
 * - Natural responses with mannerisms
 */

import { EgyptianWorkshopNLP, type EgyptianDialect, type UserType } from '@/lib/nlp/EgyptianWorkshopNLP';

export interface ConversationMemory {
  userId: string;
  history: ConversationTurn[];
  emotionalState: EmotionalState;
  personalityTraits: PersonalityTraits;
  preferences: UserPreferences;
}

export interface ConversationTurn {
  timestamp: number;
  userMessage: string;
  assistantMessage: string;
  assistantMessageArabic: string;
  emotion?: Emotion;
  topic?: string;
}

export interface EmotionalState {
  current: Emotion;
  history: Array<{ emotion: Emotion; timestamp: number }>;
  intensity: number; // 0-1
}

export type Emotion = 'happy' | 'frustrated' | 'confused' | 'satisfied' | 'worried' | 'neutral';

export interface PersonalityTraits {
  formality: 'casual' | 'respectful' | 'formal';
  verbosity: 'minimal' | 'moderate' | 'detailed';
  humor: 'none' | 'light' | 'moderate' | 'heavy';
  patience: 'low' | 'medium' | 'high';
}

export interface UserPreferences {
  preferredLanguage: 'ar' | 'en';
  preferredDialect: EgyptianDialect;
  responseLength: 'short' | 'medium' | 'long';
  explanationDepth: 'simple' | 'moderate' | 'detailed';
}

export interface ConversationStyle {
  greeting: string;
  closing: string;
  transitions: string[];
  confirmations: string[];
  clarifications: string[];
}

/**
 * Human Conversation Engine
 */
export class HumanConversationEngine {
  private memories: Map<string, ConversationMemory> = new Map();
  private workshopNLP: EgyptianWorkshopNLP;

  constructor() {
    this.workshopNLP = new EgyptianWorkshopNLP();
  }

  /**
   * Get or create conversation memory
   */
  getConversationMemory(userId: string): ConversationMemory {
    if (!this.memories.has(userId)) {
      this.memories.set(userId, {
        userId,
        history: [],
        emotionalState: {
          current: 'neutral',
          history: [],
          intensity: 0.5,
        },
        personalityTraits: {
          formality: 'respectful',
          verbosity: 'moderate',
          humor: 'light',
          patience: 'high',
        },
        preferences: {
          preferredLanguage: 'ar',
          preferredDialect: 'cairo_shobra',
          responseLength: 'medium',
          explanationDepth: 'moderate',
        },
      });
    }

    return this.memories.get(userId)!;
  }

  /**
   * Generate human-like response
   */
  async generateResponse(
    userId: string,
    userMessage: string,
    technicalAnswer: string,
    userType: UserType,
    location: string
  ): Promise<{
    response: string;
    responseArabic: string;
    emotion: Emotion;
    style: ConversationStyle;
  }> {
    const memory = this.getConversationMemory(userId);

    // 1. Detect emotion from user message
    const emotion = this.detectEmotion(userMessage, memory);

    // 2. Update emotional state
    this.updateEmotionalState(memory, emotion);

    // 3. Learn personality traits from interaction
    this.learnPersonalityTraits(memory, userMessage);

    // 4. Get conversation style
    const style = this.getConversationStyle(userType, memory.personalityTraits, location);

    // 5. Generate response with personality
    const response = await this.generatePersonalityResponse(
      technicalAnswer,
      userMessage,
      memory,
      style,
      userType,
      location
    );

    // 6. Translate to workshop Egyptian
    const parsed = await this.workshopNLP.understandWorkshopQuery(response, userType);
    const workshopResponse = await this.workshopNLP.respondInWorkshopTongue(response, parsed.dialect, userType);
    const responseArabic = workshopResponse.workshop || response;

    // 7. Add mannerisms
    const responseWithMannerisms = this.addMannerisms(
      responseArabic,
      style,
      emotion,
      userType
    );

    // 8. Save to memory
    memory.history.push({
      timestamp: Date.now(),
      userMessage,
      assistantMessage: response,
      assistantMessageArabic: responseWithMannerisms,
      emotion,
    });

    return {
      response,
      responseArabic: responseWithMannerisms,
      emotion,
      style,
    };
  }

  /**
   * Detect emotion from user message
   */
  private detectEmotion(message: string, memory: ConversationMemory): Emotion {
    const lower = message.toLowerCase();

    // Frustration indicators
    if (
      lower.includes('مش شغال') ||
      lower.includes('غلط') ||
      lower.includes('مش فاهم') ||
      lower.includes('مش عارف')
    ) {
      return 'frustrated';
    }

    // Confusion indicators
    if (
      lower.includes('ازاي') ||
      lower.includes('كيف') ||
      lower.includes('مش فاهم') ||
      lower.includes('شرح')
    ) {
      return 'confused';
    }

    // Worry indicators
    if (
      lower.includes('خوف') ||
      lower.includes('قلق') ||
      lower.includes('مشكلة') ||
      lower.includes('غلط')
    ) {
      return 'worried';
    }

    // Satisfaction indicators
    if (
      lower.includes('شكراً') ||
      lower.includes('تمام') ||
      lower.includes('كويس') ||
      lower.includes('ممتاز')
    ) {
      return 'satisfied';
    }

    // Happy indicators
    if (
      lower.includes('حلو') ||
      lower.includes('رائع') ||
      lower.includes('ممتاز') ||
      lower.includes('برافو')
    ) {
      return 'happy';
    }

    // Default to previous emotion or neutral
    return memory.emotionalState.current || 'neutral';
  }

  /**
   * Update emotional state
   */
  private updateEmotionalState(memory: ConversationMemory, emotion: Emotion): void {
    memory.emotionalState.current = emotion;
    memory.emotionalState.history.push({
      emotion,
      timestamp: Date.now(),
    });

    // Keep only last 10 emotions
    if (memory.emotionalState.history.length > 10) {
      memory.emotionalState.history.shift();
    }

    // Calculate intensity based on recent emotions
    const recentEmotions = memory.emotionalState.history.slice(-5);
    const emotionCounts = recentEmotions.reduce((acc, e) => {
      acc[e.emotion] = (acc[e.emotion] || 0) + 1;
      return acc;
    }, {} as Record<Emotion, number>);

    const maxCount = Math.max(...Object.values(emotionCounts));
    memory.emotionalState.intensity = maxCount / recentEmotions.length;
  }

  /**
   * Learn personality traits from interaction
   */
  private learnPersonalityTraits(memory: ConversationMemory, message: string): void {
    const lower = message.toLowerCase();

    // Detect formality
    if (lower.includes('يا معلم') || lower.includes('يا ريس')) {
      memory.personalityTraits.formality = 'respectful';
    } else if (lower.includes('يا هندسة') || lower.includes('يا باشا')) {
      memory.personalityTraits.formality = 'casual';
    }

    // Detect verbosity preference
    if (message.length < 20) {
      memory.personalityTraits.verbosity = 'minimal';
    } else if (message.length > 100) {
      memory.personalityTraits.verbosity = 'detailed';
    }

    // Detect humor preference
    if (lower.includes('ضحك') || lower.includes('مزح') || lower.includes('هزار')) {
      memory.personalityTraits.humor = 'moderate';
    }
  }

  /**
   * Get conversation style
   */
  private getConversationStyle(
    userType: UserType,
    traits: PersonalityTraits,
    location: string
  ): ConversationStyle {
    // Detect dialect from location
    let _dialect: EgyptianDialect = 'cairo_shobra';
    if (location.toLowerCase().includes('alexandria')) {
      _dialect = 'alexandria';
    } else if (location.toLowerCase().includes('upper')) {
      _dialect = 'upper_egypt';
    }

    const styles: Partial<Record<UserType, ConversationStyle>> & { general: ConversationStyle } = {
      workshop_owner: {
        greeting: 'يا ريس',
        closing: 'ربنا يبارك',
        transitions: ['طيب', 'خلينا نشوف', 'اتفضل'],
        confirmations: ['تمام', 'كويس', 'ممتاز'],
        clarifications: ['تقصد', 'يعني', 'يعني إيه'],
      },
      operator: {
        greeting: 'يا اسطى',
        closing: 'خلي بالك من الجودة',
        transitions: ['خلينا نشوف', 'اتفضل', 'قول'],
        confirmations: ['تمام', 'صح', 'كويس'],
        clarifications: ['يعني إيه', 'تقصد', 'ازاي'],
      },
      technical_office: {
        greeting: 'من الناحية الهندسية',
        closing: 'حسب المواصفات',
        transitions: ['بناءً على', 'حسب', 'وفقاً ل'],
        confirmations: ['صحيح', 'دقيق', 'مطابق'],
        clarifications: ['أقصد', 'أعني', 'بمعنى'],
      },
      beginner: {
        greeting: 'معلومة بسيطة',
        closing: 'لو محتاج مساعدة قول',
        transitions: ['خليني أشرحلك', 'ببساطة', 'يعني'],
        confirmations: ['فهمت', 'تمام', 'كويس'],
        clarifications: ['يعني إيه', 'ازاي', 'كيف'],
      },
      general: {
        greeting: 'أهلاً',
        closing: 'لو محتاج حاجة قول',
        transitions: ['طيب', 'خلينا نشوف'],
        confirmations: ['تمام', 'كويس'],
        clarifications: ['يعني إيه', 'تقصد'],
      },
    };

    return styles[userType] || styles.general;
  }

  /**
   * Generate personality-based response
   */
  private async generatePersonalityResponse(
    technicalAnswer: string,
    userMessage: string,
    memory: ConversationMemory,
    style: ConversationStyle,
    userType: UserType,
    location: string
  ): Promise<string> {
    let response = technicalAnswer;

    // Adjust based on verbosity preference
    if (memory.personalityTraits.verbosity === 'minimal') {
      response = response.split('.')[0] + '.';
    } else if (memory.personalityTraits.verbosity === 'detailed') {
      response = `${response}. ${this.addContextualDetails(userMessage, location)}`;
    }

    // Adjust based on formality
    if (memory.personalityTraits.formality === 'casual') {
      response = this.makeCasual(response);
    } else if (memory.personalityTraits.formality === 'formal') {
      response = this.makeFormal(response);
    }

    // Add humor if appropriate
    if (memory.emotionalState.current === 'frustrated' && memory.personalityTraits.humor !== 'none') {
      response = this.addHumor(response, style);
    }

    return response;
  }

  /**
   * Add mannerisms to response
   */
  private addMannerisms(
    response: string,
    style: ConversationStyle,
    emotion: Emotion,
    _userType: UserType
  ): string {
    let manneredResponse = response;

    // Add greeting based on emotion
    if (emotion === 'frustrated') {
      manneredResponse = `${style.greeting}، ${manneredResponse}، متقلقش هنحلها`;
    } else if (emotion === 'confused') {
      manneredResponse = `${style.greeting}، ${manneredResponse}، لو محتاج شرح تاني قول`;
    } else {
      manneredResponse = `${style.greeting}، ${manneredResponse}`;
    }

    // Add closing
    manneredResponse = `${manneredResponse}، ${style.closing}`;

    return manneredResponse;
  }

  /**
   * Make response casual
   */
  private makeCasual(response: string): string {
    return response.replace(/يجب/g, 'لازم').replace(/يجب عليك/g, 'لازم');
  }

  /**
   * Make response formal
   */
  private makeFormal(response: string): string {
    return response.replace(/لازم/g, 'يجب').replace(/مش/g, 'ليس');
  }

  /**
   * Add humor to response
   */
  private addHumor(response: string, _style: ConversationStyle): string {
    const jokes = [
      'الشغلانة دي أسهل من شرب المية... تقريباً',
      'ده أبسط من تركيب عروة... والله مش بهزر',
      'هتعملها وأنت مغمض عينك... بس متغمسهومش عشان السلامة',
    ];

    const joke = jokes[Math.floor(Math.random() * jokes.length)];
    return `${response}. ${joke}`;
  }

  /**
   * Add contextual details
   */
  private addContextualDetails(message: string, location: string): string {
    if (location.toLowerCase().includes('cairo')) {
      return 'في القاهرة، المنافسة عالية فخلي السعر تنافسي.';
    } else if (location.toLowerCase().includes('alexandria')) {
      return 'في الإسكندرية، الملوحة بتأثر على المواد فاستخدم مواد مقاومة.';
    }

    return '';
  }

  /**
   * Get conversation history
   */
  getConversationHistory(userId: string, limit: number = 10): ConversationTurn[] {
    const memory = this.getConversationMemory(userId);
    return memory.history.slice(-limit);
  }

  /**
   * Clear conversation history
   */
  clearConversationHistory(userId: string): void {
    const memory = this.getConversationMemory(userId);
    memory.history = [];
    memory.emotionalState.current = 'neutral';
    memory.emotionalState.history = [];
  }
}

