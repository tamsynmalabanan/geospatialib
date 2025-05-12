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

        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
            try {
                return parseJSONResponse(response)
            } catch {
                throw new Error('Failed to parse JSON.')
            }
        }

        const contentDisposition = response.headers.get('Content-Disposition')
        console.log(contentDisposition)
        if (contentDisposition && contentDisposition.includes('attachment')) {
            console.log('This response is a downloadable file.')
        } else {
            console.log('This response is not a downloadable file.')
        }

    }).then(data => {
        return data
    }).catch(error => {
        console.log(error)
    })
}