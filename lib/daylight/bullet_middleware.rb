# frozen_string_literal: true

require "digest"

module Daylight
  # Rack middleware that flushes Bullet detections into Daylight performance issues.
  #
  # In development: always active.
  # In production: only active during a time-limited diagnostic window, and only
  # instruments a sample of requests to limit overhead.
  #
  # IMPORTANT: Skips Daylight's own routes to avoid infinite recursion
  # (Bullet tracking Daylight's DB writes which trigger more Bullet notifications).
  class BulletMiddleware
    SAMPLE_RATE = 0.05 # Instrument 5% of production requests
    CHECK_INTERVAL = 30 # Seconds between checking if diagnostic window is still active

    def initialize(app)
      @app = app
      @last_window_check = Time.at(0)
      @window_active = false
    end

    def call(env)
      # Never instrument Daylight's own routes — prevents infinite recursion
      path = env["PATH_INFO"] || ""
      return @app.call(env) if path.start_with?("/daylight")

      return @app.call(env) unless should_instrument?

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

    def should_instrument?
      return false unless defined?(Bullet) && Bullet.enable?

      # Development/test: always instrument
      return true unless production?

      # Production: only during an active diagnostic window + sampled
      return false unless diagnostic_window_active?
      rand < SAMPLE_RATE
    end

    def production?
      defined?(Rails) && Rails.env.production?
    end

    # Rate-limited check against the database setting
    def diagnostic_window_active?
      now = Time.current
      if now - @last_window_check > CHECK_INTERVAL
        @last_window_check = now
        @window_active = check_window
      end
      @window_active
    end

    def check_window
      Database.ensure_connected!
      expires = Database.get_setting("bullet_diagnostic_expires_at")
      return false if expires.blank?
      Time.parse(expires) > Time.current
    rescue StandardError
      false
    end

    def collect_bullet_notifications
      return unless Bullet.notification?

      # Re-entrancy guard: Daylight DB writes could trigger Bullet tracking
      return if Thread.current[:daylight_bullet_storing]
      Thread.current[:daylight_bullet_storing] = true

      controller_action = Thread.current[:daylight_controller_action]

      Bullet.gathered_notifications.each do |notification|
        store_notification(notification, controller_action)
      end
    rescue StandardError => e
      Rails.logger.debug("[Daylight] Bullet collection error: #{e.message}") if defined?(Rails)
    ensure
      Thread.current[:daylight_bullet_storing] = false
    end

    def store_notification(notification, controller_action)
      Database.ensure_connected!

      title = notification_title(notification)
      body = notification_body(notification)
      issue_type = detect_type(notification)

      # Stable fingerprint for deduplication
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
