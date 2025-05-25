const fetchProj4Def = async (crs, {
    abortBtns,
    controller,
} = {}) => {
    const srid = crs.split(':')[crs.split(':').length-1]
    for (const url of [
        `/htmx/srs_wkt/${srid}/`,
        `https://spatialreference.org/ref/epsg/${srid}/ogcwkt`,
    ]) {
        const def = await fetchTimeout(url, {
            abortBtns,
            controller,
            callback: (response) => {
                const def = response.text()
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