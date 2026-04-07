# frozen_string_literal: true

module Daylight
  module Database
    # Mixin for ActiveRecord classes that need a status_counts class method.
    # Extend the record class and call count_statuses to generate it.
    #
    # Examples:
    #   extend HasStatusCounts
    #   count_statuses :open, :investigating, :resolved, :false_alarm
    #   # => { open: N, investigating: N, resolved: N, false_alarm: N, total: N }
    #
    #   count_statuses :all, :draft, :approved, :pushed, :rejected, total: false
    #   # => { all: N, draft: N, approved: N, pushed: N, rejected: N }
    module HasStatusCounts
      def count_statuses(*statuses, total: true)
        define_singleton_method(:status_counts) do
          result = {}
          statuses.each do |status|
            if status == :all
              result[:all] = count
            else
              result[status] = where(status: status.to_s).count
            end
          end
          result[:total] = count if total && !statuses.include?(:all)
          result
        end
      end
    end
  end
end
