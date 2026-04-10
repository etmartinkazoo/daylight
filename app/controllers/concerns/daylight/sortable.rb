# frozen_string_literal: true

# Include in any Daylight controller that needs column sorting on index views.
#
# Usage in controller:
#   scope = apply_sort(scope, default: "last_seen_at", allowed: %w[error_class occurrences_count last_seen_at])
#
# For aggregated queries where you need a SQL expression:
#   order_sql = sort_order_sql(default: "total DESC", allowed: { "total" => "total", "avg_duration" => "avg_duration" })
#
# Reads params[:sort] and params[:direction] from the request.
# Passes sort_column and sort_direction to Inertia props via sort_props.
module Daylight
  module Sortable
    extend ActiveSupport::Concern

    private

    def apply_sort(scope, default: "created_at", allowed: [], direction: "desc")
      col = params[:sort].presence
      dir = params[:direction].presence

      col = allowed.include?(col) ? col : default
      dir = %w[asc desc].include?(dir) ? dir : direction

      @_sort_column = col
      @_sort_direction = dir

      scope.reorder(col => dir)
    end

    # For aggregated/grouped queries, returns an Arel ORDER BY expression.
    def sort_order_sql(default:, allowed: {}, direction: "desc")
      col = params[:sort].presence
      dir = params[:direction].presence

      resolved_col = allowed.key?(col) ? col : default.split(/\s+/).first
      resolved_expr = allowed[resolved_col] || resolved_col
      dir = %w[asc desc].include?(dir) ? dir : direction

      @_sort_column = resolved_col
      @_sort_direction = dir

      Arel.sql("#{resolved_expr} #{dir}")
    end

    def sort_props
      {
        sort_column: @_sort_column,
        sort_direction: @_sort_direction
      }
    end
  end
end
