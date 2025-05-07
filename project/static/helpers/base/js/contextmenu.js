const contextMenuHandler = (e, menuItems, {
    title,
    dismissBtn = false,
} = {}) => {
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

    if (title || dismissBtn) {
        const header = customCreateElement({
            parent: menuContainer,
            className: 'd-flex flex-nowrap',
        })

        if (title) {
            const title = createSpan(title, {
                parent: header
            })
        }

        if (dismissBtn) {
            const dismiss = createIcon({
                parent: header
                className: 'bi bi-x'
            })
        }
    }

    for (const item in menuItems) {
        const data = menuItems[item]
        if (!data) continue

        const btnCallback = data.btnCallback
        if (btnCallback) {
            delete data.btnCallback
            data.btnCallback = (e) => {
                L.DomEvent.stopPropagation(e)
                L.DomEvent.preventDefault(e)
                if (!data.keepMenuOn) menuContainer.remove()
                btnCallback(e)
            }
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

    return menuContainer
}

document.addEventListener('DOMContentLoaded', () => {
    ['wheel', 'click'].forEach(trigger => {
        document.addEventListener(trigger, (e) => {
            document.querySelector(`.custom-context-menu`)?.remove()
        })
    })
})