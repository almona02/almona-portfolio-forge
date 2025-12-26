"""
YDT Multi-Source Parser API
Provides endpoints for parsing PDFs, code files, and other sources
for YDT knowledge base
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
import json
import os
from pathlib import Path

router = APIRouter(prefix="/ydt/parser", tags=["YDT Parser"])


@router.get("/knowledge-base")
async def get_knowledge_base():
    """
    Get the parsed YDT knowledge base JSON
    """
    try:
        # Path to the knowledge base file
        # __file__ is python_backend/apis/v2/ydt_parser.py
        # Need to go up to project root: python_backend -> project root
        current_file = Path(__file__).resolve()
        # Go up: ydt_parser.py -> v2 -> apis -> python_backend -> project_root
        project_root = current_file.parent.parent.parent.parent

        # Try multiple path strategies
        possible_paths = [
            project_root / "src" / "lib" / "ydt" / "knowledge-base.json",
            current_file.parent.parent.parent
            / "src"
            / "lib"
            / "ydt"
            / "knowledge-base.json",
            Path.cwd() / "src" / "lib" / "ydt" / "knowledge-base.json",
        ]

        kb_path = None
        for path in possible_paths:
            if path.exists():
                kb_path = path
                break

        if not kb_path:
            paths_tried = [str(p) for p in possible_paths]
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Knowledge base not found. Tried: {paths_tried}. "
                    "Run the parser first: npm run parse:documentation"
                ),
            )

        with open(kb_path, "r", encoding="utf-8") as f:
            kb_data = json.load(f)

        return kb_data
    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500, detail=f"Invalid JSON in knowledge base file: {str(e)}"
        )
    except Exception as e:
        import traceback

        error_detail = (
            f"Error loading knowledge base: {str(e)}\n{traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail=error_detail)


@router.post("/parse-pdf")
async def parse_pdf(file: UploadFile = File(...)):
    """
    Parse a PDF file and extract text content for YDT knowledge base
    """
    try:
        from agents.manual_parser import ManualParser

        # Save uploaded file temporarily
        temp_path = f"/tmp/{file.filename}"
        with open(temp_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # Parse PDF
        parser = ManualParser()
        extracted = parser.extract_text_from_pdf(temp_path)

        # Clean up
        os.remove(temp_path)

        return {
            "status": "success",
            "filename": file.filename,
            "content": extracted.get("full_text", ""),
            "pages": len(extracted.get("pages", [])),
            "tables": len(extracted.get("tables", [])),
        }
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail=(
                "PDF parsing not available. "
                "Install pdfplumber: pip install pdfplumber"
            ),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing PDF: {str(e)}")


@router.post("/parse-code")
async def parse_code_file(file: UploadFile = File(...)):
    """
    Parse a code file (TypeScript, Python, etc.) and extract structure
    """
    try:
        content = await file.read()
        text_content = content.decode("utf-8")

        # Basic code analysis
        lines = text_content.split("\n")
        words = text_content.split()

        # Extract basic stats
        stats = {
            "filename": file.filename,
            "lines": len(lines),
            "words": len(words),
            "characters": len(text_content),
        }

        return {
            "status": "success",
            "stats": stats,
            "content": text_content[:1000],  # First 1000 chars as preview
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error parsing code file: {str(e)}"
        )


@router.get("/stats")
async def get_parser_stats():
    """
    Get statistics about the parsed knowledge base
    """
    try:
        kb_path = (
            Path(__file__).parent.parent.parent
            / "src"
            / "lib"
            / "ydt"
            / "knowledge-base.json"
        )

        if not kb_path.exists():
            return {
                "status": "not_found",
                "message": "Knowledge base not parsed yet",
            }

        with open(kb_path, "r", encoding="utf-8") as f:
            kb_data = json.load(f)

        return {
            "status": "success",
            "files_parsed": kb_data.get("documents", {}).get("totalFiles", 0),
            "workflows": len(kb_data.get("workflows", {})),
            "algorithms": len(kb_data.get("algorithms", {})),
            "components": len(kb_data.get("components", [])),
            "parsed_at": kb_data.get("metadata", {}).get("parsedAt", "unknown"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting stats: {str(e)}")
