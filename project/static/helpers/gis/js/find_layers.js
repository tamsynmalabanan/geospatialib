document.addEventListener('DOMContentLoaded', () => {
    const modalElement = document.querySelector(`#findLayersModal`)
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement)
    const formId = 'findLayersForm'
    const form = modalElement.querySelector(`#${formId}`)
    const responseContainer = document.querySelector(`#findLayersResponse`)
    const bboxInput = form.elements.bbox
    const setMapBbox = form.elements.setMapBbox
    const subjectInput = form.elements.subject
    const resetBtn = form.elements.reset
    const submitBtn = form.elements.submit
    
    const toggleSubmitBtn = () => {
        submitBtn.disabled = submitBtn.querySelector('.spinner-border') || subjectInput.value === '' || !isBbox(bboxInput.value)
    }

    const resetSubmitBtn = () => {
        submitBtn.innerHTML = '<i class="bi bi-search"></i>'
    }
    
    let map
    let defaultBbox
    modalElement.addEventListener('show.bs.modal', (e) => {
        map = getLeafletMap(e.relatedTarget.closest('.leaflet-container').id)
        if (!map) return

        const bounds = map.getBounds()
        const geojson = L.rectangle([Object.values(bounds.getSouthEast()), Object.values(bounds.getNorthWest())]).toGeoJSON()
        if (turf.area(geojson)/1000000 <= 10000) {
            defaultBbox = `[${turf.bbox(geojson).map(i => Math.round(i * 100000) / 100000).join(',')}]`
        } else {
            defaultBbox = `[${turf.bbox(turf.buffer(turf.centroid(geojson), 50)).map(i => Math.round(i * 100000) / 100000).join(',')}]`
        }
        
        if (!bboxInput.value) bboxInput.value = defaultBbox
        
        toggleSubmitBtn()
    })
    
    resetBtn.addEventListener('click', (e) => {
        subjectInput.value = ''
        subjectInput.style.height = '32px'
        
        bboxInput.value = defaultBbox
        
        resetSubmitBtn()
        toggleSubmitBtn()

        // dismiss web socket here...
    })
    
    setMapBbox.addEventListener('click', (e) => {
        bboxInput.value =  `[${getLeafletMapBbox(map).join(',')}]`
    })

    bboxInput.addEventListener('change', async (event) => {
        submitBtn.disabled = true
        bboxInput.classList.remove('is-invalid')

        const value = event.target.value
        
        if (!value) {
            bboxInput.value = defaultBbox
        } else {
            const invalidFeedback = event.target.parentElement.querySelector(`.invalid-feedback`)

            if (isBbox(value)) {
                try {
                    const [w,s,e,n] = JSON.parse(value)
                    if ((w < -180 || w >= e) || (s < -90 || s >= n) || (e > 180 || e <= w) || (n > 90 || n <= s)) throw new Error('Invalid value.')
                } catch (error) {
                    invalidFeedback.innerText = `Invalid bbox.`
                    event.target.classList.add('is-invalid')
                }
            } else {
                try {
                    const response = await fetchTimeout(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}`)
                    const geojson = (await response.json())[0]
                    const [s,n,w,e] = geojson.boundingbox.map(i => parseFloat(i))
                    bboxInput.value = `[${[w-0.1,s-0.1,e+0.1,n+0.1].map(i => Math.round(i * 100000) / 100000).join(',')}]`
                } catch (error) {
                    invalidFeedback.innerText = `Sorry, we can't geolocate this place.`
                    event.target.classList.add('is-invalid')
                }
            }
        }

        toggleSubmitBtn()
    })

    let subjectInputTimeout
    subjectInput.addEventListener('input', (e) => {
        clearTimeout(subjectInputTimeout)
        subjectInputTimeout = setTimeout(() => {
            toggleSubmitBtn()
        }, 250);
    })

    form.addEventListener('htmx:configRequest', (e) => {
        submitBtn.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"></div>'
        toggleSubmitBtn()
    })
    
    form.addEventListener('htmx:afterSwap', (e) => {
        // if swapped with final response from websocket:
        // resetSubmitBtn()
        // dismiss web socket if needed

        toggleSubmitBtn()
    })
    
    Array('responseError', 'sendError').forEach(type => {
        form.addEventListener(`htmx:${type}`, (e) => {
            responseContainer.innerHTML = customCreateElement({
                tag:'div', 
                innerHTML: 'Server error. Please try again.', 
                className: 'd-flex w-100 justify-content-center'
            }).outerHTML

            resetSubmitBtn()
            toggleSubmitBtn()
        })
    })
})