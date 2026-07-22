"use client";

import {
  POLICY_CHECKSUM,
  ROUTES,
  type BatchPolicyMutationDto,
  type PermissionCatalogItemDto,
  type PermissionPolicyDocumentDto,
  type PolicyDirectoryQueryDto,
  type PolicyMutationResultDto,
  type PolicyTargetDto,
  type PrincipalPolicyDirectoryDto,
  type ResetPolicyDto,
  type RolePolicyDirectoryDto
} from "@kloqra/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { buildListQuery } from "../../api/list-query";
import { tenantApiOptions, useTenantApiWorkspaceId } from "./tenant-api-workspace";

function targetKey(target: PolicyTargetDto | null | undefined): string {
  if (!target) return "none";
  return target.type === "ROLE"
    ? `role:${target.role}:${target.scope}:${target.resourceId}`
    : `principal:${target.principalId}:${target.scope}:${target.resourceId}`;
}

export const permissionPolicyQueryKeys = {
  all: ["permission-policy"] as const,
  catalog: () => [...permissionPolicyQueryKeys.all, "catalog"] as const,
  directories: () => [...permissionPolicyQueryKeys.all, "directory"] as const,
  directory: (kind: "roles" | "principals", query: PolicyDirectoryQueryDto) =>
    [...permissionPolicyQueryKeys.directories(), kind, query] as const,
  documents: () => [...permissionPolicyQueryKeys.all, "document"] as const,
  document: (target: PolicyTargetDto | null | undefined) =>
    [...permissionPolicyQueryKeys.documents(), targetKey(target)] as const
};

function directoryPath(route: string, query: PolicyDirectoryQueryDto): string {
  const search = buildListQuery({
    page: query.page,
    limit: query.limit,
    search: query.search,
    filters: { scope: query.scope, resourceId: query.resourceId }
  });
  return `${route}?${search}`;
}

export function permissionPolicyDocumentPath(route: string, target: PolicyTargetDto): string {
  const search = new URLSearchParams({
    scope: target.scope,
    resourceId: target.resourceId
  });
  return `${route}?${search.toString()}`;
}

export function usePermissionPolicyCatalog(enabled = true) {
  const workspaceId = useTenantApiWorkspaceId();
  return useQuery({
    queryKey: permissionPolicyQueryKeys.catalog(),
    queryFn: () =>
      api<PermissionCatalogItemDto[]>(
        ROUTES.TENANTS.PERMISSION_POLICY_CATALOG,
        tenantApiOptions(workspaceId)
      ),
    enabled,
    staleTime: 5 * 60_000
  });
}

export function useRolePolicyDirectory(query: PolicyDirectoryQueryDto, enabled = true) {
  const workspaceId = useTenantApiWorkspaceId();
  return useQuery({
    queryKey: permissionPolicyQueryKeys.directory("roles", query),
    queryFn: () =>
      api<RolePolicyDirectoryDto>(
        directoryPath(ROUTES.TENANTS.ROLE_POLICIES, query),
        tenantApiOptions(workspaceId)
      ),
    enabled,
    placeholderData: (previous) => previous
  });
}

export function usePrincipalPolicyDirectory(query: PolicyDirectoryQueryDto, enabled = true) {
  const workspaceId = useTenantApiWorkspaceId();
  return useQuery({
    queryKey: permissionPolicyQueryKeys.directory("principals", query),
    queryFn: () =>
      api<PrincipalPolicyDirectoryDto>(
        directoryPath(ROUTES.TENANTS.PRINCIPAL_POLICIES, query),
        tenantApiOptions(workspaceId)
      ),
    enabled,
    placeholderData: (previous) => previous
  });
}

export function usePermissionPolicy(target: PolicyTargetDto | null, enabled = true) {
  const workspaceId = useTenantApiWorkspaceId();
  const path =
    target?.type === "ROLE"
      ? permissionPolicyDocumentPath(ROUTES.TENANTS.ROLE_POLICY(target.role), target)
      : target?.type === "PRINCIPAL"
        ? permissionPolicyDocumentPath(ROUTES.TENANTS.PRINCIPAL_POLICY(target.principalId), target)
        : "";
  return useQuery({
    queryKey: permissionPolicyQueryKeys.document(target),
    queryFn: () => api<PermissionPolicyDocumentDto>(path, tenantApiOptions(workspaceId)),
    enabled: enabled && Boolean(target),
    refetchOnMount: "always"
  });
}

export function useSavePermissionPolicy() {
  const workspaceId = useTenantApiWorkspaceId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: BatchPolicyMutationDto) =>
      api<PolicyMutationResultDto>(ROUTES.TENANTS.PERMISSION_POLICY_BATCH, {
        method: "PATCH",
        body: JSON.stringify(request),
        ...tenantApiOptions(workspaceId)
      }),
    onMutate: async (request) => {
      const target = request.mutations[0]?.target;
      if (!target) return {};
      const key = permissionPolicyQueryKeys.document(target);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PermissionPolicyDocumentDto>(key);
      if (previous) {
        const configured = new Map(
          request.mutations.map((mutation) => [mutation.permission, mutation.configured])
        );
        queryClient.setQueryData<PermissionPolicyDocumentDto>(key, {
          ...previous,
          items: previous.items.map((item) => ({
            ...item,
            configured: configured.get(item.permission) ?? item.configured
          }))
        });
      }
      return { previous, target };
    },
    onError: (_error, _request, context) => {
      if (context?.previous && context.target) {
        queryClient.setQueryData(
          permissionPolicyQueryKeys.document(context.target),
          context.previous
        );
      }
    },
    onSuccess: (result) => {
      queryClient.setQueryData<PermissionPolicyDocumentDto>(
        permissionPolicyQueryKeys.document(result.target),
        {
          policyVersion: result.policyVersion,
          policyChecksum: POLICY_CHECKSUM,
          revision: result.revision,
          target: result.target,
          items: result.items
        }
      );
    },
    onSettled: (_data, error) => {
      void queryClient.invalidateQueries({ queryKey: permissionPolicyQueryKeys.directories() });
      if (error) {
        void queryClient.invalidateQueries({ queryKey: permissionPolicyQueryKeys.documents() });
      }
    }
  });
}

export function useResetPermissionPolicy() {
  const workspaceId = useTenantApiWorkspaceId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: ResetPolicyDto) => {
      const path =
        request.target.type === "ROLE"
          ? ROUTES.TENANTS.ROLE_POLICY_RESET(request.target.role)
          : ROUTES.TENANTS.PRINCIPAL_POLICY_RESET(request.target.principalId);
      return api<PolicyMutationResultDto>(path, {
        method: "POST",
        body: JSON.stringify(request),
        ...tenantApiOptions(workspaceId)
      });
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({
        queryKey: permissionPolicyQueryKeys.document(result.target)
      });
      void queryClient.invalidateQueries({ queryKey: permissionPolicyQueryKeys.directories() });
    }
  });
}
