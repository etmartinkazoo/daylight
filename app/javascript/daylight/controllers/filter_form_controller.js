import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { delay: { type: Number, default: 300 } }

  initialize() {
    this.submit = this.#debounce(this.submit.bind(this), this.delayValue)
  }

  submit() {
    this.element.requestSubmit()
  }

  #debounce(fn, delay) {
    let timer
    return (...args) => {
      clearTimeout(timer)
      timer = setTimeout(() => fn(...args), delay)
    }
  }
}
