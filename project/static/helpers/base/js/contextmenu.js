const contextMenuHandler = (e, content) => {
    L.DomEvent.stopPropagation(e)
    L.DomEvent.preventDefault(e)

    document.querySelector(`.custom-context-menu`)?.remove()
    
    const menuContainer = document.createElement('div')
    menuContainer.className = removeWhitespace(`
        text-bg-${getPreferredTheme()} 
        custom-context-menu
        position-fixed 
        rounded shadow-sm p-2 
        small border
    `)
    menuContainer.innerText = 'context menu here'
    document.body.appendChild(menuContainer)
    
    const menuContainerWidth = menuContainer.offsetWidth
    const menuContainerHeight = menuContainer.offsetHeight
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    
    console.log('element', menuContainerWidth, menuContainerHeight)
    console.log('window', windowWidth, windowHeight)
    console.log('point', e.x, e.y)

    menuContainer.style.top = `${e.y}px`
    menuContainer.style.left = `${e.x}px`
}

let removeCustomContextMenuTimeout
document.addEventListener('DOMContentLoaded', () => {
    Array(
        {parent: document, triggers: [
            'click',
            'wheel',
            'mousedown',
        ]},
        {parent: window, triggers: [
            'scroll'
        ]},
    ).forEach(props => {
        props.triggers.forEach(trigger => {
            props.parent.addEventListener(trigger, (e) => {
                const menu = document.querySelector(`.custom-context-menu`)
                if (!menu) return

                clearTimeout(removeCustomContextMenuTimeout)
                removeCustomContextMenuTimeout = setTimeout(() => {
                    console.log(e)
                    menu.remove()
                }, 100)
            })
        })
    })
})