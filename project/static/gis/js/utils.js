const isLngLatString = (value) => {
    const coords = value.replaceAll(',', ' ').split(' ').map(i => parseFloat(i)).filter(i => !isNaN(i))
    if (coords.length !== 2) return false
    if (coords[0] > 180 || coords[0] < -180) return false
    if (coords[1] > 90 || coords[1] < -90) return false
    return coords
}