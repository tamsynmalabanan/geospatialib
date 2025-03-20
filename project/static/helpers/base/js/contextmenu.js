const contextMenuHandler = (e, menuItems) => {
    L.DomEvent.stopPropagation(e)
    L.DomEvent.preventDefault(e)

    document.querySelector(`.custom-context-menu`)?.remove()
    
    const menuContainer = document.createElement('ul')
    menuContainer.className = removeWhitespace(`
        text-bg-${getPreferredTheme()} 
        custom-context-menu
        dropdown-menu show
        small shadow-sm
    `)
    for (const item in menuItems) {
        const data = menuItems[item]
        if (data.btnCallback) data.btnCallback = (e) => {
            L.DomEvent.stopPropagation(e)
            L.DomEvent.preventDefault(e)
            menuContainer.remove()
            data.btnCallback(e)
        }
        const li = createDropdownMenuLi({...data, parent:menuContainer})
    }
    document.body.appendChild(menuContainer)
    
    const menuContainerWidth = menuContainer.offsetWidth
    const menuContainerHeight = menuContainer.offsetHeight
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    menuContainer.style.left = `${(windowWidth-e.x-menuContainerWidth-10) >= 0 ? e.x : e.x-menuContainerWidth}px`
    menuContainer.style.top = `${(windowHeight-e.y-menuContainerHeight-10) >= 0 ? e.y : e.y-menuContainerHeight}px`
}

document.addEventListener('DOMContentLoaded', () => {
    Array(
        {parent: document, triggers: [
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
                setTimeout(() => {
                    menu.remove()
                }, 1000)
            })
        })
    })
})