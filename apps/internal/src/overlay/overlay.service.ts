import { User, UserDocument } from '@libs/common-db/schemas/user.schema';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserStream } from './layouts/user-stream';
import { ConfigService } from '@nestjs/config';
import {
  OverlayLayout,
  OverlayLayoutDocument,
} from '@libs/common-db/schemas/overlay.schema';
import { MultiUserStream } from './layouts/multi-user-stream';

@Injectable()
export class OverlayService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(OverlayLayout.name)
    private readonly overlayLayoutModel: Model<OverlayLayoutDocument>,

    private readonly configService: ConfigService,
  ) {}

  async setUserStream(username: string) {
    const user = await this.userModel.findOne({ username });

    if (!user) {
      throw new Error('User not found');
    }

    const livestreamProxy = this.configService.get('LIVESTREAM_PROXY_URL');
    const streamUrl = `${livestreamProxy}/${user.vpnIpAddress}/stream.m3u8`;
    const webcamUrl = `${livestreamProxy}/${user.vpnIpAddress}/webcam.m3u8`;

    const userStream = new UserStream({
      username,
      streamUrl,
      webcamUrl,
    });

    await this.overlayLayoutModel.updateOne(
      { key: 'user-stream' },
      { data: userStream.toRecord() },
      { upsert: true },
    );

    return userStream.toRecord();
  }

  async getUserStream() {
    const layout = await this.overlayLayoutModel.findOne({
      key: 'user-stream',
    });

    if (!layout) {
      return new UserStream({
        username: '',
        streamUrl: '',
        webcamUrl: '',
      });
    }

    return layout.data;
  }

  async getMultiUserStream() {
    const layout = await this.overlayLayoutModel.findOne({
      key: 'multi-user-stream',
    });

    if (!layout) {
      return [];
    }

    return layout.data;
  }

  async setMultiUserStream(usernames: string[]) {
    const users = await Promise.all(
      usernames.map(async (username) => {
        const user = await this.userModel.findOne({ username });

        if (!user) {
          throw new Error('User not found');
        }

        const livestreamProxy = this.configService.get('LIVESTREAM_PROXY');
        const streamUrl = `${livestreamProxy}/${user.vpnIpAddress}/stream.m3u8`;
        const webcamUrl = `${livestreamProxy}/${user.vpnIpAddress}/webcam.m3u8`;

        return new UserStream({
          username,
          streamUrl,
          webcamUrl,
        });
      }),
    );

    const multiUserStream = new MultiUserStream({ users });

    await this.overlayLayoutModel.updateOne(
      { key: 'multi-user-stream' },
      { data: multiUserStream.toRecord() },
      { upsert: true },
    );

    return multiUserStream.toRecord();
  }
}
