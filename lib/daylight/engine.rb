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

    # Isolate Daylight's Zeitwerk inflection from the host app's acronyms.
    # Without this, a host app registering inflect.acronym "AI" (or any gem
    # that does) would change the expected constant names for Daylight's own
    # autoloaded files. This wraps the Rails inflector so files inside the
    # gem always use default snake_case → CamelCase, while host app files
    # keep whatever conventions they've configured.
    initializer "daylight.zeitwerk_inflector", before: :set_autoload_paths do
      gem_root = root.to_s
      original_inflector = Rails.autoloaders.main.inflector

      Rails.autoloaders.main.inflector = Class.new do
        define_method(:camelize) do |basename, abspath|
          if abspath.start_with?(gem_root)
            basename.split("_").each(&:capitalize!).join
          else
            original_inflector.camelize(basename, abspath)
          end
        end

        define_method(:inflect) do |overrides|
          original_inflector.inflect(overrides)
        end
      end.new
    end

    initializer "daylight.alba" do
      Alba.backend = :active_support if defined?(Alba)
    end


    # After every code reload (development), record classes lose their
    # establish_connection config. Reset the flag so ensure_connected!
    # re-establishes the SQLite connection on the next request.
    config.to_prepare do
      Daylight::Database.reset_connection!
    end

    initializer "daylight.assets" do |app|
      app.config.assets.paths << root.join("app", "assets", "stylesheets")
      app.config.assets.paths << root.join("app", "javascript")
    end

    initializer "daylight.importmap", before: "importmap" do |app|
      app.config.importmap.paths << root.join("config", "importmap.rb")
      app.config.importmap.cache_sweepers << root.join("app", "javascript")
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

      Daylight::Notifier.subscribe!
      Daylight::AnomalyDetector.subscribe!
    end

    initializer "daylight.error_reporter" do
      if Rails.respond_to?(:error) && Rails.error.respond_to?(:subscribe)
        Rails.error.subscribe(Daylight::ErrorSubscriber.new)
      end
    end

    initializer "daylight.bullet", after: :load_config_initializers do
      next unless defined?(Bullet)

      Bullet.enable = true
      Bullet.n_plus_one_query_enable = true
      Bullet.unused_eager_loading_enable = true
      Bullet.counter_cache_enable = true
      Bullet.add_footer = false
      Bullet.console    = false
      Bullet.rails_logger = false
    end

    initializer "daylight.bullet_middleware", after: "daylight.bullet" do |app|
      next unless defined?(Bullet) && Bullet.enable?

      require "daylight/bullet_middleware"
      app.middleware.use Daylight::BulletMiddleware
    end
  end

  class ErrorSubscriber
    def report(error, handled:, severity:, context: {}, source: nil)
      # Don't track Daylight's own errors — only monitor the host app
      return if error.class.name&.start_with?("Daylight")
      return if source&.to_s&.start_with?("daylight")
      backtrace_line = error.backtrace&.first.to_s
      return if backtrace_line.include?("/daylight/") && !backtrace_line.include?("/app/")

      Daylight::Tracker.record(error, context: context.merge(
        handled: handled,
        severity: severity.to_s,
        source: source || "rails_error_reporter"
      ))
    end
  end
end
