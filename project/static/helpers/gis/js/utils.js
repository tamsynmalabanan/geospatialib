const ddToDMS = (decimalDegrees, precision=2) => {
    let degrees = Math.floor(Math.abs(decimalDegrees))
    let minutesFloat = (Math.abs(decimalDegrees) - degrees) * 60
    let minutes = Math.floor(minutesFloat)
    let seconds = (minutesFloat - minutes) * 60
  
    seconds = parseFloat(seconds.toFixed(precision))
  
    return {
        degrees: degrees,
        minutes: minutes,
        seconds: seconds,
        toString: () => `${degrees}°${minutes}'${seconds}"`
    }
}

const loopThroughCoordinates = (coordinates, handler) => {
    if (Object.keys(coordinates).every(key => Array('lat', 'lng').includes(key))) {
        handler(coordinates)
    } else if (Array.isArray(coordinates) && coordinates.every(item => typeof item === 'number')) {
        handler(coordinates)
    } else {
        Object.values(coordinates).forEach(value => loopThroughCoordinates(value, handler))
    }
    return coordinates
}

const isBbox = (value) => /^\[\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*\]$/.test(value)

const isLngLatString = (value) => {
    const coords = value.replaceAll(',', ' ').split(' ').map(i => parseFloat(i)).filter(i => !isNaN(i))
    if (coords.length !== 2) return false
    if (coords[0] > 180 || coords[0] < -180) return false
    if (coords[1] > 90 || coords[1] < -90) return false
    return coords
}