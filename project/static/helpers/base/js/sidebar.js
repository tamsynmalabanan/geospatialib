const toggleSidebar = (sidebarSelector) => {
    const button = event.target
    const sidebar = document.querySelector(sidebarSelector)
    const toggle = document.querySelector(`[data-bs-toggle="offcanvas"][data-bs-target="${sidebarSelector}"]`)
    const dismiss = document.querySelector(`[data-bs-dismiss="offcanvas"][data-bs-target="${sidebarSelector}"]`)

    if (sidebar.classList.contains('offcanvas-lg')) {
        button.classList.remove('bi-layout-sidebar-inset')
        button.classList.add('bi-window-sidebar')
        
        sidebar.classList.remove('offcanvas-lg')
        sidebar.classList.contains('show') && toggle.click()
        sidebar.classList.add('offcanvas')
        
        toggle.classList.remove('d-lg-none')
        dismiss.classList.remove('d-lg-none')
    } else {
        button.classList.remove('bi-window-sidebar')
        button.classList.add('bi-layout-sidebar-inset')

        sidebar.classList.remove('offcanvas')
        sidebar.classList.add('offcanvas-lg')

        toggle.classList.add('d-lg-none')
        dismiss.classList.add('d-lg-none')
    }
}

const resizeSidebar = (sidebarSelector) => {
    const sidebar = document.querySelector(sidebarSelector)
    const currentPosition = {
        x: event.x,
        y: event.y,
    }

    const handler = (event) => {
        const newPosition = {
            x: event.x,
            y: event.y,
        }
        console.log(currentPosition)
        console.log(newPosition)
        document.removeEventListener('mouseup', handler)
    }

    document.addEventListener('mouseup', handler)
}