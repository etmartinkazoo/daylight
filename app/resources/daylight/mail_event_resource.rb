# frozen_string_literal: true

module Daylight
  class MailEventResource < BaseResource
    attributes :id, :event_type, :mailer_class, :action_name, :recipients,
               :channel, :subject, :status, :duration_ms, :error_message,
               :trace_id, :occurred_at
  end
end
