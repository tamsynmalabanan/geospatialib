let addDatasetBounds
let addDatasetLayerLoadErrorTimeout

const getAddDatasetSubmitBtn = () => document.querySelector('#AddDatasetModal .btn[type="submit"]')
const getAddDatasetNameField = () => document.querySelector('#AddDatasetModal [name="name"]')
const getAddDatasetMap = () => mapQuerySelector('#AddDatasetModal .leaflet-container')

const disableAddDatasetSubmitBtn = () => {
    getAddDatasetSubmitBtn().setAttribute('disabled', true)
}

const resetAddDatasetSubmitBtn = () => {
    clearTimeout(addDatasetLayerLoadErrorTimeout)
    disableAddDatasetSubmitBtn()
}

const handleAddDatasetForm = (bounds) => {
    if (bounds) {
        bounds = bounds.replace('(', '[').replace(')', ']')
        addDatasetBounds = JSON.parse(bounds)
    } else {
        addDatasetBounds = undefined
    }
    disableAddDatasetSubmitBtn()
    clearAllLayers(getAddDatasetMap())
}

const AddDatasetLayerLoaded = (event) => {
    clearTimeout(addDatasetLayerLoadErrorTimeout)

    const submitButton = getAddDatasetSubmitBtn()
    if (!addDatasetBounds) {
        submitButton.removeAttribute('disabled')
    }

    const nameField = getAddDatasetNameField()
    if (nameField.classList.contains('is-invalid')) {
        nameField.classList.remove('is-invalid')
        
        const invalidFeedback = nameField.parentElement.querySelector('.invalid-feedback')
        invalidFeedback.textContent = ''
    }
}

const AddDatasetLayerLoadError = (event) => {
    disableAddDatasetSubmitBtn()

    const nameField = getAddDatasetNameField()
    if (!nameField.classList.contains('is-invalid')) {
        nameField.classList.add('is-invalid')
        
        const invalidFeedback = nameField.parentElement.querySelector('.invalid-feedback')
        invalidFeedback.textContent = 'Layer is not loading within the current map extent. Provided the the URL and format are valid, it may load when you zoom in or span to other parts of the map.'
    }    
}

const renderAddedDatasetLayer = () => {
    const map = getAddDatasetMap()
    if (map) {
        const formElements = document.querySelector('#AddDatasetModal form').elements
        const fields = {
            layerUrl: formElements.url, 
            layerFormat: formElements.format,
            layerName: formElements.name,
        }

        if (Object.values(fields).every(field => !field.classList.contains('is-invalid') && field.value !== '')) {
            const data = {}
            for (const key in fields) {
                data[key] = fields[key].value
            }
            
            const layer = createLayerFromURL(data)
            if (layer) {
                assignLayerLoadEventHandlers(
                    layer, 
                    AddDatasetLayerLoaded,
                    AddDatasetLayerLoadError,
                )
        
                map.getLayerGroups().client.addLayer(layer)
            }
        
            if (addDatasetBounds) {
                const [minX, minY, maxX, maxY] = addDatasetBounds
                const bounds = L.latLngBounds([[minY, minX], [maxY, maxX]]);
                map.fitBounds(bounds)
            }
        }

    }
}