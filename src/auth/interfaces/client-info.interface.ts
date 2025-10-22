export interface ClientInfo {
  ipAddress: string;
  originalIpAddress: string | null;
  userAgent: string;
  isProxy: boolean;
}
