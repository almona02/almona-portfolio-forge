"""
Calibration Learner - ML-Powered K-Factor Prediction
=====================================================

The self-learning engine that makes Fabricator Pro increasingly intelligent.
Learns from production feedback to predict optimal K-factors for any profile.

Features:
- Multivariate regression for K-factor prediction
- Training from production feedback (QR code scans)
- Confidence scoring with reasoning explanations
- Per-workshop and collective learning modes
- Continuous improvement from user corrections

The Learning Loop:
1. Define: User creates profile from technical data sheets
2. Control: User sets optimization strategy
3. Calibrate: Initial K-factors from test cuts or AI suggestions
4. Reflect: Dashboard shows analytics and trends
5. Learn: Production feedback collected via QR codes
6. Predict: AI suggests improved K-factors

This class implements steps 5-6: Learn and Predict.
"""

import logging
import pickle
import json
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

import numpy as np

logger = logging.getLogger(__name__)


class LearningMode(Enum):
    """Learning data scope."""
    WORKSHOP_ONLY = "workshop_only"
    COLLECTIVE = "collective"
    HYBRID = "hybrid"


@dataclass
class TrainingConfig:
    """Configuration for model training."""
    min_samples: int = 10
    max_samples: int = 10000
    learning_rate: float = 0.01
    regularization: float = 0.1
    feature_weights: Dict[str, float] = field(default_factory=lambda: {
        "profile_weight": 0.3,
        "material_type": 0.2,
        "joint_type": 0.2,
        "workshop_history": 0.15,
        "environmental": 0.05,
        "machine_type": 0.1
    })
    confidence_threshold: float = 0.6
    trend_window_days: int = 30


@dataclass
class KFactorPrediction:
    """K-factor prediction with confidence and reasoning."""
    profile_id: str
    joint_type: str

    predicted_k_factor: float
    confidence: float

    reasoning: List[str]
    contributing_factors: Dict[str, float]

    # Statistics
    sample_size: int
    workshops_contributing: int
    data_quality_score: float

    # Comparison
    current_k_factor: Optional[float] = None
    suggested_adjustment: Optional[float] = None

    # Metadata
    model_version: str = "1.0.0"
    predicted_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        adj = self.suggested_adjustment
        return {
            "profile_id": self.profile_id,
            "joint_type": self.joint_type,
            "predicted_k_factor": round(self.predicted_k_factor, 2),
            "confidence": round(self.confidence, 2),
            "reasoning": self.reasoning,
            "contributing_factors": {
                k: round(v, 3) for k, v in self.contributing_factors.items()
            },
            "sample_size": self.sample_size,
            "workshops_contributing": self.workshops_contributing,
            "data_quality_score": round(self.data_quality_score, 2),
            "current_k_factor": self.current_k_factor,
            "suggested_adjustment": round(adj, 2) if adj else None,
            "model_version": self.model_version,
            "predicted_at": self.predicted_at.isoformat()
        }


@dataclass
class TrainingDataPoint:
    """Single training data point."""
    profile_id: str
    workshop_id: Optional[str]
    joint_type: str

    # Features
    profile_weight: float
    profile_depth: float
    profile_width: float
    material_type: str
    system_pack: Optional[str]

    # Target
    k_factor: float
    fit_status: str

    # Context
    machine_brand: Optional[str]
    temperature: Optional[float]
    humidity: Optional[float]

    # Metadata
    timestamp: datetime
    source: str


class CalibrationLearner:
    """
    ML-powered calibration learning engine.

    Uses multivariate regression to predict optimal K-factors
    based on profile characteristics and historical data.
    """

    MODEL_VERSION = "1.0.0"

    def __init__(
        self,
        config: Optional[TrainingConfig] = None,
        model_dir: str = "models/calibration"
    ):
        """
        Initialize the calibration learner.

        Args:
            config: Training configuration
            model_dir: Directory to store trained models
        """
        self.config = config or TrainingConfig()
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)

        # Model state
        self._coefficients: Dict[str, np.ndarray] = {}
        self._feature_means: Dict[str, np.ndarray] = {}
        self._feature_stds: Dict[str, np.ndarray] = {}
        self._training_stats: Dict[str, Dict] = {}

        # Load existing model if available
        self._load_model()

    def predict(
        self,
        profile_data: Dict[str, Any],
        joint_type: str,
        workshop_id: Optional[str] = None,
        current_k_factor: Optional[float] = None,
        mode: LearningMode = LearningMode.HYBRID
    ) -> KFactorPrediction:
        """
        Predict optimal K-factor for a profile.

        Args:
            profile_data: Profile characteristics dictionary
            joint_type: Type of joint (miter_45, miter_90, butt, etc.)
            workshop_id: Workshop ID for workshop-specific prediction
            current_k_factor: Current K-factor being used
            mode: Learning mode (workshop, collective, hybrid)

        Returns:
            KFactorPrediction with predicted value and confidence
        """
        profile_id = profile_data.get("id", "unknown")

        # Extract features
        features = self._extract_features(
            profile_data, joint_type, workshop_id
        )

        # Get model key
        model_key = self._get_model_key(joint_type, mode, workshop_id)

        # Check if we have a trained model
        if model_key not in self._coefficients:
            # Fall back to heuristic prediction
            return self._heuristic_prediction(
                profile_data, joint_type, current_k_factor
            )

        # Normalize features
        normalized = self._normalize_features(features, model_key)

        # Predict
        coeffs = self._coefficients[model_key]
        predicted_k = float(np.dot(normalized, coeffs[:-1]) + coeffs[-1])

        # Calculate confidence
        confidence = self._calculate_confidence(
            features, model_key, predicted_k
        )

        # Generate reasoning
        reasoning, contributing_factors = self._generate_reasoning(
            features, coeffs, model_key, predicted_k
        )

        # Get training stats
        stats = self._training_stats.get(model_key, {})

        # Calculate suggested adjustment
        adj = None
        if current_k_factor is not None:
            adj = predicted_k - current_k_factor

        return KFactorPrediction(
            profile_id=profile_id,
            joint_type=joint_type,
            predicted_k_factor=predicted_k,
            confidence=confidence,
            reasoning=reasoning,
            contributing_factors=contributing_factors,
            sample_size=stats.get("sample_size", 0),
            workshops_contributing=stats.get("workshops", 1),
            data_quality_score=stats.get("data_quality", 0.5),
            current_k_factor=current_k_factor,
            suggested_adjustment=adj,
            model_version=self.MODEL_VERSION
        )

    def train(
        self,
        training_data: List[TrainingDataPoint],
        joint_type: str,
        workshop_id: Optional[str] = None,
        mode: LearningMode = LearningMode.HYBRID
    ) -> Dict[str, Any]:
        """
        Train or update the model with new data.

        Args:
            training_data: List of training data points
            joint_type: Joint type to train for
            workshop_id: Workshop ID for workshop-specific training
            mode: Learning mode

        Returns:
            Training results dictionary
        """
        if len(training_data) < self.config.min_samples:
            needed = self.config.min_samples - len(training_data)
            return {
                "success": False,
                "error": f"Insufficient data: {len(training_data)} "
                         f"< {self.config.min_samples}",
                "samples_needed": needed
            }

        # Filter data for this joint type
        filtered_data = [
            d for d in training_data
            if d.joint_type == joint_type
        ]

        if not filtered_data:
            return {
                "success": False,
                "error": f"No data for joint type: {joint_type}"
            }

        # Apply sample limit
        if len(filtered_data) > self.config.max_samples:
            # Keep most recent samples
            filtered_data = sorted(
                filtered_data,
                key=lambda x: x.timestamp,
                reverse=True
            )[:self.config.max_samples]

        # Extract features and targets
        X = []
        y = []
        quality_scores = []

        for dp in filtered_data:
            features = self._extract_features_from_datapoint(dp)
            X.append(features)
            y.append(dp.k_factor)

            # Weight by fit status
            if dp.fit_status == "perfect":
                quality_scores.append(1.0)
            elif dp.fit_status in ["tight", "loose"]:
                quality_scores.append(0.7)
            else:
                quality_scores.append(0.4)

        X = np.array(X)
        y = np.array(y)
        weights = np.array(quality_scores)

        # Calculate feature statistics
        model_key = self._get_model_key(joint_type, mode, workshop_id)
        self._feature_means[model_key] = X.mean(axis=0)
        self._feature_stds[model_key] = X.std(axis=0) + 1e-8

        # Normalize features
        X_norm = (X - self._feature_means[model_key])
        X_norm = X_norm / self._feature_stds[model_key]

        # Add bias term
        X_bias = np.column_stack([X_norm, np.ones(len(X_norm))])

        # Weighted least squares with regularization
        W = np.diag(weights)
        reg = self.config.regularization * np.eye(X_bias.shape[1])
        reg[-1, -1] = 0  # Don't regularize bias

        try:
            coeffs = np.linalg.solve(
                X_bias.T @ W @ X_bias + reg,
                X_bias.T @ W @ y
            )
        except np.linalg.LinAlgError:
            # Fallback to pseudo-inverse
            inv = np.linalg.pinv(X_bias.T @ W @ X_bias + reg)
            coeffs = inv @ X_bias.T @ W @ y

        self._coefficients[model_key] = coeffs

        # Calculate training metrics
        y_pred = X_bias @ coeffs
        mse = np.mean((y - y_pred) ** 2)
        ss_res = np.sum((y - y_pred) ** 2)
        ss_tot = np.sum((y - np.mean(y)) ** 2)
        r2 = 1 - ss_res / ss_tot

        # Store training stats
        unique_workshops = set(
            d.workshop_id for d in filtered_data if d.workshop_id
        )
        self._training_stats[model_key] = {
            "sample_size": len(filtered_data),
            "workshops": len(unique_workshops),
            "data_quality": float(np.mean(quality_scores)),
            "mse": float(mse),
            "r2": float(r2),
            "trained_at": datetime.utcnow().isoformat()
        }

        # Save model
        self._save_model()

        logger.info(
            f"Trained model for {joint_type}: samples={len(filtered_data)}, "
            f"MSE={mse:.4f}, R²={r2:.4f}"
        )

        return {
            "success": True,
            "model_key": model_key,
            "samples_used": len(filtered_data),
            "metrics": {
                "mse": float(mse),
                "r2": float(r2),
                "data_quality": float(np.mean(quality_scores))
            }
        }

    def add_feedback(
        self,
        profile_id: str,
        joint_type: str,
        k_factor_used: float,
        fit_status: str,
        workshop_id: Optional[str] = None,
        profile_data: Optional[Dict[str, Any]] = None
    ):
        """
        Add production feedback for incremental learning.

        This is called when production floor workers report
        fit status via QR code scanning.

        Args:
            profile_id: Profile that was cut
            joint_type: Joint type used
            k_factor_used: K-factor that was applied
            fit_status: Reported fit status
            workshop_id: Workshop where cut was made
            profile_data: Optional profile characteristics
        """
        pd = profile_data or {}
        # Create training data point
        datapoint = TrainingDataPoint(
            profile_id=profile_id,
            workshop_id=workshop_id,
            joint_type=joint_type,
            profile_weight=pd.get("weight", 1.0),
            profile_depth=pd.get("depth", 60.0),
            profile_width=pd.get("width", 40.0),
            material_type=pd.get("material", "aluminum"),
            system_pack=pd.get("system_pack"),
            k_factor=k_factor_used,
            fit_status=fit_status,
            machine_brand=pd.get("machine_brand"),
            temperature=pd.get("temperature"),
            humidity=pd.get("humidity"),
            timestamp=datetime.utcnow(),
            source="production"
        )

        # Store feedback for batch training
        feedback_file = self.model_dir / "pending_feedback.json"

        pending = []
        if feedback_file.exists():
            try:
                with open(feedback_file, 'r') as f:
                    pending = json.load(f)
            except (json.JSONDecodeError, IOError):
                pending = []

        pending.append({
            "profile_id": datapoint.profile_id,
            "workshop_id": datapoint.workshop_id,
            "joint_type": datapoint.joint_type,
            "profile_weight": datapoint.profile_weight,
            "profile_depth": datapoint.profile_depth,
            "profile_width": datapoint.profile_width,
            "material_type": datapoint.material_type,
            "system_pack": datapoint.system_pack,
            "k_factor": datapoint.k_factor,
            "fit_status": datapoint.fit_status,
            "machine_brand": datapoint.machine_brand,
            "temperature": datapoint.temperature,
            "humidity": datapoint.humidity,
            "timestamp": datapoint.timestamp.isoformat(),
            "source": datapoint.source
        })

        with open(feedback_file, 'w') as f:
            json.dump(pending, f)

        logger.info(f"Added feedback for profile {profile_id}: {fit_status}")

        # Trigger incremental training if enough new data
        if len(pending) >= 50:
            self._trigger_incremental_training(joint_type, workshop_id)

    def _extract_features(
        self,
        profile_data: Dict[str, Any],
        joint_type: str,
        workshop_id: Optional[str]
    ) -> np.ndarray:
        """Extract feature vector from profile data."""
        features = [
            profile_data.get("weight", 1.0),
            profile_data.get("depth", 60.0),
            profile_data.get("width", 40.0),
            self._encode_material(profile_data.get("material", "aluminum")),
            self._encode_joint_type(joint_type),
            1.0 if workshop_id else 0.0,
        ]
        return np.array(features)

    def _extract_features_from_datapoint(
        self, dp: TrainingDataPoint
    ) -> np.ndarray:
        """Extract features from training data point."""
        features = [
            dp.profile_weight,
            dp.profile_depth,
            dp.profile_width,
            self._encode_material(dp.material_type),
            self._encode_joint_type(dp.joint_type),
            1.0 if dp.workshop_id else 0.0,
        ]
        return np.array(features)

    def _encode_material(self, material: str) -> float:
        """Encode material type as numeric."""
        encoding = {
            "aluminum": 0.0,
            "upvc": 0.5,
            "steel": 1.0
        }
        return encoding.get(material.lower(), 0.0)

    def _encode_joint_type(self, joint_type: str) -> float:
        """Encode joint type as numeric."""
        encoding = {
            "miter_45": 0.0,
            "miter_90": 0.25,
            "butt": 0.5,
            "cope": 0.75,
            "scarf": 1.0
        }
        return encoding.get(joint_type.lower(), 0.25)

    def _get_model_key(
        self,
        joint_type: str,
        mode: LearningMode,
        workshop_id: Optional[str]
    ) -> str:
        """Generate model key for storage."""
        if mode == LearningMode.WORKSHOP_ONLY and workshop_id:
            return f"{joint_type}_{workshop_id}"
        elif mode == LearningMode.COLLECTIVE:
            return f"{joint_type}_collective"
        else:
            return f"{joint_type}_hybrid"

    def _normalize_features(
        self, features: np.ndarray, model_key: str
    ) -> np.ndarray:
        """Normalize features using stored statistics."""
        if model_key not in self._feature_means:
            return features

        normalized = features - self._feature_means[model_key]
        return normalized / self._feature_stds[model_key]

    def _calculate_confidence(
        self,
        features: np.ndarray,
        model_key: str,
        prediction: float
    ) -> float:
        """Calculate confidence score for prediction."""
        stats = self._training_stats.get(model_key, {})

        # Base confidence from sample size
        sample_size = stats.get("sample_size", 0)
        size_confidence = min(1.0, sample_size / 100)

        # Confidence from model fit
        r2 = stats.get("r2", 0.5)
        fit_confidence = max(0, r2)

        # Confidence from data quality
        quality = stats.get("data_quality", 0.5)

        # Combine factors
        confidence = (
            0.3 * size_confidence +
            0.4 * fit_confidence +
            0.3 * quality
        )

        return min(1.0, max(0.0, confidence))

    def _generate_reasoning(
        self,
        features: np.ndarray,
        coefficients: np.ndarray,
        model_key: str,
        prediction: float
    ) -> Tuple[List[str], Dict[str, float]]:
        """Generate human-readable reasoning for prediction."""
        reasoning = []
        contributing_factors = {}

        stats = self._training_stats.get(model_key, {})

        # Sample size reasoning
        sample_size = stats.get("sample_size", 0)
        if sample_size >= 100:
            reasoning.append(
                f"Based on {sample_size} calibration records (high confidence)"
            )
        elif sample_size >= 50:
            reasoning.append(
                f"Based on {sample_size} calibration records "
                f"(moderate confidence)"
            )
        else:
            reasoning.append(
                f"Based on {sample_size} calibration records (limited data)"
            )

        # Feature contributions
        feature_names = [
            "profile_weight", "profile_depth", "profile_width",
            "material_type", "joint_type", "workshop_context"
        ]

        for i, name in enumerate(feature_names):
            if i < len(coefficients) - 1:
                contribution = features[i] * coefficients[i]
                contributing_factors[name] = float(contribution)

        # Most influential factors
        sorted_factors = sorted(
            contributing_factors.items(),
            key=lambda x: abs(x[1]),
            reverse=True
        )

        if sorted_factors:
            top_factor = sorted_factors[0]
            if abs(top_factor[1]) > 0.5:
                factor_name = top_factor[0].replace('_', ' ')
                reasoning.append(
                    f"Primary factor: {factor_name} "
                    f"(contribution: {top_factor[1]:.2f}mm)"
                )

        # Model fit quality
        r2 = stats.get("r2", 0)
        if r2 > 0.8:
            reasoning.append("Model shows excellent fit to historical data")
        elif r2 > 0.6:
            reasoning.append("Model shows good fit to historical data")
        elif r2 > 0.4:
            reasoning.append(
                "Model shows moderate fit - consider more test cuts"
            )

        # Data quality
        quality = stats.get("data_quality", 0.5)
        if quality > 0.8:
            reasoning.append(
                "Training data has high proportion of 'perfect fit' results"
            )

        return reasoning, contributing_factors

    def _heuristic_prediction(
        self,
        profile_data: Dict[str, Any],
        joint_type: str,
        current_k_factor: Optional[float]
    ) -> KFactorPrediction:
        """
        Fallback heuristic prediction when no model is available.

        Uses industry standards and profile characteristics.
        """
        # Base K-factors by joint type (industry standards)
        base_k = {
            "miter_45": 3.0,
            "miter_90": 2.0,
            "butt": 0.0,
            "cope": 1.5,
            "scarf": 2.5
        }.get(joint_type, 2.0)

        # Adjust by profile weight
        weight = profile_data.get("weight", 1.0)
        if weight > 1.5:
            base_k += 0.5
        elif weight < 0.5:
            base_k -= 0.3

        # Adjust by material
        material = profile_data.get("material", "aluminum")
        if material.lower() == "upvc":
            base_k -= 0.5
        elif material.lower() == "steel":
            base_k += 1.0

        reasoning = [
            "Using heuristic calculation (no trained model available)",
            f"Base K-factor for {joint_type}: {base_k:.1f}mm",
            "Recommend performing test cuts to improve accuracy"
        ]

        adj = None
        if current_k_factor is not None:
            adj = round(base_k - current_k_factor, 2)

        return KFactorPrediction(
            profile_id=profile_data.get("id", "unknown"),
            joint_type=joint_type,
            predicted_k_factor=round(base_k, 2),
            confidence=0.3,
            reasoning=reasoning,
            contributing_factors={"heuristic_base": base_k},
            sample_size=0,
            workshops_contributing=0,
            data_quality_score=0.0,
            current_k_factor=current_k_factor,
            suggested_adjustment=adj,
            model_version=self.MODEL_VERSION
        )

    def _trigger_incremental_training(
        self, joint_type: str, workshop_id: Optional[str]
    ):
        """Trigger incremental model training with accumulated feedback."""
        logger.info(f"Triggering incremental training for {joint_type}")

        # Load pending feedback
        feedback_file = self.model_dir / "pending_feedback.json"
        if not feedback_file.exists():
            return

        try:
            with open(feedback_file, 'r') as f:
                pending = json.load(f)

            # Convert to TrainingDataPoint objects
            training_data = []
            for item in pending:
                training_data.append(TrainingDataPoint(
                    profile_id=item["profile_id"],
                    workshop_id=item.get("workshop_id"),
                    joint_type=item["joint_type"],
                    profile_weight=item["profile_weight"],
                    profile_depth=item["profile_depth"],
                    profile_width=item["profile_width"],
                    material_type=item["material_type"],
                    system_pack=item.get("system_pack"),
                    k_factor=item["k_factor"],
                    fit_status=item["fit_status"],
                    machine_brand=item.get("machine_brand"),
                    temperature=item.get("temperature"),
                    humidity=item.get("humidity"),
                    timestamp=datetime.fromisoformat(item["timestamp"]),
                    source=item["source"]
                ))

            # Train model
            result = self.train(training_data, joint_type, workshop_id)

            if result["success"]:
                # Clear processed feedback
                with open(feedback_file, 'w') as f:
                    json.dump([], f)

        except Exception as e:
            logger.error(f"Incremental training failed: {e}")

    def _save_model(self):
        """Save model to disk."""
        model_file = self.model_dir / "calibration_model.pkl"

        model_state = {
            "coefficients": self._coefficients,
            "feature_means": self._feature_means,
            "feature_stds": self._feature_stds,
            "training_stats": self._training_stats,
            "version": self.MODEL_VERSION,
            "saved_at": datetime.utcnow().isoformat()
        }

        with open(model_file, 'wb') as f:
            pickle.dump(model_state, f)

        logger.info(f"Model saved to {model_file}")

    def _load_model(self):
        """Load model from disk."""
        model_file = self.model_dir / "calibration_model.pkl"

        if not model_file.exists():
            logger.info("No existing model found, starting fresh")
            return

        try:
            with open(model_file, 'rb') as f:
                model_state = pickle.load(f)

            self._coefficients = model_state.get("coefficients", {})
            self._feature_means = model_state.get("feature_means", {})
            self._feature_stds = model_state.get("feature_stds", {})
            self._training_stats = model_state.get("training_stats", {})

            logger.info(
                f"Model loaded: version={model_state.get('version')}, "
                f"keys={list(self._coefficients.keys())}"
            )

        except Exception as e:
            logger.error(f"Failed to load model: {e}")
