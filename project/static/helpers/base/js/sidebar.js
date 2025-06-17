const toggleSidebar = (sidebarSelector) => {
    const sidebar = document.querySelector(sidebarSelector)
    const toggle = document.querySelector(`[data-bs-toggle="offcanvas"][data-bs-target="${sidebarSelector}"]`)
    
    const sidebarGutter = sidebar.parentElement.querySelector('.sidebar-gutter')
    const button = sidebar.querySelector(`[onclick='toggleSidebar("${sidebarSelector}")']`)
    const dismiss = sidebar.querySelector(`[data-bs-dismiss="offcanvas"][data-bs-target="${sidebarSelector}"]`)

    const isLg = sidebar.classList.toggle('offcanvas-lg')
    setCookie(`show_${sidebarSelector}`, isLg)

    sidebar.classList.toggle('offcanvas', !isLg)
    if (sidebar.classList.contains('show')) toggle.click()

    button.classList.toggle('bi-layout-sidebar-inset', isLg)
    button.classList.toggle('bi-window-sidebar', !isLg)
    
    if (sidebarGutter) sidebarGutter.classList.toggle('d-lg-block', isLg)
    dismiss.classList.toggle('d-lg-none', isLg)
    toggle.classList.toggle('d-lg-none', isLg)
}

const resizeSidebar = (sidebarSelector) => {
    const sidebar = document.querySelector(sidebarSelector)
    const sidebarWidth = sidebar.offsetWidth
    const startX = event.type === 'touchstart' ? event.touches[0].clientX : event.clientX
    
    const mouseMoveHandler = (event) => {
        document.body.classList.add('user-select-none')

        const newX = event.type === 'touchmove' ? event.touches[0].clientX : event.clientX
        const moveX = newX - startX

        sidebar.style.width =`${sidebarWidth + moveX}px`;
    }
    
    const mouseUpHandler = () => {
        document.body.classList.remove('user-select-none')

        const rowWidth = sidebar.parentElement.offsetWidth
        const sidebarWidth = sidebar.offsetWidth

        let col = Math.floor(sidebarWidth/(rowWidth/12))

        if (col > 0) {
            if (col < 4) col = 4
            if (col > 6) col = 6

            sidebar.classList.forEach(className => {
                if (className.includes('col-lg-')) {
                    sidebar.classList.remove(className)
                }
            })

            sidebar.classList.add(`col-lg-${col}`)
        } else {
            toggleSidebar(sidebarSelector)
        }

        sidebar.style.width = ''
    }

    Array('mousemove', 'touchmove').forEach(moveTrigger => {
        document.addEventListener(moveTrigger, mouseMoveHandler)
    })

    Array('mouseup', 'touchend').forEach(endTrigger => {
        document.addEventListener(endTrigger, () => {
            mouseUpHandler()
            
            Array('mousemove', 'touchmove').forEach(moveTrigger => {
                document.removeEventListener(moveTrigger, mouseMoveHandler)
            })
            
            Array('mouseup', 'touchend').forEach(moveTrigger => {
                document.removeEventListener(moveTrigger, mouseUpHandler)
            })
        })
    })
}