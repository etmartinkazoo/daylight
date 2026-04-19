# frozen_string_literal: true

module Daylight
  class ModelRecord < Record
    self.table_name = "daylight_models"

    has_many :chats, class_name: "Daylight::ChatRecord", foreign_key: :model_id

    def to_llm
      RubyLLM::Model::Info.new(
        id: model_id,
        name: name || model_id,
        provider: provider,
        family: family,
        created_at: model_created_at,
        context_window: context_window,
        max_output_tokens: max_output_tokens,
        modalities: (modalities || {}).deep_symbolize_keys,
        capabilities: capabilities || [],
        pricing: (pricing || {}).deep_symbolize_keys,
        metadata: (metadata || {}).deep_symbolize_keys
      )
    end
  end
end
