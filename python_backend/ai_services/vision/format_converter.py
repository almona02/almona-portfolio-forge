import io
import logging
import os
from typing import List, Tuple, Optional

logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


class FormatConverter:
    """Convert various formats to image bytes for scanning."""

    IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".webp"}
    PDF_EXTS = {".pdf"}
    DXF_EXTS = {".dxf"}
    DWG_EXTS = {".dwg"}  # Not supported directly

    @staticmethod
    def get_supported_extensions() -> List[str]:
        return sorted(FormatConverter.IMAGE_EXTS | FormatConverter.PDF_EXTS | FormatConverter.DXF_EXTS)

    @staticmethod
    def can_convert(filename: str) -> Tuple[bool, Optional[str]]:
        import os

        ext = os.path.splitext(filename.lower())[1]
        if ext in FormatConverter.IMAGE_EXTS:
            return True, None
        if ext in FormatConverter.PDF_EXTS:
            return True, None
        if ext in FormatConverter.DXF_EXTS:
            return True, None
        if ext in FormatConverter.DWG_EXTS:
            return False, "DWG format requires conversion to DXF or image first"
        return False, f"Unsupported file format: {ext}"

    @staticmethod
    def validate_file_size(content: bytes, filename: str):
        if len(content) > MAX_FILE_SIZE:
            from fastapi import HTTPException

            raise HTTPException(
                status_code=413,
                detail=f"File too large ({len(content)/1024/1024:.1f}MB). Max 50MB.",
            )

    @staticmethod
    def pdf_to_images(
        pdf_bytes: bytes,
        dpi: int = 300,
        max_pages: int = 3,
        first_page: int = 1,
    ) -> List[bytes]:
        try:
            from pdf2image import convert_from_bytes
            poppler_path = os.environ.get("POPPLER_PATH")
            if not poppler_path and os.name == "nt":
                default_poppler = r"C:\\poppler\\Library\\bin"
                if os.path.isdir(default_poppler):
                    poppler_path = default_poppler

            images = convert_from_bytes(
                pdf_bytes,
                dpi=dpi,
                first_page=first_page,
                last_page=first_page + max_pages - 1,
                fmt="PNG",
                thread_count=2,
                grayscale=True,
                poppler_path=poppler_path,
            )
            if not images:
                raise ValueError("PDF conversion produced no images")

            out: List[bytes] = []
            for img in images:
                buf = io.BytesIO()
                img.save(buf, format="PNG", optimize=True)
                out.append(buf.getvalue())
            return out
        except ImportError as exc:
            raise ImportError("pdf2image + poppler-utils required") from exc
        except Exception as exc:
            logger.error("PDF conversion failed: %s", exc)
            raise ValueError(f"PDF conversion failed: {str(exc)}") from exc

    @staticmethod
    def dxf_to_image(
        dxf_bytes: bytes, resolution: int = 2048, line_width: float = 1.0
    ) -> bytes:
        try:
            import ezdxf
            from ezdxf.addons.drawing import RenderContext, Frontend
            from ezdxf.addons.drawing.matplotlib import MatplotlibBackend
            import matplotlib.pyplot as plt

            # ezdxf.read expects a text stream; normalize to bytes then wrap safely
            if isinstance(dxf_bytes, str):
                dxf_bytes = dxf_bytes.encode("utf-8", errors="ignore")
            buffer = io.BytesIO(dxf_bytes)
            text_stream = io.TextIOWrapper(buffer, encoding="utf-8", errors="ignore")
            doc = ezdxf.read(text_stream)
            msp = doc.modelspace()
            if len(msp) == 0:
                raise ValueError("Empty DXF file (no modelspace entities)")

            try:
                bbox = msp.bbox()
                if bbox:
                    min_x, min_y, max_x, max_y = bbox
                else:
                    min_x, min_y, max_x, max_y = 0, 0, 100, 100
            except Exception:
                min_x, min_y, max_x, max_y = 0, 0, 100, 100

            width, height = max_x - min_x, max_y - min_y
            if width <= 0 or height <= 0:
                width, height = 100, 100
                min_x, min_y = 0, 0

            max_dim = max(width, height)
            scale = resolution / max_dim
            fig_w = max(width * scale / 100, 1.0)
            fig_h = max(height * scale / 100, 1.0)

            fig = plt.figure(figsize=(fig_w, fig_h), dpi=100, facecolor="white")
            ax = fig.add_axes([0, 0, 1, 1])
            margin = max_dim * 0.05
            ax.set_xlim(min_x - margin, max_x + margin)
            ax.set_ylim(min_y - margin, max_y + margin)
            ax.set_aspect("equal")
            ax.axis("off")

            from ezdxf.addons.drawing.config import Configuration
            
            ctx = RenderContext(doc)
            ctx.set_current_layout(msp)
            config = Configuration().with_changes(min_lineweight=line_width)
            backend = MatplotlibBackend(ax)
            backend.configure(config)
            Frontend(ctx, backend, config).draw_layout(msp)

            buf = io.BytesIO()
            plt.savefig(
                buf,
                format="png",
                dpi=100,
                bbox_inches="tight",
                pad_inches=0,
                transparent=False,
                facecolor="white",
            )
            plt.close(fig)
            return buf.getvalue()
        except ImportError as exc:
            raise ImportError("DXF rendering requires: pip install ezdxf[drawing] matplotlib") from exc
        except Exception as exc:
            try:
                import ezdxf  # type: ignore

                if isinstance(exc, ezdxf.DXFStructureError):
                    raise ValueError(f"Invalid DXF file: {str(exc)}") from exc
            except Exception:
                pass
            raise ValueError(f"DXF rendering failed: {str(exc)}") from exc

    @staticmethod
    def convert_to_images(
        file_bytes: bytes, filename: str, max_images: int = 3, **kwargs
    ) -> List[bytes]:
        import os

        can_convert, error = FormatConverter.can_convert(filename)
        if not can_convert:
            raise ValueError(error)

        ext = os.path.splitext(filename.lower())[1]
        if ext in FormatConverter.IMAGE_EXTS:
            return [file_bytes]
        if ext in FormatConverter.PDF_EXTS:
            return FormatConverter.pdf_to_images(
                file_bytes,
                max_pages=max_images,
                **{k: v for k, v in kwargs.items() if k in ["dpi", "first_page"]},
            )
        if ext in FormatConverter.DXF_EXTS:
            return [
                FormatConverter.dxf_to_image(
                    file_bytes,
                    **{k: v for k, v in kwargs.items() if k in ["resolution", "line_width"]},
                )
            ]
        raise ValueError(f"Unhandled file format: {ext}")

