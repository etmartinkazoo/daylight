# frozen_string_literal: true

module Daylight
  class AiChatChannel < ActionCable::Channel::Base
    def subscribed
      stream_from "daylight:ai_chat:#{current_user_id}"
    end

    private

    def current_user_id
      # Use connection identifier or session-based fallback
      connection.current_user&.id || connection.env["rack.session"]&.id || "anonymous"
    end
  end
end
