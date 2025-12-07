# SmartScan Support & Guardrails

## Required native dependencies
- Poppler (pdf2image): ensure `pdftoppm` is on `PATH` or set `POPPLER_PATH` (Windows default: `C:\poppler\Library\bin`).
- Potrace / potracer: `pip install potracer` (Python wheel). For C binary `potrace`, ensure it is on `PATH`.
- Tesseract OCR (optional but recommended): install system binary and ensure `tesseract` is on `PATH`.
- EasyOCR (optional): install GPU/CPU per environment; the scanner will fall back to Tesseract if unavailable.

## Python dependencies
- See `requirements-production.txt` / `requirements-enhanced.txt` for: `pdf2image`, `opencv-python-headless`, `numpy`, `potracer`, `ezdxf[drawing]`, `matplotlib`, `pytesseract`/`easyocr`.

## Supported formats and limits
- Images: JPG, PNG, BMP, TIFF, WEBP.
- PDF: first `max_pages` pages converted via Poppler (default `dpi=300`).
- DXF: rendered via ezdxf + matplotlib.
- DWG: **not supported** (convert to DXF or image first).
- File size: ≤ 50 MB (`MAX_FILE_SIZE`).

## Environment hints
- Set `POPPLER_PATH` on Windows if Poppler is not on `PATH`.
- Backend default dev port for SmartScan v2: `8002` (current session using `8003`).

## Quick self-tests
- PDF conversion smoke test (from `python_backend`):
  ```bash
  export PATH="/c/poppler/Library/bin:$PATH"
  export POPPLER_PATH="/c/poppler/Library/bin"
  python - <<'PY'
  from ai_services.vision.format_converter import FormatConverter
  from pathlib import Path
  pdf = Path("../public/PROFILES/sheried 2.pdf")
  imgs = FormatConverter.convert_to_images(pdf.read_bytes(), pdf.name, max_images=1)
  print("pages", len(imgs), "first_image_bytes", len(imgs[0]))
  PY
  ```
- Enhanced scan smoke (adjust port/file):
  ```bash
  curl -s -X POST -F "file=@../public/PROFILES/sheried 2.pdf" \
    http://localhost:8003/api/v2/smart-scan/enhanced | python -m json.tool
  ```

## Guardrails
- Reject files >50 MB; PDF/DXF require native deps.
- Prefer PDFs over screenshots for OCR accuracy (higher DPI).
- Use callout extraction when available; image-bounds dimensions are fallback only.

