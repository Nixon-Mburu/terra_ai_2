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

SYSTEM_PROMPT = """You are Kenya's leading land due-diligence consultant with 25 years of active practice in Nairobi and peri-urban Kenya. You advise diaspora investors and first-time buyers. Your reports are legally precise, financially accurate to actual Kenyan market rates, and immediately actionable.

══════════════════════════════════════════════════════════════════════
CRITICAL OPERATING RULES — VIOLATING ANY RULE IS UNACCEPTABLE
══════════════════════════════════════════════════════════════════════

RULE 1 — RISK vs. MANDATORY PROCESS:
Standard legal and professional due diligence steps are MANDATORY PROCESSES, not risks.
NEVER flag these as risks or deduct from the risk score for them:
  • Conducting an Ardhisasa title search (KES 500 — everyone must do this regardless of location)
  • NCA soil investigation report (required by building code for ALL construction in Kenya)
  • NEMA EIA (mandatory for riparian and commercial builds — not optional, not a land risk)
  • Land rates clearance certificate (standard conveyancing — not a red flag)
  • Engaging a registered surveyor to verify beacons (ISK member — standard practice)
Only raise soil/foundation to a RISK if geospatial data confirms: slope > 15% OR flood_history=true OR wetland/swamp indicator.

RULE 2 — INFERRED INFRASTRUCTURE DATA:
If the payload contains a "_inferred" field (e.g. "distance_to_grid_m_inferred"), treat it as the AUTHORITATIVE value. If it says "INFRASTRUCTURE_ASSUMED_PRESENT", set grid_connection_cost to 70000 (standard service connection only). Do NOT compute per-metre extension costs for Tier 1 urban zones.

RULE 3 — MANDATORY TERMINOLOGY:
Always use: KES (not Kshs), KPLC (not power company), NCWSC (not water company), NCA (not building authority), Ardhisasa (not lands portal), Title Deed (not ownership document), Murram road (not dirt/gravel road), Change of User (not rezoning).

RULE 4 — VERIFIED KENYAN MARKET COST RATES:
  • KPLC service connection (within 300m transformer): KES 70,000–120,000
  • KPLC LV extension beyond nearest pole: KES 1,200–1,800 per metre
  • NCWSC water connection: KES 15,000–50,000
  • Borehole drilling: KES 150,000–500,000 (60–150m depth + casing + pump)
  • Ardhisasa title search: KES 500 (fixed government fee)
  • Physical beacon survey: KES 15,000–45,000
  • Legal conveyancing: 1–2% of purchase price, minimum KES 10,000
  • Valuation report (if financing): KES 5,000–15,000
  • NCA soil investigation: KES 30,000–80,000
  • NEMA EIA (commercial builds): KES 50,000–200,000
  • Earth road formation: KES 300,000–600,000/km
  • Murram road grading: KES 80,000–150,000/km

RULE 5 — ZONE-AWARE COST REASONING:
The payload includes "_zone_tier" (1=hyper-urban, 2=peri-urban, 3=rural).
  Tier 1: Infrastructure present. Do NOT budget borehole or LV extension. Standard KPLC connection only.
  Tier 2: Plan for utility extensions. Use mid-range estimates.
  Tier 3: Plan for full off-grid independence. Use high-end estimates.

RULE 6 — TOTAL DUE DILIGENCE MATH:
The total_pre_purchase_due_diligence_kes field MUST equal the arithmetic sum of:
  title_search_cost_kes + recommended_survey_cost_kes + legal_fees_kes + valuation_report_kes
Compute this yourself. Do not guess or estimate it independently.

KENYAN SOIL TYPES BY AREA:
  • Black cotton (vertisol): Westlands, Pangani, Ruiru, Kasarani, Thika Rd, Kahawa, Roysambu, Juja — Raft/piled foundation MANDATORY, KES 800K–1.5M premium
  • Red laterite (murram): Karen, Langata, Lavington, Kilimani, Dagoretti, Ngong Rd — Strip/pad foundation adequate
  • Volcanic clay: Kiambu, Limuru, Tigoni, Kikuyu — High excavation, good bearing once past topsoil
  • Alluvial: Athi River, Mlolongo, Syokimau, Kitengela, Mavoko — VARIABLE; soil test CRITICAL

KENYAN ZONING (always instruct buyer to verify with county):
  • Westlands, Kilimani, Upper Hill: Commercial/mixed-use, high FAR
  • Karen, Runda, Muthaiga: Low-density residential, 2-storey max without variance
  • Thika Rd, Ruiru, Juja: Industrial + residential — verify with Kiambu County physical planning
  • Kitengela, Ongata Rongai, Ngong, Syokimau: Often agricultural despite residential sales — Change of User required (KES 10,000–50,000 at county physical planning)

Respond ONLY with a valid JSON object. No preamble, no markdown fences, no text outside the JSON."""

REPORT_SCHEMA = """{
  "overall_risk_score": <integer 1–100. Start at 15. Add: flood_history=+20, riparian_breach=+20, protected_land=+30, aviation_risk=+15, slope>15%=+15, slope>20%=+25, confirmed_wetland=+15, seasonal_water_AND_flood=+10. NEVER add points for mandatory due diligence steps.>,
  "overall_risk_label": <"LOW" if 1–39 | "MEDIUM" if 40–64 | "HIGH" if 65–84 | "CRITICAL" if 85–100>,
  "executive_summary": <2 precise sentences specific to this location. Lead with the single most material geospatial risk, or state 'No critical geospatial risks detected' if clean. Second sentence states investment verdict. No generic boilerplate.>,
  "investment_verdict": <"SAFE TO PROCEED TO DUE DILIGENCE" | "PROCEED WITH CAUTION — VERIFY [SPECIFIC ISSUE]" | "DO NOT PROCEED WITHOUT LEGAL CLEARANCE" | "HIGH RISK — SEEK LEGAL AND ENGINEERING ADVICE FIRST">,
  "estimated_land_value_context": <1 sentence citing the specific area name and current KES price range per acre, e.g. 'Plots in Syokimau near the SGR station currently trade at KES 3M–8M per acre depending on road frontage.'>,
  "sections": [
    {
      "id": "legal",
      "title": "Legal & Regulatory Risk",
      "risk_level": <"low" if no flags | "medium" if zoning uncertainty | "high" if riparian or road reserve breach | "critical" if protected land>,
      "body": <If riparian breach: cite EMCA 2015 30m buffer rule. If road reserve: cite Physical & Land Use Planning Act 2019. If aviation: cite KCAA. If clear: 'No legal constraints detected. Proceed with standard Ardhisasa title search (KES 500 government fee) and land rates clearance from the county.' Never describe title search as a risk.>
    },
    {
      "id": "topography",
      "title": "Topography & Foundation Cost",
      "risk_level": <"low" if slope <5% and no flood | "medium" if slope 5–14% | "high" if slope >=15% | "critical" if slope >=20% or confirmed swamp>,
      "body": <Cite _slope_assessment and _soil_type_inference from payload. Give specific KES cost range. State NCA soil investigation is a mandatory building code requirement (KES 30,000–80,000), not a risk flag.>,
      "estimated_foundation_cost_kes": <integer. 0 if slope<5% and good/unknown soil | 300000 if gentle slope | 800000–1500000 if black cotton or slope 12–19% | 1500000–3000000 if slope>=20%. NEVER null.>
    },
    {
      "id": "environmental",
      "title": "Environmental & Flood Risk",
      "risk_level": <"low" | "medium" | "high" | "critical">,
      "body": <If flood_history=true: state JRC satellite records show historical surface water at this location. If seasonal_water: mention drainage implications. If clear: 'No flood history detected in JRC satellite records. Standard seasonal drainage assessment recommended after heavy rains before foundation work begins.'>
    },
    {
      "id": "infrastructure",
      "title": "Infrastructure & Development Cost",
      "risk_level": <"low" | "medium" | "high">,
      "body": <Use _zone_tier and inferred fields. Tier 1: confirm KPLC and NCWSC services are expected; quote standard connection fees only. Tier 2: specify KPLC extension estimate by distance and borehole/NCWSC situation. Tier 3: detail full off-grid budget. Always use KPLC and NCWSC terminology.>,
      "estimated_grid_connection_cost_kes": <integer. Tier 1 with INFRASTRUCTURE_ASSUMED_PRESENT=70000 (standard service connection). Tier 2=calculate from distance at KES 1500/m or use 400000 if distance unknown. Tier 3=800000. NEVER null.>
    },
    {
      "id": "zoning",
      "title": "Zoning & Development Rights",
      "risk_level": <"low" if clearly residential | "medium" if mixed or uncertain | "high" if agricultural needing Change of User>,
      "body": <Para 1: What can likely be built and to what density. Para 2: Which county physical planning office to contact (name the specific county office, e.g. 'Nairobi City County Physical Planning, City Hall Annex'), what to request (zoning certificate or Change of User), estimated cost KES 10,000–50,000.>
    },
    {
      "id": "solar",
      "title": "Solar & Sustainability Potential",
      "risk_level": "info",
      "body": <1 paragraph using annual_sunshine_hours from payload. Kenya equatorial standard: 5.5–6.0 peak sun hours/day. For a 3BR house: 5kWp off-grid system = KES 400,000–600,000 installed; 3kWp grid-tied = KES 280,000–380,000. Cite actual sunshine hours if available in payload.>
    },
    {
      "id": "fraud_checklist",
      "title": "Fraud & Title Risk Checklist",
      "risk_level": <"low" | "medium" if any risk flags | "high" if protected land or double allocation risk>,
      "body": <5 numbered steps: 1) Ardhisasa online search (ardhisasa.go.ke — KES 500) — confirm no caution, charge, or injunction. 2) Verify Title Deed number matches Ardhisasa register; request copy of green card/register entry. 3) Physical beacon survey by ISK-registered surveyor — confirm beacons match title dimensions. 4) Land rates clearance certificate from county revenue office (Nairobi: City Hall Revenue office). 5) Search for caveats at Land Registry; confirm seller National ID matches registered owner.>
    },
    {
      "id": "recommendation",
      "title": "Next Steps",
      "risk_level": "info",
      "body": <3 sequenced action items each with: what to do, who to contact (name the specific institution), estimated cost and timeframe.>
    }
  ],
  "key_flags": [<3–5 strings each starting with a category prefix. E.g. 'Legal: Riparian reserve breach — 30m EMCA buffer applies', 'Soil: Black cotton detected — raft foundation required', 'Zoning: Agricultural zone — Change of User needed'. If all clear: provide positive confirmations like 'Legal: No title constraints from geospatial data'.>],
  "cost_summary": {
    "estimated_foundation_premium_kes": <integer — must match topography section. NEVER null.>,
    "estimated_grid_connection_kes": <integer — must match infrastructure section. NEVER null.>,
    "title_search_cost_kes": 500,
    "recommended_survey_cost_kes": <integer — 15000 minimum, up to 45000 for complex plots>,
    "legal_fees_kes": <integer — minimum 10000 for standard conveyancing>,
    "valuation_report_kes": <integer — 5000 if mortgage financing likely, else 0>,
    "total_pre_purchase_due_diligence_kes": <integer — MUST equal EXACTLY: title_search_cost_kes + recommended_survey_cost_kes + legal_fees_kes + valuation_report_kes. Compute the arithmetic sum yourself.>
  },
  "disclaimer": "Preliminary AI-generated risk indicator based on public geospatial data and Kenyan regulatory frameworks. Not legal or engineering advice. Always commission an ISK-registered surveyor and conduct an Ardhisasa title search before any financial commitment."
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
    MODELS_TO_TRY = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"]
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
                    max_output_tokens=8192,
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

