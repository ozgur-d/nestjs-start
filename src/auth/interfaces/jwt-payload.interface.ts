import { Role } from '../../common/enums/role.enum';

export interface JwtPayload {
  sub: string;
  username: string;
  roles: Role[];
  jti: string; // JWT ID - unique identifier for each token
  iat?: number; // Issued at timestamp (seconds) - auto-added by JWT
  exp?: number; // Expiration timestamp (seconds) - auto-added by JWT
}
