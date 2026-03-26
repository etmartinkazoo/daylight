# frozen_string_literal: true

require "digest"

module Daylight
  # Rack middleware that flushes Bullet detections into Daylight performance issues
  # after each request completes.
  class BulletMiddleware
    def initialize(app)
      @app = app
    end

    def call(env)
      return @app.call(env) unless defined?(Bullet) && Bullet.enable?

      Bullet.start_request
      response = @app.call(env)
      collect_bullet_notifications
      Bullet.end_request
      response
    rescue StandardError => e
      Bullet.end_request rescue nil
      raise e
    end

    private

    def collect_bullet_notifications
      return unless Bullet.notification?

      controller_action = Thread.current[:daylight_controller_action]

      Bullet.gathered_notifications.each do |notification|
        store_notification(notification, controller_action)
      end
    rescue StandardError => e
      Rails.logger.debug("[Daylight] Bullet collection error: #{e.message}") if defined?(Rails)
    end

    def store_notification(notification, controller_action)
      Database.ensure_connected!

      title = notification_title(notification)
      body = notification_body(notification)
      issue_type = detect_type(notification)

      # Build a stable fingerprint so we don't duplicate
      fingerprint = Digest::SHA256.hexdigest("bullet:#{issue_type}:#{title}")[0..31]

      # Increment if already tracked, otherwise create
      existing = Database::PerformanceIssueRecord.find_by(sql_pattern: fingerprint, status: "open")
      if existing
        existing.update_columns(
          occurrences: existing.occurrences + 1,
          detected_at: Time.current
        )
        return
      end

      Database::PerformanceIssueRecord.create!(
        scan_id: "bullet_live",
        issue_type: issue_type,
        severity: issue_type == "n_plus_one" ? "warning" : "info",
        title: title.truncate(255),
        description: body,
        sql_pattern: fingerprint,
        source_location: extract_source(notification),
        controller_action: controller_action,
        occurrences: 1,
        status: "open",
        detected_at: Time.current
      )
    rescue StandardError => e
      Rails.logger.debug("[Daylight] Bullet store error: #{e.message}") if defined?(Rails)
    end

    def notification_title(n)
      case n
      when Bullet::Notification::NPlusOneQuery
        "N+1 query: #{n.base_class} => #{n.associations}"
      when Bullet::Notification::UnusedEagerLoading
        "Unused eager loading: #{n.base_class} => #{n.associations}"
      when Bullet::Notification::CounterCache
        "Counter cache: #{n.base_class} => #{n.associations}"
      else
        n.try(:title) || n.to_s.truncate(200)
      end
    rescue StandardError
      n.to_s.truncate(200)
    end

    def notification_body(n)
      case n
      when Bullet::Notification::NPlusOneQuery
        "Bullet detected an N+1 query at runtime.\n" \
        "Model: #{n.base_class}\n" \
        "Association: #{n.associations}\n" \
        "Add `includes(:#{Array(n.associations).join(', :')})` to eliminate this."
      when Bullet::Notification::UnusedEagerLoading
        "Bullet detected unused eager loading.\n" \
        "Model: #{n.base_class}\n" \
        "Association: #{n.associations}\n" \
        "Remove `includes(:#{Array(n.associations).join(', :')})` — it's loading data that isn't used."
      when Bullet::Notification::CounterCache
        "Bullet detected a counter cache opportunity.\n" \
        "Model: #{n.base_class}\n" \
        "Association: #{n.associations}\n" \
        "Add a counter_cache column to avoid repeated COUNT queries."
      else
        n.try(:body) || n.to_s
      end
    rescue StandardError
      n.to_s
    end

    def detect_type(n)
      case n
      when Bullet::Notification::NPlusOneQuery then "n_plus_one"
      when Bullet::Notification::UnusedEagerLoading then "unused_eager_load"
      when Bullet::Notification::CounterCache then "counter_cache"
      else "n_plus_one"
      end
    rescue StandardError
      "n_plus_one"
    end

    def extract_source(n)
      callstack = n.try(:callstack)
      return nil unless callstack.is_a?(Array) && callstack.any?

      app_line = callstack.find { |l| l.to_s.include?("/app/") && !l.to_s.include?("/gems/") }
      return nil unless app_line

      loc = app_line.to_s
      loc.sub(%r{.*/app/}, "app/")
    rescue StandardError
      nil
    end
  end
end
