import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["panel"]

  open() { this.panelTarget.showModal() }
  close() { this.panelTarget.close() }

  closeOnClickOutside({ target }) {
    if (target.nodeName === "DIALOG") this.close()
  }
}
