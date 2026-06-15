export interface StrategicPointResponse {
  id: string;
  eventId: string;
  name: string;
  type: 'MEDICAL' | 'SECURITY' | 'ENTRANCE' | 'STAGE' | 'INFO' | 'OTHER';
  latitude?: number;
  longitude?: number;
  xRatio?: number;
  yRatio?: number;
}

export interface CreateStrategicPointRequest {
  name: string;
  type: 'MEDICAL' | 'SECURITY' | 'ENTRANCE' | 'STAGE' | 'INFO' | 'OTHER';
  latitude?: number;
  longitude?: number;
  xRatio?: number;
  yRatio?: number;
}
