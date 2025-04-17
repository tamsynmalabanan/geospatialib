const titleToTooltip = (element, altTitle) => {
    const title = altTitle || element.getAttribute('title')
    if (!title) return

    element.removeAttribute('title')
    element.setAttribute('data-bs-toggle', 'tooltip')
    element.setAttribute('data-bs-title', title)
    
    const tooltip = bootstrap.Tooltip.getOrCreateInstance(element)
    tooltip.setContent({'.tooltip-inner':title})

    return element
}

document.addEventListener('DOMContentLoaded', () => {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))
})

const bootstrapIcons = {}
document.addEventListener('DOMContentLoaded', () => {
    fetch('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css')
    .then(response => {
        if (!response.ok) throw new Error('Response not ok.')
        return response.text()
    })
    .then(text => {
        text.replace(' ', '').split('.bi-').slice(1).forEach(i => {
            const [name, unicode] = i.replace('"}', '').split('::before{content:"\\')
            bootstrapIcons[name] = unicode
        })
    })
    .catch(error => {
        console.log(error)
    })
})

const setBootstrapIconsAsOptions = (element) => {
    for (const i in bootstrapIcons) {
        const option = document.createElement('option')
        option.style.fontFamily = 'bootstrap-icons'
        option.value = i
        option.text = `&#x${bootstrapIcons[i]};`
        // option.innerHTML = `&#x${bootstrapIcons[i]};`
        element.appendChild(option)
    }
}