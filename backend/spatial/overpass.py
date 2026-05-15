"""
Overpass API fetcher — expanded query with fallback instances and retry logic.

Changes from original:
- 3 Overpass instance URLs with automatic fallback on failure
- Comprehensive QL query covering water, roads, power, aviation, protected land,
  landuse zones, amenities, infrastructure, and hazards
- Returns raw_elements alongside categorised lists for shapely_engine consumption
"""

import requests

OVERPASS_INSTANCES = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]

RADIUS_M = 1000     # 1 km radius for most features
AERO_RADIUS_M = 8000  # 8 km radius for aerodromes (covers both Nairobi airports)


def fetch_overpass_data(lat: float, lng: float) -> dict:
    """
    Execute a batched Overpass QL query for all risk-relevant OSM features
    around the given coordinates. Tries multiple Overpass instances on failure.

    Returns a dict with keys:
        waterways, highways, power_lines, substations, power_poles, aerodromes,
        raw_elements
    """
    query = f"""
[out:json][timeout:30];
(
  // WATER — riparian risk
  way["waterway"~"river|stream|canal|drain|ditch"](around:{RADIUS_M},{lat},{lng});
  relation["waterway"~"river|stream"](around:{RADIUS_M},{lat},{lng});
  way["natural"~"water|wetland|riverbank"](around:{RADIUS_M},{lat},{lng});
  way["landuse"="basin"](around:{RADIUS_M},{lat},{lng});

  // ROADS — road reserve risk
  way["highway"~"trunk|primary|secondary|tertiary|motorway|unclassified"](around:{RADIUS_M},{lat},{lng});

  // POWER — expanded for LV distribution network (more common in OSM than HV lines)
  way["power"="line"](around:{RADIUS_M},{lat},{lng});
  way["power"="minor_line"](around:{RADIUS_M},{lat},{lng});
  way["power"="cable"](around:{RADIUS_M},{lat},{lng});
  node["power"="substation"](around:{RADIUS_M},{lat},{lng});
  node["power"="transformer"](around:{RADIUS_M},{lat},{lng});
  node["power"="pole"](around:{RADIUS_M},{lat},{lng});
  node["power"="tower"](around:{RADIUS_M},{lat},{lng});

  // AVIATION
  node["aeroway"="aerodrome"](around:{AERO_RADIUS_M},{lat},{lng});
  way["aeroway"="aerodrome"](around:{AERO_RADIUS_M},{lat},{lng});

  // LAND USE — zoning context
  way["landuse"~"residential|commercial|industrial|retail|farmland|forest|meadow|recreation_ground|cemetery|allotments"](around:{RADIUS_M},{lat},{lng});

  // PROTECTED LAND — critical flag
  way["boundary"~"protected_area|national_park|forest_reserve"](around:{RADIUS_M},{lat},{lng});
  relation["boundary"~"protected_area|national_park|forest_reserve"](around:{RADIUS_M},{lat},{lng});
  way["leisure"~"nature_reserve|park"](around:{RADIUS_M},{lat},{lng});

  // AMENITIES — value context
  node["amenity"~"school|hospital|clinic|police|bank|marketplace|market"](around:{RADIUS_M},{lat},{lng});
  node["amenity"="fuel"](around:{RADIUS_M},{lat},{lng});

  // INFRASTRUCTURE — development context
  node["amenity"="water_point"](around:{RADIUS_M},{lat},{lng});
  way["man_made"="pipeline"](around:{RADIUS_M},{lat},{lng});
  node["man_made"="water_tower"](around:{RADIUS_M},{lat},{lng});

  // HAZARDS
  way["natural"~"cliff|escarpment"](around:{RADIUS_M},{lat},{lng});
  way["geological"="fault"](around:{RADIUS_M},{lat},{lng});
);
out geom;
"""

    last_error = None
    for instance in OVERPASS_INSTANCES:
        try:
            response = requests.post(
                instance,
                data={"data": query},
                timeout=25,
                headers={"Accept": "application/json"},
            )
            response.raise_for_status()
            elements = response.json().get("elements", [])
            return _categorise(elements)
        except Exception as exc:
            print(f"[Terra AI] Overpass instance {instance} failed: {exc}, trying next…")
            last_error = exc
            continue

    # All instances failed — return graceful empty result
    print(f"[Terra AI] All Overpass instances failed. Last error: {last_error}")
    return {
        "waterways": [],
        "highways": [],
        "power_lines": [],
        "substations": [],
        "power_poles": [],
        "aerodromes": [],
        "raw_elements": [],
    }


def _categorise(elements: list) -> dict:
    """Bucket raw Overpass elements into named lists for the shapely engine."""

    def tag_match(el, key, value):
        return el.get("tags", {}).get(key) == value

    def tag_in(el, key):
        return key in el.get("tags", {})

    def tag_value_in(el, key, values):
        return el.get("tags", {}).get(key) in values

    waterway_types = {"river", "stream", "canal", "drain", "ditch"}
    return {
        "waterways": [
            e for e in elements
            if tag_in(e, "waterway") and e.get("tags", {}).get("waterway") in waterway_types
            or tag_value_in(e, "natural", {"water", "wetland", "riverbank"})
            or tag_match(e, "landuse", "basin")
        ],
        "highways": [e for e in elements if tag_in(e, "highway")],
        "power_lines": [e for e in elements if e.get("tags", {}).get("power") in ("line", "minor_line", "cable")],
        "substations": [e for e in elements if e.get("tags", {}).get("power") == "substation"],
        "power_poles": [e for e in elements if e.get("tags", {}).get("power") in ("pole", "tower", "transformer")],
        "aerodromes": [e for e in elements if tag_match(e, "aeroway", "aerodrome")],
        "raw_elements": elements,
    }
