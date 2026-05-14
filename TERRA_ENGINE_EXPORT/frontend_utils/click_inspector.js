function isFiniteNumber(n) {
	return typeof n === 'number' && Number.isFinite(n)
}

export function pointInPolygon(point, polygon) {
	if (!point || !Array.isArray(polygon) || polygon.length < 3) return false
	const x = point[0]
	const y = point[1]
	if (!isFiniteNumber(x) || !isFiniteNumber(y)) return false

	// Ray casting algorithm
	let inside = false
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const xi = Number(polygon[i]?.[0])
		const yi = Number(polygon[i]?.[1])
		const xj = Number(polygon[j]?.[0])
		const yj = Number(polygon[j]?.[1])
		if (!isFiniteNumber(xi) || !isFiniteNumber(yi) || !isFiniteNumber(xj) || !isFiniteNumber(yj)) continue

		const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi
		if (intersect) inside = !inside
	}
	return inside
}

function clamp(min, value, max) {
	return Math.max(min, Math.min(max, value))
}

function bboxContainsPoint(box, x, y, padding = 0) {
	if (!Array.isArray(box) || box.length !== 4) return false
	const x1 = Number(box[0])
	const y1 = Number(box[1])
	const x2 = Number(box[2])
	const y2 = Number(box[3])
	if (![x1, y1, x2, y2].every(isFiniteNumber)) return false
	const left = Math.min(x1, x2) - padding
	const right = Math.max(x1, x2) + padding
	const top = Math.min(y1, y2) - padding
	const bottom = Math.max(y1, y2) + padding
	return x >= left && x <= right && y >= top && y <= bottom
}

function bboxCenter(box) {
	const x1 = Number(box?.[0])
	const y1 = Number(box?.[1])
	const x2 = Number(box?.[2])
	const y2 = Number(box?.[3])
	if (![x1, y1, x2, y2].every(isFiniteNumber)) return null
	return [(x1 + x2) / 2, (y1 + y2) / 2]
}

function sqDist(a, b) {
	const dx = a[0] - b[0]
	const dy = a[1] - b[1]
	return dx * dx + dy * dy
}

export function pickInstanceAtImagePoint({ instances, x, y }) {
	const list = Array.isArray(instances) ? instances : []
	if (!list.length || !isFiniteNumber(x) || !isFiniteNumber(y)) return null

	// 1) Precise hit test on segmentation polygons (best match)
	for (let i = 0; i < list.length; i++) {
		const inst = list[i]
		const poly = inst?.mask_polygon
		if (Array.isArray(poly) && poly.length >= 3 && pointInPolygon([x, y], poly)) {
			return inst
		}
	}

	// 2) Fallback: bbox contains point (slight padding to be user-friendly)
	for (let i = 0; i < list.length; i++) {
		const inst = list[i]
		if (bboxContainsPoint(inst?.box_xyxy, x, y, 6)) return inst
	}

	// 3) Fallback: nearest bbox center
	let best = null
	let bestD = Infinity
	for (let i = 0; i < list.length; i++) {
		const inst = list[i]
		const c = bboxCenter(inst?.box_xyxy)
		if (!c) continue
		const d = sqDist(c, [x, y])
		if (d < bestD) {
			bestD = d
			best = inst
		}
	}
	return best
}

export function estimateDistanceMeters({ instance, imageHeight }) {
	// Heuristic only (no depth sensor): infer relative distance from apparent object size.
	// Larger bbox height => likely closer.
	const h = Number(imageHeight)
	const box = instance?.box_xyxy
	if (!isFiniteNumber(h) || !Array.isArray(box) || box.length !== 4) return null
	const y1 = Number(box[1])
	const y2 = Number(box[3])
	if (!isFiniteNumber(y1) || !isFiniteNumber(y2)) return null
	const boxH = Math.max(1, Math.abs(y2 - y1))

	// Tuned to feel plausible across typical land photos.
	const ratio = clamp(0.02, boxH / h, 0.95)
	const meters = 45 * (1 / ratio) * 0.06
	return clamp(1, Math.round(meters), 250)
}

export function computeDottedPathPoints({ from, to, spacingPx = 22 }) {
	if (!from || !to) return []
	const x1 = Number(from.x)
	const y1 = Number(from.y)
	const x2 = Number(to.x)
	const y2 = Number(to.y)
	if (![x1, y1, x2, y2].every(isFiniteNumber)) return []

	const dx = x2 - x1
	const dy = y2 - y1
	const len = Math.sqrt(dx * dx + dy * dy)
	if (!len || !Number.isFinite(len)) return []

	const step = Math.max(8, Number(spacingPx) || 22)
	const count = Math.max(2, Math.floor(len / step) + 1)
	const pts = []
	for (let i = 0; i < count; i++) {
		const t = count === 1 ? 1 : i / (count - 1)
		pts.push({ x: x1 + dx * t, y: y1 + dy * t })
	}
	return pts
}
