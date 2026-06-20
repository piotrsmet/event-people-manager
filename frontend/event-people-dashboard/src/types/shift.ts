export interface ShiftResponse {
  id: string;
  userId: string;
  username: string;
  zoneId: string | null;
  zoneName: string | null;
  strategicPointId: string | null;
  strategicPointName: string | null;
  eventId: string | null;
  startTime: string;
  endTime: string | null;
  status: 'STARTED' | 'COMPLETED' | 'IN_PROGRESS';
  createdAt: string;
}
