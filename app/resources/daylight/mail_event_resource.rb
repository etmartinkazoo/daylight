# frozen_string_literal: true

module Daylight
  class MailEventResource < BaseResource
    attributes :id, :mailer_class, :status, :duration_ms, :occurred_at

    attribute :action do |e|
      e.try(:action)
    end

    attribute :recipient do |e|
      e.try(:recipient)
    end

    attribute :error_message do |e|
      e.try(:error_message)
    end
  end
end
