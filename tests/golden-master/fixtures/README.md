# Golden Master Test Fixtures

This directory contains real Cairo workshop DXF files used for golden master accuracy tests.

## Fixture Structure

Each fixture should include:
- Original DXF file
- Expected output data
- Accuracy benchmarks
- Performance baselines

## Adding New Fixtures

1. Place DXF file in this directory
2. Create corresponding test data file (`.json`)
3. Update test files to reference new fixture
4. Verify accuracy targets are met

## Current Fixtures

- `cairo_workshop_001.dxf` - Standard window frame
- `cairo_workshop_002.dxf` - Large frame with multiple cuts
- `cairo_workshop_003.dxf` - Small precision cuts

## Notes

- Fixtures are currently mocked in test files
- Real DXF files should be added when available
- All fixtures must maintain 99.6%+ accuracy target

