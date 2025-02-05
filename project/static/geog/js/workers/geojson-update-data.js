self.onmessage = async function (e) {
    console.log(e)
    self.postMessage(e);
};