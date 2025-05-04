const relationHandlers = (name) => {
    return {
        equals: (v1, v2, {caseSensitive=true}={}) => {
            const v1Str = String(v1)
            const v2Str = String(v2)
            if (caseSensitive) {
                return v1Str === v2Str
            } else {
                return v1Str.toLowerCase() === v2Str.toLowerCase()
            }
        },
        contains: (v1, v2, {caseSensitive=true}={}) => {
            const v1Str = String(v1)
            const v2Str = String(v2)
            if (caseSensitive) {
                return v1Str.includes(v2Str)
            } else {
                return v1Str.toLowerCase().includes(v2Str.toLowerCase())
            }
        },
        greaterThan: (v1, v2) => {
            const v1Num = Number(v1)
            const v2Num = Number(v2)
            if (isNaN(v1Num) || isNaN(v2Num)) throw new Error('NaN')
            return v1Num > v2Num
        },
        greaterThanEqualTo: (v1, v2) => {
            const v1Num = Number(v1)
            const v2Num = Number(v2)
            if (isNaN(v1Num) || isNaN(v2Num)) throw new Error('NaN')
            return v1Num >= v2Num
        },
        lessThan: (v1, v2) => {
            const v1Num = Number(v1)
            const v2Num = Number(v2)
            if (isNaN(v1Num) || isNaN(v2Num)) throw new Error('NaN')
            return v1Num < v2Num
        },
        lessThanEqualTo: (v1, v2) => {
            const v1Num = Number(v1)
            const v2Num = Number(v2)
            if (isNaN(v1Num) || isNaN(v2Num)) throw new Error('NaN')
            return v1Num <= v2Num
        },
    }[name]
}

const removeWhitespace = (str) => (str.replace(/\s{2,}/g, ' ')).trim()

const validateGeoJSONFeature = (feature, filters) => {
    if (filters.type.active && !filters.type.values[feature.geometry.type]) return false
    
    if (filters.properties.active) {
        const operator = filters.properties.operator
        const propertyFilters = Object.values(filters.properties.values)
        .filter(i => i.active && i.property && i.values?.length)

        const eval = (i) => {
            const handler = relationHandlers(i.handler)
            if (!handler) return true

            const value = (() => {
                const value = removeWhitespace(String(feature.properties[i.property] ?? '[undefined]'))
                return value === '' ? '[blank]' : value
            })()
            
            try {
                return i.values.some(v => handler(value, v, {caseSensitive:i.case}) === i.value)
            } catch (error) {
                return !i.value
            }
        }

        if (operator === '&&' && !propertyFilters.every(i => eval(i))) return false
        if (operator === '||' && !propertyFilters.some(i => eval(i))) return false
    }
        
    if (filters.geom.active) {
        const operator = filters.geom.operator
        const geomFilters = Object.values(filters.geom.values)
        .filter(i => i.active && i.geoms?.length && i.geoms.every(g => turf.booleanValid(g)))
        
        const eval = (i) => {
            const handler = turf[i.handler]
            if (!handler) return true

            try {
                return i.geoms.some(g => handler(feature.geometry, g) === i.value)
            } catch {
                return !i.value
            }
        }

        if (operator === '&&' && !geomFilters.every(i => eval(i))) return false
        if (operator === '||' && !geomFilters.some(i => eval(i))) return false
    }

    return true
}