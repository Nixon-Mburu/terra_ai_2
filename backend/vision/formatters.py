import base64
from typing import Any, Dict, List, Optional

import cv2


def encode_png_data_url(bgr_image) -> str:
    ok, buf = cv2.imencode(".png", bgr_image)
    if not ok:
        raise RuntimeError("Failed to encode annotated image")
    b64 = base64.b64encode(buf.tobytes()).decode("utf-8")
    return f"data:image/png;base64,{b64}"


def _as_box_xyxy(box) -> List[float]:
    xyxy = box.xyxy[0].tolist()
    return [float(x) for x in xyxy]


def _as_mask_polygon(mask_xy) -> List[List[float]]:
    out: List[List[float]] = []
    for pt in mask_xy:
        out.append([float(pt[0]), float(pt[1])])
    return out


def result_to_instances(result) -> List[Dict[str, Any]]:
    instances: List[Dict[str, Any]] = []

    names = result.names or {}
    boxes = result.boxes
    masks = result.masks

    mask_polys: Optional[Any] = None
    if masks is not None and hasattr(masks, "xy"):
        mask_polys = masks.xy

    if boxes is None:
        return instances

    for idx in range(len(boxes)):
        box = boxes[idx]
        cls_id = int(box.cls[0].item()) if hasattr(box.cls[0], "item") else int(box.cls[0])
        conf = float(box.conf[0].item()) if hasattr(box.conf[0], "item") else float(box.conf[0])
        name = names.get(cls_id, str(cls_id))

        poly = None
        if mask_polys is not None and idx < len(mask_polys) and mask_polys[idx] is not None:
            poly = _as_mask_polygon(mask_polys[idx])

        instances.append(
            {
                "class_id": cls_id,
                "class_name": name,
                "confidence": conf,
                "box_xyxy": _as_box_xyxy(box),
                "mask_polygon": poly,
                "source": "yolo",
            }
        )

    return instances
