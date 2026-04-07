# frozen_string_literal: true

module Daylight
  class ErrorMailer < ActionMailer::Base
    def error_occurred(error_record, recipients)
      @error = error_record

      mail(
        to: recipients,
        subject: "[Daylight] #{error_record.error_class}: #{error_record.message.truncate(80)}"
      )
    end
  end
end
