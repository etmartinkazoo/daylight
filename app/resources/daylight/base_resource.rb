# frozen_string_literal: true

module Daylight
  class BaseResource
    include Alba::Resource

    def self.serialize(object, params: {})
      new(object, params: params).serializable_hash
    end
  end
end
