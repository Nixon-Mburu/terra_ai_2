// src/utils/analyzeUtils.js
// Copied from TERRA_ENGINE_EXPORT/frontend_utils/analyzeUtils.js
// DO NOT MODIFY — engine-provided utility

export const EXPORT_LOADING_STEPS = [
	'Analyzing conversation',
	'Synthesizing project info',
	'Preparing Terra AI Document',
]

export const ANNO_COLORS = ['rgba(88, 118, 196, 1)', 'rgba(26, 143, 77, 1)', 'rgba(215, 168, 92, 1)']

export const MAX_VISIBLE_ANNOTATIONS = 250

export const FALLBACK_LOCATION_CANDIDATES = [
	{
		id: 'nairobi',
		name: 'Nairobi',
		region: 'Nairobi County, Kenya',
		country: 'Kenya',
		latitude: -1.286389,
		longitude: 36.817223,
		overview: 'Nairobi is Kenya\'s capital with fast-moving development approvals, utilities, and high land demand in most suburbs.',
		wikiTitle: 'Nairobi',
	},
	{
		id: 'mombasa',
		name: 'Mombasa',
		region: 'Mombasa County, Kenya',
		country: 'Kenya',
		latitude: -4.043477,
		longitude: 39.668206,
		overview: 'Mombasa is Kenya\'s coastal hub with marine setbacks, coastal flooding considerations, and high-value tourism corridors.',
		wikiTitle: 'Mombasa',
	},
	{
		id: 'kisumu',
		name: 'Kisumu',
		region: 'Kisumu County, Kenya',
		country: 'Kenya',
		latitude: -0.091702,
		longitude: 34.767956,
		overview: 'Kisumu sits on Lake Victoria; drainage, seasonal water, and wetlands are common due diligence considerations.',
		wikiTitle: 'Kisumu',
	},
	{
		id: 'nakuru',
		name: 'Nakuru',
		region: 'Nakuru County, Kenya',
		country: 'Kenya',
		latitude: -0.303099,
		longitude: 36.080025,
		overview: 'Nakuru is a fast-growing Rift Valley city; terrain slope and escarpment-adjacent plots can affect foundation costs.',
		wikiTitle: 'Nakuru',
	},
	{
		id: 'eldoret',
		name: 'Eldoret',
		region: 'Uasin Gishu County, Kenya',
		country: 'Kenya',
		latitude: 0.514277,
		longitude: 35.26978,
		overview: 'Eldoret is a high-altitude growth center with expanding residential estates and mixed-use peri-urban land.',
		wikiTitle: 'Eldoret',
	},
	{
		id: 'kajiado',
		name: 'Kajiado',
		region: 'Kajiado County, Kenya',
		country: 'Kenya',
		latitude: -1.852378,
		longitude: 36.77684,
		overview: 'Kajiado is a semi-arid region south of Nairobi with rapid subdivision activity; verify zoning, access roads, and services carefully.',
		wikiTitle: 'Kajiado',
	},
]

export const LOCATION_HISTORY_KEY = 'terra-image-location-history'

export function getLocationSearchHint(sourceType) {
	if (sourceType === 'camera') {
		return 'Camera capture uses the current GPS position from this device.'
	}
	return 'Uploaded images try photo GPS metadata first, then offer current GPS + potential Kenya areas for confirmation.'
}

export function getBrowserPosition() {
	return new Promise((resolve, reject) => {
		if (!navigator.geolocation) {
			reject(new Error('Geolocation is not available in this browser.'))
			return
		}
		navigator.geolocation.getCurrentPosition(
			(position) => resolve(position),
			(error) => reject(error),
			{ enableHighAccuracy: true, timeout: 9000, maximumAge: 1000 * 60 * 5 },
		)
	})
}

export async function fetchWikiSummary(title) {
	if (!title) return null
	const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
	const response = await fetch(url)
	if (!response.ok) return null
	const payload = await response.json()
	return {
		imageUrl: payload?.thumbnail?.source || payload?.originalimage?.source || '',
		overview: payload?.extract || '',
		wikiUrl: payload?.content_urls?.desktop?.page || '',
	}
}

export async function enrichLocationCandidates(candidates) {
	const seen = new Set()
	const enriched = await Promise.all(
		candidates.filter((candidate) => {
			const key = String(candidate.name || '').trim().toLowerCase()
			if (!key || seen.has(key)) return false
			seen.add(key)
			return true
		}).map(async (candidate) => {
			try {
				const wiki = await fetchWikiSummary(candidate.wikiTitle || candidate.name)
				return {
					...candidate,
					imageUrl: wiki?.imageUrl || candidate.imageUrl || '',
					overview: wiki?.overview || candidate.overview,
					wikiUrl: wiki?.wikiUrl || candidate.wikiUrl || '',
				}
			} catch {
				return { ...candidate }
			}
		}),
	)
	return enriched
}

export function readLocationHistory() {
	try {
		const raw = window.localStorage.getItem(LOCATION_HISTORY_KEY)
		const parsed = JSON.parse(raw || '[]')
		return Array.isArray(parsed) ? parsed.slice(0, 6) : []
	} catch {
		return []
	}
}

export function writeLocationHistory(entry) {
	try {
		const current = readLocationHistory()
		const key = String(entry?.name || '').trim().toLowerCase()
		const next = [
			entry,
			...current.filter((item) => String(item?.name || '').trim().toLowerCase() !== key),
		].filter((item) => item?.name).slice(0, 6)
		window.localStorage.setItem(LOCATION_HISTORY_KEY, JSON.stringify(next))
		return next
	} catch {
		return []
	}
}

export async function reverseGeocodePosition({ latitude, longitude }) {
	try {
		const response = await fetch(
			`/api/location/reverse?lat=${encodeURIComponent(latitude)}&lng=${encodeURIComponent(longitude)}`,
		)
		const payload = await response.json()
		const first = payload?.results?.[0]
		if (first) {
			const parts = first.address_components || []
			const pick = (types) => parts.find((part) => types.every((type) => part.types?.includes(type)))?.long_name
			return {
				formatted: first.formatted_address,
				locality: pick(['locality']) || pick(['administrative_area_level_2']),
				region: pick(['administrative_area_level_1']) || pick(['administrative_area_level_2']),
				country: pick(['country']),
				latitude,
				longitude,
			}
		}
	} catch {
		// Fall through to the public reverse-geocode fallback below.
	}

	const response = await fetch(
		`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&zoom=10&addressdetails=1`,
	)
	const payload = await response.json()
	const address = payload?.address || {}
	return {
		formatted: payload?.display_name || '',
		locality: address.city || address.town || address.village || address.county || '',
		region: address.state || address.county || '',
		country: address.country || '',
		latitude,
		longitude,
	}
}

export function buildCandidatesFromGeocode(geocode) {
	const seen = new Set()
	const fresh = [geocode?.locality, geocode?.region]
		.filter(Boolean)
		.map((name, idx) => ({
			id: `gps-${idx}-${name}`,
			name,
			region: [geocode?.region, geocode?.country].filter(Boolean).join(', '),
			country: geocode?.country || 'Kenya',
			latitude: geocode?.latitude,
			longitude: geocode?.longitude,
			overview: `This candidate came from the device GPS clue. Terra should ask the user to confirm before treating it as the image location.`,
			wikiTitle: name,
		}))

	const history = (geocode?.history || [])
		.filter((item) => item?.name)
		.map((item, idx) => ({
			id: `history-${idx}-${item.name}`,
			name: item.name,
			region: item.region || item.formatted || 'Recent Terra GPS search',
			country: item.country || 'Kenya',
			latitude: item.latitude,
			longitude: item.longitude,
			overview: `This candidate came from recent Terra GPS searches on this browser and should be confirmed before Terra uses it as the image location.`,
			wikiTitle: item.name,
		}))

	const dynamic = [...fresh, ...history]
		.filter((candidate) => {
			const key = candidate.name.toLowerCase()
			if (seen.has(key)) return false
			seen.add(key)
			return true
		})

	return [...dynamic, ...FALLBACK_LOCATION_CANDIDATES].slice(0, 6)
}

export function getInstanceLabel(inst) {
	const label =
		inst?.class_name ??
		inst?.label ??
		inst?.name ??
		inst?.className ??
		inst?.category ??
		inst?.class
	if (typeof label === 'string' && label.trim()) return label.trim()
	if (typeof label === 'number' && Number.isFinite(label)) return `Class ${label}`

	const classId = inst?.class_id ?? inst?.classId ?? inst?.category_id ?? inst?.categoryId
	if (typeof classId === 'number' && Number.isFinite(classId)) return `Class ${classId}`

	return 'Object'
}

export function getInstanceConfidence(inst) {
	const conf =
		inst?.confidence ??
		inst?.score ??
		inst?.prob ??
		inst?.probability
	return typeof conf === 'number' && Number.isFinite(conf) ? conf : 0
}

export function getOrderedInstances(visionResult) {
	const raw = Array.isArray(visionResult?.instances) ? visionResult.instances : []
	const withIndex = raw.map((inst, idx) => ({ inst, idx }))
	withIndex.sort((a, b) => {
		const aSource = String(a.inst?.source || '') === 'yolo' ? 0 : 1
		const bSource = String(b.inst?.source || '') === 'yolo' ? 0 : 1
		if (aSource !== bSource) return aSource - bSource
		const confDelta = getInstanceConfidence(b.inst) - getInstanceConfidence(a.inst)
		if (confDelta) return confDelta
		return a.idx - b.idx
	})
	return withIndex.map((x) => x.inst)
}

export function polygonToPath(points) {
	if (!Array.isArray(points) || points.length < 3) return ''
	let d = ''
	for (let i = 0; i < points.length; i++) {
		const pt = points[i]
		if (!Array.isArray(pt) || pt.length < 2) continue
		const x = Number(pt[0])
		const y = Number(pt[1])
		if (!Number.isFinite(x) || !Number.isFinite(y)) continue
		d += `${i === 0 ? 'M' : 'L'} ${x} ${y} `
	}
	return d ? `${d}Z` : ''
}
