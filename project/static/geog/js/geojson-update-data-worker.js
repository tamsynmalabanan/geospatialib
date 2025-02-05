onmessage = (message) => {
    console.log(message)
    console.log(turf)
    postMessage('response')
};