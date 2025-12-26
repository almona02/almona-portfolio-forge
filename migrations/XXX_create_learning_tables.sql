-- YDT Learning System Database Schema
-- Creates tables for candidate memory, trust scores, and verification
-- PostgreSQL compatible (for Railway/Supabase)

-- Candidate Facts Table
CREATE TABLE IF NOT EXISTS candidate_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim TEXT NOT NULL,
  claim_arabic TEXT,
  contributor_id UUID NOT NULL,
  contributor_trust_score DECIMAL(3, 2) NOT NULL,
  verifications INTEGER DEFAULT 0,
  denials INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'probation', 'accepted', 'rejected')),
  validation_result JSONB,
  region VARCHAR(100),
  category VARCHAR(50),
  applicable_scenarios TEXT[],
  contra_indications TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_verified TIMESTAMP WITH TIME ZONE
);

-- Indexes for candidate_facts
CREATE INDEX IF NOT EXISTS idx_candidate_facts_status ON candidate_facts(status);
CREATE INDEX IF NOT EXISTS idx_candidate_facts_category ON candidate_facts(category);
CREATE INDEX IF NOT EXISTS idx_candidate_facts_contributor ON candidate_facts(contributor_id);
CREATE INDEX IF NOT EXISTS idx_candidate_facts_created ON candidate_facts(created_at);

-- Fact Verifications Table
CREATE TABLE IF NOT EXISTS fact_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_id UUID NOT NULL REFERENCES candidate_facts(id) ON DELETE CASCADE,
  verifier_id UUID NOT NULL,
  verified BOOLEAN NOT NULL,
  response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fact_verifications
CREATE INDEX IF NOT EXISTS idx_fact_verifications_fact ON fact_verifications(fact_id);
CREATE INDEX IF NOT EXISTS idx_fact_verifications_verifier ON fact_verifications(verifier_id);

-- User Trust Scores Table
CREATE TABLE IF NOT EXISTS user_trust_scores (
  user_id UUID PRIMARY KEY,
  numerical_score DECIMAL(3, 2) NOT NULL,
  label VARCHAR(50) NOT NULL,
  lineage_type VARCHAR(50),
  reputation_type VARCHAR(50),
  experience_years INTEGER,
  contribution_total INTEGER DEFAULT 0,
  contribution_correct INTEGER DEFAULT 0,
  contribution_incorrect INTEGER DEFAULT 0,
  contribution_valuable INTEGER DEFAULT 0,
  consistency_score DECIMAL(3, 2) DEFAULT 0.5,
  supplier_connections INTEGER DEFAULT 0,
  workshop_memberships INTEGER DEFAULT 0,
  mentor_id UUID,
  location_reputation JSONB, -- { "area": score }
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for user_trust_scores
CREATE INDEX IF NOT EXISTS idx_user_trust_scores_score ON user_trust_scores(numerical_score);
CREATE INDEX IF NOT EXISTS idx_user_trust_scores_label ON user_trust_scores(label);

-- Learning Conversations Table
CREATE TABLE IF NOT EXISTS learning_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  claim TEXT NOT NULL,
  fact_id UUID REFERENCES candidate_facts(id),
  status VARCHAR(20) NOT NULL,
  response TEXT NOT NULL,
  response_arabic TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for learning_conversations
CREATE INDEX IF NOT EXISTS idx_learning_conversations_user ON learning_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_conversations_fact ON learning_conversations(fact_id);
CREATE INDEX IF NOT EXISTS idx_learning_conversations_created ON learning_conversations(created_at);

-- Comments
COMMENT ON TABLE candidate_facts IS 'Staging area for new knowledge claims before verification';
COMMENT ON TABLE fact_verifications IS 'Verification records for candidate facts';
COMMENT ON TABLE user_trust_scores IS 'Egyptian-style trust scores for users';
COMMENT ON TABLE learning_conversations IS 'Conversation history with learning system';
