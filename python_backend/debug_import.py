import sys
import traceback
import os
from unittest.mock import Mock
import types
import importlib.machinery


# Mock setups
def _stub_module(name: str):
    mod = types.ModuleType(name)
    mod.__spec__ = importlib.machinery.ModuleSpec(name, loader=None)
    sys.modules[name] = mod


sys.modules["ultralytics"] = Mock()
_stub_module("tensorflow")
_stub_module("torchvision")
_stub_module("torchvision.transforms")
_stub_module("torchvision.ops")
_stub_module("torchvision.models")
_stub_module("easyocr")

try:
    from apis.main import app

    with open("import_success.txt", "w") as f:
        f.write("Success")
except Exception as e:
    with open("import_error.txt", "w") as f:
        f.write(str(e))
        f.write("\n")
        traceback.print_exc(file=f)
