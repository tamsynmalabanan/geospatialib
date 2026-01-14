class SettingsControl {
    constructor(options={}) {

    }

    onAdd(map) {
        this.map = map
    }

    onRemove() {
        this.container.parentNode.removeChild(this.container)
        this.map = undefined
    }
}