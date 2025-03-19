const fetchProj4Def = async (crs, {
    abortBtns,
    controller,
} = {}) => {
    const urls = [
        `/htmx/srs_wkt/${crs}/`,
        `https://spatialreference.org/ref/epsg/${crs}/ogcwkt`,
    ]

    for (const url of urls) {
        console.log(url)
        const def = await fetchTimeout(url, {
            abortBtns,
            controller,
            fetchParams: {headers: {'HX-Request': 'true'}}
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

        if (def) return def
    }

    // // const url = `https://spatialreference.org/ref/epsg/${crs}/ogcwkt`
    // return fetchTimeout(`/htmx/srs_wkt/${crs}/`, {
    //     abortBtns,
    //     controller,
    //     fetchParams: {headers: {'HX-Request': 'true'}}
    // }).then(response => {
    //     if (!response.ok && (response.status < 200 || response.status > 300)) {
    //         throw new Error('Response not ok.')
    //     }

    //     return response.text()
    // }).then(def => {
    //     const crs_text = `EPSG:${crs}`
    //     proj4.defs(crs_text, def)
    //     return proj4.defs(crs_text)
    // }).catch(error => console.error(error))
}