import { useMemo, useState } from "react";

export interface UsePaginationOptions {
  totalItems: number;
  initialPage?: number;
  initialPageSize?: number;
  pageSizeOptions?: number[];
}

export interface UsePaginationResult {
  page: number;
  pageSize: number;
  totalPages: number;
  setPage: (nextPage: number) => void;
  setPageSize: (nextSize: number) => void;
  slice: [number, number];
}

export function usePagination(options: UsePaginationOptions): UsePaginationResult {
  const { totalItems, initialPage = 1, initialPageSize = 10 } = options;

  const [page, setPage] = useState<number>(Math.max(1, initialPage));
  const [pageSize, setPageSize] = useState<number>(initialPageSize);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(Math.max(0, totalItems) / Math.max(1, pageSize)));
  }, [totalItems, pageSize]);

  const safeSetPage = (nextPage: number) => {
    if (!Number.isFinite(nextPage)) return;
    const bounded = Math.min(Math.max(1, Math.trunc(nextPage)), totalPages);
    setPage(bounded);
  };

  const safeSetPageSize = (nextSize: number) => {
    if (!Number.isFinite(nextSize) || nextSize <= 0) return;
    setPageSize(Math.trunc(nextSize));
    // Reset to first page when pageSize changes to avoid out-of-range page
    setPage(1);
  };

  const slice = useMemo<[number, number]>(() => {
    const start = (page - 1) * pageSize;
    return [start, start + pageSize];
  }, [page, pageSize]);

  // Ensure current page remains valid when totalItems changes
  if (page > totalPages) {
    // This synchronous guard avoids a stale out-of-range page briefly rendering
    // while keeping logic simple for client-side pagination.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    setTimeout(() => setPage(1), 0);
  }

  return {
    page,
    pageSize,
    totalPages,
    setPage: safeSetPage,
    setPageSize: safeSetPageSize,
    slice,
  };
}


