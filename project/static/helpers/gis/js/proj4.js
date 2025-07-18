const fetchProj4Def = async (crs, {
    abortBtns,
    controller,
} = {}) => {
    for (const url of [
        `/htmx/srs/wkt/${crs}/`,
        `https://spatialreference.org/ref/epsg/${crs}/ogcwkt`,
    ]) {
        const def = await fetchTimeout(url, {
            abortBtns,
            controller,
            callback: async (response) => {
                const def = await response.text()
                const crs_text = `EPSG:${crs}`
                proj4.defs(crs_text, def)
                return proj4.defs(crs_text)
            },
            fetchParams: {headers: {'HX-Request': 'true'}}
        }).catch(error => {
            console.error(error)
        })

        if (def) return def
    }
}