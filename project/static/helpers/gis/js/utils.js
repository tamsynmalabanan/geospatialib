const ddToDMS = (decimalDegrees, precision=2) => {
    let degrees = Math.floor(Math.abs(decimalDegrees))
    let minutesFloat = (Math.abs(decimalDegrees) - degrees) * 60
    let minutes = Math.floor(minutesFloat)
    let seconds = (minutesFloat - minutes) * 60
  
    seconds = parseFloat(seconds.toFixed(precision))
  
    return {
        degrees: degrees,
        minutes: minutes,
        seconds: seconds,
        toString: () => `${this.degrees}° ${this.minutes}' ${this.seconds}"`
    }
}