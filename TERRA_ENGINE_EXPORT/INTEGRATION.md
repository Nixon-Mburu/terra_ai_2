# Terra Engine Export Integration Guide

This guide covers how to integrate the extracted Terra AI engine into a new project repository. The intelligence engine includes the spatial analysis backend, the vision analysis backend, and a set of pure frontend utility functions.

## 1. Project Setup

Copy the contents of `TERRA_ENGINE_EXPORT/` into your new project.

### Starting the Flask Server

The backend is fully self-contained in the `backend/` directory.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment and install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Set up your environment variables:
   Copy `.env.example` to `.env` and fill in the required API keys (e.g., Gemini API, Google Maps, Overpass, Earth Engine).

4. Start the server:
   ```bash
   python app.py
   ```
   By default, the server will run on port `5000` (or `PORT` defined in your `.env`) at `http://localhost:5000`.

## 2. API Endpoints Expose by `app.py`

The Flask server (`app.py`) exposes the following core endpoints through the registered blueprints:

- `GET /` - Returns server status and a list of available endpoints.
- `GET /health` - Simple health check endpoint.
- `POST /api/vision/analyze` - Image vision processing and segmentation using YOLO.
- `POST /api/spatial/analyze` - Comprehensive geospatial risk analysis and Gemini synthesis.
- `GET /api/location/reverse` - Reverse geocoding (convert lat/lng to address).
- `POST /api/spatial/chat` - Chat functionality about the generated spatial report.
- `POST /api/export/analysis-document` - Packages analysis output for export.

## 3. Expected JSON Payloads

### `/api/vision/analyze`
**Method:** POST
**Content-Type:** `multipart/form-data` (Note: This endpoint expects a multipart form request containing the image file, typically under the `image` field, as it relies on `decode_image_from_flask_request`.)

### `/api/spatial/analyze`
**Method:** POST
**Content-Type:** `application/json`
**Payload:**
```json
{
  "lat": -1.2921,
  "lng": 36.8219,
  "clientContext": { ... }, // Optional client details
  "visionContext": { ... }  // Optional vision summary details
}
```
*Note: `lat` and `lng` must be numeric and within the geographic bounds of Kenya (-5.0 to 5.0 latitude, 33.9 to 41.9 longitude).*

## 4. Frontend Utilities

The `frontend_utils/` directory contains framework-agnostic Javascript utilities essential to the engine's functionality. You can import these directly into your frontend application regardless of the framework you choose:

- `analyzeUtils.js` - Contains logic for interacting with the backend and formatting data.
- `click_inspector.js` - Contains specific vision/image inspection capabilities.
- `annotation_descriptions.js` - Stores constant descriptions for the annotation system.
