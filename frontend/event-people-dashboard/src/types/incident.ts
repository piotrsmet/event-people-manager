export interface IncidentResponse {
  id: string;
  reporterId: string;
  reporterUsername: string;
  zoneId: string | null;
  zoneName: string | null;
  eventId: string | null;
  type: 'MEDICAL' | 'SECURITY' | 'LOGISTICS' | 'OTHER';
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'FALSE_ALARM';
  locationLat: number | null;
  locationLng: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedIncidents {
  content: IncidentResponse[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}
