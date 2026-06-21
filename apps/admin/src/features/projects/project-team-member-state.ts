export function memberIsActive(m: { isActive?: boolean }): boolean {
  return m.isActive !== false;
}

export function memberCanActivate(
  m: { userId: string; isActive?: boolean },
  workspaceMemberUserIds: Set<string>
): boolean {
  return !memberIsActive(m) && workspaceMemberUserIds.has(m.userId);
}
