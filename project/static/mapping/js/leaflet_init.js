document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener("map:init", (event) => {
        const map = event.detail.map
        
        console.log(map)

        map._initComplete = true
        map.fire('mapInitComplete')
    })
})