import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["tab"]
  static values = { active: String }

  connect() {
    this.#updateTabs()
  }

  #updateTabs() {
    this.tabTargets.forEach(tab => {
      if (tab.dataset.value === this.activeValue) {
        tab.setAttribute("aria-current", "page")
      } else {
        tab.removeAttribute("aria-current")
      }
    })
  }
}
