const DESCRIPTION_BY_LABEL = {
	road:
		"Road — This is a vehicle-access corridor (paved or compacted). It impacts access planning, drainage (runoff direction), setbacks, and where heavy machinery can safely move during construction.",
	sidewalk:
		"Sidewalk — A pedestrian path typically bordering a road. It affects site access, boundary offsets, and may imply local right-of-way restrictions.",
	building:
		"Building — A constructed structure (house/wall/roof). Use it to infer nearby utilities, neighbors, and possible setback constraints; verify exact boundaries on-site.",
	wall:
		"Wall — A built vertical surface or boundary. It can indicate property edges or existing development; confirm with a survey for legal boundaries.",
	fence:
		"Fence — A boundary marker or enclosure. It can suggest property edges, but legal boundaries must be confirmed with a survey.",
	gate:
		"Gate — An entry point through a fence or wall. Useful for access planning and understanding how vehicles/people enter the property.",
	car:
		"Car — A parked or moving vehicle. This is mainly contextual: it indicates active road access and typical scale for nearby pathways.",
	truck:
		"Truck — A heavy vehicle. This suggests road capacity and construction access feasibility, but always verify ground bearing and turning radius on-site.",
	bus:
		"Bus — Public transport vehicle. This can indicate a higher-traffic roadway and potential noise/safety considerations.",
	motorcycle:
		"Motorcycle — A two-wheeled vehicle. Contextual indicator of road access and typical local traffic patterns.",
	bicycle:
		"Bicycle — A two-wheeled non-motor vehicle. Contextual indicator; may suggest nearby pedestrian/cyclist usage.",
	person:
		"Person — A human figure. Useful for rough scale; it can also indicate active use of the space.",
	bench:
		"Bench — Outdoor seating. Contextual indicator of a pedestrian-friendly area or public space nearby.",
	"traffic sign":
		"Traffic sign — Road signage. Suggests regulated traffic flow and may imply right-of-way constraints.",
	"traffic light":
		"Traffic light — Road control infrastructure. Contextual indicator of an intersection and heavier traffic.",
	"stop sign":
		"Stop sign — Road signage indicating a stop-controlled junction; suggests an intersection and traffic flow constraints.",
	"fire hydrant":
		"Fire hydrant — Emergency water access point. Useful for planning service clearances and understanding nearby utility infrastructure.",
	pole:
		"Pole — Utility or light pole. Indicates possible power/lighting infrastructure and clearance constraints.",
	"street light":
		"Street light — Roadside lighting pole. Contextual indicator of public right-of-way and nearby infrastructure.",
	tree:
		"Tree — A woody plant with a trunk and canopy. Trees can affect foundation placement, shading/solar yield, root zones, and local permitting requirements.",
	vegetation:
		"Vegetation — Grass/shrubs/plant cover. This can hint at soil moisture patterns and potential clearing requirements.",
	plant:
		"Plant — Visible plant cover (shrub/ornamental). Useful for understanding vegetation density and clearing needs.",
	grass:
		"Grass — Low vegetation cover. Can hint at soil stability and moisture conditions.",
	ground:
		"Ground — Bare soil/earth/sand. Ground conditions influence drainage, erosion risk, and the type of foundation suitable for the site.",
	sand:
		"Sand — Loose granular ground. Often has drainage implications and may require specific foundation considerations.",
	rock:
		"Rock — Exposed rock or rocky terrain. Can affect excavation, foundation design, and drainage.",
	sky:
		"Sky — Open sky region. Mostly contextual; it can help estimate openness for solar exposure but is not a buildable surface.",
	water:
		"Water — A visible water body (stream/pond). This affects setbacks, flood risk, drainage, and may introduce environmental constraints.",
	bridge:
		"Bridge — An elevated structure crossing a gap/ditch/water. Contextual indicator; may imply drainage channels or right-of-way.",
	rail:
		"Rail — Railway track or related structures. Usually implies strict right-of-way restrictions; do not build near without proper permits.",
	river:
		"River — Flowing watercourse. Important for flood risk and setback constraints; always consult local regulations.",
	pond:
		"Pond — Standing water body. Indicates drainage patterns and possible seasonal water accumulation.",
	ditch:
		"Ditch — Drainage channel. Important for stormwater management and erosion control.",
	culvert:
		"Culvert — Drainage structure under a road/path. Indicates engineered water flow routes; do not block during construction.",
}

const ALIASES = {
	street: 'road',
	highway: 'road',
	path: 'road',
	walkway: 'sidewalk',
	footpath: 'sidewalk',
	grass: 'vegetation',
	bush: 'vegetation',
	shrub: 'vegetation',
	soil: 'ground',
	dirt: 'ground',
	sand: 'ground',
	terrain: 'ground',
	house: 'building',
}

function normalizeLabel(rawLabel) {
	const label = String(rawLabel || '').trim()
	if (!label) return ''
	return label.toLowerCase()
}

export function getAnnotationDescription(rawLabel) {
	const normalized = normalizeLabel(rawLabel)
	const canonical = ALIASES[normalized] || normalized

	const exact = DESCRIPTION_BY_LABEL[canonical]
	if (exact) return exact

	// Ensure every label has a paragraph, even if we don't have a custom entry.
	const pretty = rawLabel ? String(rawLabel) : 'Unknown'
	return `${pretty} — Detected by the vision model as a relevant feature in the scene. Use this as a visual cue, but verify critical decisions (boundaries, setbacks, utilities, slope/drainage) with on-site inspection and a survey.`
}
