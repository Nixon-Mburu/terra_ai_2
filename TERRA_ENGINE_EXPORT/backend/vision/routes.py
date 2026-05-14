from flask import Blueprint, jsonify, request

from .image_io import decode_image_from_flask_request
from .service import analyze_image

bp = Blueprint("vision", __name__)


@bp.post("/api/vision/analyze")
def vision_analyze():
    try:
        rgb = decode_image_from_flask_request(request)
        return jsonify(analyze_image(rgb))
    except Exception as err:
        return jsonify({"error": str(err)}), 400
