# frozen_string_literal: true

module Daylight
  module Paginatable
    extend ActiveSupport::Concern

    private

    # Simple offset pagination that returns a page struct and records.
    #
    #   @pagination, @records = paginate(scope, limit: 20)
    #   @pagination, @records = paginate(grouped_scope, count: 150, limit: 20)
    #
    def paginate(scope, limit: 20, count: nil)
      page = [params[:page].to_i, 1].max
      total = count || scope.count(:all)
      pages = [(total.to_f / limit).ceil, 1].max
      page = [page, pages].min

      offset = (page - 1) * limit
      records = scope.offset(offset).limit(limit)

      pagination = Daylight::Pagination.new(page: page, pages: pages, count: total, limit: limit)
      [pagination, records]
    end
  end
end
