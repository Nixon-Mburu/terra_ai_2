"""
Gemini 2.5 Flash synthesis — Terra AI land risk report generator

Uses google.generativeai (v0.8.x) with a precise Kenya-expert system prompt
and an expanded JSON schema covering investment verdict, cost summary, fraud
checklist, solar potential, and zoning guidance.
"""

import json
import os
import re
import warnings
from typing import Optional

with warnings.catch_warnings():
    warnings.filterwarnings("ignore", category=FutureWarning)
    import google.generativeai as genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


def _is_credit_depleted_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return ("429" in msg and ("credit" in msg or "prepayment" in msg or "billing" in msg)) or (
        "prepayment credits" in msg
    )


def _gemini_unavailable_message(exc: Exception) -> str:
    if _is_credit_depleted_error(exc):
        return (
            "Gemini is currently unavailable because your Gemini API project has depleted its prepayment credits. "
            "Top up/enable billing in AI Studio, then retry."
        )
    return f"Gemini is currently unavailable: {str(exc)}"

SYSTEM_PROMPT = """You are a senior Kenyan civil engineer and land legal consultant with 20 years of experience in Nairobi and peri-urban Kenya. You write clear, direct risk assessments that diaspora investors and first-time buyers can act on immediately.

KENYAN LAW CONTEXT (apply to every report):
- EMCA 2015: 30-metre riparian reserve from highest water mark — no development permitted
- Physical & Land Use Planning Act 2019: 15m road reserve for primary roads, 7.5m for secondary
- Land Registration Act 2012 Section 34: title searches mandatory before purchase
- KCAA: height restrictions within 5km JKIA, 3km Wilson Airport
- Kenya Power: LV extension ~KES 800-1,500 per metre beyond nearest pole
- NCA building codes: require soil investigation report before foundation design

SOIL TYPES BY NAIROBI AREA (use for foundation cost estimates):
- Westlands, Pangani, Ruiru, Thika Road, Kasarani: Black cotton soil (vertisols) — HIGH shrink-swell — raft or piled foundation required — add KES 800K-1.5M to foundation budget
- Karen, Langata, Ngong Road, Lavington, Kilimani: Red laterite (murram) — MODERATE — strip or pad foundation adequate
- Kiambu, Limuru, Tigoni, Kikuyu: Volcanic rock/clay — excavation cost HIGH but good bearing capacity once past topsoil
- Athi River, Mlolongo, Syokimau, Kitengela: Alluvial deposits — variable — soil test MANDATORY
- Eastlands (Umoja, Donholm, Embakasi): Mix — generally moderate bearing capacity

ZONING RULES BY AREA (approximate, always verify with county):
- Westlands, Kilimani, Upper Hill: commercial/mixed use, high FAR
- Karen, Runda, Muthaiga: low-density residential, 2-storey max without variance
- Thika Road corridor, Ruiru, Juja: industrial and residential mixed — verify with Kiambu County
- Satellite towns (Kitengela, Ongata Rongai, Ngong): often still agricultural zone despite residential sales — change of user needed

Respond ONLY with a valid JSON object. No preamble, no markdown fences. Match this schema exactly."""

REPORT_SCHEMA = """{
  "overall_risk_score": <integer 1-100>,
  "overall_risk_label": <"LOW"|"MEDIUM"|"HIGH"|"CRITICAL">,
  "executive_summary": <2 sentences max — lead with the single biggest risk>,
  "investment_verdict": <"PROCEED WITH CAUTION"|"DO NOT PROCEED WITHOUT LEGAL CLEARANCE"|"SAFE TO PROCEED TO DUE DILIGENCE"|"HIGH RISK — SEEK ALTERNATIVES">,
  "estimated_land_value_context": <1 sentence on whether the plot is in a high/mid/low value zone and typical price range per acre in KES>,
  "sections": [
    {"id": "legal", "title": "Legal & Regulatory Risk", "risk_level": <"low"|"medium"|"high"|"critical">, "body": <str>},
    {"id": "topography", "title": "Topography & Foundation Cost", "risk_level": <str>, "body": <str>, "estimated_foundation_cost_kes": <integer — foundation cost premium in KES, 0 if flat/good soil>},
    {"id": "environmental", "title": "Environmental & Flood Risk", "risk_level": <str>, "body": <str>},
    {"id": "infrastructure", "title": "Infrastructure & Development Cost", "risk_level": <str>, "body": <str>, "estimated_grid_connection_cost_kes": <integer>},
    {"id": "zoning", "title": "Zoning & Development Rights", "risk_level": <str>, "body": <2 paragraphs: what can likely be built here, what permits are needed, which county office to contact>},
    {"id": "solar", "title": "Solar & Sustainability Potential", "risk_level": "info", "body": <1 paragraph on solar suitability — Kenya has 5-6 peak sun hours at equator, estimate system size for typical 3BR house, cost KES 400K-800K for off-grid>},
    {"id": "fraud_checklist", "title": "Fraud Risk Checklist", "risk_level": <str>, "body": <list 5 specific checks the buyer MUST do before paying: title search on Ardhisasa (KES 500), confirm no caution/charge on title, verify seller ID matches title, check for double allocation, confirm land rates clearance certificate>},
    {"id": "recommendation", "title": "Next Steps", "risk_level": "info", "body": <3 specific, actionable next steps with estimated costs and contact points in Nairobi>}
  ],
  "key_flags": [<3-5 short strings, each starting with a risk category and colon>],
  "cost_summary": {
    "estimated_foundation_premium_kes": <integer>,
    "estimated_grid_connection_kes": <integer>,
    "title_search_cost_kes": 500,
    "recommended_survey_cost_kes": <integer — typically 15000-45000 for cadastral survey>,
    "total_pre_purchase_due_diligence_kes": <integer — sum of all>
  },
  "disclaimer": "Preliminary AI-generated risk indicator based on public geospatial data. Not legal or engineering advice. Always commission a registered surveyor and conduct a title search before purchase."
}"""


def synthesize_with_gemini(payload: dict) -> dict:
    """
    Call Gemini 2.5 Flash with the analysis payload and return parsed JSON report.

    Args:
        payload: The merged analysis dict from the orchestrator.

    Returns:
        Parsed JSON report dict matching the schema above.

    Raises:
        RuntimeError: If GEMINI_API_KEY is not set.
        ValueError: If Gemini returns invalid JSON after extraction attempts.
    """
    if not GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY environment variable is not set. "
            "Add it to backend/.env or your environment."
        )

    genai.configure(api_key=GEMINI_API_KEY)

    coords = payload.get("coordinates", {})
    lat = coords.get("lat", 0)
    lng = coords.get("lng", 0)

    # Build rich user message with all available data fields
    seasonal_water_str = "YES — seasonally inundated" if payload.get("seasonal_water") else "None detected"
    protected_str = "YES — WITHIN OR NEAR PROTECTED AREA — CRITICAL FLAG" if payload.get("protected_land_risk") else "None detected"
    tree_cover_str = "YES — possible forest reserve boundary nearby" if payload.get("tree_cover_flag") else "No"
    riparian_str = "YES — WITHIN BUFFER" if payload.get("riparian_breach") else "No — clear"
    road_str = "YES — encroachment" if payload.get("road_reserve_risk") else "No — clear"
    aviation_str = "YES — KCAA restricted zone" if payload.get("aviation_risk") else "No"
    water_conn_str = "Yes — within 200m" if payload.get("water_connection_nearby") else "Not detected"
    cliff_str = f"{payload.get('nearest_cliff_m')}m" if payload.get("nearest_cliff_m") else "None detected"
    grid_str = f"{payload.get('distance_to_grid_m')}m to nearest line/pole" if payload.get("distance_to_grid_m") else "None within 1km"
    moisture_flag = " (HIGH — drainage concern)" if payload.get("high_moisture_risk") else ""
    solar_str = str(payload.get("annual_sunshine_hours")) if payload.get("annual_sunshine_hours") else "Kenya standard 5.5-6.0 peak sun hours"

    payload_json = json.dumps(payload or {}, ensure_ascii=False)[:12000]

    user_message = f"""Analyse this plot:

LOCATION: {payload.get('ward', '')} ward, {payload.get('subcounty', '')} sub-county, {payload.get('county', '')} County ({lat:.5f}, {lng:.5f})
PLACE NAME: {payload.get('place_name', payload.get('neighborhood', 'Unknown'))}
ELEVATION: {payload.get('elevation_m') or 'N/A'} metres ASL
SLOPE: {payload.get('slope_percent') or 'N/A'}% (aspect: {payload.get('aspect_degrees') or 'N/A'}°)
FLOOD HISTORY (JRC): {'YES — surface water recorded' if payload.get('flood_history') else 'None detected'}
SEASONAL WATER RISK: {seasonal_water_str}
SOIL MOISTURE INDEX: {payload.get('soil_moisture') or 'N/A'}{moisture_flag}
NDVI VEGETATION: {payload.get('ndvi_score') or 'N/A'} — {payload.get('ndvi_interpretation') or 'unknown'}
LAND COVER CLASS: {payload.get('land_cover_label') or 'Unknown'} (ESA WorldCover)
PROTECTED LAND: {protected_str}
TREE COVER FLAG: {tree_cover_str}
RIPARIAN BREACH (30m): {riparian_str}
NEAREST WATERWAY: {payload.get('nearest_waterway_m') or 'None within 1km'} metres
ROAD RESERVE RISK (15m): {road_str}
NEAREST MAJOR ROAD: {payload.get('nearest_road_m') or 'N/A'} metres
NEAREST CLIFF/ESCARPMENT: {cliff_str}
POWER GRID: {grid_str}
WATER CONNECTION NEARBY: {water_conn_str}
AVIATION RESTRICTION: {aviation_str}
NEAREST AIRPORT: {payload.get('nearest_airport_km') or 'N/A'} km
SURROUNDING LAND USE: {payload.get('landuse_zone') or 'Not mapped'}
SOLAR POTENTIAL: {solar_str} hours/year
NEAREST AMENITIES: Police {payload.get('nearest_police_km') or 'N/A'}km, Hospital {payload.get('nearest_hospital_km') or 'N/A'}km, School {payload.get('nearest_school_km') or 'N/A'}km, Market {payload.get('nearest_market_km') or 'N/A'}km

FULL CONTEXT JSON (ground truth, do not ignore):
{payload_json}

Write the full risk assessment JSON now."""

    # Try models in order — keep to commonly available "flash" models.
    # If the key has access to fewer models, later ones may 404.
    MODELS_TO_TRY = ["gemini-2.5-flash", "gemini-2.0-flash"]
    raw_text = None
    last_model_error = None

    for model_name in MODELS_TO_TRY:
        try:
            print(f"[Terra AI] Trying Gemini model: {model_name}")
            model = genai.GenerativeModel(
                model_name=model_name,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                    max_output_tokens=4000,
                ),
                system_instruction=SYSTEM_PROMPT + "\n\nSchema:\n" + REPORT_SCHEMA,
            )
            response = model.generate_content(user_message)
            raw_text = response.text
            print(f"[Terra AI] Model {model_name} succeeded.")
            break
        except Exception as model_err:
            print(f"[Terra AI] Model {model_name} failed: {model_err}")
            last_model_error = model_err
            raw_text = None
            if _is_credit_depleted_error(model_err):
                break
            continue

    if raw_text is None:
        raise RuntimeError(f"All Gemini models failed. Last error: {last_model_error}")

    # Clean markdown formatting if present
    cleaned_text = raw_text.strip()
    if cleaned_text.startswith("```json"):
        cleaned_text = cleaned_text[7:]
    elif cleaned_text.startswith("```"):
        cleaned_text = cleaned_text[3:]
    if cleaned_text.endswith("```"):
        cleaned_text = cleaned_text[:-3]
    cleaned_text = cleaned_text.strip()

    # Primary: direct parse
    try:
        return json.loads(cleaned_text)
    except json.JSONDecodeError as e:
        print(f"[Terra AI] JSON Decode Error on cleaned text: {e}")
        pass

    # Fallback: extract first JSON object from response
    match = re.search(r"\{[\s\S]*\}", cleaned_text)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError as e:
            print(f"[Terra AI] JSON Decode Error on regex matched text: {e}")
            pass

    raise ValueError(
        f"Gemini returned invalid JSON. First 300 chars: {cleaned_text[:300]}"
    )


def answer_questions_with_gemini(
    *,
    question: str,
    payload: dict,
    report: dict,
    vision_summary=None,
    history=None,
) -> str:
    """Answer free-form questions about a plot using the existing Gemini key.

    The model is instructed to ground answers in the supplied payload/report.
    """
    if not GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY environment variable is not set. "
            "Add it to backend/.env or your environment."
        )

    genai.configure(api_key=GEMINI_API_KEY)

    history = history or []
    safe_history = []
    for m in history[-10:]:
        role = (m.get("role") if isinstance(m, dict) else None) or "user"
        text = (m.get("text") if isinstance(m, dict) else None) or ""
        role = "user" if role not in ("user", "assistant") else role
        if text:
            safe_history.append({"role": role, "text": str(text)[:2000]})

    context = {
        "payload": payload or {},
        "report": report or {},
        "vision_summary": vision_summary,
    }

    chat_system = (
        "You are Terra AI, a Kenyan land due-diligence assistant. "
        "Answer the user's questions using ONLY the provided context (payload/report/vision_summary). "
        "If the context doesn't contain enough information, say what is missing and what the user should verify (e.g., title search, survey, county approvals). "
        "Keep answers direct and actionable. Do not invent numbers or legal outcomes."
    )

    MODELS_TO_TRY = ["gemini-2.5-flash", "gemini-2.0-flash"]

    parts = [
        "CONTEXT (JSON):\n" + json.dumps(context, ensure_ascii=False)[:12000],
    ]
    if safe_history:
        parts.append(
            "\nRECENT CHAT:\n"
            + "\n".join(
                f"{m['role'].upper()}: {m['text']}" for m in safe_history
            )
        )
    parts.append("\nUSER QUESTION:\n" + question)

    prompt = "\n".join(parts)

    last_error: Optional[Exception] = None
    for model_name in MODELS_TO_TRY:
        try:
            model = genai.GenerativeModel(
                model_name=model_name,
                generation_config=genai.GenerationConfig(
                    response_mime_type="text/plain",
                    temperature=0.2,
                    max_output_tokens=900,
                ),
                system_instruction=chat_system,
            )
            response = model.generate_content(prompt)
            return (response.text or "").strip()
        except Exception as exc:
            last_error = exc
            if _is_credit_depleted_error(exc):
                break
            continue

    return _gemini_unavailable_message(last_error or RuntimeError("Gemini request failed"))


def answer_questions_with_gemini_safe(
    *,
    question: str,
    payload: dict,
    report: dict,
    vision_summary=None,
    history=None,
) -> str:
    """Wrapper that never raises; returns a helpful message if Gemini is unavailable."""
    try:
        return answer_questions_with_gemini(
            question=question,
            payload=payload,
            report=report,
            vision_summary=vision_summary,
            history=history,
        )
    except Exception as exc:
        return _gemini_unavailable_message(exc)

