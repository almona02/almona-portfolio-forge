import mlflow
import os
from pathlib import Path

# Set the MLflow tracking URI to a local directory
# This will create a `mlruns` directory in the current working directory
mlflow.set_tracking_uri("file:./mlruns")

# Define the experiment name
experiment_name = "part_detection_models"
mlflow.set_experiment(experiment_name)

# Define the models to register
# We assume the models are in the `python_backend/ai_services/part_detection/models` directory
models_to_register = {
    "part_detector": "model.pt",
    # Add other models here if needed, e.g., "part_detector_v2": "model_v2.pt"
}

def register_model(model_name, model_filename):
    """
    Registers a model with the MLflow Model Registry.
    """
    model_path = Path("ai_services/part_detection/models") / model_filename
    if not model_path.exists():
        print(f"Model file not found at {model_path}. Skipping registration.")
        return

    with mlflow.start_run() as run:
        # Log the model as an artifact
        mlflow.log_artifact(str(model_path), artifact_path="model")

        # Register the model in the Model Registry
        model_uri = f"runs:/{run.info.run_id}/model"
        registered_model = mlflow.register_model(model_uri, model_name)
        print(f"Model '{model_name}' registered with version {registered_model.version}")

if __name__ == "__main__":
    for name, filename in models_to_register.items():
        register_model(name, filename)

    print("Model registration script finished.")
