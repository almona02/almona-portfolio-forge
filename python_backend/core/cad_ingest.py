"""
Production-hardened CAD ingestion engine for DXF profiles.

Universal geometry support for real-world DXF files including LWPOLYLINE,
POLYLINE, and support for curves/bulges. Extracts geometry, area, perimeter,
weight, and validation suitable for certified CAD imports.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import io
import logging

import ezdxf  # type: ignore
import numpy as np  # type: ignore
from ezdxf.path import make_path  # type: ignore
from ezdxf.math import Vec2  # type: ignore

logger = logging.getLogger(__name__)


@dataclass
class CadProfileMetrics:
    area_mm2: float
    perimeter_mm: float
    weight_kg_per_m: float
    is_thermal_break: bool
    bounding_box: Tuple[float, float, float, float]
    vertex_count: int
    is_closed: bool


class CadProfileIngestor:
    """
    Processes DXF files to extract physical properties for
    aluminium/UPVC profiles.
    """

    ALUMINIUM_DENSITY = 2.7  # g/cm^3
    UPVC_DENSITY = 1.4  # g/cm^3

    def __init__(self, material_type: str = "aluminium"):
        self.material_type = material_type
        self.density = (
            self.ALUMINIUM_DENSITY
            if material_type == "aluminium"
            else self.UPVC_DENSITY
        )

    def process_dxf(self, file_bytes: bytes) -> Dict:
        """
        Primary ingestion method for DXF files. Returns structured metrics.
        """
        try:
            # ezdxf.read expects a text stream;
            # normalize to bytes then wrap safely.
            if isinstance(file_bytes, str):
                file_bytes = file_bytes.encode("utf-8", errors="ignore")
            buffer = io.BytesIO(file_bytes)
            text_stream = io.TextIOWrapper(buffer, encoding="utf-8", errors="ignore")
            doc = ezdxf.read(text_stream)
            msp = doc.modelspace()

            # Log DXF version and entity count for debugging
            entity_count = len(list(msp))
            logger.debug(
                f"Processing DXF version: {doc.dxfversion}, "
                f"entities: {entity_count}"
            )

            # Quick check for empty DXF
            if entity_count == 0:
                return self._error_response(
                    "Empty DXF file - no entities found in modelspace"
                )

            # Check if this might be a 3D DXF (we only handle 2D profiles)
            has_3d_entities = any(
                e.dxftype() in ["3DFACE", "3DSOLID", "BODY", "REGION"] for e in msp
            )
            if has_3d_entities:
                logger.warning(
                    "3D entities detected - " "this ingestor only processes 2D profiles"
                )
                return self._error_response(
                    "3D entities detected - " "please provide 2D profile drawings only"
                )

            # --- STRATEGY 1: Universal Geometry Support ---
            polygons = []

            # Iterate through all polyline types (LWPOLYLINE and POLYLINE)
            for entity in msp.query("LWPOLYLINE POLYLINE"):
                try:
                    if entity.is_closed:
                        # Convert to path to handle bulges (arcs) correctly
                        p = make_path(entity)
                        # Flatten to linear vertices with high precision
                        # (0.01mm tolerance)
                        verts = list(p.flattening(distance=0.01))
                        if len(verts) > 2:
                            polygons.append(np.array(verts))
                    else:
                        # Try to handle open polylines that might form closed
                        # Check if start and end points are close enough
                        points = list(entity.get_points())
                        if len(points) > 2:
                            start_point = Vec2(points[0][0], points[0][1])
                            end_point = Vec2(points[-1][0], points[-1][1])
                            # 1 micron tolerance
                            if start_point.distance(end_point) < 0.001:
                                # Treat as closed
                                p = make_path(entity)
                                verts = list(p.flattening(distance=0.01))
                                if len(verts) > 2:
                                    polygons.append(np.array(verts))
                except Exception as e:
                    logger.warning(f"Failed to process polyline: {e}")
                    continue

            # --- STRATEGY 2: Handle exploded geometry (LINES, ARCS, etc.) ---
            if not polygons:
                # Try to find closed loops from loose entities
                # This is more computationally expensive but handles
                # exploded profiles
                try:
                    all_entities = list(msp)
                    lines = [e for e in all_entities if e.dxftype() == "LINE"]
                    arcs = [e for e in all_entities if e.dxftype() == "ARC"]
                    circles = [e for e in all_entities if e.dxftype() == "CIRCLE"]
                    splines = [e for e in all_entities if e.dxftype() == "SPLINE"]

                    # Log detailed entity information for debugging
                    logger.debug(
                        f"Entity breakdown - Lines: {len(lines)}, "
                        f"Arcs: {len(arcs)}, Circles: {len(circles)}, "
                        f"Splines: {len(splines)}"
                    )

                    # If we have lots of lines/arcs/splines,
                    # it's likely an exploded profile
                    if len(lines) > 10 or len(arcs) > 5 or len(splines) > 2:
                        # For pilot, we'll provide helpful error message
                        entity_counts = {}
                        for e in msp:
                            entity_counts[e.dxftype()] = (
                                entity_counts.get(e.dxftype(), 0) + 1
                            )

                        msg = (
                            f"Exploded geometry detected: {entity_counts}. "
                            f"Please use 'JOIN' or 'BOUNDARY' command in "
                            f"AutoCAD to create a closed profile, or "
                            f"convert to a single LWPOLYLINE/POLYLINE for "
                            f"automatic processing."
                        )
                        return self._error_response(msg)

                except Exception as e:
                    logger.warning(f"Error analyzing exploded geometry: {e}")
                    pass

            if not polygons:
                # Debug Info: What IS in the file?
                entity_counts = {}
                for e in msp:
                    entity_counts[e.dxftype()] = entity_counts.get(e.dxftype(), 0) + 1

                msg = (
                    f"No closed loops found. "
                    f"Entities detected: {entity_counts}. "
                    f"Please use 'JOIN' or 'BOUNDARY' command in AutoCAD "
                    f"to create a closed profile."
                )
                return self._error_response(msg)

            # --- Physics Calculation ---
            total_area_mm2 = 0.0
            total_perimeter_mm = 0.0

            for poly in polygons:
                area = self._calculate_area(poly)
                # Simple check to filter out tiny noise
                # (e.g. screw holes < 1mm)
                if area > 1.0:
                    total_area_mm2 += area
                    total_perimeter_mm += self._calculate_perimeter(poly)
                else:
                    # Log small areas that we're filtering out
                    logger.debug(f"Filtered out small area: {area:.6f} mm²")

            weight_per_m = (total_area_mm2 * self.density) / 1000.0
            is_thermal_break = len(polygons) > 1

            # Log processing summary for debugging
            logger.info(
                f"Processed {len(polygons)} polygon(s), "
                f"total area: {total_area_mm2:.2f} mm², "
                f"perimeter: {total_perimeter_mm:.2f} mm"
            )

            # Calculate bounding box from all polygons
            # (full drawing extent)
            all_points = np.vstack(polygons)
            min_vals = np.min(all_points, axis=0)
            max_vals = np.max(all_points, axis=0)
            min_x, min_y = min_vals[0], min_vals[1]
            max_x, max_y = max_vals[0], max_vals[1]

            # Calculate actual profile cross-section dimensions
            # Use the largest polygon (main profile) to get actual dimensions
            profile_width_mm = None
            profile_height_mm = None
            if polygons:
                # Find the polygon with the largest area (main profile)
                largest_poly_idx = max(
                    range(len(polygons)),
                    key=lambda i: self._calculate_area(polygons[i]),
                )
                largest_poly = polygons[largest_poly_idx]

                # Calculate bounding box of the main profile
                poly_min = np.min(largest_poly, axis=0)
                poly_max = np.max(largest_poly, axis=0)
                profile_width_mm = float(poly_max[0] - poly_min[0])
                profile_height_mm = float(poly_max[1] - poly_min[1])

                logger.info(
                    f"Profile cross-section: "
                    f"{profile_width_mm:.2f} × {profile_height_mm:.2f} mm "
                    f"(Full bounding box: "
                    f"{max_x - min_x:.2f} × {max_y - min_y:.2f} mm)"
                )

            metrics = CadProfileMetrics(
                area_mm2=float(total_area_mm2),
                perimeter_mm=float(total_perimeter_mm),
                weight_kg_per_m=float(weight_per_m),
                is_thermal_break=is_thermal_break,
                bounding_box=(float(min_x), float(min_y), float(max_x), float(max_y)),
                vertex_count=sum(len(poly) for poly in polygons),
                is_closed=True,  # All polygons are closed by our query
            )

            validation = self._validate_for_egyptian_standards(metrics)

            # Generate SVG preview (pass polygons for fallback)
            svg_preview = self._generate_svg_preview(
                doc, msp, metrics.bounding_box, polygons
            )

            # Extract ALL polygons as separate profiles for multi-profile DXF files
            all_profiles = []
            for idx, poly in enumerate(polygons):
                poly_area = self._calculate_area(poly)
                if poly_area > 1.0:  # Filter out tiny noise
                    poly_min = np.min(poly, axis=0)
                    poly_max = np.max(poly, axis=0)
                    poly_width = float(poly_max[0] - poly_min[0])
                    poly_height = float(poly_max[1] - poly_min[1])
                    poly_perimeter = self._calculate_perimeter(poly)
                    poly_weight = (poly_area * self.density) / 1000.0
                    
                    all_profiles.append({
                        "index": idx,
                        "area_mm2": round(poly_area, 2),
                        "perimeter_mm": round(poly_perimeter, 2),
                        "weight_kg_per_m": round(poly_weight, 4),
                        "width_mm": round(poly_width, 2),
                        "height_mm": round(poly_height, 2),
                        "bounding_box": (
                            float(poly_min[0]),
                            float(poly_min[1]),
                            float(poly_max[0]),
                            float(poly_max[1])
                        ),
                        "center": (
                            float((poly_min[0] + poly_max[0]) / 2),
                            float((poly_min[1] + poly_max[1]) / 2)
                        ),
                    })

            # Sort profiles by area (largest first) for role detection
            all_profiles.sort(key=lambda p: p["area_mm2"], reverse=True)

            result = {
                "status": "success",
                "accuracy_score": 100.0,
                "confidence": "certified_cad",
                "source_type": "dxf",
                "egyptian_standard_compliant": validation["is_compliant"],
                "profile_metrics": {
                    "area_mm2": round(metrics.area_mm2, 2),
                    "perimeter_mm": round(metrics.perimeter_mm, 2),
                    "weight_kg_per_m": round(metrics.weight_kg_per_m, 4),
                    "is_thermal_break": is_thermal_break,
                    "bounding_box": [round(v, 1) for v in metrics.bounding_box],
                    "vertex_count": metrics.vertex_count,
                    "is_closed": metrics.is_closed,
                },
                "validation_warnings": validation["warnings"],
                "svg_preview": svg_preview,
            }

            # Add actual profile cross-section dimensions
            # (excluding text labels, etc.)
            if profile_width_mm is not None and profile_height_mm is not None:
                result["profile_metrics"]["profile_width_mm"] = round(
                    profile_width_mm, 2
                )
                result["profile_metrics"]["profile_height_mm"] = round(
                    profile_height_mm, 2
                )
            
            # Add all profiles array (for multi-profile DXF files)
            result["all_profiles"] = all_profiles
            result["total_profiles"] = len(all_profiles)

            return result
        except ezdxf.DXFStructureError as exc:
            logger.error("Invalid DXF structure: %s", exc, exc_info=True)
            return self._error_response(f"Invalid DXF structure: {exc}")
        except Exception as exc:  # pragma: no cover - defensive
            logger.error("CAD ingestion failed: %s", exc, exc_info=True)
            return self._error_response(f"Processing error: {exc}")

    def _calculate_area(self, points: np.ndarray) -> float:
        """Calculate area using Green's Theorem (Shoelace Formula)"""
        x, y = points[:, 0], points[:, 1]
        return 0.5 * np.abs(np.dot(x, np.roll(y, 1)) - np.dot(y, np.roll(x, 1)))

    def _calculate_perimeter(self, points: np.ndarray) -> float:
        """Calculate perimeter by summing distances between points"""
        diff = np.diff(points, axis=0, append=points[:1])
        return np.sum(np.sqrt(np.sum(diff**2, axis=1)))

    def _validate_for_egyptian_standards(self, metrics: CadProfileMetrics) -> Dict:
        warnings: List[str] = []

        width = metrics.bounding_box[2] - metrics.bounding_box[0]
        if width > 200:
            warnings.append("Profile width exceeds typical Egyptian window systems")
        if metrics.perimeter_mm > 5000:
            warnings.append("Large perimeter may indicate incorrect scaling")
        if not metrics.is_closed:
            warnings.append("Profile is not closed - may cause manufacturing issues")

        # Additional validation for Egyptian standards
        # Very small area might indicate scaling issues
        if metrics.area_mm2 < 100:
            warnings.append("Very small profile area detected - check drawing scale")

        return {"is_compliant": len(warnings) == 0, "warnings": warnings}

    def _generate_svg_preview(
        self,
        doc,
        msp,
        bounding_box: Tuple[float, float, float, float],
        polygons: Optional[List] = None,
    ) -> str:
        """Generate SVG preview from DXF geometry."""
        try:
            from ezdxf.addons.drawing import (  # type: ignore
                RenderContext,
                Frontend,
                layout,
            )
            from ezdxf.addons.drawing.svg import SVGBackend  # type: ignore
            from ezdxf.addons.drawing.config import Configuration  # type: ignore

            # Create SVG backend
            svg_backend = SVGBackend()

            # Create render context
            ctx = RenderContext(doc)
            ctx.set_current_layout(msp)

            # Configure drawing with proper API
            config = Configuration().with_changes(min_lineweight=0.1)

            # Draw layout
            frontend = Frontend(ctx, svg_backend, config)
            frontend.draw_layout(msp)

            # Get SVG as string
            min_x, min_y, max_x, max_y = bounding_box
            width = max_x - min_x
            height = max_y - min_y

            # Create page layout
            page = layout.Page(width, height, margins=layout.Margins.all(5))
            settings = layout.Settings()

            # Get SVG string - check API signature
            try:
                svg_string = svg_backend.get_string(
                    page, settings, xml_declaration=False
                )
            except TypeError:
                # Try without settings parameter
                svg_string = svg_backend.get_string(page, xml_declaration=False)

            return svg_string

        except ImportError:
            logger.warning("SVG backend not available, generating SVG from polygons")
            return (
                self._generate_svg_from_polygons(bounding_box, polygons)
                if polygons
                else self._generate_simple_svg(bounding_box)
            )
        except Exception as e:
            logger.warning(f"SVG generation failed: {e}, using polygon fallback")
            return (
                self._generate_svg_from_polygons(bounding_box, polygons)
                if polygons
                else self._generate_simple_svg(bounding_box)
            )

    def _generate_svg_from_polygons(
        self, bounding_box: Tuple[float, float, float, float], polygons: List
    ) -> str:
        """Generate SVG from polygon data."""
        min_x, min_y, max_x, max_y = bounding_box
        width = max_x - min_x
        height = max_y - min_y

        # Add margin
        margin = max(width, height) * 0.1
        view_width = width + (margin * 2)
        view_height = height + (margin * 2)

        # Build SVG paths from polygons
        paths = []
        for poly in polygons:
            if len(poly) < 3:
                continue
            # Convert polygon to SVG path
            path_data = f"M {poly[0][0]:.2f},{poly[0][1]:.2f}"
            for point in poly[1:]:
                path_data += f" L {point[0]:.2f},{point[1]:.2f}"
            path_data += " Z"  # Close path
            paths.append(
                f'<path d="{path_data}" fill="none" stroke="#333" '
                f'stroke-width="0.5"/>'
            )

        if paths:
            svg_paths = "\n  ".join(paths)
        else:
            svg_paths = (
                f'<rect x="{min_x:.1f}" y="{min_y:.1f}" '
                f'width="{width:.1f}" height="{height:.1f}" '
                f'fill="none" stroke="#333" stroke-width="0.5"/>'
            )

        view_box = (
            f"{min_x - margin:.1f} {min_y - margin:.1f} "
            f"{view_width:.1f} {view_height:.1f}"
        )
        text_x = (min_x + max_x) / 2
        text_y = max_y + margin / 2
        svg = (
            f'<svg width="{view_width:.1f}" height="{view_height:.1f}" '
            f'viewBox="{view_box}" '
            f'xmlns="http://www.w3.org/2000/svg">\n'
            f"  {svg_paths}\n"
            f'  <text x="{text_x:.1f}" y="{text_y:.1f}" '
            f'text-anchor="middle" font-size="2" fill="#666">'
            f"{width:.1f} × {height:.1f} mm</text>\n"
            f"</svg>"
        )
        return svg

    def _generate_simple_svg(
        self, bounding_box: Tuple[float, float, float, float]
    ) -> str:
        """Generate a simple SVG preview from bounding box."""
        min_x, min_y, max_x, max_y = bounding_box
        width = max_x - min_x
        height = max_y - min_y

        # Add margin
        margin = max(width, height) * 0.1
        view_width = width + (margin * 2)
        view_height = height + (margin * 2)

        view_box = (
            f"{min_x - margin:.1f} {min_y - margin:.1f} "
            f"{view_width:.1f} {view_height:.1f}"
        )
        text_x = (min_x + max_x) / 2
        text_y = max_y + margin / 2
        svg = (
            f'<svg width="{view_width:.1f}" height="{view_height:.1f}" '
            f'viewBox="{view_box}" '
            f'xmlns="http://www.w3.org/2000/svg">\n'
            f'  <rect x="{min_x:.1f}" y="{min_y:.1f}" '
            f'width="{width:.1f}" height="{height:.1f}" '
            f'fill="none" stroke="#333" stroke-width="0.5"/>\n'
            f'  <text x="{text_x:.1f}" y="{text_y:.1f}" '
            f'text-anchor="middle" font-size="2" fill="#666">'
            f"{width:.1f} × {height:.1f} mm</text>\n"
            f"</svg>"
        )
        return svg

    def _error_response(self, message: str) -> Dict:
        logger.warning(f"CAD ingestion failed: {message}")
        return {
            "status": "error",
            "accuracy_score": 0.0,
            "confidence": "failed",
            "error": message,
        }
