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
    const user = await this.userModel.findOne({ username: 'admin' }).lean();
    if (!user) {
      console.log('Initializing admin user...');
      await this.userModel.create({
        username: 'admin',
        password: await argon2.hash('admin'),
        userType: 'admin',
        isActive: true,
      });
    }
    const defaultPasswordCheck = await argon2.verify(user.password, 'admin');
    if (defaultPasswordCheck) {
      console.warn(
        'Password for admin user is currently set to default. Please change it as soon as possible.',
      );
    }
  }

  async findAll(): Promise<UserDocument[]> {
    const users = await this.userModel.find().lean();
    return users;
  }

  async findById(id: string): Promise<UserDocument> {
    const user = this.userModel.findById(id).lean();
    return user;
  }

  async findByUsername(username: string): Promise<UserDocument> {
    const user = this.userModel.findOne({ username: username }).lean();
    return user;
  }

  async update(userId: string, data: Partial<User>): Promise<void> {
    if (data.password) {
      data.password = await argon2.hash(data.password);
    }
    await this.userModel.findByIdAndUpdate(userId, data);
  }
}
