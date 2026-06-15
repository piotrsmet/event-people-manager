import { authApi } from "./auth";
import { userApi } from "./user";
import { eventApi } from "./event";
import { zoneApi } from "./zone";
import { shiftApi } from "./shift";
import { locationApi } from "./location";
import { incidentApi } from "./incident";

export * from "./base";

export const api = {
  ...authApi,
  ...userApi,
  ...eventApi,
  ...zoneApi,
  ...shiftApi,
  ...locationApi,
  ...incidentApi,
};
export type { UserResponse, EventResponse, ZoneResponse, ShiftResponse, IncidentResponse } from "./base";
