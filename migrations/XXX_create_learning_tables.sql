-- YDT Learning System Database Schema
-- Creates tables for candidate memory, trust scores, and verification
-- Candidate Facts Table
CREATE TABLE IF NOT EXISTS candidate_facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim TEXT NOT NULL,
    claim_arabic TEXT,
    contributor_id UUID NOT NULL,
    contributor_trust_score DECIMAL(3, 2) NOT NULL,
    verifications INTEGER DEFAULT 0,
    denials INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL CHECK (
        status IN ('pending', 'probation', 'accepted', 'rejected')
    ),
    validation_result JSONB,
    region VARCHAR(100),
    category VARCHAR(50),
    applicable_scenarios TEXT [],
    contra_indications TEXT [],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_verified TIMESTAMP WITH TIME ZONE,
    -- Indexes
    INDEX idx_candidate_facts_status (status),
    INDEX idx_candidate_facts_category (category),
    INDEX idx_candidate_facts_contributor (contributor_id),
    INDEX idx_candidate_facts_created (created_at)
);
-- Fact Verifications Table
CREATE TABLE IF NOT EXISTS fact_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fact_id UUID NOT NULL REFERENCES candidate_facts(id) ON DELETE CASCADE,
    verifier_id UUID NOT NULL,
    verified BOOLEAN NOT NULL,
    response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Indexes
    INDEX idx_fact_verifications_fact (fact_id),
    INDEX idx_fact_verifications_verifier (verifier_id)
);
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
    location_reputation JSONB,
    -- { "area": score }
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Indexes
    INDEX idx_user_trust_scores_score (numerical_score),
    INDEX idx_user_trust_scores_label (label)
);
-- Learning Conversations Table
CREATE TABLE IF NOT EXISTS learning_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    claim TEXT NOT NULL,
    fact_id UUID REFERENCES candidate_facts(id),
    status VARCHAR(20) NOT NULL,
    response TEXT NOT NULL,
    response_arabic TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Indexes
    INDEX idx_learning_conversations_user (user_id),
    INDEX idx_learning_conversations_fact (fact_id),
    INDEX idx_learning_conversations_created (created_at)
);
-- Comments
COMMENT ON TABLE candidate_facts IS 'Staging area for new knowledge claims before verification';
COMMENT ON TABLE fact_verifications IS 'Verification records for candidate facts';
COMMENT ON TABLE user_trust_scores IS 'Egyptian-style trust scores for users';
COMMENT ON TABLE learning_conversations IS 'Conversation history with learning system';