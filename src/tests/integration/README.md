# Integration Tests for Fabricator Pro Phase 1 Enhancements

This directory contains comprehensive integration tests for all Phase 1 enhancements:

1. **Adaptive Solver Engine** - Algorithm selection and optimization
2. **Calibration System** - Profile-specific cutting adjustments
3. **Remnant ML System** - ML-based remnant matching with location priority
4. **Complete Workflow** - End-to-end testing from project creation to cutting plan generation

## Test Files

### `adaptiveSolver.integration.test.ts`
Tests the adaptive solver's ability to:
- Select appropriate algorithms based on job complexity (greedy, linear programming, genetic)
- Complete simple jobs in < 2 seconds
- Handle medium and complex jobs correctly
- Respect preferred algorithm settings
- Calculate costs and waste percentages accurately
- Support multiple profiles

### `calibration.integration.test.ts`
Verifies calibration modifiers are correctly applied:
- Length modifiers and blade width compensation
- System pack-specific calibrations
- Active/inactive calibration handling
- Impact on optimization results
- Edge cases (zero values, large values, missing calibrations)

### `remnantML.integration.test.ts`
Confirms remnant matching works with ML scoring:
- ML prediction scoring (age, length, profile popularity, historical usage)
- Location-based prioritization
- Composite scoring (prediction + location)
- Utilization calculations
- Quality and status filtering
- Edge cases (empty arrays, no matches, short remnants)

### `workflow.integration.test.ts`
Tests the complete workflow:
- Project creation → validation → cutting plan generation
- Integration of all Phase 1 features together
- Performance benchmarks
- Error handling
- Data consistency
- Multiple project handling

## Running the Tests

```bash
# Run all integration tests
npm test src/tests/integration

# Run specific test file
npm test src/tests/integration/adaptiveSolver.integration.test.ts

# Run with coverage
npm test -- --coverage src/tests/integration

# Run in watch mode
npm test -- --watch src/tests/integration
```

## Test Coverage

These integration tests verify:

✅ **Adaptive Solver**
- Algorithm selection logic
- Performance targets (<2s for simple, <15s for medium, <60s for complex)
- Cost calculation accuracy
- Multi-profile support

✅ **Calibration System**
- Modifier application (length + blade width)
- System pack-specific calibrations
- Impact on cutting plan generation
- Active/inactive state handling

✅ **Remnant ML**
- Prediction scoring (0-100 scale)
- Location prioritization
- Composite scoring algorithm
- Utilization calculations
- Status and quality filtering

✅ **Complete Workflow**
- End-to-end project lifecycle
- Integration of all features
- Error handling and edge cases
- Performance benchmarks
- Data consistency

## Mock Data

Tests use mock data to avoid dependencies on:
- Database connections (Supabase)
- External APIs (LME pricing)
- Real CNC machines

For production testing, consider:
- Setting up a test database
- Mocking Supabase client
- Using test fixtures for consistent data

## Notes

- Tests are designed to run in isolation
- Mock data is reset in `beforeEach` hooks
- Performance tests use `performance.now()` for timing
- Some tests may require mocking Supabase client for full functionality

## Future Enhancements

- Add E2E tests with Playwright/Cypress
- Add performance benchmarking suite
- Add load testing for multiple concurrent projects
- Add visual regression tests for UI components

