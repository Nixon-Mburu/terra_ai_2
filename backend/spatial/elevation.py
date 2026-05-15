"""
Elevation & Flood data fetcher — Google Maps Elevation API + GEE datasets

Uses:
  - Google Maps Elevation API for elevation + slope calculation
  - Google Earth Engine REST API:
      - JRC GSW GlobalSurfaceWater (flood occurrence + seasonality)
      - MODIS MOD13A1 (NDVI — vegetation health)
      - ESA WorldCover v200 (10m land cover classification)
      - SRTM (aspect calculation)
"""

import os
import requests

MAPS_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
GEE_KEY = (
    os.getenv("GOOGLE_EARTH_ENGINE_API_KEY")
    or os.getenv("GOOGLE_EARTH_ENGINE_API")
    or MAPS_KEY
    or ""
)

GEE_URL = "https://earthengine.googleapis.com/v1alpha/projects/earthengine-public:computeValue"

# ~50 m in degrees latitude (≈ 0.00045°)
OFFSET_LAT = 0.00045
OFFSET_LNG = 0.00045

# ESA WorldCover class labels
_ESA_LABELS = {
    10: "Tree cover",
    20: "Shrubland",
    30: "Grassland",
    40: "Cropland",
    50: "Built-up",
    60: "Bare / sparse vegetation",
    70: "Snow and ice",
    80: "Permanent water bodies",
    90: "Herbaceous wetland",
    95: "Mangroves",
    100: "Moss and lichen",
}


def fetch_elevation_data(lat: float, lng: float) -> dict:
    """
    Fetch elevation at the pin and 4 cardinal neighbours, calculate slope %.
    Also runs a JRC flood-history check via Earth Engine.

    Returns:
        {elevation_m, slope_percent, flood_history}
    """
    if not MAPS_KEY:
        print("[Terra AI] GOOGLE_MAPS_API_KEY not set — skipping elevation.")
        return {"elevation_m": None, "slope_percent": None, "flood_history": False}

    try:
        locations = "|".join([
            f"{lat},{lng}",
            f"{lat + OFFSET_LAT},{lng}",    # North
            f"{lat - OFFSET_LAT},{lng}",    # South
            f"{lat},{lng + OFFSET_LNG}",    # East
            f"{lat},{lng - OFFSET_LNG}",    # West
        ])
        url = (
            "https://maps.googleapis.com/maps/api/elevation/json"
            f"?locations={locations}&key={MAPS_KEY}"
        )
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        results = resp.json().get("results", [])

        if len(results) < 5:
            raise ValueError(f"Expected 5 elevation points, got {len(results)}")

        center = results[0]["elevation"]
        rises = [abs(results[i]["elevation"] - center) for i in range(1, 5)]
        max_rise = max(rises)
        # 50 m horizontal distance → slope %
        slope_pct = round((max_rise / 50) * 100, 1)

        # Flood history check (non-fatal)
        flood_history = False
        try:
            flood_history = _check_flood_history(lat, lng)
        except Exception as flood_err:
            print(f"[Terra AI] Flood check failed (non-fatal): {flood_err}")

        return {
            "elevation_m": round(center, 1),
            "slope_percent": slope_pct,
            "flood_history": flood_history,
        }

    except Exception as err:
        print(f"[Terra AI] Elevation fetch error: {err}")
        return {"elevation_m": None, "slope_percent": None, "flood_history": False}


def _check_flood_history(lat: float, lng: float) -> bool:
    """
    Query JRC Global Surface Water dataset via Earth Engine REST API.
    Returns True if the pixel has recorded surface water historically.
    """
    if not GEE_KEY:
        return False

    payload = {
        "expression": {
            "functionInvocationValue": {
                "functionName": "Image.sample",
                "arguments": {
                    "input": {
                        "functionInvocationValue": {
                            "functionName": "Image.select",
                            "arguments": {
                                "input": {
                                    "functionInvocationValue": {
                                        "functionName": "ImageCollection.first",
                                        "arguments": {
                                            "collection": {
                                                "functionInvocationValue": {
                                                    "functionName": "ImageCollection.load",
                                                    "arguments": {
                                                        "id": {
                                                            "constantValue": "JRC/GSW1_4/GlobalSurfaceWater"
                                                        }
                                                    },
                                                }
                                            }
                                        },
                                    }
                                },
                                "bandSelectors": {"constantValue": ["occurrence"]},
                            },
                        }
                    },
                    "region": {
                        "functionInvocationValue": {
                            "functionName": "Geometry.Point",
                            "arguments": {
                                "coordinates": {"constantValue": [lng, lat]}
                            },
                        }
                    },
                    "scale": {"constantValue": 30},
                },
            }
        }
    }

    resp = requests.post(
        GEE_URL,
        json=payload,
        params={"key": GEE_KEY},
        timeout=15,
    )
    resp.raise_for_status()
    occurrence = (
        resp.json()
        .get("result", {})
        .get("features", [{}])[0]
        .get("properties", {})
        .get("occurrence", 0)
    )
    return int(occurrence) > 0


def fetch_gee_landcover(lat: float, lng: float) -> dict:
    """
    Fetch vegetation, land cover, seasonal water, and aspect data
    from multiple GEE public datasets.

    Datasets used:
      - MODIS MOD13A1 → NDVI (vegetation health)
      - JRC GSW seasonality band → seasonal water risk
      - ESA WorldCover v200 → 10m land cover class
      - SRTM → slope aspect (direction)

    Returns:
        {
            ndvi_score, ndvi_interpretation,
            seasonal_water, land_cover_class, land_cover_label,
            wetland_risk, tree_cover_flag, aspect_degrees
        }
    """
    result = {
        "ndvi_score": None,
        "ndvi_interpretation": "unknown",
        "seasonal_water": False,
        "land_cover_class": None,
        "land_cover_label": "Unknown",
        "wetland_risk": False,
        "tree_cover_flag": False,
        "aspect_degrees": None,
    }

    if not GEE_KEY:
        print("[Terra AI] GEE key not set — skipping landcover fetch.")
        return result

    # ── NDVI via MODIS MOD13A1 ────────────────────────────────────────────────
    try:
        ndvi_payload = {
            "expression": {
                "functionInvocationValue": {
                    "functionName": "Image.reduceRegion",
                    "arguments": {
                        "input": {
                            "functionInvocationValue": {
                                "functionName": "ImageCollection.mean",
                                "arguments": {
                                    "collection": {
                                        "functionInvocationValue": {
                                            "functionName": "ImageCollection.select",
                                            "arguments": {
                                                "input": {
                                                    "functionInvocationValue": {
                                                        "functionName": "ImageCollection.filterDate",
                                                        "arguments": {
                                                            "collection": {
                                                                "functionInvocationValue": {
                                                                    "functionName": "ImageCollection.load",
                                                                    "arguments": {
                                                                        "id": {"constantValue": "MODIS/061/MOD13A1"}
                                                                    }
                                                                }
                                                            },
                                                            "start": {"constantValue": "2023-01-01"},
                                                            "end": {"constantValue": "2024-01-01"}
                                                        }
                                                    }
                                                },
                                                "bandSelectors": {"constantValue": ["NDVI"]}
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "reducer": {"functionInvocationValue": {"functionName": "Reducer.mean", "arguments": {}}},
                        "geometry": {
                            "functionInvocationValue": {
                                "functionName": "Geometry.Point",
                                "arguments": {"coordinates": {"constantValue": [lng, lat]}}
                            }
                        },
                        "scale": {"constantValue": 500}
                    }
                }
            }
        }
        resp = requests.post(GEE_URL, json=ndvi_payload, params={"key": GEE_KEY}, timeout=15)
        resp.raise_for_status()
        raw_ndvi = resp.json().get("result", {}).get("NDVI")
        if raw_ndvi is not None:
            # MODIS NDVI is scaled by 10000
            ndvi_val = float(raw_ndvi) / 10000.0
            result["ndvi_score"] = round(ndvi_val, 3)
            if ndvi_val < 0.1:
                result["ndvi_interpretation"] = "bare / possibly degraded"
            elif ndvi_val < 0.3:
                result["ndvi_interpretation"] = "sparse vegetation"
            elif ndvi_val < 0.6:
                result["ndvi_interpretation"] = "moderate vegetation"
            else:
                result["ndvi_interpretation"] = "dense vegetation"
    except Exception as exc:
        print(f"[Terra AI] NDVI fetch failed (non-fatal): {exc}")

    # ── JRC Seasonality band ──────────────────────────────────────────────────
    try:
        season_payload = {
            "expression": {
                "functionInvocationValue": {
                    "functionName": "Image.sample",
                    "arguments": {
                        "input": {
                            "functionInvocationValue": {
                                "functionName": "Image.select",
                                "arguments": {
                                    "input": {
                                        "functionInvocationValue": {
                                            "functionName": "ImageCollection.first",
                                            "arguments": {
                                                "collection": {
                                                    "functionInvocationValue": {
                                                        "functionName": "ImageCollection.load",
                                                        "arguments": {"id": {"constantValue": "JRC/GSW1_4/GlobalSurfaceWater"}}
                                                    }
                                                }
                                            }
                                        }
                                    },
                                    "bandSelectors": {"constantValue": ["seasonality"]}
                                }
                            }
                        },
                        "region": {
                            "functionInvocationValue": {
                                "functionName": "Geometry.Point",
                                "arguments": {"coordinates": {"constantValue": [lng, lat]}}
                            }
                        },
                        "scale": {"constantValue": 30}
                    }
                }
            }
        }
        resp = requests.post(GEE_URL, json=season_payload, params={"key": GEE_KEY}, timeout=15)
        resp.raise_for_status()
        seasonality = (
            resp.json()
            .get("result", {})
            .get("features", [{}])[0]
            .get("properties", {})
            .get("seasonality", 0)
        )
        result["seasonal_water"] = int(seasonality) > 3
    except Exception as exc:
        print(f"[Terra AI] Seasonality fetch failed (non-fatal): {exc}")

    # ── ESA WorldCover 10m land cover ─────────────────────────────────────────
    try:
        esa_payload = {
            "expression": {
                "functionInvocationValue": {
                    "functionName": "Image.sample",
                    "arguments": {
                        "input": {
                            "functionInvocationValue": {
                                "functionName": "ImageCollection.first",
                                "arguments": {
                                    "collection": {
                                        "functionInvocationValue": {
                                            "functionName": "ImageCollection.load",
                                            "arguments": {"id": {"constantValue": "ESA/WorldCover/v200"}}
                                        }
                                    }
                                }
                            }
                        },
                        "region": {
                            "functionInvocationValue": {
                                "functionName": "Geometry.Point",
                                "arguments": {"coordinates": {"constantValue": [lng, lat]}}
                            }
                        },
                        "scale": {"constantValue": 10}
                    }
                }
            }
        }
        resp = requests.post(GEE_URL, json=esa_payload, params={"key": GEE_KEY}, timeout=15)
        resp.raise_for_status()
        lc_class = (
            resp.json()
            .get("result", {})
            .get("features", [{}])[0]
            .get("properties", {})
            .get("Map")
        )
        if lc_class is not None:
            lc_int = int(lc_class)
            result["land_cover_class"] = lc_int
            result["land_cover_label"] = _ESA_LABELS.get(lc_int, f"Class {lc_int}")
            result["wetland_risk"] = lc_int == 90
            # Class 10 (tree cover) may indicate forest/riparian reserve
            result["tree_cover_flag"] = lc_int == 10
            # Class 80 = permanent water — also a flag
            if lc_int == 80:
                result["wetland_risk"] = True
    except Exception as exc:
        print(f"[Terra AI] ESA WorldCover fetch failed (non-fatal): {exc}")

    # ── SRTM Aspect ───────────────────────────────────────────────────────────
    try:
        aspect_payload = {
            "expression": {
                "functionInvocationValue": {
                    "functionName": "Image.reduceRegion",
                    "arguments": {
                        "input": {
                            "functionInvocationValue": {
                                "functionName": "Terrain.aspect",
                                "arguments": {
                                    "input": {
                                        "functionInvocationValue": {
                                            "functionName": "Image.load",
                                            "arguments": {"id": {"constantValue": "USGS/SRTMGL1_003"}}
                                        }
                                    }
                                }
                            }
                        },
                        "reducer": {"functionInvocationValue": {"functionName": "Reducer.mean", "arguments": {}}},
                        "geometry": {
                            "functionInvocationValue": {
                                "functionName": "Geometry.Point",
                                "arguments": {"coordinates": {"constantValue": [lng, lat]}}
                            }
                        },
                        "scale": {"constantValue": 30}
                    }
                }
            }
        }
        resp = requests.post(GEE_URL, json=aspect_payload, params={"key": GEE_KEY}, timeout=15)
        resp.raise_for_status()
        aspect = resp.json().get("result", {}).get("aspect")
        if aspect is not None:
            result["aspect_degrees"] = round(float(aspect), 1)
    except Exception as exc:
        print(f"[Terra AI] Aspect fetch failed (non-fatal): {exc}")

    return result
