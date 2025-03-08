const titleToTooltip = (element, altTitle) => {
    const title = altTitle || element.getAttribute('title')
    if (!title) return

    element.removeAttribute('title')
    element.setAttribute('data-bs-toggle', 'tooltip')
    element.setAttribute('data-bs-title', title)
    
    let tooltip = bootstrap.Tooltip.getInstance(element)
    if (tooltip) {
        tooltip._config.title = title
    } else {
        tooltip = new bootstrap.Tooltip(element)
    }
 
    if (tooltip._isShown()) {
        const tooltipElement = document.querySelector('.bs-tooltip-auto .tooltip-inner')
        tooltipElement.innerText = title
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))
})