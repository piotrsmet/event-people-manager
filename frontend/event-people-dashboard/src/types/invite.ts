export interface InviteTokenResponse {
  id: string;
  eventId: string;
  eventName: string;
  code: string;
  assignedRole: 'COORDINATOR' | 'SECURITY' | 'VOLUNTEER';
  maxUses: number | null;
  currentUses: number;
  expiresAt: string | null;
  valid: boolean;
  createdAt: string;
}
