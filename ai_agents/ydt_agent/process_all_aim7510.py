"""
Complete AIM 7510 Processing Pipeline
Processes all related files: manual, wiring diagram, spare parts catalog
"""

import json
from pathlib import Path
from typing import Dict, List, Any
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)


class AIM7510CompleteProcessor:
    """Complete processor for all AIM 7510 documentation"""
    
    def __init__(self, base_path: Path):
        self.base_path = Path(base_path)
        self.raw_manuals = self.base_path / "knowledge" / "raw_manuals"
        self.processed = self.base_path / "knowledge" / "processed" / "aim-7510"
        
    def get_processing_status(self) -> Dict[str, Any]:
        """Get current processing status of all AIM 7510 files"""
        status = {
            "machine_id": "aim-7510",
            "model": "AIM 7510",
            "files": {}
        }
        
        # Check manual processing
        manual_file = self.processed / "structure.json"
        if manual_file.exists():
            with open(manual_file, 'r', encoding='utf-8') as f:
                manual_data = json.load(f)
            status["files"]["user_manual"] = {
                "filename": "MKK.028_1ET089000-0122_AIM_7510_(20.07.2020)_REV.07.pdf",
                "status": "processed",
                "chapters": len(manual_data.get("chapters", [])),
                "tables": len(manual_data.get("tables", [])) if "tables" in str(manual_file.parent) else 0
            }
        else:
            status["files"]["user_manual"] = {
                "filename": "MKK.028_1ET089000-0122_AIM_7510_(20.07.2020)_REV.07.pdf",
                "status": "pending"
            }
        
        # Check wiring diagram processing
        wiring_file = self.processed / "vision_ai_extraction.json"
        if wiring_file.exists():
            with open(wiring_file, 'r', encoding='utf-8') as f:
                wiring_data = json.load(f)
            status["files"]["wiring_diagram"] = {
                "filename": "1-AIM 7410-7510 3P-v8.pdf",
                "status": "partially_processed",
                "pages_processed": len(set(c.get("page_number", 0) for c in wiring_data.get("components", []))),
                "total_pages": wiring_data.get("total_pages", 21),
                "components": len(wiring_data.get("components", [])),
                "connections": len(wiring_data.get("connections", []))
            }
        else:
            status["files"]["wiring_diagram"] = {
                "filename": "1-AIM 7410-7510 3P-v8.pdf",
                "status": "pending"
            }
        
        # Check spare parts catalog
        parts_file = self.raw_manuals / "spare_part_catalogs" / "AIM 7510 parts.pdf"
        if parts_file.exists():
            parts_processed = self.processed / "spare_parts.json"
            if parts_processed.exists():
                with open(parts_processed, 'r', encoding='utf-8') as f:
                    parts_data = json.load(f)
                status["files"]["spare_parts_catalog"] = {
                    "filename": "AIM 7510 parts.pdf",
                    "status": "processed",
                    "parts_count": len(parts_data.get("parts", []))
                }
            else:
                status["files"]["spare_parts_catalog"] = {
                    "filename": "AIM 7510 parts.pdf",
                    "status": "pending"
                }
        else:
            status["files"]["spare_parts_catalog"] = {
                "filename": "AIM 7510 parts.pdf",
                "status": "file_not_found"
            }
        
        # Check specifications
        specs_file = self.processed / "specifications_gold_tier.json"
        if specs_file.exists():
            with open(specs_file, 'r', encoding='utf-8') as f:
                specs_data = json.load(f)
            status["files"]["specifications"] = {
                "status": "processed",
                "confidence": specs_data.get("extraction_confidence", 0.0),
                "is_gold_tier": specs_data.get("validation_report", {}).get("is_gold_tier", False)
            }
        
        # Calculate overall progress
        total_files = len([f for f in status["files"].values() if f.get("status") != "file_not_found"])
        processed_files = len([f for f in status["files"].values() if f.get("status") in ["processed", "partially_processed"]])
        status["overall_progress"] = {
            "processed": processed_files,
            "total": total_files,
            "percentage": (processed_files / total_files * 100) if total_files > 0 else 0
        }
        
        return status
    
    def create_complete_summary(self) -> Dict[str, Any]:
        """Create complete summary of all AIM 7510 knowledge"""
        summary = {
            "machine_id": "aim-7510",
            "model": "AIM 7510",
            "description": "5-axis CNC Aluminium Profile Machining Center",
            "processing_date": "2025-01-27",
            "knowledge_sources": {}
        }
        
        # Manual knowledge
        manual_file = self.processed / "structure.json"
        if manual_file.exists():
            with open(manual_file, 'r', encoding='utf-8') as f:
                manual_data = json.load(f)
            summary["knowledge_sources"]["user_manual"] = {
                "chapters": len(manual_data.get("chapters", [])),
                "status": "complete"
            }
        
        # Wiring diagram knowledge
        wiring_file = self.processed / "vision_ai_extraction.json"
        if wiring_file.exists():
            with open(wiring_file, 'r', encoding='utf-8') as f:
                wiring_data = json.load(f)
            summary["knowledge_sources"]["wiring_diagram"] = {
                "components": len(wiring_data.get("components", [])),
                "connections": len(wiring_data.get("connections", [])),
                "pages_processed": len(set(c.get("page_number", 0) for c in wiring_data.get("components", []))),
                "total_pages": wiring_data.get("total_pages", 21),
                "status": "partial" if len(set(c.get("page_number", 0) for c in wiring_data.get("components", []))) < wiring_data.get("total_pages", 21) else "complete"
            }
        
        # Specifications
        specs_file = self.processed / "specifications_gold_tier.json"
        if specs_file.exists():
            with open(specs_file, 'r', encoding='utf-8') as f:
                specs_data = json.load(f)
            summary["knowledge_sources"]["specifications"] = {
                "confidence": specs_data.get("extraction_confidence", 0.0),
                "is_gold_tier": specs_data.get("validation_report", {}).get("is_gold_tier", False),
                "status": "complete"
            }
        
        # Component knowledge graph
        wiring_file = self.processed / "wiring_diagram_analysis.json"
        if wiring_file.exists():
            with open(wiring_file, 'r', encoding='utf-8') as f:
                graph_data = json.load(f)
            summary["knowledge_sources"]["component_graph"] = {
                "components": len(graph_data.get("components", [])),
                "connections": len(graph_data.get("connections", [])),
                "fault_paths": len(graph_data.get("knowledge_graph", {}).get("fault_paths", {})),
                "status": "complete"
            }
        
        return summary


def main():
    """Generate complete AIM 7510 processing status and summary"""
    print("="*70)
    print("AIM 7510 COMPLETE PROCESSING STATUS")
    print("="*70 + "\n")
    
    processor = AIM7510CompleteProcessor(Path(__file__).parent)
    
    # Get status
    status = processor.get_processing_status()
    
    print("PROCESSING STATUS:\n")
    for file_type, file_info in status["files"].items():
        status_icon = "[COMPLETE]" if file_info.get("status") == "processed" else "[PARTIAL]" if file_info.get("status") == "partially_processed" else "[PENDING]"
        print(f"{status_icon} {file_type.upper().replace('_', ' ')}")
        print(f"   File: {file_info.get('filename', 'N/A')}")
        print(f"   Status: {file_info.get('status', 'unknown')}")
        
        if file_info.get("status") in ["processed", "partially_processed"]:
            if "chapters" in file_info:
                print(f"   Chapters: {file_info['chapters']}")
            if "components" in file_info:
                print(f"   Components: {file_info['components']}")
                print(f"   Connections: {file_info['connections']}")
                print(f"   Pages: {file_info.get('pages_processed', 0)}/{file_info.get('total_pages', 0)}")
            if "parts_count" in file_info:
                print(f"   Parts: {file_info['parts_count']}")
        print()
    
    print(f"OVERALL PROGRESS: {status['overall_progress']['processed']}/{status['overall_progress']['total']} files ({status['overall_progress']['percentage']:.1f}%)")
    
    # Create complete summary
    print("\n" + "="*70)
    print("COMPLETE KNOWLEDGE SUMMARY")
    print("="*70 + "\n")
    
    summary = processor.create_complete_summary()
    
    total_components = 0
    total_connections = 0
    
    for source, info in summary["knowledge_sources"].items():
        print(f"{source.upper().replace('_', ' ')}:")
        if "components" in info:
            print(f"   Components: {info['components']}")
            total_components += info['components']
        if "connections" in info:
            print(f"   Connections: {info['connections']}")
            total_connections += info['connections']
        if "chapters" in info:
            print(f"   Chapters: {info['chapters']}")
        if "confidence" in info:
            print(f"   Confidence: {info['confidence']:.1%}")
        print(f"   Status: {info.get('status', 'unknown')}")
        print()
    
    print(f"TOTAL KNOWLEDGE BASE:")
    print(f"   Total Components: {total_components}")
    print(f"   Total Connections: {total_connections}")
    print(f"   Knowledge Sources: {len(summary['knowledge_sources'])}")
    
    # Save summary
    summary_file = processor.processed / "complete_summary.json"
    with open(summary_file, 'w', encoding='utf-8') as f:
        json.dump({
            "status": status,
            "summary": summary,
            "totals": {
                "components": total_components,
                "connections": total_connections,
                "sources": len(summary["knowledge_sources"])
            }
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\nSummary saved to: {summary_file}")
    print("\n" + "="*70 + "\n")


if __name__ == "__main__":
    main()

