# frozen_string_literal: true

module Daylight
  module Sanitizer
    # Context keys that must never be persisted.
    SENSITIVE_KEYS = %w[
      password password_confirmation current_password
      token secret api_key auth_token access_token
      refresh_token private_key credit_card cvv ssn
    ].map(&:freeze).freeze

    # Removes sensitive values from a context hash and safely serializes to JSON.
    def self.sanitize_and_serialize(hash)
      safe_json(filter_sensitive(hash))
    end

    def self.filter_sensitive(hash)
      hash.each_with_object({}) do |(k, v), result|
        result[k] = SENSITIVE_KEYS.any? { |s| k.to_s.downcase.include?(s) } ? "[FILTERED]" : v
      end
    end

    def self.safe_json(hash)
      seen = {}.compare_by_identity
      sanitize = ->(obj) do
        case obj
        when Hash
          return "(circular)" if seen.key?(obj)
          seen[obj] = true
          obj.each_with_object({}) { |(k, v), h| h[k] = sanitize.call(v) }
        when Array
          return "(circular)" if seen.key?(obj)
          seen[obj] = true
          obj.map { |v| sanitize.call(v) }
        else
          obj
        end
      end
      sanitize.call(hash).to_json
    rescue => e
      { "_daylight_serialization_error" => e.message }.to_json
    end
  end
end
