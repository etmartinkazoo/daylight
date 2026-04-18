import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["source"]

  copy() {
    const text = this.sourceTarget.textContent || this.sourceTarget.value
    navigator.clipboard.writeText(text)
  }
}
