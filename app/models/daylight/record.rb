# frozen_string_literal: true

module Daylight
  # Abstract base class for all Daylight AR models.
  # Connection is established by Database.ensure_connected! at boot.
  class Record < ActiveRecord::Base
    self.abstract_class = true
  end
end
