import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import * as ip from 'ip';

import { User, UserSchema } from '../database/schema/user.schema';
import { generateKeyPair } from '../utils/keygen';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: User.name,
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const schema = UserSchema;

          schema.pre('validate', async function (next) {
            if (this.isModified('password')) {
              this.password = await argon2.hash(this.password);
            }

            // Generate VPN IP address and key pair. Only generate for new users.
            if (this.isNew && !this.vpnIpAddress) {
              console.log('Generating VPN IP address and key pair...');
              const sameTypeUserCount = await this.model(User.name).countDocuments({
                role: this.role,
                vpnIpAddress: { $ne: null },
              });

              let vpnBaseSubnet: number;

              switch (this.role) {
                case 'user':
                  vpnBaseSubnet = ip.toLong(configService.get('WG_USER_BASE_SUBNET')!);
                  break;
                case 'coach':
                  vpnBaseSubnet = ip.toLong(configService.get('WG_COACH_BASE_SUBNET')!);
                  break;
                case 'admin':
                  vpnBaseSubnet = ip.toLong(configService.get('WG_ADMIN_BASE_SUBNET')!);
                  break;
              }

              this.vpnIpAddress = ip.fromLong(vpnBaseSubnet + sameTypeUserCount + 1);

              this.keyPair = generateKeyPair();
            }

            next();
          });

          return schema;
        },
      },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
