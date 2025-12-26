# Egyptian Cultural Intelligence Layer

## Overview

The Egyptian Cultural Layer transforms YDT from a "technically brilliant" system into a "culturally unbeatable" Egyptian maalem brain. This layer adds the missing Egyptian soul that makes YDT impossible to replicate outside Egypt.

## Components

### 1. Egyptian Maalem Wisdom Parser
**File**: `scripts/parse-maalem-wisdom.ts`

Transforms technical documentation into Egyptian workshop wisdom:
- **Wisdom Mapping**: Converts technical facts to maalem language
  - "99.8% accuracy" → "مفيش خسارة، كل قطعة بتتقطع على المقاس"
  - "15-20% material savings" → "كل متر خشب بيخش في حتة، مش بيطلع حاجة تلف"
  - "3-click workflow" → "ضغطة تلاتة وتكون خلصت، مش محتاج شاي وكلام"

- **Decision Patterns**: Extracts Egyptian decision-making wisdom
  - Pricing: "شوف المنافس عامل بكام، حطه أرخص بجنيهات قليلة عشان يكسبك"
  - Material Choice: "خشب إيطالي للفيلات، خشب محلي للشقق، ده سر المهنة"

- **Stories**: Creates Egyptian stories from case studies
  - "محمد في ورشته في فيصل، كان بيخسر خشب كتير. جرب البرنامج، وقعد يلاقي نفسه وفر ١٨٪؜ من الخشب."

### 2. Egyptian Dialect Detector
**File**: `src/lib/nlp/EgyptianDialectDetector.ts`

Detects user type from question style:
- **Technical Office**: Detects patterns like "الكود المصري", "المواصفات القياسية"
- **Workshop Owner**: Detects patterns like "كام السعر", "ربنا يبارك"
- **Operator**: Detects patterns like "ليه بيعمل كده", "المكنة مش شغالة"
- **Beginner**: Detects patterns like "ازاي", "ممكن تساعدني"
- **Maalem**: Detects patterns like "يا معلم", "الخبرة", "السنين"

Also detects regional dialects:
- Cairo: "إيه", "عامل إيه", "ازيك"
- Alexandria: "إزيك", "عاملين إيه"
- Upper Egypt: Regional variations

### 3. Egyptian Response Translator
**File**: `src/lib/personality/EgyptianResponseTranslator.ts`

Translates technical answers to appropriate Egyptian dialect:
- **Technical**: For engineers (technical office)
- **Maalem**: For workshop owners and maalems
- **Simple**: For beginners
- **With Mannerisms**: Adds Egyptian greetings and cultural context

### 4. Egyptian Oral Tradition Memory
**File**: `src/lib/memory/EgyptianOralTraditionMemory.ts`

Encodes knowledge in Egyptian cultural formats:
- **Stories (حكايات)**: Workshop stories that teach lessons
- **Proverbs (أمثال)**: Easy-to-remember sayings
  - "قطرة سولار على المنشار، والشغل بيتغير"
- **Warnings (تحذيرات)**: Safety and quality warnings
- **Advice (نصائح)**: Practical workshop advice

### 5. Enhanced QuickStartYDT
**File**: `src/lib/ydt/QuickStartYDT.ts`

Now includes:
- Dialect detection before answering
- Response translation based on user type
- Cultural context awareness

## Example Transformations

### Before (Technical):
**User**: "What does the Optimization button do?"
**YDT**: "The optimization button triggers our dual-calculation system that reduces material waste by 15-20% and planning time by 93% with 99.8% accuracy. It uses a genetic algorithm with remnant-first strategy."

### After (Egyptian):
**User (Workshop Owner)**: "كام السعر؟"
**YDT**: "ياسطي، في المعادي السعر بيكون ٢٧٠٠ جنيه لو خشب إيطالي. بس فيه ورشة في المقطم بتبيعه بـ٢٥٠٠ ونضيف. محتاج امتى؟ لو في رمضان، خلي بالك الشغل هيكون أبطأ."

**User (Technical Office)**: "What does the Optimization button do?"
**YDT**: "Uses genetic algorithm with 99.8% accuracy..."

**User (Beginner)**: "ازاي استخدم الزر ده؟"
**YDT**: "ببساطة: دوس على الزر وخلاص. البرنامج هيعملك كل الحسابات."

## Integration Points

1. **QuickStartYDT**: Enhanced with dialect detection and translation
2. **Learning System**: Uses Egyptian trust scoring and verification
3. **Documentation Parser**: Extracts maalem wisdom from technical docs
4. **Response System**: All responses go through Egyptian translator

## Competitive Advantages

1. **Cultural Understanding**: Knows how Egyptians actually think
2. **Dialect Adaptation**: Responds in appropriate style
3. **Oral Tradition**: Captures unwritten workshop knowledge
4. **Regional Intelligence**: Cairo ≠ Alexandria ≠ Upper Egypt
5. **Maalem Wisdom**: Transforms technical facts into practical wisdom

## Next Steps

1. **Proactive Help System**: Watch user behavior, offer Egyptian-style help
2. **Workshop Relationship Simulator**: Simulate Egyptian workshop interactions
3. **Storytelling Engine**: Create stories from case studies automatically
4. **Reality Testing**: Test claims against Egyptian workshop reality
5. **Contribution Rewards**: Egyptian-style badges and status

## Database Migration

**Important**: Run the migration file in your PostgreSQL database (Railway/Supabase):

```sql
-- Run: migrations/XXX_create_learning_tables.sql
```

The migration creates:
- `candidate_facts`: Staging area for new knowledge
- `fact_verifications`: Verification records
- `user_trust_scores`: Egyptian-style trust scores
- `learning_conversations`: Conversation history

**Note**: PostgreSQL requires `CREATE INDEX` statements separate from `CREATE TABLE`. The migration file has been fixed to use proper PostgreSQL syntax.



