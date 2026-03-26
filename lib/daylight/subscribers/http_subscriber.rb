# frozen_string_literal: true

module Daylight
  module Subscribers
    class HttpSubscriber
      def self.attach!
        ActiveSupport::Notifications.subscribe("request.net_http") do |*args|
          event = ActiveSupport::Notifications::Event.new(*args)
          payload = event.payload

          url = payload[:url]&.to_s
          next if url.blank?
          next if url.include?("/daylight")

          uri = URI.parse(url) rescue nil
          host = uri&.host

          Database.ensure_connected!
          Database::HttpRequestRecord.create!(
            method: payload[:method]&.to_s&.upcase,
            url: url.truncate(2000),
            host: host,
            status_code: payload[:status_code] || payload[:code],
            duration_ms: event.duration&.round(2),
            controller_action: Thread.current[:daylight_controller_action],
            request_path: Thread.current[:daylight_request_path],
            occurred_at: Time.current
          )
        rescue StandardError
          # Never break the app for telemetry
        end
      end
    end
  end
end
