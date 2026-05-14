"""
Shapely-based spatial risk engine — port of terra_ai_demo1/server/services/turfEngine.js

Key conversions from Turf.js:
  - turf.lineString + turf.buffer(30, 'meters')  →  LineString.buffer(30 / DEG_PER_METER)
  - turf.booleanPointInPolygon                   →  Point.within(polygon)
  - turf.nearestPointOnLine + turf.distance       →  nearest_points(line, point)
  - turf.distance(a, b, 'meters')                →  haversine_meters(a, b)

Coordinate convention throughout: (lon, lat) for Shapely (GIS standard).
"""

import math
from shapely.geometry import LineString, Point, Polygon
from shapely.ops import nearest_points

# 1 degree of latitude ≈ 111,320 m.  For small distances this approximation
# is accurate enough (within 0.5% error at 50 m scale).
METERS_PER_DEG = 111_320.0

# Hardcoded Nairobi-area airports with CORRECTED coordinates.
# Section 3C fix: the previous entries had JKIA and Wilson swapped.
#   JKIA (Jomo Kenyatta International): -1.3192, 36.9275 — east of Nairobi
#   Wilson Airport (Langata):           -1.3217, 36.8155 — west of Nairobi
_NAIROBI_AIRPORTS = [
    {"lat": -1.3192, "lng": 36.9275, "restrict_km": 5.0},   # JKIA (Embakasi)
    {"lat": -1.3217, "lng": 36.8155, "restrict_km": 3.0},   # Wilson Airport (Langata)
]


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in metres between two WGS-84 points."""
    R = 6_371_000  # Earth radius in metres
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _way_coords(way: dict) -> list[tuple[float, float]] | None:
    """Extract [(lon, lat), ...] from an Overpass 'way' element."""
    geom = way.get("geometry")
    if not geom or len(geom) < 2:
        return None
    return [(node["lon"], node["lat"]) for node in geom]


def compute_risks(lat: float, lng: float, overpass_data: dict) -> dict:
    """
    Run all spatial risk checks for the given pin coordinates.

    Args:
        lat, lng: Pin coordinates in WGS-84.
        overpass_data: Categorised Overpass response from overpass.fetch_overpass_data().

    Returns:
        dict with keys:
            riparian_breach, nearest_waterway_m,
            road_reserve_risk, nearest_road_m,
            distance_to_grid_m,
            aviation_risk, nearest_airport_km,
            protected_land_risk, landuse_zone,
            nearest_school_km, nearest_market_km,
            water_connection_nearby, nearest_cliff_m
    """
    pin = Point(lng, lat)  # Shapely convention: (x=lon, y=lat)

    result = {
        "riparian_breach": False,
        "nearest_waterway_m": None,
        "road_reserve_risk": False,
        "nearest_road_m": None,
        "distance_to_grid_m": None,
        "aviation_risk": False,
        "nearest_airport_km": None,
        "protected_land_risk": False,
        "landuse_zone": "Not mapped",
        "nearest_school_km": None,
        "nearest_market_km": None,
        "water_connection_nearby": False,
        "nearest_cliff_m": None,
    }

    # ── 1. RIPARIAN BUFFER CHECK (30 m per Kenya EMCA) ───────────────────────
    waterways = overpass_data.get("waterways", [])
    if waterways:
        min_dist_m = float("inf")
        for way in waterways:
            coords = _way_coords(way)
            if not coords:
                continue
            try:
                line = LineString(coords)
                # Nearest point on the line, measure haversine distance
                near_pt, _ = nearest_points(line, pin)
                dist_m = _haversine_m(lat, lng, near_pt.y, near_pt.x)
                if dist_m < min_dist_m:
                    min_dist_m = dist_m
                # Buffer the line by 30 m converted to degrees
                buf_deg = 30 / METERS_PER_DEG
                buffer_poly = line.buffer(buf_deg)
                if pin.within(buffer_poly):
                    result["riparian_breach"] = True
            except Exception as exc:
                print(f"[Shapely] Waterway error: {exc}")
        if min_dist_m < float("inf"):
            result["nearest_waterway_m"] = round(min_dist_m)

    # ── 2. ROAD RESERVE CHECK (15 m per Kenya Roads Act) ────────────────────
    highways = overpass_data.get("highways", [])
    if highways:
        min_dist_m = float("inf")
        for way in highways:
            coords = _way_coords(way)
            if not coords:
                continue
            try:
                line = LineString(coords)
                near_pt, _ = nearest_points(line, pin)
                dist_m = _haversine_m(lat, lng, near_pt.y, near_pt.x)
                if dist_m < min_dist_m:
                    min_dist_m = dist_m
                buf_deg = 15 / METERS_PER_DEG
                buffer_poly = line.buffer(buf_deg)
                if pin.within(buffer_poly):
                    result["road_reserve_risk"] = True
            except Exception as exc:
                print(f"[Shapely] Highway error: {exc}")
        if min_dist_m < float("inf"):
            result["nearest_road_m"] = round(min_dist_m)

    # ── 3. POWER GRID DISTANCE ────────────────────────────────────────────────
    grid_features = overpass_data.get("power_lines", []) + overpass_data.get("substations", []) + overpass_data.get("power_poles", [])
    if grid_features:
        min_dist_m = float("inf")
        for feat in grid_features:
            try:
                if feat.get("type") == "node":
                    d = _haversine_m(lat, lng, feat["lat"], feat["lon"])
                    if d < min_dist_m:
                        min_dist_m = d
                else:
                    coords = _way_coords(feat)
                    if not coords:
                        continue
                    line = LineString(coords)
                    near_pt, _ = nearest_points(line, pin)
                    d = _haversine_m(lat, lng, near_pt.y, near_pt.x)
                    if d < min_dist_m:
                        min_dist_m = d
            except Exception as exc:
                print(f"[Shapely] Grid error: {exc}")
        if min_dist_m < float("inf"):
            result["distance_to_grid_m"] = round(min_dist_m)

    # ── 4. AVIATION / KCAA CHECK ──────────────────────────────────────────────
    # Check hardcoded Nairobi airports first
    for airport in _NAIROBI_AIRPORTS:
        dist_km = _haversine_m(lat, lng, airport["lat"], airport["lng"]) / 1000
        prev = result["nearest_airport_km"]
        if prev is None or dist_km < prev:
            result["nearest_airport_km"] = round(dist_km, 2)
        if dist_km <= airport["restrict_km"]:
            result["aviation_risk"] = True

    # Also check any OSM aerodromes found within 5 km
    for aerodrome in overpass_data.get("aerodromes", []):
        try:
            if aerodrome.get("type") == "node":
                a_lat, a_lng = aerodrome["lat"], aerodrome["lon"]
            elif aerodrome.get("center"):
                a_lat = aerodrome["center"]["lat"]
                a_lng = aerodrome["center"]["lon"]
            else:
                continue
            dist_km = _haversine_m(lat, lng, a_lat, a_lng) / 1000
            prev = result["nearest_airport_km"]
            if prev is None or dist_km < prev:
                result["nearest_airport_km"] = round(dist_km, 2)
            if dist_km <= 5.0:
                result["aviation_risk"] = True
        except Exception as exc:
            print(f"[Shapely] Aerodrome error: {exc}")

    # ── 5. PROTECTED LAND CHECK ────────────────────────────────────────────────
    raw_elements = overpass_data.get("raw_elements", [])
    protected_areas = [
        e for e in raw_elements
        if e.get("tags", {}).get("boundary") in ("protected_area", "national_park", "forest_reserve")
        or e.get("tags", {}).get("leisure") in ("nature_reserve",)
    ]
    for area in protected_areas:
        coords = _way_coords(area)
        if not coords:
            continue
        try:
            if len(coords) >= 3:
                poly = Polygon(coords)
                if pin.within(poly) or pin.distance(poly) < (100 / METERS_PER_DEG):
                    result["protected_land_risk"] = True
                    break
        except Exception:
            pass

    # ── 6. LAND USE ZONE DETECTION ───────────────────────────────────────────
    landuse_elements = [e for e in raw_elements if "landuse" in e.get("tags", {})]
    landuse_zone = "Not mapped"
    if landuse_elements:
        # Find the landuse element the pin sits within
        for el in landuse_elements:
            coords = _way_coords(el)
            if coords and len(coords) >= 3:
                try:
                    poly = Polygon(coords)
                    if pin.within(poly):
                        landuse_zone = el["tags"]["landuse"]
                        break
                except Exception:
                    pass
        if landuse_zone == "Not mapped" and landuse_elements:
            landuse_zone = landuse_elements[0].get("tags", {}).get("landuse", "Not mapped")
    result["landuse_zone"] = landuse_zone

    # ── 7. AMENITY DISTANCES ──────────────────────────────────────────────────
    for amenity_type, result_key in [
        ("school", "nearest_school_km"),
        ("marketplace", "nearest_market_km"),
        ("market", "nearest_market_km"),
    ]:
        amenity_nodes = [
            e for e in raw_elements
            if e.get("tags", {}).get("amenity") == amenity_type and e.get("type") == "node"
        ]
        if amenity_nodes and result[result_key] is None:
            min_d = min(_haversine_m(lat, lng, n["lat"], n["lon"]) for n in amenity_nodes)
            result[result_key] = round(min_d / 1000, 2)

    # ── 8. WATER CONNECTION NEARBY ────────────────────────────────────────────
    water_infra = [
        e for e in raw_elements
        if e.get("tags", {}).get("amenity") == "water_point"
        or "pipeline" in e.get("tags", {}).get("man_made", "")
        or e.get("tags", {}).get("man_made") == "water_tower"
    ]
    for node in water_infra:
        if node.get("type") == "node":
            d = _haversine_m(lat, lng, node["lat"], node["lon"])
            if d < 200:
                result["water_connection_nearby"] = True
                break

    # ── 9. CLIFF / ESCARPMENT CHECK ───────────────────────────────────────────
    cliff_elements = [
        e for e in raw_elements
        if e.get("tags", {}).get("natural") in ("cliff", "escarpment")
    ]
    for el in cliff_elements:
        coords = _way_coords(el)
        if not coords:
            continue
        try:
            line = LineString(coords)
            near_pt, _ = nearest_points(line, pin)
            d = _haversine_m(lat, lng, near_pt.y, near_pt.x)
            if result["nearest_cliff_m"] is None or d < result["nearest_cliff_m"]:
                result["nearest_cliff_m"] = round(d)
        except Exception:
            pass

    return result
