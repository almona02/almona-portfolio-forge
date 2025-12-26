# YDT Self-Learning System - Collective Wisdom Engine

## Overview

The YDT Self-Learning System transforms YDT from a static knowledge base into a **living, growing Egyptian fabrication memory**. It captures, validates, and learns from the collective wisdom of Egyptian workshops.

## Architecture

### Core Components

1. **Knowledge Validator** (`KnowledgeValidator.ts`)
   - The Judge: Validates claims against physics, system logic, and deep reasoning
   - Three-layer validation: Physics → Documentation → Subjective Analysis
   - Classifies claims: fact, trick, price_intel, supplier_review, safety_warning, material_advice

2. **Candidate Memory** (`CandidateMemory.ts`)
   - The Staging Area: Stores plausible but unverified knowledge
   - Status flow: pending → probation → accepted/rejected
   - Requires consensus before promotion to core knowledge

3. **Egyptian Trust Scoring** (`EgyptianTrustScoring.ts`)
   - Calculates trust based on Egyptian workshop culture:
     - **النسب (Lineage)**: Who trained you?
     - **السمعة (Reputation)**: Where do you work?
     - **التجربة (Experience)**: How many years?
     - **تاريخ المشاركة (Contribution History)**: What have you shared?
   - Trust labels: معلم كبير, معلم, صنايعي محترم, صنايعي جديد, مبتدئ

4. **Egyptian Verification Dialog** (`EgyptianVerificationDialog.ts`)
   - Creates culturally appropriate verification questions
   - Different questions for different user types (Maalem, Engineer, Owner, Operator)
   - Egyptian conversation flow: الاستفتاح → التهيئة → السؤال → الاستماع → التعمق

5. **Learning Conversation** (`LearningConversation.ts`)
   - Handles user statements and integrates learning into conversation
   - Manages verification flow
   - Provides Egyptian-style responses

## Workflow

### 1. User Submits Claim

```typescript
const result = await learningConversation.handleUserStatement(
  "استخدام السولار على المنشار يساعد في قطع UPVC",
  { userId: "user123", location: "Cairo" }
);
```

### 2. Validation Process

1. **Physics Check**: Can this physically work?
2. **System Check**: Does this contradict documentation?
3. **Subjective Check**: Deep reasoning about plausibility

### 3. Staging Decision

- **High Trust + High Confidence** → Accepted immediately
- **Plausible** → Probation (needs verification)
- **Invalid** → Rejected

### 4. Verification Process

- YDT asks trusted users for verification
- Uses Egyptian-style conversation
- Requires consensus before acceptance

### 5. Promotion to Core Knowledge

- After sufficient verifications, fact moves to accepted
- Becomes part of YDT's core knowledge
- Can be shared with other users

## Egyptian Cultural Intelligence

### Trust Factors

- **Lineage Types**:
  - Maalem Apprentice: 0.7
  - Self Taught: 0.3
  - Technical College: 0.5
  - University: 0.6

- **Reputation Types**:
  - Known Workshop Cairo: 0.8
  - Technical Office: 0.7
  - Government Engineer: 0.9
  - New Workshop: 0.4

- **Experience Levels**:
  - <2 years: 0.3
  - 2-5 years: 0.5
  - 5-10 years: 0.7
  - 10-20 years: 0.9
  - 20+ years: 1.0 (Maalem status)

### Verification Requirements

- **Maalem (20+ years)**: 1 confirmation
- **Experienced (10-20 years)**: 2 confirmations
- **Regular (5-10 years)**: 3 confirmations
- **New User (<5 years)**: 5 confirmations

## API Endpoints

### Submit Claim
```
POST /api/v2/learning/claim
Headers: X-User-ID
Body: { claim, claim_arabic?, category?, location? }
```

### Verify Fact
```
POST /api/v2/learning/verify
Headers: X-User-ID
Body: { fact_id, verified, response? }
```

### Get Facts
```
GET /api/v2/learning/facts?category=&status=&limit=10
```

### Get Facts Needing Verification
```
GET /api/v2/learning/facts/needing-verification?limit=10
```

### Get User Trust Score
```
GET /api/v2/learning/trust-score/{user_id}
```

## Database Schema

- `candidate_facts`: Staging area for new knowledge
- `fact_verifications`: Verification records
- `user_trust_scores`: Egyptian-style trust scores
- `learning_conversations`: Conversation history

## Example Scenarios

### Scenario 1: High Trust User Submits Valid Trick

**User**: "استخدام السولار على المنشار يساعد في قطع UPVC"
**Trust Score**: 0.9 (Maalem)
**Validation**: Plausible (diesel is lubricant)
**Result**: Accepted immediately
**Response**: "الله يفتح عليك! معلومة دهب. سجلتها عندي وهقولها للصنايعية."

### Scenario 2: New User Submits Price Intel

**User**: "الخشب الصيني دلوقتي أحسن من الإيطالي"
**Trust Score**: 0.4 (New User)
**Validation**: Subjective, needs verification
**Result**: Probation
**Response**: "كلام يحترم، بس جديد عليا. هسأل كبار السوق وأتأكد، ولو صح هعتمدها."

### Scenario 3: Invalid Physics Claim

**User**: "يمكن تقطع 7 متر من 6 متر"
**Validation**: Physics violation
**Result**: Rejected immediately
**Response**: "يا ريس، أنا حسبتها هندسياً لقيتها مش راكبة عشان الكود المصري بيقول..."

## Competitive Advantages

1. **Cultural Understanding**: Knows how Egyptians actually think
2. **Oral Tradition Capture**: Captures unwritten workshop knowledge
3. **Trust Network**: Builds Egyptian-style trust relationships
4. **Regional Intelligence**: Knowledge valid in Cairo ≠ Alexandria ≠ Upper Egypt
5. **Community Ownership**: Users feel they're building their own knowledge base

## Future Enhancements

1. **Egyptian Oral Tradition Memory**: Story/proverb encoding
2. **Regional Knowledge Maps**: Cairo vs Alexandria vs Upper Egypt
3. **Council of Maalems**: Senior maalem verification panel
4. **Contribution Rewards**: Egyptian-style badges and status
5. **Reality Testing**: Test claims against Egyptian workshop reality

