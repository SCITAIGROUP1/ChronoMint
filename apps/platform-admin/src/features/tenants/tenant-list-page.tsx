"use client";

import { ROUTES, type PlatformTenantListResponseDto } from "@kloqra/contracts";
import {
  AppBar,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  Table,
  TableBody,
  TableRow
} from "@kloqra/ui";
import { api } from "@kloqra/web-shared";
import Link from "next/link";
import { useEffect, useState } from "react";

export function TenantListPage() {
  const [data, setData] = useState<PlatformTenantListResponseDto | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void api<PlatformTenantListResponseDto>(`${ROUTES.PLATFORM.TENANTS}?page=1&limit=25`)
      .then(setData)
      .catch(() => setError("Failed to load tenants"));
  }, []);

  return (
    <div className="space-y-6 p-6">
      <AppBar
        title="Tenants"
        description="Organization accounts provisioned on Kloqra."
        actions={
          <Link
            href="/tenants/new"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create tenant
          </Link>
        }
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <DataTableCard>
        <Table>
          <TableBody>
            <DataTableHeaderRow>
              <DataTableHead>Name</DataTableHead>
              <DataTableHead>Slug</DataTableHead>
              <DataTableHead>Status</DataTableHead>
              <DataTableHead>Plan</DataTableHead>
              <DataTableHead>Workspaces</DataTableHead>
              <DataTableHead>Members</DataTableHead>
            </DataTableHeaderRow>
            {(data?.items ?? []).map((tenant) => (
              <TableRow key={tenant.id}>
                <DataTableCell>
                  <Link
                    href={`/tenants/${tenant.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {tenant.name}
                  </Link>
                </DataTableCell>
                <DataTableCell>{tenant.slug}</DataTableCell>
                <DataTableCell>{tenant.status}</DataTableCell>
                <DataTableCell>{tenant.planSlug ?? "—"}</DataTableCell>
                <DataTableCell>{tenant.workspaceCount}</DataTableCell>
                <DataTableCell>{tenant.memberCount}</DataTableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableCard>
    </div>
  );
}
