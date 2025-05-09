const contextMenuHandler = (e, menuItems, {
    title,
    dismissBtn = false,
    style = {},
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
    Object.keys(style).forEach(k => menuContainer.style[k] = style[k])

    if (title || dismissBtn) {
        const header = customCreateElement({
            parent: menuContainer,
            className: 'd-flex flex-nowrap px-3 mb-2',
            style: {fontSize:'14px'}
        })

        if (title) {
            const titleSpan = createSpan(title, {
                parent: header,
                className: 'fw-medium'
            })
        }

        if (dismissBtn) {
            makeMovable(menuContainer)
            const dismissIcon = createIcon({
                parent: header,
                peNone: false,
                className: 'bi bi-x ms-auto custom-context-menu-dismiss',
                events: {
                    click: (e) => {
                        menuContainer.remove()                        
                    }
                }
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
    const handler = (e) => {
        const menu = document.querySelector(`.custom-context-menu`)
        if (menu) {
            const dismiss = menu.querySelector('.custom-context-menu-dismiss')
            if (!dismiss || e.type === 'resize') menu.remove()
        }
    }

    ['wheel', 'click'].forEach(trigger => {
        document.addEventListener(trigger, handler)
    })

    window.addEventListener("resize", handler)
})
