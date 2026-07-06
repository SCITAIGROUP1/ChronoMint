"use client";

import { DEFAULT_TABLE_PAGE_SIZE } from "@kloqra/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";

export function useClientTablePagination<T>(items: T[], initialPageSize = DEFAULT_TABLE_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const [limit, setLimitState] = useState(initialPageSize);

  const total = items.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  useEffect(() => {
    setPage(1);
  }, [items]);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const setLimit = useCallback((nextLimit: number) => {
    setPage(1);
    setLimitState(nextLimit);
  }, []);

  const pageItems = useMemo(() => {
    const start = (page - 1) * limit;
    return items.slice(start, start + limit);
  }, [items, page, limit]);

  return {
    page,
    setPage,
    setLimit,
    pageItems,
    total,
    totalPages,
    limit
  };
}
