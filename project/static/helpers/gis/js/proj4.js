const fetchProj4Def = async (crs, {
    abortBtns,
    controller,
} = {}) => {
    const url = `https://spatialreference.org/ref/epsg/${crs}/ogcwkt`
    return fetchTimeout(url, {
        abortBtns,
        controller,
    }).then(response => {
        if (!response.ok && (response.status < 200 || response.status > 300)) {
            throw new Error('Response not ok.')
        }

        return response.text()
    }).then(def => {
        const crs_text = `EPSG:${crs}`
        proj4.defs(crs_text, def)
        return proj4.defs(crs_text)
    }).catch(error => console.error(error))
}