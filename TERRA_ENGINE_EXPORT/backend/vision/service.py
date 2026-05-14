import os
import time
from typing import Any, Dict

import numpy as np

from .formatters import encode_png_data_url, result_to_instances
from .semantic_instances import semantic_instances
from .vision_model import _get_conf, _get_imgsz, predict

# Land-relevant class keywords. Instances that match any of these (case-insensitive)
# are kept. High-confidence detections (> 0.6) are always kept regardless.
LAND_RELEVANT_CLASSES = {
    'road', 'street', 'highway', 'path', 'sidewalk', 'walkway', 'footpath',
    'ground', 'soil', 'dirt', 'sand', 'earth', 'terrain',
    'grass', 'lawn', 'field', 'vegetation', 'tree', 'palm', 'plant', 'shrub', 'bush',
    'building', 'house', 'wall', 'roof', 'fence', 'gate',
    'water', 'river', 'stream', 'pond', 'wetland',
    'rock', 'cliff', 'stone',
    'car', 'truck', 'person',  # scale context
}


def analyze_image(rgb: np.ndarray) -> Dict[str, Any]:
    started = time.perf_counter()

    result = predict(rgb)

    try:
        annotated_bgr = result.plot(
            boxes=True,
            masks=True,
            labels=True,
            conf=True,
            line_width=4,
        )
    except TypeError:
        # Older/newer ultralytics may not support all kwargs.
        annotated_bgr = result.plot()

    # Always return annotated image — removed TERRA_RETURN_ANNOTATED env gate.
    annotated_data_url = encode_png_data_url(annotated_bgr)

    instances = result_to_instances(result)

    # Add coarse scene-level annotations (road/ground/tree/vegetation/etc).
    try:
        instances.extend(semantic_instances(rgb))
    except Exception:
        # Semantic model is optional; YOLO results still return.
        pass

    # Filter to land-relevant classes only; keep high-confidence detections regardless.
    instances = [
        i for i in instances
        if any(kw in (i.get('class_name') or '').lower() for kw in LAND_RELEVANT_CLASSES)
        or i.get('confidence', 0) > 0.6
    ]

    class_counts: Dict[str, int] = {}
    for inst in instances:
        name = str(inst.get("class_name") or "unknown")
        class_counts[name] = class_counts.get(name, 0) + 1

    h, w = rgb.shape[:2]
    elapsed_ms = (time.perf_counter() - started) * 1000

    return {
        "image": {"width": int(w), "height": int(h)},
        "model": {
            "weights": os.getenv("TERRA_YOLO_MODEL", "yolov8n-seg.pt"),
            "task": "segment",
            "conf": _get_conf(),
            "imgsz": _get_imgsz(),
        },
        "summary": {
            "instanceCount": len(instances),
            "classCounts": class_counts,
        },
        "instances": instances,
        "annotatedImageDataUrl": annotated_data_url,
        "timing": {"inference_ms": round(elapsed_ms, 2)},
    }
