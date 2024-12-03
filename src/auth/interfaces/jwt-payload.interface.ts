import { Role } from '../../common/enums/role.enum';

export interface JwtPayload {
  sub: number;
  username: string;
  roles: Role[];
  type: 'access' | 'refresh';
}
