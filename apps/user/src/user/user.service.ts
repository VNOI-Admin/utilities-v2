import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import { User, UserDocument } from '../database/schema/user.schema';
import { Model } from 'mongoose';

@Injectable()
export class UserService implements OnModuleInit {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async onModuleInit() {
    let user = await this.userModel.findOne({ username: 'admin' });
    if (!user) {
      console.log('Initializing admin user...');
      user = await this.userModel.create({
        username: 'admin',
        password: 'admin',
        role: 'admin',
        isActive: true,
        refreshToken: null,
      });
    }
    const defaultPasswordCheck = await argon2.verify(user.password, 'admin');
    if (defaultPasswordCheck) {
      console.warn(
        'Password for admin user is currently set to default. Please change it as soon as possible.',
      );
    }
  }
}
