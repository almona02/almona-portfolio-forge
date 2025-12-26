/**
 * Egyptian Response Translator
 * 
 * Translates technical answers to Egyptian workshop language
 */

import { EgyptianDialectDetector, type UserType } from '@/lib/nlp/EgyptianDialectDetector';
import type { YDTAnswer } from '@/lib/ydt/types';

export interface UserContext {
  location?: string;
  userType?: UserType;
  dialect?: 'cairo' | 'alexandria' | 'upper_egypt' | 'standard';
}

export interface TranslatedAnswer {
  technical: string;
  maalem: string;
  simple: string;
  withMannerisms: string;
}

/**
 * Egyptian Response Translator
 */
export class EgyptianResponseTranslator {
  private dialectDetector: EgyptianDialectDetector;

  constructor() {
    this.dialectDetector = new EgyptianDialectDetector();
  }

  /**
   * Translate answer to user's dialect
   */
  async translateAnswer(
    technicalAnswer: YDTAnswer,
    userType: UserType,
    location: string = 'cairo'
  ): Promise<TranslatedAnswer> {
    return {
      technical: technicalAnswer.answer,
      maalem: this.translateToMaalem(technicalAnswer.answer, userType),
      simple: this.simplifyForUser(technicalAnswer.answer, userType),
      withMannerisms: this.addEgyptianMannerisms(technicalAnswer.answer, userType, location),
    };
  }

  /**
   * Translate to maalem language
   */
  private translateToMaalem(answer: string, userType: UserType): string {
    const translations: Record<string, string> = {
      'optimization': 'بيوفرلك خشب، كل متر بيخش في حته',
      'accuracy': 'مفيش غلطة، كل قطعة على المقاس',
      'speed': 'ضغطة تلاتة وتكون خلصت',
      'pricing': 'السعر حسب السوق، مش هتخسر',
      'validation': 'الشغل مضمون، مش هتحصل مشاكل',
    };

    // Find matching translation
    for (const [key, translation] of Object.entries(translations)) {
      if (answer.toLowerCase().includes(key)) {
        return translation;
      }
    }

    // Default maalem translation
    return this.createMaalemTranslation(answer, userType);
  }

  /**
   * Simplify for beginner users
   */
  private simplifyForUser(answer: string, userType: UserType): string {
    if (userType === 'beginner') {
      return `ببساطة: ${answer.split('.')[0]}. دوس على الزر وخلاص.`;
    }

    return answer;
  }

  /**
   * Add Egyptian mannerisms
   */
  private addEgyptianMannerisms(
    answer: string,
    userType: UserType,
    location: string
  ): string {
    const greetings = {
      cairo: 'ياسطي',
      alexandria: 'يا ريس',
      upper_egypt: 'يا معلم',
      standard: 'يا ريس',
    };

    const greeting = greetings[location] || greetings.standard;

    if (userType === 'workshop_owner' || userType === 'maalem') {
      return `${greeting}، ${answer} ربنا يبارك.`;
    }

    if (userType === 'operator') {
      return `${greeting}، ${answer} خلي بالك من الجودة.`;
    }

    return answer;
  }

  /**
   * Create maalem translation
   */
  private createMaalemTranslation(answer: string, userType: UserType): string {
    // Simple word replacement for common technical terms
    const replacements: Record<string, string> = {
      'algorithm': 'البرنامج',
      'optimization': 'التوفير',
      'accuracy': 'الدقة',
      'validation': 'الفحص',
      'calculation': 'الحساب',
      'system': 'النظام',
      'process': 'العملية',
    };

    let translated = answer;
    for (const [english, arabic] of Object.entries(replacements)) {
      translated = translated.replace(new RegExp(english, 'gi'), arabic);
    }

    return translated;
  }
}



