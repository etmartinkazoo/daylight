# frozen_string_literal: true

module Daylight
  # Centralized AI configuration. All scanners and generators should use
  # Daylight::AI.chat(model:) instead of calling RubyLLM directly.
  module AI
    MODELS = [
      # Gemini
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "gemini" },
      { id: "gemini-2.5-pro",   label: "Gemini 2.5 Pro",   provider: "gemini" },
      # Anthropic
      { id: "claude-haiku-4-5-20251001", label: "Claude Haiku",  provider: "anthropic" },
      { id: "claude-sonnet-4-6",         label: "Claude Sonnet", provider: "anthropic" },
      { id: "claude-opus-4-6",           label: "Claude Opus",   provider: "anthropic" },
      # OpenAI
      { id: "gpt-4.1",       label: "GPT-4.1",       provider: "openai" },
      { id: "gpt-4.1-mini",  label: "GPT-4.1 Mini",  provider: "openai" },
      { id: "gpt-4.1-nano",  label: "GPT-4.1 Nano",  provider: "openai" },
      { id: "o3",            label: "o3",             provider: "openai" },
      { id: "o4-mini",       label: "o4 Mini",        provider: "openai" },
      # Kimi (Moonshot)
      { id: "moonshot-v1-8k",   label: "Kimi Moonshot 8K",   provider: "openai" },
      { id: "moonshot-v1-32k",  label: "Kimi Moonshot 32K",  provider: "openai" },
      { id: "moonshot-v1-128k", label: "Kimi Moonshot 128K", provider: "openai" },
    ].freeze

    PROVIDERS = %w[gemini anthropic openai].freeze

    class << self
      # Configure RubyLLM with all available API keys and return a chat
      # instance for the given model (or the default model from settings).
      def chat(model: nil)
        configure!
        model_id = model || default_model
        RubyLLM.chat(model: model_id)
      end

      def default_model
        Database.ensure_connected!
        Database.get_setting("default_ai_model").presence || "gemini-2.5-flash"
      end

      # Returns only models whose provider has a configured API key
      def available_models
        configure!
        MODELS.select { |m| provider_configured?(m[:provider]) }
      end

      def configured?
        Database.ensure_connected!
        Database.get_setting("gemini_api_key").present? ||
          Database.get_setting("anthropic_api_key").present? ||
          Database.get_setting("openai_api_key").present?
      end

      def configure!
        Database.ensure_connected!
        gemini_key    = Database.get_setting("gemini_api_key")
        anthropic_key = Database.get_setting("anthropic_api_key")
        openai_key    = Database.get_setting("openai_api_key")

        RubyLLM.configure do |c|
          c.gemini_api_key    = gemini_key    if gemini_key.present?
          c.anthropic_api_key = anthropic_key if anthropic_key.present?
          c.openai_api_key    = openai_key    if openai_key.present?
        end
      end

      private

      def provider_configured?(provider)
        case provider
        when "gemini"    then Database.get_setting("gemini_api_key").present?
        when "anthropic" then Database.get_setting("anthropic_api_key").present?
        when "openai"    then Database.get_setting("openai_api_key").present?
        else false
        end
      end
    end
  end
end
