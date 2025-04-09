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

const bootstrapIConsDatalist = customCreateElement({tag:'datalist', parent:document.body})
document.addEventListener('DOMContentLoaded', () => {
    fetch('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css')
    .then(response => {
        if (!response.ok) throw new Error('Response not ok.')
        return response.text()
    })
    .then(text => {
        const iconNames = text.split('.bi-').map(i => i.split('::before')[0]).slice(1)
        iconNames.forEach(i => {
            const option = document.createElement('option')
            option.value = i
            bootstrapIConsDatalist.appendChild(option)
        })
    })
    .catch(error => {
        console.log(error)
    })
})