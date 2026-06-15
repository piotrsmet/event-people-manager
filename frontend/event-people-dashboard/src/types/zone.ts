export interface ZoneResponse {
  id: string;
  name: string;
  description: string;
  capacity: number | null;
  eventId: string;
  createdAt: string;
}

export interface CreateZoneRequest {
  name: string;
  description: string;
  capacity?: number;
}
