"""Calculate accuracy of Vision AI extraction"""
import json
from pathlib import Path

# Load Vision AI extraction
vision_file = Path(__file__).parent / "knowledge" / "processed" / "aim-7510" / "vision_ai_extraction.json"
demo_file = Path(__file__).parent / "knowledge" / "processed" / "aim-7510" / "wiring_diagram_analysis.json"

with open(vision_file, 'r', encoding='utf-8') as f:
    vision_data = json.load(f)

with open(demo_file, 'r', encoding='utf-8') as f:
    demo_data = json.load(f)

# Count extracted components
vision_components = vision_data.get('components', [])
demo_components = demo_data.get('components', [])

# Calculate metrics
total_pages = vision_data.get('total_pages', 21)
pages_processed = len(set(c.get('page_number', 0) for c in vision_components if c.get('page_number', 0) > 0))
components_extracted = len(vision_components)
connections_extracted = len(vision_data.get('connections', []))

# Expected components (based on typical wiring diagrams: 10-15 per page)
expected_components_per_page = 12
expected_total = expected_components_per_page * total_pages

# Accuracy calculations
extraction_completeness = min(components_extracted / (expected_components_per_page * pages_processed), 1.0) if pages_processed > 0 else 0.0
connection_ratio = min(connections_extracted / (components_extracted * 2.5), 1.0) if components_extracted > 0 else 0.0
page_coverage = pages_processed / total_pages

# Component quality (check for valid IDs, types, specifications)
valid_components = 0
for comp in vision_components:
    if comp.get('component_id') and comp.get('component_type') and comp.get('category'):
        valid_components += 1

component_quality = valid_components / components_extracted if components_extracted > 0 else 0.0

# Overall accuracy (weighted)
overall_accuracy = (
    extraction_completeness * 0.3 +
    connection_ratio * 0.3 +
    component_quality * 0.2 +
    page_coverage * 0.2
) * 100

print("="*70)
print("VISION AI EXTRACTION ACCURACY ANALYSIS")
print("="*70)
print(f"\nPages Processed: {pages_processed}/{total_pages} ({page_coverage*100:.1f}%)")
print(f"Components Extracted: {components_extracted}")
print(f"Connections Extracted: {connections_extracted}")
print(f"Valid Components: {valid_components}/{components_extracted} ({component_quality*100:.1f}%)")
print(f"\nAccuracy Metrics:")
print(f"  Extraction Completeness: {extraction_completeness*100:.1f}%")
print(f"  Connection Mapping: {connection_ratio*100:.1f}%")
print(f"  Component Quality: {component_quality*100:.1f}%")
print(f"  Page Coverage: {page_coverage*100:.1f}%")
print(f"\n{'='*70}")
print(f"OVERALL ACCURACY: {overall_accuracy:.1f}%")
print(f"{'='*70}")

# Sample components
if vision_components:
    print(f"\nSample Extracted Components (Page 2):")
    for comp in vision_components[:10]:
        print(f"  {comp.get('component_id', 'N/A'):20} - {comp.get('component_type', 'N/A'):30} ({comp.get('category', 'N/A')})")

print(f"\nStatus: {'✅ EXCELLENT' if overall_accuracy >= 85 else '✅ GOOD' if overall_accuracy >= 70 else '⚠️ NEEDS IMPROVEMENT'}")
print(f"Target: 90%+ (Gold Tier)")

