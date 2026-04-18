# frozen_string_literal: true

module Daylight
  # Abstract base class for all Daylight AR models.
  # Uses its own SQLite database, completely separate from the host app's
  # connection pool. Setting connection_class = true ensures compatibility
  # with multi-database and tenanted setups (e.g. activerecord-tenanted).
  class Record < ActiveRecord::Base
    self.abstract_class = true
    self.connection_class = true
  end
end
