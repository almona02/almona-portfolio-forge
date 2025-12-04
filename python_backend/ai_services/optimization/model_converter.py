"""
Optimized Model Conversion for Manufacturing AI
===============================================

Converts YOLOv8 models to ONNX format for 2-3x faster CPU inference,
critical for production environments where GPU may not be available.

Features:
- YOLOv8 to ONNX conversion with validation
- Production optimization with ONNX Runtime
- Benchmarking and performance metrics
- Model validation and integrity checking
"""

import os
import time
import logging
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from datetime import datetime

import numpy as np

logger = logging.getLogger(__name__)


class ModelOptimizer:
    """
    Optimize AI models for manufacturing environment.

    Provides ONNX conversion and runtime optimization for YOLOv8 models
    used in part detection and quality control.
    """

    def __init__(self, model_dir: str = "models"):
        """
        Initialize the model optimizer.

        Args:
            model_dir: Directory to store converted models
        """
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(exist_ok=True, parents=True)
        self._ort_session = None

    def convert_yolo_to_onnx(
        self,
        model_path: str,
        output_path: Optional[str] = None,
        opset: int = 12,
        simplify: bool = True,
        img_size: int = 640
    ) -> Dict[str, Any]:
        """
        Convert YOLOv8 model to ONNX for faster CPU inference.

        Args:
            model_path: Path to YOLO model (.pt file)
            output_path: Output ONNX path (optional, auto-generated if None)
            opset: ONNX opset version (12 recommended for compatibility)
            simplify: Whether to simplify the model graph
            img_size: Input image size for the model

        Returns:
            Dictionary with conversion results including:
            - success: bool
            - onnx_path: str (if successful)
            - size metrics
            - validation results
        """
        try:
            from ultralytics import YOLO
            import onnx
            import onnxruntime as ort
        except ImportError as e:
            logger.error(f"Missing dependency: {e}")
            return {
                "success": False,
                "error": f"Missing dependency: {e}",
                "conversion_time": datetime.utcnow().isoformat()
            }

        try:
            start_time = time.time()

            # Load YOLO model
            logger.info(f"Loading YOLO model from {model_path}")
            model = YOLO(model_path)

            # Determine output path
            if not output_path:
                model_name = Path(model_path).stem
                output_path = str(self.model_dir / f"{model_name}.onnx")

            # Export to ONNX
            logger.info(
                f"Exporting to ONNX (opset={opset}, simplify={simplify})"
            )
            export_path = model.export(
                format="onnx",
                imgsz=img_size,
                opset=opset,
                simplify=simplify,
                dynamic=False,  # Fixed batch size for production stability
                device='cpu'    # Optimize for CPU deployment
            )

            if not export_path or not os.path.exists(export_path):
                raise Exception(
                    "ONNX export failed - no output file created"
                )

            # Move to desired output path if different
            if str(export_path) != output_path:
                import shutil
                shutil.move(str(export_path), output_path)

            # Validate ONNX model
            logger.info("Validating ONNX model...")
            onnx_model = onnx.load(output_path)
            onnx.checker.check_model(onnx_model)

            # Test inference with ONNX Runtime
            logger.info("Testing inference with ONNX Runtime...")
            ort_session = ort.InferenceSession(
                output_path,
                providers=['CPUExecutionProvider']
            )

            # Create test input
            input_name = ort_session.get_inputs()[0].name
            input_shape = ort_session.get_inputs()[0].shape

            # Handle dynamic dimensions
            test_shape = [
                1 if isinstance(dim, str) or dim is None else dim
                for dim in input_shape
            ]
            if len(test_shape) == 4:
                test_shape = [1, 3, img_size, img_size]

            test_input = np.random.randn(*test_shape).astype(np.float32)
            ort_inputs = {input_name: test_input}

            # Run inference
            ort_outputs = ort_session.run(None, ort_inputs)

            # Calculate metrics
            conversion_time = time.time() - start_time
            onnx_size = os.path.getsize(output_path) / (1024 * 1024)  # MB
            original_size = (
                os.path.getsize(model_path) / (1024 * 1024)
                if os.path.exists(model_path) else 0
            )

            result = {
                "success": True,
                "onnx_path": output_path,
                "original_size_mb": round(original_size, 2),
                "onnx_size_mb": round(onnx_size, 2),
                "size_reduction_percent": round(
                    (original_size - onnx_size) / original_size * 100, 2
                ) if original_size > 0 else 0,
                "input_shape": list(
                    ort_session.get_inputs()[0].shape
                ),
                "output_shapes": [
                    list(out.shape) for out in ort_session.get_outputs()
                ],
                "test_inference_successful": len(ort_outputs) > 0,
                "opset_version": opset,
                "conversion_time_seconds": round(conversion_time, 2),
                "converted_at": datetime.utcnow().isoformat()
            }

            logger.info(
                f"Successfully converted model to ONNX: {result}"
            )
            return result

        except Exception as e:
            logger.error(
                f"ONNX conversion failed: {str(e)}", exc_info=True
            )
            return {
                "success": False,
                "error": str(e),
                "conversion_time": datetime.utcnow().isoformat()
            }

    def optimize_for_production(
        self,
        model_path: str,
        num_threads: int = 4,
        inter_op_threads: int = 2
    ) -> Dict[str, Any]:
        """
        Apply production optimizations to model and benchmark.

        Args:
            model_path: Path to model file (.pt or .onnx)
            num_threads: Number of intra-op threads for parallelism
            inter_op_threads: Number of inter-op threads

        Returns:
            Optimization results with benchmarks
        """
        try:
            import onnxruntime as ort
        except ImportError:
            return {
                "success": False,
                "error": "onnxruntime not installed",
                "optimizations": []
            }

        optimizations = []

        # Convert to ONNX if not already
        if model_path.endswith('.pt'):
            logger.info("Converting PyTorch model to ONNX first...")
            onnx_result = self.convert_yolo_to_onnx(model_path)
            if not onnx_result["success"]:
                return {
                    "success": False,
                    "error": (
                        f"ONNX conversion failed: "
                        f"{onnx_result.get('error')}"
                    ),
                    "optimizations": []
                }
            model_path = onnx_result["onnx_path"]
            optimizations.append("converted_to_onnx")

        if not model_path.endswith('.onnx'):
            return {
                "success": False,
                "error": "Model must be .pt or .onnx format",
                "optimizations": optimizations
            }

        try:
            # ONNX Runtime optimization options
            providers = ['CPUExecutionProvider']

            session_options = ort.SessionOptions()
            session_options.graph_optimization_level = (
                ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            )
            session_options.intra_op_num_threads = num_threads
            session_options.inter_op_num_threads = inter_op_threads
            session_options.enable_cpu_mem_arena = True
            session_options.enable_mem_pattern = True
            session_options.enable_mem_reuse = True

            # Create optimized session
            ort_session = ort.InferenceSession(
                model_path,
                sess_options=session_options,
                providers=providers
            )

            optimizations.append("onnx_runtime_optimized")
            optimizations.append(f"threads_intra_{num_threads}")
            optimizations.append(f"threads_inter_{inter_op_threads}")

            # Get input info
            input_name = ort_session.get_inputs()[0].name

            # Create test input
            test_shape = [1, 3, 640, 640]  # Standard YOLO input
            test_input = np.random.randn(*test_shape).astype(np.float32)

            # Warm up
            logger.info("Running warm-up iterations...")
            warmup_start = time.time()
            for _ in range(10):
                ort_session.run(None, {input_name: test_input})
            warmup_time = time.time() - warmup_start

            # Benchmark
            logger.info("Running benchmark iterations...")
            iterations = 100
            benchmark_start = time.time()
            for _ in range(iterations):
                ort_session.run(None, {input_name: test_input})
            benchmark_time = (
                (time.time() - benchmark_start) / iterations * 1000
            )  # ms

            # Store session for reuse
            self._ort_session = ort_session

            return {
                "success": True,
                "optimizations": optimizations,
                "model_path": model_path,
                "warmup_time_ms": round(warmup_time * 100, 2),
                "avg_inference_time_ms": round(benchmark_time, 2),
                "fps_estimate": round(1000 / benchmark_time, 1),
                "optimized_providers": providers,
                "thread_config": {
                    "intra_op": num_threads,
                    "inter_op": inter_op_threads
                },
                "optimized_at": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(
                f"Optimization failed: {str(e)}", exc_info=True
            )
            return {
                "success": False,
                "error": str(e),
                "optimizations": optimizations
            }

    def get_model_info(self, model_path: str) -> Dict[str, Any]:
        """
        Get detailed information about a model file.

        Args:
            model_path: Path to model file

        Returns:
            Model information dictionary
        """
        if not os.path.exists(model_path):
            return {"error": f"Model not found: {model_path}"}

        info = {
            "path": model_path,
            "size_mb": round(
                os.path.getsize(model_path) / (1024 * 1024), 2
            ),
            "format": Path(model_path).suffix,
            "modified": datetime.fromtimestamp(
                os.path.getmtime(model_path)
            ).isoformat()
        }

        if model_path.endswith('.onnx'):
            try:
                import onnx
                import onnxruntime as ort

                onnx_model = onnx.load(model_path)
                info["opset_version"] = onnx_model.opset_import[0].version
                info["ir_version"] = onnx_model.ir_version
                info["producer"] = onnx_model.producer_name

                # Get input/output info
                session = ort.InferenceSession(
                    model_path,
                    providers=['CPUExecutionProvider']
                )
                info["inputs"] = [
                    {
                        "name": inp.name,
                        "shape": list(inp.shape),
                        "type": inp.type
                    }
                    for inp in session.get_inputs()
                ]
                info["outputs"] = [
                    {
                        "name": out.name,
                        "shape": list(out.shape),
                        "type": out.type
                    }
                    for out in session.get_outputs()
                ]

            except Exception as e:
                info["onnx_error"] = str(e)

        return info

    def run_inference(
        self,
        model_path: str,
        input_data: np.ndarray
    ) -> Tuple[Optional[np.ndarray], Dict[str, Any]]:
        """
        Run inference using optimized ONNX Runtime.

        Args:
            model_path: Path to ONNX model
            input_data: Input numpy array

        Returns:
            Tuple of (output_array, metadata)
        """
        try:
            import onnxruntime as ort

            # Create or reuse session
            if (self._ort_session is None or
                    not hasattr(self, '_loaded_model') or
                    self._loaded_model != model_path):
                session_options = ort.SessionOptions()
                session_options.graph_optimization_level = (
                    ort.GraphOptimizationLevel.ORT_ENABLE_ALL
                )
                session_options.intra_op_num_threads = 4

                self._ort_session = ort.InferenceSession(
                    model_path,
                    sess_options=session_options,
                    providers=['CPUExecutionProvider']
                )
                self._loaded_model = model_path

            input_name = self._ort_session.get_inputs()[0].name

            # Ensure correct dtype
            if input_data.dtype != np.float32:
                input_data = input_data.astype(np.float32)

            # Run inference
            start_time = time.time()
            outputs = self._ort_session.run(
                None, {input_name: input_data}
            )
            inference_time = (time.time() - start_time) * 1000

            metadata = {
                "inference_time_ms": round(inference_time, 2),
                "input_shape": list(input_data.shape),
                "output_shapes": [
                    list(out.shape) for out in outputs
                ],
                "timestamp": datetime.utcnow().isoformat()
            }

            return (
                outputs[0] if len(outputs) == 1 else outputs,
                metadata
            )

        except Exception as e:
            logger.error(
                f"Inference failed: {str(e)}", exc_info=True
            )
            return None, {"error": str(e)}

    def batch_convert_models(
        self,
        model_paths: list,
        output_dir: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Convert multiple models to ONNX format.

        Args:
            model_paths: List of model paths to convert
            output_dir: Output directory (optional)

        Returns:
            Batch conversion results
        """
        if output_dir:
            self.model_dir = Path(output_dir)
            self.model_dir.mkdir(exist_ok=True, parents=True)

        results = {
            "total": len(model_paths),
            "successful": 0,
            "failed": 0,
            "conversions": []
        }

        for model_path in model_paths:
            logger.info(f"Converting {model_path}...")
            result = self.convert_yolo_to_onnx(model_path)
            results["conversions"].append({
                "input": model_path,
                "result": result
            })

            if result["success"]:
                results["successful"] += 1
            else:
                results["failed"] += 1

        results["batch_completed_at"] = datetime.utcnow().isoformat()
        return results
