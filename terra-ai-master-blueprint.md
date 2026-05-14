# 🏗️ TERRA AI: Enterprise Master Architecture & Technical Specification

## 1. Project Objective & Executive Summary
Terra AI is an enterprise-grade land pre-purchase risk assessment platform designed specifically for the Kenyan real estate market (Nairobi focus). It fuses computer vision (YOLO) with geospatial intelligence (Shapely, OpenStreetMap, Google Maps) to detect physical and legal risks—like riparian buffer zones, aviation height limits, and terrain slope—before a buyer locks in a purchase.

**Your Task as the AI Architect:** Build a flawless, high-converting React/Vite frontend that wraps our existing, highly capable Flask GIS engine. The UI must be sleek, modern, light-mode (similar to the Google Gemini chat interface), with a persistent sidebar and a massive central stage for maps and media.

---

## 2. Tech Stack & Dependencies
Initialize the Vite project and install the following specific dependencies to guarantee enterprise-grade performance and UI:

* **Core:** React 18, Vite
* **Routing:** `react-router-dom` (BrowserRouter)
* **Styling:** Tailwind CSS (Strict usage, no inline styles), `clsx`, `tailwind-merge`
* **State Management:** `zustand` (with `persist` middleware)
* **Animations:** `framer-motion` (for the cinematic scanner and page transitions)
* **Icons:** `lucide-react` (clean, consistent SVG icons)
* **Maps:** Google Maps API (or `react-map-gl` if using Mapbox, matching the backend logic)
* **PDF Generation:** `@react-pdf/renderer` (Mandatory for the final deliverable)

---

## 3. Strict Folder Architecture
You must construct the React application using this exact hierarchical structure to avoid "God Components":

```text
src/
├── assets/                 # Images, icons, static assets
├── components/
│   ├── layout/             # Sidebar.jsx, TopBar.jsx, MainLayout.jsx
│   ├── ui/                 # Reusable atomic UI (Button.jsx, Card.jsx, Tooltip.jsx, Loader.jsx)
│   ├── vision/             # Uploader.jsx, CinematicScanner.jsx, AnnotationPins.jsx
│   ├── map/                # InteractiveMap.jsx, PinDrop.jsx, LocationSearch.jsx
│   ├── results/            # RiskSummaryCard.jsx, ChatAssistant.jsx, ProgressiveLoader.jsx
│   └── pdf/                # TerraReportDocument.jsx, PdfDataCharts.jsx
├── pages/
│   ├── Home.jsx            # Landing page (Floating isometric land concept)
│   ├── Analyze.jsx         # The split choice (Vision vs. Map)
│   ├── Pricing.jsx         # SaaS Pricing tiers
│   └── Report.jsx          # Final web view before PDF download
├── store/
│   └── useTerraStore.js    # Zustand global state (Persisted)
├── utils/                  # Imported directly from TERRA_ENGINE_EXPORT
├── App.jsx                 # Router configuration
└── main.jsx                # React DOM render
4. Global State Management (Zustand)
We absolutely cannot afford data amnesia when a user navigates between routes. The useTerraStore must utilize sessionStorage persistence.

State Model Required:

userSession: { currentProjectId, recentProjects: [] }

visionState: { uploadedImageBlob: null, scanStatus: 'idle' | 'scanning' | 'complete', annotations: [] }

mapState: { pinnedCoordinates: { lat, lng }, approvedLocationData: null }

engineState: { status: 'idle' | 'loading' | 'done' | 'error', progressMessage: '', payload: null, report: null }

pdfState: { isGenerating: false }

5. UI/UX Design System & Tailwind Rules
Theme: Light mode, prioritizing massive white space and legible data hierarchy.

Colors:

Backgrounds: #F8FAFC (Main app background), #FFFFFF (Cards and Sidebar).

Primary Accent: Emerald Green (for safe states, primary CTAs, "Download PDF").

Secondary Accent: Deep Indigo/Purple (for map pins, active states, premium indicators).

Text: Slate-900 (Headings), Slate-600 (Body/Subtitles).

Typography: Inter or Roboto. Clean, sans-serif.

Layout Rule: Strict Flexbox and CSS Grid. Do NOT use absolute positioning for structural layouts. The right-hand "Main Stage" must dynamically adjust its width if the sidebar collapses on mobile.

6. Core Feature Specifications & User Flow
Step 1: The Landing Page (/)
Hero Section: Display a high-end 3D isometric floating land concept image.

Value Prop: Clear messaging: "Understand land constraints and sustainable building before you buy."

CTA: A prominent button routing to /analyze.

Step 2: The Analysis Split (/analyze)
Clean, two-column choice presented in sleek glassmorphic cards:

Option A: "Scan via Photo" (Triggers Vision Flow).

Option B: "Deep Map Analysis" (Triggers Map Flow).

Step 3: The Vision Flow (Option A)
Cinematic Scanner (CinematicScanner.jsx): When an image is uploaded, use framer-motion to animate a glowing green scanning line sweeping top-to-bottom across the image.

Annotations: Do not use raw CSS borders. Fade in elegant, minimalist floating tooltips (lucide-react icons + text) pointing to detected YOLO elements (e.g., "Vegetation").

The Upsell: Render a sticky banner below the image: "Want deeper legal and zoning analysis for this plot? Drop a pin." Clicking this carries the data into Step 4.

Step 4: The Map & Engine Flow (Option B / Upsell)
Map Stage (InteractiveMap.jsx): Full-bleed satellite map. The user drops a pin.

Progressive Loading (ProgressiveLoader.jsx): Upon triggering the engine, lock the UI with a sleek overlay. Use a useEffect interval to cycle through loading text:

"Querying Nairobi infrastructure data..."

"Calculating Riparian buffers and slope terrain..."

"Cross-referencing zoning records..."

"Synthesizing final risk report via Gemini..."

The Result (RiskSummaryCard.jsx): Slide up a glassmorphic card over the map. Display the overall_risk_score, key warning flags, and the primary CTA: "Download Full PDF Report".

7. Enterprise PDF Generation Requirements
This is the monetized deliverable. It must look like a $5,000 architectural survey. Use @react-pdf/renderer inside TerraReportDocument.jsx.

Data Flow: The PDF component receives engineState.payload and engineState.report directly from Zustand.

Page 1: Executive Summary (The Hook)

Header: Corporate Terra AI logo, Project Name, and Date.

Visual: High-resolution static map snippet of the exact coordinates.

Verdict: The overall_risk_score in a massive, bold font.

Summary: The Gemini-generated 3-sentence executive summary.

Page 2: Environmental & Topographical Data (Hard Numbers)

Layout: 2-column flex grid.

Data: Extract Elevation, Slope Percentage, and Flood Risk from the payload.

Visuals: Implement SVG-based progress bars/meters (e.g., a slope meter that visually turns red if > 15%).

Page 3: Legal, Infrastructure, & Cost Implications (The Value)

Critical Flags: Map over critical_flags. Prefix each with a warning icon.

Cost Implications: Render the bulleted list explaining infrastructure distances (water, grid, road) and their estimated financial impact on building.

Legal Footer: "This report is generated via geospatial AI for exploratory due diligence and does not replace an official Ministry of Lands physical survey or NEMA assessment."

8. Backend Integration Guardrails (CRITICAL)
I have provided the TERRA_ENGINE_EXPORT folder.

DO NOT ALTER PYTHON CODE: Do not rewrite, refactor, or attempt to "fix" app.py, the spatial/ directory, or the vision/ directory. They are perfectly tuned.

API Contract: You are building the React client to consume these local endpoints via standard fetch or axios:

POST /api/vision/analyze (Accepts imageDataUrl)

POST /api/spatial/analyze (Accepts lat, lng, clientContext, visionContext)

Error Handling: If the Flask API returns a 400 or 500 error, catch it gracefully in the frontend and display a clean error toast to the user, allowing them to try again without crashing the app.

EXECUTION COMMAND: Read this document entirely. Acknowledge these constraints. Begin by initializing the Vite project, installing the specific dependencies listed in Section 2, and generating the folder structure outlined in Section 3.





# Terra AI Backend — Environment Variables
# Auto-populated from user-provided keys

# Gemini 2.5 Flash — risk report synthesis
GEMINI_API_KEY=AIzaSyCX9wBs-2mwlIi5PKX9MIWosJ9EPaZ14xg

# Google Maps — Elevation API, Geocoding API, Places API
GOOGLE_MAPS_API_KEY=AIzaSyC7c4vFkKJn_8wWBkH3igzrusrW4WLeqtc

# Google Earth Engine — JRC flood history (optional, graceful fallback if missing)
GOOGLE_EARTH_ENGINE_API_KEY=AIzaSyCWGWYlzez4wWHl-FNnqF3ingQUQ-2doX0

# Flask port
PORT=5000



# Terra AI Frontend — Environment Variables
# Vite exposes VITE_* vars to the browser bundle
# Non-VITE_* vars are read server-side only (vite.config.js middleware)

# Google Maps JavaScript API — used by @react-google-maps/api loader + tile proxy
VITE_GOOGLE_MAPS_API_KEY=AIzaSyC7c4vFkKJn_8wWBkH3igzrusrW4WLeqtc
GOOGLE_MAPS_API_KEY=AIzaSyC7c4vFkKJn_8wWBkH3igzrusrW4WLeqtc
