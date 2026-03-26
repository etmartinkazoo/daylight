# frozen_string_literal: true

module Daylight
  class Configuration
    attr_accessor :database_path, :ignored_exceptions, :auto_capture, :context_builder, :log_capture_level

    def initialize
      @database_path = nil # resolved at boot from Rails.root
      @ignored_exceptions = %w[
        ActiveRecord::RecordNotFound
        ActionController::RoutingError
        ActionController::UnknownFormat
        ActionController::InvalidAuthenticityToken
      ]
      @auto_capture = true   # install middleware automatically
      @context_builder = nil # proc that returns a hash, called per-request
      @log_capture_level = 2 # Logger::WARN — capture warn, error, fatal, unknown
    end

    def resolved_database_path
      @database_path || (defined?(Rails) ? Rails.root.join("db", "daylight.sqlite3").to_s : "daylight.sqlite3")
    end
  end
end
