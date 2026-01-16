class FitToWorldControl {
  onAdd(map) {
    this.map = map
    this._container = customCreateElement({
      className:'maplibregl-ctrl maplibregl-ctrl-group'
    })

    const button = customCreateElement({
        tag:'button',
        parent: this._container,
        className: 'fs-16',
        attrs: {
            type: 'button',
            title: 'Fit to world'
        },
        innerText: '🌍',
        events: {
            click: (e) => this.map.fitBounds([[-140, -70], [160, 90]])
        }
    })

    return this._container
  }

  onRemove() {
    this._container.parentNode.removeChild(this._container);
    this.map = undefined;
  }
}