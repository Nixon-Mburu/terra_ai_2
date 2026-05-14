from typing import Any, Dict, List, Tuple

import cv2
import numpy as np

from .semantic_model import semantic_segment


def _label_match(name: str) -> str:
    s = (name or "").lower()

    # Keep this mapping simple and land-focused.
    if any(k in s for k in ["road", "street", "highway", "runway", "path"]):
        return "road"
    if any(k in s for k in ["sidewalk", "footpath", "walkway"]):
        return "sidewalk"
    if any(k in s for k in ["grass", "lawn", "field"]):
        return "vegetation"
    if any(k in s for k in ["tree", "palm"]):
        return "tree"
    if any(k in s for k in ["plant", "shrub", "bush", "vegetation"]):
        return "vegetation"
    if any(k in s for k in ["earth", "soil", "dirt", "sand", "ground", "terrain"]):
        return "ground"
    if "sky" in s:
        return "sky"
    if any(k in s for k in ["building", "house", "wall"]):
        return "building"

    return ""


def _connected_component_boxes(mask: np.ndarray, min_area_px: int) -> List[Tuple[int, int, int, int]]:
    # mask: uint8 {0,1}
    num, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    boxes: List[Tuple[int, int, int, int]] = []
    for i in range(1, num):
        x, y, w, h, area = stats[i]
        if int(area) < int(min_area_px):
            continue
        boxes.append((int(x), int(y), int(x + w), int(y + h)))
    return boxes


def semantic_instances(rgb: np.ndarray) -> List[Dict[str, Any]]:
    """Generate coarse 'scene' instances (road/ground/tree/vegetation/etc) from semantic segmentation."""

    class_map, prob_map, id2label = semantic_segment(rgb)
    h, w = class_map.shape

    # Build a lookup for class ids we care about.
    wanted: Dict[int, str] = {}
    for class_id, label in id2label.items():
        mapped = _label_match(str(label))
        if mapped:
            wanted[int(class_id)] = mapped

    if not wanted:
        return []

    min_area_px = max(800, int(h * w * 0.004))
    out: List[Dict[str, Any]] = []

    for class_id, mapped_name in wanted.items():
        mask = (class_map == int(class_id)).astype(np.uint8)
        if mask.sum() < min_area_px:
            continue

        # Reduce noise: morphological close.
        kernel = np.ones((7, 7), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

        boxes = _connected_component_boxes(mask, min_area_px=min_area_px)
        if not boxes:
            continue

        # Confidence: average of prob_map inside class mask.
        cls_conf = float(np.mean(prob_map[mask.astype(bool)])) if mask.any() else 0.0

        # Limit boxes per class to keep UI readable.
        for (x1, y1, x2, y2) in boxes[:3]:
            out.append(
                {
                    "class_id": int(class_id),
                    "class_name": mapped_name,
                    "confidence": cls_conf,
                    "box_xyxy": [float(x1), float(y1), float(x2), float(y2)],
                    "mask_polygon": None,
                    "source": "semantic",
                }
            )

    return out
