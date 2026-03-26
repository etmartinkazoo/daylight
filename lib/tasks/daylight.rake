# frozen_string_literal: true

namespace :daylight do
  desc "Clean up old Daylight data based on retention_days setting"
  task cleanup: :environment do
    result = Daylight::Cleanup.perform
    puts "Daylight cleanup complete:"
    result.each { |table, count| puts "  #{table}: #{count} records deleted" }
  end
end
