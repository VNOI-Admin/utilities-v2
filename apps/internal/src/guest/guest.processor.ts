import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import { Role } from '@libs/common/decorators/role.decorator';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { Model } from 'mongoose';
import { UserService } from '../user/user.service';
import * as crypto from 'crypto';

const GUEST_QUEUE = 'guest-operations';

interface AdjustGuestCountJobData {
  currentCount: number;
  targetCount: number;
}

@Processor(GUEST_QUEUE)
export class GuestProcessor extends WorkerHost {
  private readonly logger = new Logger(GuestProcessor.name);

  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private userService: UserService,
  ) {
    super();
  }

  async process(job: Job<AdjustGuestCountJobData>): Promise<void> {
    this.logger.log(`Processing job ${job.id} - ${job.name}`);

    const { currentCount, targetCount } = job.data;

    try {
      if (targetCount > currentCount) {
        // Need to create more guests
        const toCreate = targetCount - currentCount;
        await this.createGuestUsers(toCreate);
        this.logger.log(`Created ${toCreate} guest users`);
      } else if (targetCount < currentCount) {
        // Need to remove guests
        const toRemove = currentCount - targetCount;
        await this.removeGuestUsers(toRemove);
        this.logger.log(`Removed ${toRemove} guest users`);
      }

      this.logger.log('Guest adjustment completed successfully');
    } catch (error) {
      this.logger.error(`Failed to adjust guest count: ${error.message}`, error.stack);
      throw error; // Re-throw to mark job as failed
    }
  }

  /**
   * Create multiple guest users with auto-incremented usernames
   */
  private async createGuestUsers(count: number): Promise<void> {
    const startNumber = await this.findNextGuestNumber();

    for (let i = 0; i < count; i++) {
      const guestNumber = startNumber + i;
      await this.createGuestUser(guestNumber);
      this.logger.log(`Created guest user: guest_${guestNumber.toString().padStart(3, '0')}`);
    }
  }

  /**
   * Remove guest users (highest numbered first)
   */
  private async removeGuestUsers(count: number): Promise<void> {
    const guests = await this.userModel
      .find({ role: Role.GUEST })
      .sort({ username: -1 }) // Sort descending to get highest numbered first
      .limit(count)
      .exec();

    for (const guest of guests) {
      this.logger.log(`Removing guest user: ${guest.username}`);
      await guest.deleteOne();
    }
  }

  /**
   * Find the next available guest number
   */
  private async findNextGuestNumber(): Promise<number> {
    const lastGuest = await this.userModel
      .findOne({ role: Role.GUEST })
      .sort({ username: -1 })
      .lean()
      .exec();

    if (!lastGuest) {
      return 1;
    }

    // Extract number from username (e.g., "guest_042" -> 42)
    const match = lastGuest.username.match(/guest_(\d+)/);
    if (match) {
      return Number.parseInt(match[1], 10) + 1;
    }

    return 1;
  }

  /**
   * Create a single guest user with the specified number
   */
  private async createGuestUser(number: number): Promise<void> {
    const username = `guest_${number.toString().padStart(3, '0')}`;

    // Generate random password (16 character alphanumeric)
    const password = crypto.randomBytes(12).toString('base64').slice(0, 16);

    await this.userService.createUser({
      username,
      fullName: `Guest ${number.toString().padStart(3, '0')}`,
      password,
      role: Role.GUEST,
      isActive: false, // Guests start inactive until they connect
    });
  }
}
