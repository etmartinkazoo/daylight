# frozen_string_literal: true

module Daylight
  class DeployRecord < Record
    self.table_name = "daylight_deploys"

    validates :version, :deployed_at, presence: true
  end
end
