# frozen_string_literal: true

module Daylight
  module Middleware
    class Catcher
      THREAD_KEY = :daylight_tracking

      def initialize(app)
        @app = app
      end

      def call(env)
        @app.call(env)
      rescue Exception => error # rubocop:disable Lint/RescueException
        path = env["PATH_INFO"].to_s
        unless path.start_with?("/daylight") || Thread.current[THREAD_KEY]
          begin
            Thread.current[THREAD_KEY] = true
            Daylight.track(error, context: build_context(env).merge(
              handled: false,
              source: "middleware"
            ))
          rescue # rubocop:disable Lint/RescueWithoutErrorClass
            # Swallow ALL tracking failures
          ensure
            Thread.current[THREAD_KEY] = false
          end
        end

        raise
      end

      private

      def build_context(env)
        ctx = {
          request_url: env["REQUEST_URI"] || env["PATH_INFO"],
          request_method: env["REQUEST_METHOD"],
          remote_ip: env["REMOTE_ADDR"],
          user_agent: env["HTTP_USER_AGENT"]&.to_s&.slice(0, 200),
        }

        # Capture route/controller info from Rails if available
        if (params = env["action_dispatch.request.path_parameters"])
          ctx[:controller] = params[:controller]
          ctx[:action] = params[:action]
          ctx[:route] = "#{params[:controller]}##{params[:action]}"
        end

        # Capture query string params (sanitized)
        if env["QUERY_STRING"].present?
          ctx[:query_string] = env["QUERY_STRING"].to_s.slice(0, 500)
        end

        # Capture tenant if available
        if defined?(ApplicationRecord) && ApplicationRecord.respond_to?(:current_tenant)
          tenant = ApplicationRecord.current_tenant rescue nil
          ctx[:tenant] = tenant.to_s if tenant
        end

        # Capture current user if available
        if defined?(Current) && Current.respond_to?(:user)
          user = Current.user rescue nil
          if user
            ctx[:user_id] = user.id
            ctx[:user_name] = user.name rescue nil
          end
        end

        ctx
      rescue
        {}
      end
    end
  end
end
