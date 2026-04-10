# frozen_string_literal: true

module Daylight
  class SettingRecord < Record
    self.table_name = "daylight_settings"

    validates :key, presence: true
  end
end
