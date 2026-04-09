# frozen_string_literal: true

module Daylight
  class DeployResource < BaseResource
    attributes :id, :version, :description, :git_sha, :deployed_by, :deployed_at
  end
end
