import {
  DEFAULT_DROPDOWN_LIST_LIMIT,
  DEFAULT_TABLE_PAGE_SIZE,
  buildPaginationMeta,
  type PaginatedResponse
} from "@kloqra/contracts";
import { api } from "./client";
import { appendListQuery, buildListQuery } from "./list-query";

type ListApiResponse<T> = T[] | PaginatedResponse<T>;

export function normalizePaginatedListResponse<T>(
  data: ListApiResponse<T>,
  page: number,
  limit: number
): PaginatedResponse<T> {
  if (Array.isArray(data)) {
    const total = data.length;
    return { items: data, ...buildPaginationMeta(total, page, limit) };
  }
  const items = data.items ?? [];
  const total = data.total ?? items.length;
  return {
    items,
    page: data.page ?? page,
    limit: data.limit ?? limit,
    total,
    totalPages: data.totalPages ?? buildPaginationMeta(total, page, limit).totalPages
  };
}

export async function fetchListItems<T>(
  path: string,
  options: {
    workspaceId: string;
    filters?: Record<string, string | string[] | number | boolean | undefined | null>;
    limit?: number;
  }
): Promise<T[]> {
  const limit = options.limit ?? DEFAULT_DROPDOWN_LIST_LIMIT;
  const query = buildListQuery({
    page: 1,
    limit,
    filters: options.filters
  });
  const res = await api<ListApiResponse<T>>(appendListQuery(path, query), {
    workspaceId: options.workspaceId
  });
  return normalizePaginatedListResponse(res, 1, limit).items;
}

export async function fetchPaginatedList<T>(
  path: string,
  options: {
    workspaceId: string;
    page: number;
    limit?: number;
    search?: string;
    filters?: Record<string, string | string[] | number | boolean | undefined | null>;
    signal?: AbortSignal;
  }
): Promise<PaginatedResponse<T>> {
  const limit = options.limit ?? DEFAULT_TABLE_PAGE_SIZE;
  const query = buildListQuery({
    page: options.page,
    limit,
    search: options.search,
    filters: options.filters
  });
  const res = await api<ListApiResponse<T>>(appendListQuery(path, query), {
    workspaceId: options.workspaceId,
    signal: options.signal
  });
  return normalizePaginatedListResponse(res, options.page, limit);
}
