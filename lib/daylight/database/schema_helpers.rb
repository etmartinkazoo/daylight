# frozen_string_literal: true

module Daylight
  module Database
    # Helpers for idempotent schema migrations.
    # Extend the Database module with this to get create_table_once and add_column_once.
    module SchemaHelpers
      private

      # Creates a table only if it doesn't already exist.
      # Define columns and indexes inline with t.column / t.index inside the block.
      def create_table_once(conn, table, &block)
        conn.create_table(table, &block) unless conn.table_exists?(table)
      end

      # Adds a column only when the table exists but the column does not.
      # Pass index: true to also index the new column (uses column name as index name).
      # Pass index: :other_column to index a different column after adding.
      def add_column_once(conn, table, column, type, index: false, **opts)
        return unless conn.table_exists?(table) && !conn.column_exists?(table, column)

        conn.add_column(table, column, type, **opts)
        idx = index == true ? column : index
        conn.add_index(table, idx) rescue nil if idx
      end
    end
  end
end
