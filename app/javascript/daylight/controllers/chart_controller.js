import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { data: Array }

  connect() {
    this.#render()
  }

  #render() {
    const data = this.dataValue
    if (!data.length) return

    const max = Math.max(...data.map(d => d.v), 1)
    this.element.innerHTML = ""

    data.forEach(point => {
      const bar = document.createElement("div")
      bar.className = "bar-chart__bar"
      bar.style.height = `${(point.v / max) * 100}%`
      bar.title = `${point.t}: ${point.v}`
      this.element.appendChild(bar)
    })
  }
}
