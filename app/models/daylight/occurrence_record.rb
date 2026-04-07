# frozen_string_literal: true

module Daylight
  class OccurrenceRecord < Record
    self.table_name = "daylight_occurrences"

    after_create :probabilistic_cleanup

    private

    # On ~1% of inserts, purge occurrences belonging to resolved/ignored errors
    # older than the configured retention window.
    # No background job needed — self-cleaning at write time.
    def probabilistic_cleanup
      return unless (id % 100).zero?

      retention_days = (Database.get_setting("retention_days") || "30").to_i
      cutoff = retention_days.days.ago

      resolved_error_ids = ErrorRecord
        .where(status: %w[resolved ignored])
        .where("last_seen_at < ?", cutoff)
        .select(:id)

      old_occurrences = OccurrenceRecord
        .where(error_id: resolved_error_ids)
        .where("occurred_at < ?", cutoff)

      deleted_error_ids = old_occurrences.pluck(:error_id).uniq
      old_occurrences.delete_all

      ErrorRecord
        .where(id: deleted_error_ids)
        .where.not(id: OccurrenceRecord.select(:error_id).distinct)
        .delete_all
    rescue StandardError
      # Never let cleanup break recording
    end
  end
end
