const titleToTooltip = (element, altTitle) => {
    const title = element.getAttribute('title') || altTitle
    if (!title) return

    element.removeAttribute('title')
    element.setAttribute('data-bs-toggle', 'tooltip')
    element.setAttribute('data-bs-title', title)
    
    const existingTooltip = bootstrap.Tooltip.getInstance(element)
    if (existingTooltip) {
        console.log(existingTooltip)
        existingTooltip._config.title = title
    } else {
        new bootstrap.Tooltip(element)
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))
})