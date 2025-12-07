import logging
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class TechnicalData:
    profile_name: Optional[str] = None
    dimensions: List[Dict] = field(default_factory=list)
    material_hints: List[str] = field(default_factory=list)
    thermal_break: Optional[bool] = None
    detected_brands: List[str] = field(default_factory=list)
    confidence: float = 0.0
    raw_texts: List[str] = field(default_factory=list)
    weight_kg_per_m: Optional[float] = None
    dimension_callouts: List[float] = field(default_factory=list)


class TechnicalOCRService:
    """
    OCR helper that extracts profile name, dimension labels, material hints,
    thermal-break cues, weights, and numeric callouts. Uses EasyOCR when
    available; falls back to Tesseract otherwise.
    """

    def __init__(self):
        # Common Egyptian profile naming patterns
        self.egyptian_patterns = [
            (r"JUMBO\s*\d{2,3}", "jumbo"),
            (r"MAXI\s*\d{2,3}", "maxi"),
            (r"SUPER\s*\d{2,3}", "super"),
            (r"ECOLINE\s*\d{2,3}", "ecoline"),
            (r"ECOWIN\s*\d{2,3}", "ecowin"),
            (r"THERMO\s*\d{2,3}", "thermo"),
            (r"UPVC\s*\d{2,3}", "upvc"),
            (r"ALUMIN(I|U)M\s*\d{2,3}", "aluminum"),
        ]

        # Known Egyptian brands
        self.egyptian_brands = [
            "KLEEMANN",
            "PROFILE",
            "SHEER",
            "ASCOM",
            "ALUMISR",
            "ALEX",
            "CAIRO",
            "EGYPT",
            "NILE",
            "PYRAMID",
        ]

        # Material keywords
        self.material_keywords = {
            "ALUMINIUM": "aluminum",
            "ALUMINUM": "aluminum",
            "UPVC": "upvc",
            "PVC": "upvc",
            "WOOD": "wood",
            "TIMBER": "wood",
            "STEEL": "steel",
        }

        # Initialize OCR engine(s)
        self.reader = None
        self.using_easyocr = False
        try:
            import easyocr

            self.reader = easyocr.Reader(
                ["en"], gpu=False, verbose=False
            )
            self.using_easyocr = True
            logger.info(
                "EasyOCR initialized successfully for TechnicalOCRService"
            )
        except Exception as exc:
            logger.warning(
                "EasyOCR not available, falling back to Tesseract: %s", exc
            )
            self.reader = None

    def extract_from_image(self, image_bytes: bytes) -> TechnicalData:
        """
        Main entry point: extract technical data from an image bytes payload.
        """
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if image is None:
                raise ValueError("Could not decode image")

            texts = self._extract_text(image)
            data = TechnicalData(
                profile_name=self._extract_profile_name(texts),
                dimensions=self._extract_dimensions(texts),
                material_hints=self._extract_material_hints(texts),
                thermal_break=self._detect_thermal_break(texts),
                detected_brands=self._detect_brands(texts),
                confidence=self._calculate_confidence(texts),
                raw_texts=texts,
                weight_kg_per_m=self._extract_weight(texts),
                dimension_callouts=self._extract_dimension_callouts(texts),
            )
            return data
        except Exception as exc:
            logger.error("OCR extraction failed: %s", exc)
            return TechnicalData()

    def _preprocess_for_ocr(self, image: np.ndarray) -> np.ndarray:
        """Preprocess technical drawings for stronger OCR."""
        gray = (
            cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            if len(image.shape) == 3
            else image.copy()
        )
        h, w = gray.shape
        if max(h, w) < 1200:
            scale = 1800 / max(h, w)
            gray = cv2.resize(
                gray,
                (int(w * scale), int(h * scale)),
                interpolation=cv2.INTER_CUBIC,
            )
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        denoised = cv2.bilateralFilter(enhanced, 9, 75, 75)
        kernel_sharp = np.array([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]])
        sharpened = cv2.filter2D(denoised, -1, kernel_sharp)
        binary = cv2.adaptiveThreshold(
            sharpened,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            11,
            2,
        )
        kernel = np.ones((1, 1), np.uint8)
        morphed = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        return morphed

    def _preprocess_for_ocr_aggressive(self, image: np.ndarray) -> np.ndarray:
        """More aggressive preprocessing for low-contrast screenshots."""
        gray = (
            cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            if len(image.shape) == 3
            else image.copy()
        )
        h, w = gray.shape
        if max(h, w) < 1600:
            scale = 2400 / max(h, w)
            gray = cv2.resize(
                gray,
                (int(w * scale), int(h * scale)),
                interpolation=cv2.INTER_CUBIC,
            )
        # Contrast and smoothing
        clahe = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        blurred = cv2.GaussianBlur(enhanced, (3, 3), 0)
        _, otsu = cv2.threshold(
            blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
        )
        adaptive = cv2.adaptiveThreshold(
            otsu,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            15,
            4,
        )
        # Slight dilation to connect thin strokes
        kernel = np.ones((2, 2), np.uint8)
        morphed = cv2.dilate(adaptive, kernel, iterations=1)
        return morphed

    def _preprocess_for_engineering_text(self, image: np.ndarray) -> np.ndarray:
        """
        Engineering-focused preprocessing to boost numeric OCR:
        - Remove light grid lines
        - Enhance contrast
        - Preserve thin strokes for decimals/units
        """
        gray = (
            cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            if len(image.shape) == 3
            else image.copy()
        )

        # Remove horizontal/vertical light grid lines often present in drawings
        horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 1))
        vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 25))
        horizontal_lines = cv2.morphologyEx(gray, cv2.MORPH_OPEN, horizontal_kernel)
        vertical_lines = cv2.morphologyEx(gray, cv2.MORPH_OPEN, vertical_kernel)
        no_lines = cv2.subtract(gray, horizontal_lines)
        no_lines = cv2.subtract(no_lines, vertical_lines)

        # Contrast enhance and light denoise
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(no_lines)
        denoised = cv2.bilateralFilter(enhanced, 9, 75, 75)

        # Clean binary for OCR
        _, binary = cv2.threshold(
            denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
        )
        return binary

    def _extract_text(self, image: np.ndarray) -> List[str]:
        """
        Extract text from image using enhanced preprocessing and
        multi-config OCR.
        """
        texts: List[str] = []

        # Try EasyOCR first
        if self.reader:
            try:
                results = self.reader.readtext(
                    image,
                    detail=0,
                    paragraph=True,
                    width_ths=0.7,
                    height_ths=0.7,
                )
                texts.extend(
                    [
                        str(text).upper().strip()
                        for text in results
                        if str(text).strip()
                    ]
                )
            except Exception as exc:
                logger.warning(
                    "EasyOCR failed, attempting Tesseract fallback: %s", exc
                )

        # Tesseract with preprocessing and multiple configs
        try:
            import pytesseract

            pre = self._preprocess_for_ocr(image)
            pre_aggressive = self._preprocess_for_ocr_aggressive(image)
            pre_engineering = self._preprocess_for_engineering_text(image)

            configs = [
                ("--psm 6 --oem 3", pre, 0),
                ("--psm 11 --oem 3", pre, 1),
                ("--psm 4 --oem 3", pre, 2),
                ("--psm 3 --oem 3", pre, 3),
                ("--psm 6 --oem 3", pre_aggressive, 4),
                ("--psm 11 --oem 3", pre_aggressive, 5),
                # Engineering-optimized: whitelist numerics/units and keep small decimals
                (
                    "--psm 6 --oem 3 -c tessedit_char_whitelist=0123456789.,:/XxMmcmMM ",
                    pre_engineering,
                    6,
                ),
            ]
            for cfg, img_src, _idx in configs:
                text = pytesseract.image_to_string(img_src, config=cfg)
                if text.strip():
                    texts.extend(
                        [
                            line.upper().strip()
                            for line in text.split("\n")
                            if line.strip()
                        ]
                    )
        except Exception as exc:  # pragma: no cover - environment dependent
            logger.error("No OCR engine available: %s", exc)

        # Deduplicate while preserving order
        seen = set()
        deduped = []
        for t in texts:
            if t not in seen:
                seen.add(t)
                deduped.append(t)
        return deduped

    def _extract_profile_name(self, texts: List[str]) -> Optional[str]:
        """Extract profile name from OCR text."""
        for text in texts:
            for pattern, _ in self.egyptian_patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                if matches:
                    return matches[0].upper()

            generic_patterns = [
                r"PROFILE\s+[A-Z]+\s?\d{2,3}",
                r"MODEL\s+[A-Z0-9]+",
                r"[A-Z]{4,}\s+\d{2,3}",
                r"SERIES\s+[A-Z]+\s?\d+",
                r"\b(\d+)\s+(\d+)\s+(\d+)\b",
                r"\b(\d+)[\s\.-]+(\d+)[\s\.-]+(\d+)\b",
                r"\b([A-Z]{2,})(\d+)\b",
                r"\b(\d+:\d+)\s+(\d+)\b",
                r"\b(ES|EGS|EOS)\s*(\d+)[-\s]?(\d+)\b",
            ]
            for pattern in generic_patterns:
                matches = re.findall(pattern, text)
                if matches:
                    m = matches[0]
                    if isinstance(m, tuple):
                        code = "_".join(str(part) for part in m if part)
                        return code.upper()
                    return str(m).upper()
        return None

    def _extract_dimensions(self, texts: List[str]) -> List[Dict]:
        """Extract dimension information."""
        dimensions: List[Dict] = []
        patterns = [
            r"(\d+\.?\d*)\s*[Xx*]\s*(\d+\.?\d*)\s*(?:MM|CM|M)",
            (
                r"W\s*[:=]?\s*(\d+\.?\d*)\s*(?:MM|CM).*H\s*[:=]?\s*"
                r"(\d+\.?\d*)\s*(?:MM|CM)"
            ),
            r"(\d+\.?\d*)\s*/\s*(\d+\.?\d*)\s*(?:MM|CM)",
            r"SIZE\s*[:=]?\s*(\d+\.?\d*)\s*[Xx]\s*(\d+\.?\d*)",
            r"(\d+\.?\d*)\s*MM\s*[Xx]\s*(\d+\.?\d*)\s*MM",
        ]

        for text in texts:
            for pattern in patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                for match in matches:
                    if len(match) == 2:
                        try:
                            width = float(match[0])
                            height = float(match[1])
                            upper = text.upper()
                            if "CM" in upper:
                                width *= 10
                                height *= 10
                            elif re.search(r"\sM\b", upper):
                                width *= 1000
                                height *= 1000
                            dimensions.append(
                                {
                                    "width_mm": width,
                                    "height_mm": height,
                                    "source": text[:100],
                                    "confidence": 0.8,
                                }
                            )
                        except ValueError:
                            continue
        return dimensions

    def _extract_dimension_callouts(self, texts: List[str]) -> List[float]:
        """Extract standalone numeric callouts (e.g., 61.00, 34.52)."""
        callouts: List[float] = []
        patterns = [
            r"\b\d+\.\d{2}\b",
            r"\b\d+\.\d\b",
            r"\b\d+\b",
            r"[Ø⌀φ]?\s*(\d+\.?\d*)",
        ]
        for text in texts:
            for pattern in patterns:
                matches = re.findall(pattern, text)
                for m in matches:
                    try:
                        val = float(str(m).replace(",", "."))
                        if 5.0 <= val <= 300.0:
                            callouts.append(val)
                    except Exception:
                        continue
        # Deduplicate and sort descending
        return sorted({round(v, 2) for v in callouts}, reverse=True)

    def _extract_material_hints(self, texts: List[str]) -> List[str]:
        """Extract material information."""
        materials = set()
        for text in texts:
            for keyword, material in self.material_keywords.items():
                if keyword in text:
                    materials.add(material)
        return list(materials)

    def _extract_weight(self, texts: List[str]) -> Optional[float]:
        """Extract weight in kg/m, handling common OCR variations."""
        patterns = [
            (
                r"(\d+\.?\d*)\s*(?:KG/ML|KG\\ML|KG\\\/ML|KG\s*ML|KGM1|KGMl|"
                r"KGMI|KG/ M|KG/ML)"
            ),
            (
                r"(\d+\.?\d*)\s*(?:KG/M|KG\\\/M|KG\s*M|KG\s*PER\s*M|KG-M|KGM)"
            ),
            r"(?:WEIGHT|WT|MASS)[:\s]*(\d+\.?\d*)\s*(?:KG|KGS)?",
            r"(\d+[,.]?\d*)\s*(?:KG|KGS)\b",
        ]
        for text in texts:
            upper = text.upper()
            for pattern in patterns:
                matches = re.findall(pattern, upper)
                for m in matches:
                    try:
                        val = float(str(m).replace(",", "."))
                        # Normalize unlikely large values (if misread ml vs m)
                        if val > 50:
                            val = val / 1000.0
                        if 0.05 <= val <= 50.0:
                            return val
                    except Exception:
                        continue
        return None

    def _detect_thermal_break(self, texts: List[str]) -> Optional[bool]:
        """Detect if profile mentions thermal break."""
        thermal_keywords = [
            "THERMAL BREAK",
            "THERMAL-BREAK",
            "THERMO BREAK",
            "INSULATED",
        ]
        for text in texts:
            if any(keyword in text for keyword in thermal_keywords):
                return True
        return None

    def _detect_brands(self, texts: List[str]) -> List[str]:
        """Detect Egyptian brands in text."""
        brands: List[str] = []
        for text in texts:
            for brand in self.egyptian_brands:
                if brand in text and brand not in brands:
                    brands.append(brand)
        return brands

    def _calculate_confidence(self, texts: List[str]) -> float:
        """Calculate confidence score for OCR results."""
        if not texts:
            return 0.0

        confidence = 0.0
        if self._extract_profile_name(texts):
            confidence += 0.3
        if self._extract_dimensions(texts):
            confidence += 0.3
        if self._extract_dimension_callouts(texts):
            confidence += 0.1
        if self._extract_weight(texts):
            confidence += 0.1

        technical_terms = [
            "MM",
            "CM",
            "PROFILE",
            "WIDTH",
            "HEIGHT",
            "SECTION",
        ]
        found_terms = sum(
            1
            for term in technical_terms
            if any(term in text for text in texts)
        )
        confidence += (found_terms / len(technical_terms)) * 0.2

        if self._extract_material_hints(texts):
            confidence += 0.1

        if self._detect_thermal_break(texts) is not None:
            confidence += 0.1

        return min(confidence, 1.0)
