export interface EventResponse {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  ownerUsername: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  memberCount: number;
  outdoor: boolean;
  boundaryGeoJson?: string;
  buildingPlanBase64?: string;
  customRoles?: string;
  customTags?: string;
  createdAt: string;
}

export interface EventStatsResponse {
  totalMembers: number;
  activeShifts: number;
  openIncidents: number;
  resolvedIncidentsToday: number;
  totalZones: number;
}

export interface EventMemberResponse {
  id: string;
  userId: string;
  username: string;
  role: 'COORDINATOR' | 'SECURITY' | 'VOLUNTEER';
  customRoleId: string | null;
  customRoleName: string | null;
  joinedAt: string;
}

export interface CustomRoleResponse {
  id: string;
  eventId: string;
  name: string;
  permissions: string;
}
