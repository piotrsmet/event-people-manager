export interface StaffingRequestResponse {
  id: string;
  eventId: string;
  zoneId: string | null;
  zoneName: string | null;
  strategicPointId: string | null;
  strategicPointName: string | null;
  countNeeded: number;
  description: string | null;
  status: string;
  createdAt: string;
}

export interface StaffingResponseResponse {
  id: string;
  staffingRequestId: string;
  userId: string;
  username: string;
  createdAt: string;
}
