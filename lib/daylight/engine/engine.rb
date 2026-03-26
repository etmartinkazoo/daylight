# frozen_string_literal: true

require "daylight/subscribers/request_subscriber"
require "daylight/subscribers/query_subscriber"
require "daylight/subscribers/job_subscriber"
require "daylight/subscribers/log_subscriber"
require "daylight/subscribers/http_subscriber"
require "daylight/subscribers/cache_subscriber"
require "daylight/subscribers/scheduled_task_subscriber"
require "daylight/subscribers/mail_subscriber"

module Daylight
  class Engine < ::Rails::Engine
    isolate_namespace Daylight

    # Serve pre-built frontend assets from the gem at /daylight/assets/
    initializer "daylight.static_assets" do |app|
      builds_path = root.join("app", "assets", "builds")
      if builds_path.exist? && Dir.glob(builds_path.join("daylight-*")).any?
        app.routes.prepend do
          mount(
            Rack::Files.new(builds_path.to_s),
            at: "/daylight/assets",
            as: :daylight_assets
          )
        end
      end
    end

    initializer "daylight.middleware" do |app|
      if Daylight.configuration.auto_capture
        app.middleware.insert_before(0, Daylight::Middleware::Catcher)
      end
    end

    initializer "daylight.subscribers", after: :load_config_initializers do
      ActiveSupport.on_load(:action_controller) do
        before_action do
          Daylight::TraceContext.start!
          Daylight::Sampler.start_request_sampling!
          Thread.current[:daylight_controller_action] = "#{self.class.name}##{action_name}"
          Thread.current[:daylight_request_path] = request.path
          Thread.current[:daylight_query_count] = 0
          Thread.current[:daylight_query_ids] = []
          Thread.current[:daylight_http_request_ids] = []
        end
      end

      Daylight::Subscribers::RequestSubscriber.attach!
      Daylight::Subscribers::QuerySubscriber.attach!
      Daylight::Subscribers::JobSubscriber.attach!
      Daylight::Subscribers::LogSubscriber.attach!
      Daylight::Subscribers::HttpSubscriber.attach!
      Daylight::Subscribers::CacheSubscriber.attach!
      Daylight::Subscribers::ScheduledTaskSubscriber.attach!
      Daylight::Subscribers::MailSubscriber.attach!
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
        severity: severity.to_s,
        source: source || "rails_error_reporter"
      ))
    end
  end
end
