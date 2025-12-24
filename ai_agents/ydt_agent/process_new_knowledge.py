"""
Process new PDFs and integrate into YDT knowledge base
- AIM-7510-00026692.pdf: Technical capabilities
- AIM-7510-s.pdf: Applications and marketing
"""

import json
from pathlib import Path
from typing import Dict, List, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_extracted_pdfs() -> Dict[str, Any]:
    """Load extracted PDF content"""
    processed_dir = Path("knowledge/processed/aim-7510")
    
    knowledge = {
        "technical_specs": {},
        "applications": {},
        "capabilities": {
            "operations": [],
            "applications": [],
            "materials": [],
            "features": []
        }
    }
    
    # Load technical specs PDF
    tech_file = processed_dir / "AIM-7510-00026692_extracted.json"
    if tech_file.exists():
        with open(tech_file, 'r', encoding='utf-8') as f:
            tech_data = json.load(f)
            knowledge["technical_specs"] = tech_data
        
        # Extract capabilities
        if "capabilities" in tech_data:
            knowledge["capabilities"]["operations"].extend(
                tech_data["capabilities"].get("operations", [])
            )
    
    # Load applications PDF
    apps_file = processed_dir / "AIM-7510-s_extracted.json"
    if apps_file.exists():
        with open(apps_file, 'r', encoding='utf-8') as f:
            apps_data = json.load(f)
            knowledge["applications"] = apps_data
        
        # Extract applications
        if "capabilities" in apps_data:
            knowledge["capabilities"]["applications"].extend(
                apps_data["capabilities"].get("applications", [])
            )
            knowledge["capabilities"]["operations"].extend(
                apps_data["capabilities"].get("operations", [])
            )
    
    # Remove duplicates
    knowledge["capabilities"]["operations"] = list(set(knowledge["capabilities"]["operations"]))
    knowledge["capabilities"]["applications"] = list(set(knowledge["capabilities"]["applications"]))
    
    return knowledge


def create_knowledge_nodes(knowledge: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Create YDT knowledge nodes from extracted data"""
    nodes = []
    
    # Capabilities node
    nodes.append({
        "knowledge_type": "capability",
        "content": {
            "title": "AIM 7510 Operations",
            "operations": knowledge["capabilities"]["operations"],
            "description": "Complete list of operations supported by AIM 7510"
        },
        "source_document": "AIM-7510-00026692.pdf, AIM-7510-s.pdf",
        "confidence_score": 1.0
    })
    
    # Applications node
    nodes.append({
        "knowledge_type": "capability",
        "content": {
            "title": "AIM 7510 Applications",
            "applications": knowledge["capabilities"]["applications"],
            "description": "Real-world applications for AIM 7510"
        },
        "source_document": "AIM-7510-s.pdf",
        "confidence_score": 1.0
    })
    
    # Features node
    if "technical_specs" in knowledge and knowledge["technical_specs"].get("full_text"):
        text = knowledge["technical_specs"]["full_text"].lower()
        
        features = []
        if "tandem mode" in text or "tandem" in text:
            features.append("tandem_mode")
        if "automatic clamp" in text or "clamp recognition" in text:
            features.append("automatic_clamp_recognition")
        if "tool magazine" in text:
            features.append("tool_magazine")
        
        if features:
            nodes.append({
                "knowledge_type": "capability",
                "content": {
                    "title": "AIM 7510 Features",
                    "features": features,
                    "description": "Advanced features of AIM 7510"
                },
                "source_document": "AIM-7510-00026692.pdf",
                "confidence_score": 0.95
            })
    
    return nodes


def main():
    """Process new knowledge and create nodes"""
    logger.info("Processing new PDF knowledge...")
    
    # Load extracted PDFs
    knowledge = load_extracted_pdfs()
    
    # Create knowledge nodes
    nodes = create_knowledge_nodes(knowledge)
    
    # Save to knowledge base
    output_file = Path("knowledge/processed/aim-7510/new_knowledge_nodes.json")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            "knowledge_nodes": nodes,
            "summary": {
                "operations": knowledge["capabilities"]["operations"],
                "applications": knowledge["capabilities"]["applications"],
                "total_nodes": len(nodes)
            }
        }, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Created {len(nodes)} knowledge nodes")
    logger.info(f"Saved to: {output_file}")
    
    print("\n=== NEW KNOWLEDGE PROCESSED ===")
    print(f"Operations: {', '.join(knowledge['capabilities']['operations'])}")
    print(f"Applications: {', '.join(knowledge['capabilities']['applications'])}")
    print(f"Knowledge Nodes: {len(nodes)}")


if __name__ == "__main__":
    main()

