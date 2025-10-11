/**
 * SearchSynonymsService
 * 
 * Intelligent synonym mapping for industrial machinery search.
 * Handles Arabic/English terms, technical variations, and regional preferences.
 */

export interface SynonymMapping {
  primary: string;
  synonyms: string[];
  category: string;
  arabicTerms?: string[];
  popularity: number; // 1-10 scale for search prioritization
}

export class SearchSynonymsService {
  private static synonymMappings: SynonymMapping[] = [
    // CNC Machinery
    {
      primary: "cnc",
      synonyms: ["cnc centers", "cnc machines", "cnc machining centers", "computer numerical control", "automated machining"],
      category: "cnc",
      arabicTerms: ["سي ان سي", "مراكز تشغيل"],
      popularity: 10
    },
    {
      primary: "copy router",
      synonyms: ["router", "profile router", "copying machine", "template router", "k139", "yılmaz router"],
      category: "cutting",
      arabicTerms: ["راوتر", "ماكينة النسخ", "راوتر النسخ"],
      popularity: 9
    },
    
    // Cutting Equipment
    {
      primary: "cutting machine",
      synonyms: ["cut off machine", "profile cutting", "aluminum cutting", "double head cutting", "altınsoy cutting"],
      category: "cutting",
      arabicTerms: ["ماكينة قطع", "مقص الومنيوم", "قطاعة"],
      popularity: 9
    },
    {
      primary: "saw",
      synonyms: ["circular saw", "miter saw", "profile saw", "aluminum saw", "upvc saw"],
      category: "cutting",
      arabicTerms: ["منشار", "منشار دائري", "منشار قطع"],
      popularity: 8
    },
    
    // Welding Equipment
    {
      primary: "welding machine",
      synonyms: ["welder", "welding equipment", "arc welder", "mig welder", "tig welder", "spot welder"],
      category: "welding",
      arabicTerms: ["ماكينة لحام", "لحام", "آلة اللحام"],
      popularity: 8
    },
    {
      primary: "corner welding",
      synonyms: ["corner welder", "corner joining", "frame welding", "window welding"],
      category: "welding",
      arabicTerms: ["لحام الزوايا", "لحام الأركان"],
      popularity: 7
    },
    
    // Cleaning & Finishing
    {
      primary: "cleaning machine",
      synonyms: ["corner cleaning", "profile cleaning", "cleaning equipment", "ca601", "yılmaz cleaning"],
      category: "cleaning",
      arabicTerms: ["ماكينة تنظيف", "تنظيف الزوايا"],
      popularity: 6
    },
    {
      primary: "drilling machine",
      synonyms: ["drill", "hole drilling", "profile drilling", "multi spindle drilling"],
      category: "drilling",
      arabicTerms: ["ماكينة ثقب", "مثقاب", "خرامة"],
      popularity: 7
    },
    
    // Materials
    {
      primary: "aluminum",
      synonyms: ["aluminium", "alu", "aluminum profile", "aluminum fabrication"],
      category: "material",
      arabicTerms: ["الومنيوم", "الألمنيوم"],
      popularity: 9
    },
    {
      primary: "upvc",
      synonyms: ["pvc", "vinyl", "upvc profile", "plastic profile", "window profile"],
      category: "material",
      arabicTerms: ["يو بي في سي", "بلاستيك", "بروفيل بلاستيك"],
      popularity: 8
    },
    
    // Conditions & Qualifiers
    {
      primary: "cheap",
      synonyms: ["affordable", "budget", "low cost", "economical", "inexpensive", "reasonable price"],
      category: "price",
      arabicTerms: ["رخيص", "اقتصادي", "سعر مناسب"],
      popularity: 8
    },
    {
      primary: "used",
      synonyms: ["second hand", "pre-owned", "refurbished", "pre-used", "previously owned"],
      category: "condition",
      arabicTerms: ["مستعمل", "مستخدم", "موضة تانية"],
      popularity: 10
    },
    
    // Brands (Popular in Egyptian market)
    {
      primary: "yılmaz",
      synonyms: ["yilmaz", "turkish machine", "turkey machine"],
      category: "brand",
      arabicTerms: ["يلماز", "تركي"],
      popularity: 9
    },
    {
      primary: "altınsoy",
      synonyms: ["altinsoy", "turkish cutting"],
      category: "brand", 
      arabicTerms: ["التينسوي"],
      popularity: 7
    }
  ];

  /**
   * Expand search query with synonyms and related terms
   */
  static expandQuery(query: string): string[] {
    const normalizedQuery = this.normalizeQuery(query);
    const expandedTerms: Set<string> = new Set([normalizedQuery]);
    
    // Add original query
    expandedTerms.add(query.toLowerCase().trim());
    
    // Find matching synonyms
    this.synonymMappings.forEach(mapping => {
      const allTerms = [mapping.primary, ...mapping.synonyms];
      if (mapping.arabicTerms) {
        allTerms.push(...mapping.arabicTerms);
      }
      
      // Check if any term matches
      const matches = allTerms.some(term => 
        normalizedQuery.includes(term.toLowerCase()) || 
        term.toLowerCase().includes(normalizedQuery)
      );
      
      if (matches) {
        // Add all related terms with popularity weighting
        allTerms.forEach(term => {
          expandedTerms.add(term.toLowerCase());
        });
      }
    });
    
    return Array.from(expandedTerms);
  }

  /**
   * Get smart suggestions based on partial input
   */
  static getSearchSuggestions(input: string, limit = 5): string[] {
    if (input.length < 2) return [];
    
    const normalizedInput = input.toLowerCase().trim();
    const suggestions: Array<{term: string, popularity: number}> = [];
    
    this.synonymMappings.forEach(mapping => {
      const allTerms = [mapping.primary, ...mapping.synonyms];
      
      allTerms.forEach(term => {
        if (term.toLowerCase().startsWith(normalizedInput)) {
          suggestions.push({
            term: term,
            popularity: mapping.popularity
          });
        }
      });
    });
    
    // Sort by popularity and return top suggestions
    return suggestions
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit)
      .map(s => s.term);
  }

  /**
   * Extract search intent from query
   */
  static analyzeSearchIntent(query: string): {
    intent: 'commercial' | 'personal' | 'research' | 'comparison';
    confidence: number;
    indicators: string[];
  } {
    const normalizedQuery = query.toLowerCase();
    const indicators: string[] = [];
    let intent: 'commercial' | 'personal' | 'research' | 'comparison' = 'personal';
    let confidence = 0.5;
    
    // Commercial indicators
    const commercialTerms = ['factory', 'production', 'industrial', 'wholesale', 'business', 'company', 'fabrication'];
    const commercialMatches = commercialTerms.filter(term => normalizedQuery.includes(term));
    if (commercialMatches.length > 0) {
      intent = 'commercial';
      confidence += commercialMatches.length * 0.2;
      indicators.push(...commercialMatches);
    }
    
    // Comparison indicators  
    const comparisonTerms = ['vs', 'versus', 'compare', 'comparison', 'difference', 'which is better'];
    const comparisonMatches = comparisonTerms.filter(term => normalizedQuery.includes(term));
    if (comparisonMatches.length > 0) {
      intent = 'comparison';
      confidence += comparisonMatches.length * 0.3;
      indicators.push(...comparisonMatches);
    }
    
    // Research indicators
    const researchTerms = ['price', 'cost', 'specification', 'review', 'how to', 'what is'];
    const researchMatches = researchTerms.filter(term => normalizedQuery.includes(term));
    if (researchMatches.length > 1) {
      intent = 'research';
      confidence += researchMatches.length * 0.15;
      indicators.push(...researchMatches);
    }
    
    return {
      intent,
      confidence: Math.min(confidence, 1.0),
      indicators
    };
  }

  /**
   * Get category-specific suggestions
   */
  static getCategorySuggestions(category: string): string[] {
    return this.synonymMappings
      .filter(mapping => mapping.category === category)
      .sort((a, b) => b.popularity - a.popularity)
      .map(mapping => mapping.primary);
  }

  /**
   * Normalize query for better matching
   */
  private static normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/[^\w\s\u0600-\u06FF]/g, ' ') // Keep Arabic characters
      .replace(/\s+/g, ' ');
  }

  /**
   * Get popular search terms by category
   */
  static getPopularTerms(limit = 10): Array<{term: string, category: string, popularity: number}> {
    return this.synonymMappings
      .map(mapping => ({
        term: mapping.primary,
        category: mapping.category,
        popularity: mapping.popularity
      }))
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);
  }
}