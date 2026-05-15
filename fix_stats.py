path = r'g:\Dev\Documents\USIU\Year 3\Sem 2\terra_ai_3\src\pages\Report.jsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

replacements = [
    # 1. Elevation - unconditional -> null guard
    (
        '<StatBlock icon={Mountain}  label="Elevation"     value={elevation} />',
        '{payload.elevation_m != null && <StatBlock icon={Mountain} label="Elevation" value={elevation} />}'
    ),
    # 2. Slope - unconditional -> null guard
    (
        '<StatBlock icon={Mountain}  label="Slope"         value={slope} highlight={parseFloat(payload.slope_percent) >= 12} />',
        '{payload.slope_percent != null && <StatBlock icon={Mountain} label="Slope" value={slope} highlight={parseFloat(payload.slope_percent) >= 12} />}'
    ),
    # 3. Flood Risk - unconditional -> null guard
    (
        '<StatBlock icon={Droplets}  label="Flood Risk"    value={floodStr} highlight={payload.flood_history} />',
        '{payload.flood_history != null && <StatBlock icon={Droplets} label="Flood Risk" value={floodStr} highlight={payload.flood_history} />}'
    ),
    # 4. Water Dist - unconditional -> null guard
    (
        '<StatBlock icon={Droplets}  label="Water Dist"    value={waterDist} highlight={payload.riparian_breach} />',
        '{payload.nearest_waterway_m != null && <StatBlock icon={Droplets} label="Water Dist" value={waterDist} highlight={payload.riparian_breach} />}'
    ),
    # 5. Road Dist
    (
        '<StatBlock icon={Activity}  label="Road Dist"     value={roadDist} />',
        '{payload.nearest_road_m != null && <StatBlock icon={Activity} label="Road Dist" value={roadDist} />}'
    ),
    # 6. Grid Dist
    (
        '<StatBlock icon={Zap}       label="Grid Dist"     value={gridDist} />',
        '{payload.distance_to_grid_m != null && <StatBlock icon={Zap} label="Grid Dist" value={gridDist} />}'
    ),
    # 7. Airport
    (
        '<StatBlock icon={Shield}    label="Airport"       value={airportKm} highlight={payload.aviation_risk} />',
        '{payload.nearest_airport_km != null && <StatBlock icon={Shield} label="Airport" value={airportKm} highlight={payload.aviation_risk} />}'
    ),
    # 8. Hospital
    (
        '<StatBlock icon={Building2} label="Hospital"      value={hospital} />',
        '{payload.nearest_hospital_km != null && <StatBlock icon={Building2} label="Hospital" value={hospital} />}'
    ),
    # 9. School
    (
        '<StatBlock icon={Building2} label="School"        value={school} />',
        '{payload.nearest_school_km != null && <StatBlock icon={Building2} label="School" value={school} />}'
    ),
    # 10. Vegetation - hide when unknown/empty
    (
        '<StatBlock icon={TreePine}  label="Vegetation"    value={ndvi} />',
        '{(payload.ndvi_interpretation && payload.ndvi_interpretation !== "unknown" && payload.ndvi_interpretation !== "Unknown") && <StatBlock icon={TreePine} label="Vegetation" value={String(payload.ndvi_interpretation)} />}'
    ),
    # 11. Soil Moisture
    (
        '<StatBlock icon={Droplets}  label="Soil Moisture" value={moisture} />',
        '{payload.soil_moisture != null && <StatBlock icon={Droplets} label="Soil Moisture" value={moisture} />}'
    ),
    # 12. Sunshine
    (
        '<StatBlock icon={Sun}       label="Sunshine"      value={sunshine} />',
        '{payload.annual_sunshine_hours != null && <StatBlock icon={Sun} label="Sunshine" value={sunshine} />}'
    ),
    # 13. Riparian - only show on breach
    (
        '<StatBlock icon={Shield} label="Riparian"\r\n              value={payload.riparian_breach ? \'⚠ Breach\' : \'Clear\'}\r\n              highlight={payload.riparian_breach} />',
        '{payload.riparian_breach === true && <StatBlock icon={Shield} label="Riparian" value="⚠ Breach" highlight />}'
    ),
    # 14. Protected Land - only show on risk
    (
        '<StatBlock icon={Shield} label="Protected Land"\r\n              value={payload.protected_land_risk ? \'⚠ Risk\' : \'Clear\'}\r\n              highlight={payload.protected_land_risk} />',
        '{payload.protected_land_risk === true && <StatBlock icon={Shield} label="Protected Land" value="⚠ Risk" highlight />}'
    ),
    # 15. Land Cover - hide Unknown
    (
        '{payload.land_cover_label && (\r\n              <StatBlock icon={TreePine} label="Land Cover"   value={String(payload.land_cover_label)} />\r\n            )}',
        '{(payload.land_cover_label && payload.land_cover_label !== "Unknown" && payload.land_cover_label !== "unknown") && (\n              <StatBlock icon={TreePine} label="Land Cover" value={String(payload.land_cover_label)} />\n            )}'
    ),
    # 16. Water Supply - only show when true
    (
        '{payload.water_connection_nearby != null && (\r\n              <StatBlock icon={Droplets} label="Water Supply"\r\n                value={payload.water_connection_nearby ? \'Nearby\' : \'Not mapped\'} />\r\n            )}',
        '{payload.water_connection_nearby === true && <StatBlock icon={Droplets} label="Water Supply" value="Nearby (<200m)" />}'
    ),
]

changed = 0
for old, new in replacements:
    if old in c:
        c = c.replace(old, new)
        changed += 1
        print(f'  OK: {old[:55].strip()!r}')
    else:
        # try LF version
        old_lf = old.replace('\r\n', '\n')
        if old_lf in c:
            c = c.replace(old_lf, new)
            changed += 1
            print(f'  OK(LF): {old[:55].strip()!r}')
        else:
            print(f'  MISS:   {old[:55].strip()!r}')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print(f'\nDone. {changed}/{len(replacements)} replacements applied.')
