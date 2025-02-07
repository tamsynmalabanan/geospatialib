importScripts('https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js')

onmessage = (message) => {
    console.log(message)
    console.log(turf)
    postMessage('response')
};