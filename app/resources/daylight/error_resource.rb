# frozen_string_literal: true

module Daylight
  class ErrorResource < BaseResource
    include ActionView::Helpers::DateHelper
    attributes :id, :fingerprint, :error_class, :message, :backtrace_summary,
               :occurrences_count, :status, :severity

    attribute :handled do |e|
      e.try(:handled)
    end

    attribute :source do |e|
      e.try(:source)
    end

    attribute :affected_users_count do |e|
      e.try(:affected_users_count) || 0
    end

    attribute :avg_duration_ms do |e|
      e.try(:avg_duration_ms)
    end

    attribute :max_duration_ms do |e|
      e.try(:max_duration_ms)
    end

    attribute :threshold_exceeded_count do |e|
      e.try(:threshold_exceeded_count) || 0
    end

    attribute :first_seen_at do |e|
      e.first_seen_at&.strftime("%b %-d, %Y, %I:%M %p") || ""
    end

    attribute :last_seen_at do |e|
      e.last_seen_at&.strftime("%b %-d, %Y, %I:%M %p") || ""
    end

    attribute :last_seen_ago do |e|
      return "" if e.last_seen_at.nil?
      time_ago_in_words(e.last_seen_at) + " ago"
    end

    # params[:recent_occurrences] is a { error_id => [hashes] } map, injected by the controller
    attribute :recent_occurrences do |e|
      (params[:recent_occurrences] || {})[e.id] || []
    end

    attribute :ai_context do |e|
      recent = (params[:recent_occurrences] || {})[e.id] || []
      e.ai_context(recent)
    end
  end
end
