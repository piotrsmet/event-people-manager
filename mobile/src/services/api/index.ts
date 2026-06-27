import { authApi } from "./auth";
import { userApi } from "./user";
import { eventApi } from "./event";
import { zoneApi } from "./zone";
import { shiftApi } from "./shift";
import { locationApi } from "./location";
import { incidentApi } from "./incident";
import { strategicPointApi } from "./strategicPoint";
import { chatApi } from "./chat";
import { staffingApi } from "./staffing";
import { notificationApi } from "./notification";

export * from "./base";

export const api = {
  ...authApi,
  ...userApi,
  ...eventApi,
  ...zoneApi,
  ...shiftApi,
  ...locationApi,
  ...incidentApi,
  ...strategicPointApi,
  ...chatApi,
  ...staffingApi,
  ...notificationApi,
};
export type { UserResponse, EventResponse, ZoneResponse, ShiftResponse, IncidentResponse } from "./base";
export type { StrategicPointResponse } from "./strategicPoint";
export type { ChatMessageResponse } from "./chat";
export type { StaffingRequestResponse, StaffingResponseResponse } from "./staffing";
export type { NotificationResponse } from "./notification";

