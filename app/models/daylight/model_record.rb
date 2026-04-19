# frozen_string_literal: true

module Daylight
  class ModelRecord < Record
    self.table_name = "daylight_models"

    acts_as_model chat_class: "Daylight::ChatRecord"

    serialize :modalities, coder: JSON
    serialize :capabilities, coder: JSON
    serialize :pricing, coder: JSON
    serialize :metadata, coder: JSON
  end
end
