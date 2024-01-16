import { Expose } from 'class-transformer';

export class UserEntity {
  @Expose()
  _id: string;

  @Expose()
  username: string;

  @Expose()
  password: string;

  @Expose()
  refreshToken: string;

  @Expose()
  ipAddress: string;

  @Expose()
  userType: 'admin' | 'coach' | 'user';

  @Expose()
  isActive: boolean;
}
