import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import { Role } from '@libs/common/decorators/role.decorator';
import { UserEntity } from '@libs/common/dtos/User.entity';
import { getErrorMessage } from '@libs/common/helper/error';
import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bullmq';
import { Model } from 'mongoose';

const GUEST_QUEUE = 'guest-operations';

@Injectable()
export class GuestService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectQueue(GUEST_QUEUE)
    private guestQueue: Queue,
  ) {}

  /**
   * Get all guest users with their current status
   */
  async getGuests(): Promise<UserEntity[]> {
    const guests = await this.userModel
      .find({ role: Role.GUEST })
      .sort({ username: 1 })
      .lean()
      .exec();

    return guests.map((guest) => new UserEntity(guest));
  }

  /**
   * Get current count of guest users
   */
  async getGuestCount(): Promise<{ count: number }> {
    const count = await this.userModel.countDocuments({ role: Role.GUEST });
    return { count };
  }

  /**
   * Adjust the total number of guest users (async via queue)
   * Creates new guests or removes existing ones to reach targetCount
   * Returns immediately with job information
   */
  async adjustGuestCount(targetCount: number): Promise<{
    status: 'queued';
    message: string;
    currentCount: number;
    targetCount: number;
    jobId: string;
  }> {
    try {
      const currentCount = await this.userModel.countDocuments({ role: Role.GUEST });

      if (targetCount === currentCount) {
        return {
          status: 'queued',
          message: 'No changes needed',
          currentCount,
          targetCount,
          jobId: 'none',
        };
      }

      // Queue the job for background processing
      const job = await this.guestQueue.add('adjust-guest-count', {
        currentCount,
        targetCount,
      });

      const action = targetCount > currentCount ? 'creating' : 'removing';
      const count = Math.abs(targetCount - currentCount);

      return {
        status: 'queued',
        message: `Job queued: ${action} ${count} guest(s)`,
        currentCount,
        targetCount,
        jobId: job.id as string,
      };
    } catch (error) {
      throw new BadRequestException(`Unable to queue guest adjustment: ${getErrorMessage(error)}`);
    }
  }
}
