import { Controller } from "@hotwired/stimulus"

// Polls a URL and replaces the element when the response no longer contains data-poll-pending.
// Usage: data-controller="poll" data-poll-url-value="/path" data-poll-interval-value="2000"
export default class extends Controller {
  static values = {
    url: String,
    interval: { type: Number, default: 2000 }
  }

  connect() {
    this.elementId = this.element.id
    this.element.scrollTop = this.element.scrollHeight
    this.timer = setInterval(() => this.poll(), this.intervalValue)
  }

  disconnect() {
    if (this.timer) clearInterval(this.timer)
  }

  async poll() {
    try {
      const response = await fetch(this.urlValue, {
        headers: { "Accept": "text/html", "X-Requested-With": "XMLHttpRequest" }
      })
      if (!response.ok) return

      const html = await response.text()
      if (html.includes("data-poll-pending")) return

      clearInterval(this.timer)
      this.element.outerHTML = html

      // Scroll the replaced element to bottom
      requestAnimationFrame(() => {
        const el = document.getElementById(this.elementId)
        if (el) el.scrollTop = el.scrollHeight
      })
    } catch {
      // Silently ignore network errors
    }
  }
}
