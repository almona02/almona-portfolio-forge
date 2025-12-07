from typing import Dict, List, Optional

import numpy as np
from scipy import stats


class ScaleComputer:
    def __init__(self, min_scale: float = 0.005, max_scale: float = 0.2):
        self.min_scale = min_scale
        self.max_scale = max_scale

    def compute_scale(
        self, associations: List[Dict], use_robust_stats: bool = True
    ) -> Dict:
        candidates: List[float] = []
        valid_associations: List[Dict] = []
        for assoc in associations:
            scale = assoc.get("scale_candidate")
            if scale is not None and self.min_scale <= scale <= self.max_scale:
                candidates.append(scale)
                valid_associations.append(assoc)

        if not candidates:
            return {
                "scale_mm_per_px": None,
                "confidence": 0.0,
                "std_dev": 0.0,
                "n_samples": 0,
                "scale_candidates": [],
                "outliers": [],
                "method": "no_valid_candidates",
                "error": "No valid scale candidates found",
            }

        arr = np.array(candidates)
        scale_median = float(np.median(arr))

        if use_robust_stats:
            trimmed_mean = float(stats.trim_mean(arr, proportiontocut=0.2))
            weights = np.array([assoc["confidence"] for assoc in valid_associations])
            weighted_mean = float(np.average(arr, weights=weights))
            scales = [scale_median, trimmed_mean, weighted_mean]
            stds = [
                self._robust_std(arr, center=scale_median),
                self._robust_std(arr, center=trimmed_mean),
                self._robust_std(arr, center=weighted_mean, weights=weights),
            ]
            best_idx = int(np.argmin(stds))
            final_scale = scales[best_idx]
            method_used = ["median", "trimmed_mean", "weighted_mean"][best_idx]
            final_std = stds[best_idx]
        else:
            final_scale = scale_median
            method_used = "median"
            final_std = float(np.std(arr))

        mad = stats.median_abs_deviation(arr)
        median = np.median(arr)
        outlier_mask = np.abs(arr - median) > (2.5 * mad)
        outliers = arr[outlier_mask].tolist()

        confidence = self._calculate_confidence(
            n_samples=len(candidates),
            std_dev=final_std,
            outlier_ratio=len(outliers) / len(candidates) if candidates else 0,
        )

        return {
            "scale_mm_per_px": float(final_scale),
            "confidence": float(confidence),
            "std_dev": float(final_std),
            "n_samples": len(candidates),
            "scale_candidates": candidates,
            "outliers": outliers,
            "method": method_used,
            "valid_associations": valid_associations,
        }

    @staticmethod
    def _robust_std(
        data: np.ndarray,
        center: Optional[float] = None,
        weights: Optional[np.ndarray] = None,
    ) -> float:
        if center is None:
            center = float(np.median(data))
        if weights is not None:
            abs_dev = np.abs(data - center)
            weighted_mad = float(np.average(abs_dev, weights=weights))
            return float(weighted_mad * 1.4826)
        mad = stats.median_abs_deviation(data)
        return float(mad * 1.4826)

    @staticmethod
    def _calculate_confidence(
        n_samples: int, std_dev: float, outlier_ratio: float
    ) -> float:
        if n_samples >= 10:
            sample_factor = 1.0
        elif n_samples >= 5:
            sample_factor = 0.8
        elif n_samples >= 3:
            sample_factor = 0.6
        elif n_samples >= 2:
            sample_factor = 0.4
        else:
            sample_factor = 0.2

        if std_dev == 0:
            consistency_factor = 1.0
        elif std_dev < 0.01:
            consistency_factor = 0.9
        elif std_dev < 0.05:
            consistency_factor = 0.7
        elif std_dev < 0.1:
            consistency_factor = 0.5
        else:
            consistency_factor = 0.2

        if outlier_ratio == 0:
            outlier_factor = 1.0
        elif outlier_ratio < 0.1:
            outlier_factor = 0.8
        elif outlier_ratio < 0.2:
            outlier_factor = 0.6
        elif outlier_ratio < 0.3:
            outlier_factor = 0.4
        else:
            outlier_factor = 0.1

        confidence = (
            0.4 * sample_factor + 0.4 * consistency_factor + 0.2 * outlier_factor
        )
        return float(min(max(confidence, 0.0), 1.0))

