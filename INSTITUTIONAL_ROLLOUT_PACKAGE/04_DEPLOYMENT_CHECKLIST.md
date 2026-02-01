# Institutional Deployment Checklist

## Phase 1: Pre-Deployment Validation ✅

### Constitutional Compliance
- [x] Wiring manifest complete and validated
- [x] WiringValidator passes with 0 violations
- [x] Constitutional health ≥ 90/100
- [x] Tier 3 purity ≥ 95%
- [x] All components have explicit truth domains

### Audit Readiness
- [x] Institutional audit simulation passed (8/8 requirements)
- [x] Advisory snapshot logging operational
- [x] Health dashboard functional
- [x] Amendment process documented

### Documentation Complete
- [x] AICS-001 specification (canonical)
- [x] Wiring manifest (constitutional law)
- [x] Institutional readiness dossier
- [x] Constitutional certificate
- [x] This rollout package

## Phase 2: Environment Preparation

### Infrastructure Requirements
- [ ] PostgreSQL database (v14+)
- [ ] Redis instance (for Celery)
- [ ] Object storage (for files)
- [ ] SMTP server (for notifications)

### Security Configuration
- [ ] SSL certificates (production)
- [ ] Firewall rules configured
- [ ] Rate limiting enabled
- [ ] Row-level security (Supabase RLS)

### Monitoring Setup
- [ ] Health dashboard accessible
- [ ] Constitutional metrics monitoring
- [ ] Alerting configured for violations
- [ ] Audit trail retention (10 years)

## Phase 3: Deployment Execution

### Backend Deployment
```bash
# Railway deployment
npx railway up

# OR Docker
docker-compose -f docker-compose.prod.yml up -d
```

### Frontend Deployment
```bash
npm run build
# Deploy to Vercel/CDN
```

### Database Migration
```bash
python manage.py migrate
# Apply constitutional schema
```

### Initial Configuration
- [ ] Create admin user
- [ ] Load canonical truth data
- [ ] Configure material databases
- [ ] Set up machine profiles

## Phase 4: Post-Deployment Validation

### Constitutional Validation
```bash
npm run ci:full
# Should pass with 0 violations
```

### Functional Testing
- [ ] Deterministic replay test passes
- [ ] Tier boundaries enforced
- [ ] Advisory containment working
- [ ] Audit trail capturing

### Performance Validation
- [ ] API response times < 500ms
- [ ] 3D rendering at 60 FPS
- [ ] Concurrent user support
- [ ] Database query optimization

## Phase 5: Governance Handover

### Team Training
- [ ] Constitutional framework overview
- [ ] Amendment process training
- [ ] Violation response procedures
- [ ] Health dashboard usage

### Documentation Handover
- [ ] Constitutional documents
- [ ] Deployment guides
- [ ] Troubleshooting procedures
- [ ] Contact information

## Phase 6: Ongoing Governance

### Regular Audits
| Frequency | Activity |
|-----------|----------|
| Weekly | Constitutional health review |
| Monthly | Full wiring validation |
| Quarterly | Institutional audit simulation |
| Annually | External audit readiness check |

### Emergency Procedures

#### Constitutional Violation Detected
1. CI pipeline blocks deployment
2. WiringValidator identifies violation
3. Isolate affected component
4. Fix or rollback amendment
5. Full constitutional validation

#### System Stop Conditions
- Validation envelope failure
- Confidence below acceptable thresholds
- Deterministic constraint violation
- Traceability compromised

## Success Criteria

| Category | Criteria | Target |
|----------|----------|--------|
| Technical | Constitutional health | ≥ 95/100 |
| Technical | Active violations | 0 |
| Business | Production deployment | ✅ |
| Institutional | Governance operational | ✅ |
