import base64
from io import BytesIO

import numpy as np
from PIL import Image


def strip_data_url(data_url: str) -> str:
    if "," in data_url:
        return data_url.split(",", 1)[1]
    return data_url


def decode_image_from_flask_request(flask_request) -> np.ndarray:
    """Return RGB uint8 image array.

    Accepts either:
    - multipart/form-data with field name `image`
    - JSON body with `imageDataUrl` (data URL) or `image_base64`.
    """

    if getattr(flask_request, "files", None) and "image" in flask_request.files:
        file_storage = flask_request.files["image"]
        content = file_storage.read()
        img = Image.open(BytesIO(content)).convert("RGB")
        return np.array(img)

    payload = flask_request.get_json(silent=True) or {}
    image_data_url = payload.get("imageDataUrl") or payload.get("image_base64") or payload.get("image")
    if not image_data_url or not isinstance(image_data_url, str):
        raise ValueError(
            "Missing image. Send multipart field 'image' or JSON {imageDataUrl: 'data:image/...'}"
        )

    b64 = strip_data_url(image_data_url)
    raw = base64.b64decode(b64)
    img = Image.open(BytesIO(raw)).convert("RGB")
    return np.array(img)
