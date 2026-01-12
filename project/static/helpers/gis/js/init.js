document.addEventListener('DOMContentLoaded', async () => {
    window.SQL = await initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/${file}`
    })
    window.Buffer = require('buffer').Buffer
    window.wkx = require('wkx')
})