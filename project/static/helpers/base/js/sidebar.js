const toggleSidebar = (sidebarSelector) => {
    const sidebar = document.querySelector(sidebarSelector)
    const toggle = document.querySelector(`[data-bs-target="${sidebarSelector}"]`)
    console.log(toggle)
    if (sidebar.classList.contains('offcanvas-lg')) {
        sidebar.classList.remove('offcanvas-lg')
        sidebar.classList.add('offcanvas')

        toggle.classList.remove('d-lg-none')
    } else {
        sidebar.classList.remove('offcanvas')
        sidebar.classList.add('offcanvas-lg')

        toggle.classList.add('d-lg-none')
    }
}