# frozen_string_literal: true

module Daylight
  Pagination = Struct.new(:page, :pages, :count, :limit, keyword_init: true) do
    def prev
      page > 1 ? page - 1 : nil
    end

    def next
      page < pages ? page + 1 : nil
    end
  end
end
