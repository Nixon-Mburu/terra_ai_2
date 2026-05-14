import os
from typing import Optional

from ultralytics import YOLO

_MODEL: Optional[YOLO] = None


def _get_conf() -> float:
	try:
		return float(os.getenv("TERRA_YOLO_CONF", "0.15"))
	except Exception:
		return 0.15


def _get_imgsz() -> int:
	try:
		return int(os.getenv("TERRA_YOLO_IMGSZ", "1024"))
	except Exception:
		return 1024


def get_model() -> YOLO:
	"""Lazy-load a YOLO segmentation model and keep it cached in-process."""

	global _MODEL
	if _MODEL is not None:
		return _MODEL

	model_name = os.getenv("TERRA_YOLO_MODEL", "yolov8n-seg.pt")
	_MODEL = YOLO(model_name)
	return _MODEL


def predict(rgb_image):
	"""Run segmentation prediction on an RGB numpy array."""

	model = get_model()

	conf = _get_conf()
	imgsz = _get_imgsz()
	device = os.getenv("TERRA_YOLO_DEVICE")  # e.g. 'cpu', '0'

	pred_kwargs = {
		"conf": conf,
		"imgsz": imgsz,
		"retina_masks": True,
		"verbose": False,
	}
	if device:
		pred_kwargs["device"] = device

	results = model.predict(rgb_image, **pred_kwargs)
	return results[0]
