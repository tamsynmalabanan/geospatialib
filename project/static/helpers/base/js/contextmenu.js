const contextMenuHandler = (e, content) => {
    L.DomEvent.stopPropagation(e)
    L.DomEvent.preventDefault(e)

    document.querySelector(`.custom-context-menu`)?.remove()
    
    const menuContainer = document.createElement('div')
    menuContainer.className = `custom-context-menu text-bg-${getPreferredTheme()} position-fixed rounded shadow-sm p-2 small border`
    menuContainer.innerText = 'context menu here'
    document.body.appendChild(menuContainer)
    
    const menuContainerWidth = menuContainer.offsetWidth
    const menuContainerHeight = menuContainer.offsetHeight
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    
    menuContainer.style.top = `${e.y}px`
    menuContainer.style.right = `${windowWidth-e.x}px`
}

let removeCustomContextMenuTimeout
document.addEventListener('DOMContentLoaded', () => {
    Array(
        {parent: document, triggers: [
            'click'
        ]},
        {parent: window, triggers: [
            'scroll'
        ]},
    ).forEach(props => {
        props.triggers.forEach(trigger => {
            props.parent.addEventListener(trigger, (e) => {
                clearTimeout(removeCustomContextMenuTimeout)
                removeCustomContextMenuTimeout = setTimeout(() => {
                    document.querySelector(`.custom-context-menu`)?.remove()
                }, 100)
            })
        })
    })
})