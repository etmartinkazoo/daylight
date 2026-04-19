# frozen_string_literal: true

module Daylight
  class ModelRecord < Record
    self.table_name = "daylight_models"

    has_many :chats, class_name: "Daylight::ChatRecord", foreign_key: :model_id

    # RubyLLM's resolve_model_from_strings calls setters like family=, context_window=, etc.
    # In production, eager loading may cache empty columns before the table is created.
    # This ensures column info is fresh when a setter is first called.
    def method_missing(method_name, *args)
      if method_name.to_s.end_with?("=") && self.class.table_exists?
        self.class.reset_column_information
        if respond_to?(method_name)
          return send(method_name, *args)
        end
      end
      super
    end

    def respond_to_missing?(method_name, include_private = false)
      super
    end

    def to_llm
      self.class.reset_column_information unless self.class.column_names.include?("model_id")

      RubyLLM::Model::Info.new(
        id: model_id,
        name: (try(:name) || model_id),
        provider: provider,
        family: try(:family),
        created_at: try(:model_created_at),
        context_window: try(:context_window),
        max_output_tokens: try(:max_output_tokens),
        modalities: (try(:modalities) || {}).deep_symbolize_keys,
        capabilities: try(:capabilities) || [],
        pricing: (try(:pricing) || {}).deep_symbolize_keys,
        metadata: (try(:metadata) || {}).deep_symbolize_keys
      )
    end
  end
end
