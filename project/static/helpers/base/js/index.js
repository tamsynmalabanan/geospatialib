let removeCustomContextMenuTimeout
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
            console.log(e)
            clearTimeout(removeCustomContextMenuTimeout)
            removeCustomContextMenuTimeout = setTimeout(() => {
                document.querySelector(`.custom-context-menu`)?.remove()
            }, 100)
        })
    })
})