# frozen_string_literal: true

module Daylight
  class ModelRecord < Record
    self.table_name = "daylight_models"

    has_many :chats, class_name: "Daylight::ChatRecord", foreign_key: :model_id
  end
end
