export interface ZoneResponse {
  id: string;
  name: string;
  description: string;
  capacity: number | null;
  eventId: string;
  createdAt: string;
  boundaryGeoJson: string | null;
  color: string;
  allowedRoles: string;
  accessTags: string;
}

export interface CreateZoneRequest {
  name: string;
  description: string;
  capacity?: number;
  boundaryGeoJson?: string | null;
  color?: string;
  allowedRoles?: string;
  accessTags?: string;
}
