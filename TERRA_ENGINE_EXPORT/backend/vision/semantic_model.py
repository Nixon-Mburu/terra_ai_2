import os
import threading
from typing import Optional, Tuple

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForSemanticSegmentation

_MODEL_LOCK = threading.Lock()
_PROCESSOR: Optional[AutoImageProcessor] = None
_MODEL: Optional[AutoModelForSemanticSegmentation] = None
_DEVICE: Optional[torch.device] = None


def _get_device() -> torch.device:
    global _DEVICE
    if _DEVICE is not None:
        return _DEVICE

    raw = os.getenv("TERRA_SEM_DEVICE") or os.getenv("TERRA_YOLO_DEVICE") or "cpu"
    if raw == "cpu":
        _DEVICE = torch.device("cpu")
    else:
        # allow '0', '1', 'cuda', 'cuda:0'
        if raw.isdigit():
            _DEVICE = torch.device(f"cuda:{raw}")
        elif raw.startswith("cuda"):
            _DEVICE = torch.device(raw)
        else:
            _DEVICE = torch.device("cpu")

    return _DEVICE


def get_semantic_model():
    """
    Lazy-load semantic segmentation model (ADE20K) via Transformers.
    Thread-safe double-checked locking — prevents race condition when
    multiple Flask workers try to initialise the model simultaneously.
    """
    global _PROCESSOR, _MODEL

    # Fast path — already loaded
    if _PROCESSOR is not None and _MODEL is not None:
        return _PROCESSOR, _MODEL

    with _MODEL_LOCK:
        # Re-check inside the lock (double-checked locking pattern)
        if _PROCESSOR is not None and _MODEL is not None:
            return _PROCESSOR, _MODEL

        model_name = os.getenv("TERRA_SEM_MODEL", "nvidia/segformer-b0-finetuned-ade-512-512")
        _PROCESSOR = AutoImageProcessor.from_pretrained(model_name)
        _MODEL = AutoModelForSemanticSegmentation.from_pretrained(model_name)
        _MODEL.eval()
        _MODEL.to(_get_device())

    return _PROCESSOR, _MODEL


@torch.inference_mode()
def semantic_segment(rgb: np.ndarray) -> Tuple[np.ndarray, np.ndarray, dict]:
    """Return (class_map, prob_map, id2label).

    - class_map: (H, W) int class ids
    - prob_map: (H, W) float probability of predicted class (max softmax)
    """

    processor, model = get_semantic_model()

    pil = Image.fromarray(rgb.astype(np.uint8), mode="RGB")
    inputs = processor(images=pil, return_tensors="pt")
    device = _get_device()
    inputs = {k: v.to(device) for k, v in inputs.items()}

    outputs = model(**inputs)
    logits = outputs.logits  # (1, C, h, w)

    h, w = rgb.shape[:2]
    up = F.interpolate(logits, size=(h, w), mode="bilinear", align_corners=False)
    probs = up.softmax(dim=1)[0]  # (C, H, W)

    class_map = probs.argmax(dim=0).detach().cpu().numpy().astype(np.int32)
    prob_map = probs.max(dim=0).values.detach().cpu().numpy().astype(np.float32)

    id2label = getattr(model.config, "id2label", {}) or {}
    return class_map, prob_map, id2label
