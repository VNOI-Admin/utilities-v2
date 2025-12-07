import { OverlayLayout, OverlayLayoutDocument } from '@libs/common-db/schemas/overlay.schema';
import { User, UserDocument } from '@libs/common-db/schemas/user.schema';
import { Submission, SubmissionDocument } from '@libs/common-db/schemas/submission.schema';
import { Participant, ParticipantDocument } from '@libs/common-db/schemas/participant.schema';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SingleUserStreamDto } from './dtos/single-user-stream.dto';
import { WebcamLayoutDto } from './dtos/webcam-layout.dto';
import { GlobalConfigDto, FooterContentType } from './dtos/global-config.dto';
import { SingleContestantConfigDto, DisplayMode } from './dtos/single-contestant-config.dto';
import { MultiContestantConfigDto, LayoutMode } from './dtos/multi-contestant-config.dto';
import { AnnouncementConfigDto } from './dtos/announcement.dto';
import { MULTI_USER_STREAM_KEY, MultiUserStream } from './layouts/multi-user-stream';
import { USER_STREAM_KEY, UserStream } from './layouts/user-stream';
import { WEBCAM_LAYOUT_KEY, WebcamLayout } from './layouts/webcam-layout';
import { GLOBAL_CONFIG_KEY, GlobalConfig } from './layouts/global-config';
import { SINGLE_CONTESTANT_KEY, SingleContestantConfig } from './layouts/single-contestant-config';
import { MULTI_CONTESTANT_KEY, MultiContestantConfig } from './layouts/multi-contestant-config';
import { ANNOUNCEMENTS_KEY, AnnouncementConfig } from './layouts/announcement-config';
import { RANKING_KEY, RankingConfig } from './layouts/ranking-config';
import { OverlayLayoutResponse } from './responses/overlay-latout.response';

export interface SubmissionWithAuthor {
  _id?: unknown;
  submittedAt: Date;
  judgedAt?: Date;
  author: string;
  submissionStatus: string;
  contest_code: string;
  problem_code: string;
  authorFullName: string;
  [key: string]: unknown;
}

@Injectable()
export class OverlayService {
  private livestreamProxy: string;

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(OverlayLayout.name)
    private readonly overlayLayoutModel: Model<OverlayLayoutDocument>,
    @InjectModel(Submission.name)
    private readonly submissionModel: Model<SubmissionDocument>,
    @InjectModel(Participant.name)
    private readonly participantModel: Model<ParticipantDocument>,

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

  async setWebcamLayout(body: WebcamLayoutDto) {
    const webcamLayout = new WebcamLayout({
      enabled: body.enabled,
    });

    await this.overlayLayoutModel.updateOne({ key: WEBCAM_LAYOUT_KEY }, { data: webcamLayout.toRecord() }, { upsert: true });

    await this.setCurrentLayout(WEBCAM_LAYOUT_KEY);

    return webcamLayout.toRecord();
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

  async getWebcamLayout() {
    const layout = await this.overlayLayoutModel.findOne({
      key: WEBCAM_LAYOUT_KEY,
    });

    if (!layout) {
      return new WebcamLayout({
        enabled: false,
      });
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

  // New methods for overlay feature

  async getGlobalConfig() {
    const layout = await this.overlayLayoutModel.findOne({
      key: GLOBAL_CONFIG_KEY,
    });

    if (!layout) {
      return new GlobalConfig({
        contestId: '',
        fullViewMode: false,
        showSubmissionQueue: true,
        showFooter: true,
        footerContentType: FooterContentType.ANNOUNCEMENTS,
        currentLayout: 'none',
      }).toRecord();
    }

    return layout.data;
  }

  async setGlobalConfig(body: GlobalConfigDto) {
    const globalConfig = new GlobalConfig(body);

    await this.overlayLayoutModel.updateOne(
      { key: GLOBAL_CONFIG_KEY },
      { data: globalConfig.toRecord() },
      { upsert: true },
    );

    return globalConfig.toRecord();
  }

  async getSingleContestantConfig() {
    const layout = await this.overlayLayoutModel.findOne({
      key: SINGLE_CONTESTANT_KEY,
    });

    if (!layout) {
      return new SingleContestantConfig({
        username: '',
        displayMode: DisplayMode.BOTH,
        swapSources: false,
      }).toRecord();
    }

    return layout.data;
  }

  async setSingleContestantConfig(body: SingleContestantConfigDto) {
    const user = await this.userModel.findOne({ username: body.username });

    if (!user) {
      throw new Error('User not found');
    }

    const singleContestantConfig = new SingleContestantConfig(body);

    await this.overlayLayoutModel.updateOne(
      { key: SINGLE_CONTESTANT_KEY },
      { data: singleContestantConfig.toRecord() },
      { upsert: true },
    );

    return singleContestantConfig.toRecord();
  }

  async getMultiContestantConfig() {
    const layout = await this.overlayLayoutModel.findOne({
      key: MULTI_CONTESTANT_KEY,
    });

    if (!layout) {
      return new MultiContestantConfig({
        usernames: [],
        layoutMode: LayoutMode.SIDE_BY_SIDE,
      }).toRecord();
    }

    return layout.data;
  }

  async setMultiContestantConfig(body: MultiContestantConfigDto) {
    // Validate all users exist
    for (const username of body.usernames) {
      const user = await this.userModel.findOne({ username });
      if (!user) {
        throw new Error(`User not found: ${username}`);
      }
    }

    const multiContestantConfig = new MultiContestantConfig(body);

    await this.overlayLayoutModel.updateOne(
      { key: MULTI_CONTESTANT_KEY },
      { data: multiContestantConfig.toRecord() },
      { upsert: true },
    );

    return multiContestantConfig.toRecord();
  }

  async getAnnouncements() {
    const layout = await this.overlayLayoutModel.findOne({
      key: ANNOUNCEMENTS_KEY,
    });

    if (!layout) {
      return new AnnouncementConfig({
        announcements: [],
      }).toRecord();
    }

    return layout.data;
  }

  async setAnnouncements(body: AnnouncementConfigDto) {
    const announcementConfig = new AnnouncementConfig(body);

    await this.overlayLayoutModel.updateOne(
      { key: ANNOUNCEMENTS_KEY },
      { data: announcementConfig.toRecord() },
      { upsert: true },
    );

    return announcementConfig.toRecord();
  }

  async getRecentSubmissions(contestCode: string, limit = 10): Promise<SubmissionWithAuthor[]> {
    const submissions = await this.submissionModel
      .find({ contest_code: contestCode })
      .sort({ submittedAt: -1 })
      .limit(limit)
      .lean();

    // Fetch participant and mapped user details to compute displayName
    const submissionsWithUserDetails = await Promise.all(
      submissions.map(async (submission) => {
        // Find participant for this submission author
        const participant = await this.participantModel
          .findOne({
            username: submission.author,
            contest: contestCode,
          })
          .lean();

        let displayName = submission.author; // Fallback to submission author

        if (participant?.mapToUser) {
          // Participant is mapped to a user - get user details
          const user = await this.userModel.findOne({ username: participant.mapToUser }).lean();
          if (user) {
            // Use fullName if available, otherwise use username
            displayName = user.fullName && user.fullName.trim() ? user.fullName : user.username;
          } else {
            // Mapped user not found, use mapped username
            displayName = participant.mapToUser;
          }
        }

        return {
          ...submission,
          authorFullName: displayName,
        } as SubmissionWithAuthor;
      }),
    );

    return submissionsWithUserDetails;
  }

  async getRankingConfig() {
    const layout = await this.overlayLayoutModel.findOne({
      key: RANKING_KEY,
    });

    if (!layout) {
      return new RankingConfig({
        currentPage: 0,
      }).toRecord();
    }

    return layout.data;
  }

  async setRankingConfig(body: { currentPage: number }) {
    const rankingConfig = new RankingConfig(body);

    await this.overlayLayoutModel.updateOne(
      { key: RANKING_KEY },
      { data: rankingConfig.toRecord() },
      { upsert: true },
    );

    return rankingConfig.toRecord();
  }
}
