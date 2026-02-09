const isLngLatString = (value) => {
    const coords = value.replaceAll(',', ' ').split(' ').map(i => parseFloat(i)).filter(i => !isNaN(i))
    if (coords.length !== 2) return false
    if (coords[0] > 180 || coords[0] < -180) return false
    if (coords[1] > 90 || coords[1] < -90) return false
    return coords
}

const normalizeBbox = (bbox) => {
  if (!Array.isArray(bbox) || bbox.length !== 4) {
    throw new Error("bbox must be an array of [west, south, east, north]")
  }

  let [w, s, e, n] = bbox

  w = Math.max(-180, Math.min(180, w));
  e = Math.max(-180, Math.min(180, e));

  s = Math.max(-90, Math.min(90, s));
  n = Math.max(-90, Math.min(90, n));

  return [w, s, e, n]
}
