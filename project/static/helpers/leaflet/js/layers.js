const addLeafletBasemapLayer = (map) => L.tileLayer("//tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    className: `layer-${getPreferredTheme()}`
}).addTo(map)

const getDefaultLeafletLayerStyle = (type, {
    color
} = {}) => {
    if (!color) color = generateRandomColor()
    const colorIsHSLA = color.startsWith('hsla')
    
    let h,s,l,a
    if (colorIsHSLA) [h,s,l,a] = color.split(',').map(str => parseNumberFromString(str))

    const strokeWidth = options.strokeWidth || options.weight || 1

    if (type.toLowerCase() === 'point') {
        const div = document.createElement('div')
        div.className = 'h-100 w-100 rounded-circle'
        
        const strokeColor = options.strokeColor || l ? `hsla(${h}, ${s}%, ${l/2}%, ${a})` : 'grey'
        div.style.border = `${strokeWidth}px solid ${strokeColor}`

        const backgroundColor = options.colorOpacity ? `hsla(${h}, ${s}%, ${l}%, ${options.colorOpacity})` : color
        div.style.backgroundColor = backgroundColor

        return L.divIcon({
            className: 'bg-transparent',
            iconSize: options.iconSize || [12, 12],
            html: div.outerHTML,
        });
    } else {
        let opacity = options.opacity
        if (!opacity) {
            opacity = 1
        }

        const properties = {
            color: color,
            weight: strokeWidth,
            opacity: opacity
        }

        let fillColor = options.fillColor
        if (fillColor) {
            if (typeof fillColor === 'boolean') {
                if (color.startsWith('hsla')) {
                    [h,s,l,a] = color.split(',').map(str => parseNumberFromString(str))
                    l = (l / 2 * 3)
                    fillColor = `hsla(${h}, ${s}%, ${l > 100 ? 100 : l}%, ${a})`
                } else {
                    fillColor = white
                }
            }

            const fillOpacity = options.fillOpacity || 0.25
            properties.fillOpacity = fillOpacity
            properties.fillColor = fillColor
        } else {
            properties.fillOpacity = 0
        }

        return properties
    }
}