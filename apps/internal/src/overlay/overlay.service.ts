import { OverlayLayout, OverlayLayoutDocument } from '@libs/common-db/schemas/overlay.schema';
import { User, UserDocument } from '@libs/common-db/schemas/user.schema';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SingleUserStreamDto } from './dtos/single-user-stream.dto';
import { MULTI_USER_STREAM_KEY, MultiUserStream } from './layouts/multi-user-stream';
import { USER_STREAM_KEY, UserStream } from './layouts/user-stream';
import { OverlayLayoutResponse } from './responses/overlay-latout.response';

@Injectable()
export class OverlayService {
  private livestreamProxy: string;

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(OverlayLayout.name)
    private readonly overlayLayoutModel: Model<OverlayLayoutDocument>,

    private readonly configService: ConfigService,
  ) {
    this.livestreamProxy = this.configService.get('LIVESTREAM_PROXY_URL') ?? '';
  }

  async getCurrentLayout() {
    const layout = await this.overlayLayoutModel.findOne({
      current: true,
    });

    if (!layout) {
      return 'default';
    }

    return new OverlayLayoutResponse({
      key: layout.key,
      data: layout.data,
      current: layout.current,
    });
  }

  async setCurrentLayout(layout: string) {
    await this.overlayLayoutModel.updateMany({}, { current: false });
    await this.overlayLayoutModel.updateOne({ key: layout }, { current: true }, { upsert: true });
  }

  async setUserStream(body: SingleUserStreamDto) {
    const user = await this.userModel.findOne({ username: body.username });

    if (!user) {
      throw new Error('User not found');
    }

    const streamUrl =
      !body.stream && body.webcam ? undefined : `${this.livestreamProxy}/${user.vpnIpAddress}/stream.m3u8`;
    const webcamUrl =
      !body.webcam && body.stream ? undefined : `${this.livestreamProxy}/${user.vpnIpAddress}/webcam.m3u8`;

    const userStream = new UserStream({
      username: body.username,
      streamUrl,
      webcamUrl,
    });

    await this.overlayLayoutModel.updateOne({ key: USER_STREAM_KEY }, { data: userStream.toRecord() }, { upsert: true });

    await this.setCurrentLayout(USER_STREAM_KEY);

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

  async getStreamSourceByUsername(username: string) {
    const user = await this.userModel.findOne({ username }).lean();

    if (!user) {
      throw new Error('User not found');
    }

    const streamUrl = `${this.livestreamProxy}/${user.vpnIpAddress}/stream.m3u8`;
    const webcamUrl = `${this.livestreamProxy}/${user.vpnIpAddress}/webcam.m3u8`;

    return new UserStream({
      username,
      streamUrl,
      webcamUrl,
    });
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
      { key: MULTI_USER_STREAM_KEY },
      { data: multiUserStream.toRecord() },
      { upsert: true },
    );

    await this.setCurrentLayout(MULTI_USER_STREAM_KEY);

    return multiUserStream.toRecord();
  }
}
