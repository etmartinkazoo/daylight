import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["checkbox", "selectAll", "bar", "count", "ids"]

  toggleAll() {
    const checked = this.selectAllTarget.checked
    this.checkboxTargets.forEach(cb => cb.checked = checked)
    this.#update()
  }

  toggle() {
    this.#update()
  }

  #update() {
    const checked = this.checkboxTargets.filter(cb => cb.checked)
    const total = this.checkboxTargets.length

    if (this.hasSelectAllTarget) {
      this.selectAllTarget.checked = checked.length === total
      this.selectAllTarget.indeterminate = checked.length > 0 && checked.length < total
    }

    if (this.hasBarTarget) {
      this.barTarget.hidden = checked.length === 0
    }

    if (this.hasCountTarget) {
      this.countTarget.textContent = checked.length
    }

    if (this.hasIdsTarget) {
      this.idsTarget.value = checked.map(cb => cb.value).join(",")
    }
  }
}
