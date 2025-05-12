const fetchGeoJSON = async (url, {abortBtns, controller} = {}) => {
    return await fetchTimeout(url, {
        abortBtns,
        controller,
        callback: parseJSONResponse
    }).catch(error => {
        console.log(error)
    })
}

const fetchFiles = async (url, {filenames, abortBtns, controller} = {}) => {
    return await fetchTimeout(url, {
        abortBtns,
        controller,
        callback: async (response) => {
            const content = await response.blob()
            const filename = url.split('/')[url.split('/').length-1]
            const file = new File([content], filename)
            if (isCompressedFile(file)) {
                const files = await getZippedFiles(file)
                return files
            } else {
                return [file]
            }
        },
    }).catch(error => {
        console.log(error)
    })
}