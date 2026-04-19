import { Controller } from "@hotwired/stimulus"

// Polls a URL and replaces the element's content when the response changes.
// Stops polling when the response no longer contains data-poll-pending.
// Usage: data-controller="poll" data-poll-url-value="/path" data-poll-interval-value="3000"
export default class extends Controller {
  static values = {
    url: String,
    interval: { type: Number, default: 3000 }
  }

  connect() {
    this.timer = setInterval(() => this.poll(), this.intervalValue)
  }

  disconnect() {
    clearInterval(this.timer)
  }

  async poll() {
    try {
      const response = await fetch(this.urlValue, {
        headers: { "Accept": "text/html", "X-Requested-With": "XMLHttpRequest" }
      })
      if (!response.ok) return

      const html = await response.text()
      if (html.includes("data-poll-pending")) return // still in progress

      // Done — replace content and stop polling
      clearInterval(this.timer)
      this.element.outerHTML = html
    } catch {
      // Silently ignore network errors
    }
  }
}
