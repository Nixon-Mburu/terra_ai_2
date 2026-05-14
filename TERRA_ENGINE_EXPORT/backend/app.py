import os

from flask import Flask, jsonify
from flask_cors import CORS

from vision.routes import bp as vision_bp
from spatial.routes import bp as spatial_bp


app = Flask(__name__)
CORS(app)
app.register_blueprint(vision_bp)
app.register_blueprint(spatial_bp)


# Global error handler for unhandled exceptions
@app.errorhandler(500)
def handle_500(error):
    print(f"[Terra AI] Unhandled 500 error: {error}")
    return jsonify({"error": "Internal server error", "details": str(error)}), 500


@app.errorhandler(404)
def handle_404(error):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(400)
def handle_400(error):
    return jsonify({"error": "Bad request"}), 400


@app.get("/")
def index():
    return jsonify(
        {
            "ok": True,
            "service": "terra2-vision",
            "endpoints": {
                "health": "/health",
                "analyze": "/api/vision/analyze",
            },
        }
    )


@app.get("/favicon.ico")
def favicon():
    # Avoid noisy 404s when hitting the dev server in a browser.
    return ("", 204)


@app.get("/health")
def health():
    return jsonify({"ok": True})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=True)
