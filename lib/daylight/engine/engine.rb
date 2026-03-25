# frozen_string_literal: true

require "daylight/subscribers/request_subscriber"
require "daylight/subscribers/query_subscriber"
require "daylight/subscribers/job_subscriber"

module Daylight
  class Engine < ::Rails::Engine
    isolate_namespace Daylight

    initializer "daylight.middleware" do |app|
      if Daylight.configuration.auto_capture
        app.middleware.insert_before(0, Daylight::Middleware::Catcher)
      end
    end

    initializer "daylight.subscribers", after: :load_config_initializers do
      ActiveSupport.on_load(:action_controller) do
        before_action do
          Thread.current[:daylight_controller_action] = "#{self.class.name}##{action_name}"
          Thread.current[:daylight_request_path] = request.path
          Thread.current[:daylight_query_count] = 0
          Thread.current[:daylight_query_ids] = []
        end
      end

      Daylight::Subscribers::RequestSubscriber.attach!
      Daylight::Subscribers::QuerySubscriber.attach!
      Daylight::Subscribers::JobSubscriber.attach!
    end

    initializer "daylight.error_reporter" do
      if Rails.respond_to?(:error) && Rails.error.respond_to?(:subscribe)
        Rails.error.subscribe(Daylight::ErrorSubscriber.new)
      end
    end
  end

  class ErrorSubscriber
    def report(error, handled:, severity:, context: {}, source: nil)
      Daylight::Tracker.record(error, context: context.merge(
        handled: handled,
        severity: severity,
        source: source
      ))
    end
  end
end
