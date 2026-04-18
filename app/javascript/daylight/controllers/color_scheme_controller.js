import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    this.element.dataset.colorScheme = this.#colorScheme
  }

  setLight() {
    this.element.dataset.colorScheme = "light"
    localStorage.setItem("daylight-theme", "light")
  }

  setDark() {
    this.element.dataset.colorScheme = "dark"
    localStorage.setItem("daylight-theme", "dark")
  }

  setSystem() {
    this.element.dataset.colorScheme = "system"
    localStorage.removeItem("daylight-theme")
  }

  get #colorScheme() {
    return localStorage.getItem("daylight-theme") || "system"
  }
}
