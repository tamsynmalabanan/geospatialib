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
                    click: (e) => menuContainer.remove()
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

    // const x = e.x
    // const y = e.y
    // menuContainer.style.left = `${(windowWidth-x-menuContainerWidth-10) >= 0 ? x : x-menuContainerWidth}px`
    // menuContainer.style.top = `${(windowHeight-y-menuContainerHeight-10) >= 0 ? y : y-menuContainerHeight}px`

    const x = e.x
    const y = e.y

    if (x === 0 && y === 0) {
        menuContainer.style.left = `${(windowWidth - menuContainerWidth) / 2}px`
        menuContainer.style.top = `${(windowHeight - menuContainerHeight) / 2}px`
    } else {
        menuContainer.style.left = `${(windowWidth - x - menuContainerWidth - 10) >= 0 ? x : x - menuContainerWidth}px`
        menuContainer.style.top = `${(windowHeight - y - menuContainerHeight - 10) >= 0 ? y : y - menuContainerHeight}px`
    }


    return menuContainer
}

document.addEventListener('DOMContentLoaded', () => {
    const handler = (e) => {
        const menu = document.querySelector(`.custom-context-menu`)
        if (menu) {
            const dismissBtn = menu.querySelector('.custom-context-menu-dismiss')
            const escape = e.type !== 'click' || !document.elementsFromPoint(
                e.clientX, e.clientY
            ).find(i => i === menu)
            if (!dismissBtn || escape) menu.remove()
        }
    }

    ['wheel', 'click'].forEach(trigger => {
        document.addEventListener(trigger, handler)
    })

    window.addEventListener("resize", handler)
})
