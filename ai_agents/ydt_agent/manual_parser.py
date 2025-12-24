"""
YILMAZ Digital Twin - Manual Parser
Extracts text, tables, and specifications from PDF manuals.

Week 2 Deliverable: Text & Table Extraction Engine
"""

import json
import pdfplumber
import camelot
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class ManualStructure:
    """Represents the hierarchical structure of a manual"""
    machine_id: str
    model_code: str
    chapters: List[Dict[str, Any]]
    total_pages: int
    metadata: Dict[str, Any]


@dataclass
class Table:
    """Represents an extracted table"""
    table_id: str
    page_number: int
    title: Optional[str]
    headers: List[str]
    rows: List[List[str]]
    context: Optional[str]  # Surrounding text


@dataclass
class MachineSpecifications:
    """Machine specifications matching yilmazMachines.ts structure"""
    machine_id: str
    model_code: str
    power_spec: Optional[Dict[str, str]]
    air_spec: Optional[Dict[str, str]]
    dimensions: Optional[Dict[str, str]]
    weight: Optional[Dict[str, str]]
    working_capacity: Optional[Dict[str, str]]
    cutting_capacity: Optional[Dict[str, str]]
    welding_capacity: Optional[Dict[str, str]]
    other_specs: Dict[str, Any]


class ManualParser:
    """Parser for YILMAZ machine manuals"""
    
    def __init__(self, knowledge_base_path: Path):
        self.knowledge_base = Path(knowledge_base_path)
        self.raw_manuals = self.knowledge_base / "raw_manuals"
        self.processed = self.knowledge_base / "processed"
        self.processed.mkdir(parents=True, exist_ok=True)
        
    def extract_manual_structure(self, pdf_path: Path, machine_id: str) -> ManualStructure:
        """
        Extracts chapters, sections, tables with hierarchy from PDF.
        
        Args:
            pdf_path: Path to PDF manual
            machine_id: Machine ID (e.g., 'ym-001')
            
        Returns:
            ManualStructure with hierarchical chapter information
        """
        logger.info(f"Extracting structure from {pdf_path.name}")
        
        chapters = []
        current_chapter = None
        
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            
            for page_num, page in enumerate(pdf.pages, 1):
                text = page.extract_text()
                
                if not text:
                    continue
                
                # Detect chapter headings (heuristic: lines in larger font, all caps, or numbered)
                lines = text.split('\n')
                for line in lines[:10]:  # Check first 10 lines of page
                    line_clean = line.strip()
                    # Simple heuristic for chapter detection
                    if (len(line_clean) < 100 and 
                        (line_clean.isupper() or 
                         line_clean.startswith(('Chapter', 'CH', 'Section', 'SEC')) or
                         any(char.isdigit() for char in line_clean[:5]))):
                        if current_chapter:
                            chapters.append(current_chapter)
                        current_chapter = {
                            "title": line_clean,
                            "start_page": page_num,
                            "sections": []
                        }
                        break
                
                # If we have a current chapter, add page content
                if current_chapter:
                    current_chapter.setdefault("pages", []).append({
                        "page_number": page_num,
                        "text": text
                    })
            
            if current_chapter:
                chapters.append(current_chapter)
        
        # Extract metadata
        metadata = {
            "filename": pdf_path.name,
            "total_pages": total_pages,
            "extraction_date": str(Path().cwd())
        }
        
        # Load model code from index
        model_code = self._get_model_code(machine_id)
        
        return ManualStructure(
            machine_id=machine_id,
            model_code=model_code,
            chapters=chapters,
            total_pages=total_pages,
            metadata=metadata
        )
    
    def extract_tables(self, pdf_path: Path) -> List[Table]:
        """
        Extracts all tables from PDF as structured JSON.
        
        Args:
            pdf_path: Path to PDF manual
            
        Returns:
            List of Table objects
        """
        logger.info(f"Extracting tables from {pdf_path.name}")
        
        tables = []
        
        try:
            # Use camelot to extract tables
            camelot_tables = camelot.read_pdf(str(pdf_path), pages='all', flavor='lattice')
            
            for idx, table in enumerate(camelot_tables):
                table_data = table.df
                
                # Convert DataFrame to list of lists
                rows = table_data.values.tolist()
                headers = table_data.columns.tolist() if len(rows) > 0 else []
                
                tables.append(Table(
                    table_id=f"table_{table.page}_{idx}",
                    page_number=table.page,
                    title=None,  # Could be extracted from surrounding text
                    headers=[str(h) for h in headers],
                    rows=[[str(cell) for cell in row] for row in rows],
                    context=None
                ))
        except Exception as e:
            logger.warning(f"Table extraction failed: {e}. Falling back to text extraction.")
            # Fallback: could try alternative methods
        
        return tables
    
    def extract_specifications(
        self, 
        pdf_path: Path, 
        machine_id: str
    ) -> MachineSpecifications:
        """
        Extracts machine specifications matching yilmazMachines.ts structure.
        
        Args:
            pdf_path: Path to PDF manual
            machine_id: Machine ID (e.g., 'ym-001')
            
        Returns:
            MachineSpecifications object
        """
        logger.info(f"Extracting specifications from {pdf_path.name}")
        
        model_code = self._get_model_code(machine_id)
        specs = MachineSpecifications(
            machine_id=machine_id,
            model_code=model_code,
            power_spec=None,
            air_spec=None,
            dimensions=None,
            weight=None,
            working_capacity=None,
            cutting_capacity=None,
            welding_capacity=None,
            other_specs={}
        )
        
        # Extract text from PDF
        with pdfplumber.open(pdf_path) as pdf:
            full_text = ""
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
        
        # TODO: Implement specification extraction logic
        # This will use pattern matching, NLP, or structured extraction
        # to find power specs, dimensions, capacities, etc.
        # For now, return empty structure
        
        return specs
    
    def process_manual(self, machine_id: str, manual_filename: str) -> Dict[str, Any]:
        """
        Complete processing pipeline for a single manual.
        
        Args:
            machine_id: Machine ID (e.g., 'ym-001')
            manual_filename: Name of manual file
            
        Returns:
            Processing results dictionary
        """
        logger.info(f"Processing manual {manual_filename} for machine {machine_id}")
        
        # Find manual file
        manual_path = None
        for subdir in ['manuals', 'wiring_diagrams', 'spare_part_catalogs']:
            potential_path = self.raw_manuals / subdir / manual_filename
            if potential_path.exists():
                manual_path = potential_path
                break
        
        if not manual_path:
            raise FileNotFoundError(f"Manual {manual_filename} not found in raw_manuals/")
        
        # Create output directory
        output_dir = self.processed / machine_id
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Extract structure
        structure = self.extract_manual_structure(manual_path, machine_id)
        
        # Extract tables
        tables = self.extract_tables(manual_path)
        
        # Extract specifications
        specs = self.extract_specifications(manual_path, machine_id)
        
        # Save extracted data
        structure_file = output_dir / "structure.json"
        with open(structure_file, 'w', encoding='utf-8') as f:
            json.dump(asdict(structure), f, indent=2, ensure_ascii=False)
        
        tables_file = output_dir / "tables.json"
        with open(tables_file, 'w', encoding='utf-8') as f:
            json.dump([asdict(t) for t in tables], f, indent=2, ensure_ascii=False)
        
        specs_file = output_dir / "specifications.json"
        with open(specs_file, 'w', encoding='utf-8') as f:
            json.dump(asdict(specs), f, indent=2, ensure_ascii=False)
        
        # Save chapter text files
        text_dir = output_dir / "text"
        text_dir.mkdir(exist_ok=True)
        
        for idx, chapter in enumerate(structure.chapters):
            chapter_file = text_dir / f"chapter_{idx+1:02d}.txt"
            chapter_text = "\n\n".join([
                page.get("text", "") for page in chapter.get("pages", [])
            ])
            with open(chapter_file, 'w', encoding='utf-8') as f:
                f.write(chapter_text)
        
        return {
            "machine_id": machine_id,
            "manual_filename": manual_filename,
            "structure": asdict(structure),
            "tables_count": len(tables),
            "output_directory": str(output_dir)
        }
    
    def _get_model_code(self, machine_id: str) -> str:
        """Get model code from machine_manual_index.json"""
        index_file = self.knowledge_base / "machine_manual_index.json"
        if index_file.exists():
            with open(index_file, 'r', encoding='utf-8') as f:
                index = json.load(f)
                machine_data = index.get("machines", {}).get(machine_id, {})
                return machine_data.get("modelCode", machine_id)
        return machine_id


def main():
    """Example usage"""
    parser = ManualParser(Path(__file__).parent / "knowledge")
    
    # Process AIM 7510 user manual
    try:
        result = parser.process_manual(
            machine_id="aim-7510",
            manual_filename="MKK.028_1ET089000-0122_AIM_7510_(20.07.2020)_REV.07.pdf"
        )
        print(f"\n[SUCCESS] Processing complete!")
        print(f"Machine: {result['machine_id']}")
        print(f"Manual: {result['manual_filename']}")
        print(f"Chapters extracted: {len(result['structure']['chapters'])}")
        print(f"Tables extracted: {result['tables_count']}")
        print(f"Output directory: {result['output_directory']}")
        print(f"\nFiles created:")
        print(f"  - structure.json")
        print(f"  - tables.json")
        print(f"  - specifications.json")
        print(f"  - text/chapter_*.txt files")
    except FileNotFoundError as e:
        print(f"[ERROR] {e}")
        print("Please place the manual file in the appropriate raw_manuals/ subdirectory")
    except Exception as e:
        print(f"[ERROR] Error during processing: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()

