const fetchGeoJSON = async (url, {abortBtns, controller} = {}) => {
    return await fetchTimeout(url, {
        abortBtns,
        controller,
        callback: parseJSONResponse
    }).catch(error => {
        console.log(error)
    })
}

const fetchFileData = async (url, {filenames=[], abortBtns, controller} = {}) => {
    return await fetchTimeout(url, {
        abortBtns,
        controller,
        callback: async (response) => {
            const content = await response.blob()
            const filename = url.split('/')[url.split('/').length-1]
            const file = new File([content], filename)
            
            let files = [file]
            if (isCompressedFile(file)) {
                files = await getZippedFiles(file)
            }

            if (filenames?.length) {
                return files.filter(file => filenames.includes(file.name))
            } else {
                return files
            }
        },
    }).catch(error => {
        console.log(error)
    })
}