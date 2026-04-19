# frozen_string_literal: true

module Daylight
  module Color
    module_function

    DEFAULT_PRIMARY = "#f59e0b"

    def normalize(hex, fallback: DEFAULT_PRIMARY)
      return fallback unless valid?(hex)
      hex = hex.to_s.strip
      hex = "##{hex}" unless hex.start_with?("#")
      hex.downcase
    end

    def valid?(hex)
      hex.to_s.strip.match?(/\A#?[0-9a-fA-F]{6}\z/)
    end

    def lighten(hex, amount)
      r, g, b = to_rgb(hex)
      r = (r + (255 - r) * amount).round
      g = (g + (255 - g) * amount).round
      b = (b + (255 - b) * amount).round
      to_hex(r, g, b)
    end

    def darken(hex, amount)
      r, g, b = to_rgb(hex)
      r = (r * (1 - amount)).round
      g = (g * (1 - amount)).round
      b = (b * (1 - amount)).round
      to_hex(r, g, b)
    end

    # Pick black or white text depending on luminance of the background.
    def readable_on(hex)
      r, g, b = to_rgb(hex)
      luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
      luminance > 0.6 ? "#0f172a" : "#ffffff"
    end

    def to_rgb(hex)
      h = hex.to_s.delete("#")
      [h[0..1].to_i(16), h[2..3].to_i(16), h[4..5].to_i(16)]
    end

    def to_hex(r, g, b)
      "#%02x%02x%02x" % [r.clamp(0, 255), g.clamp(0, 255), b.clamp(0, 255)]
    end
  end
end
