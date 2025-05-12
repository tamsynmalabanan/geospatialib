const dataFetchHandler = (format) => {
    return {
        geojson: fetchGeoJSON,
    }[format]
}

const fetchGeoJSON = (url, {abortBtns, controller} = {}) => {
    return fetchTimeout(url, {
        abortBtns,
        controller,
    }).then(response => {
        if (!response.ok && (response.status < 200 || response.status > 300)) {
            throw new Error('Response not ok.')
        }

        console.log(response)

        const contentType = response.headers.get("content-type")
        console.log(contentType)

        if (contentType && contentType.includes("application/json")) {
            try {
                return parseJSONResponse(response)
            } catch {
                throw new Error('Failed to parse JSON.')
            }
        }

    }).then(data => {
        return data
    }).catch(error => {
        console.log(error)
    })
}