import { createHash } from 'crypto';
import {
  RemoteControlScript,
  type RemoteControlScriptDocument,
} from '@libs/common-db/schemas/remoteControlScript.schema';
import {
  RemoteJob,
  type RemoteJobDocument,
  type RemoteJobFileMetadata,
} from '@libs/common-db/schemas/remoteJob.schema';
import {
  RemoteJobRun,
  type RemoteJobRunDocument,
  RemoteJobRunStatus,
} from '@libs/common-db/schemas/remoteJobRun.schema';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { AgentJobUpdateDto } from './agentJobUpdate.dto';

interface RemoteControlFileInput {
  key?: string;
  filename: string;
  buffer: Buffer;
}

interface RemoteControlRuntimeFile extends RemoteJobFileMetadata {
  buffer: Buffer;
}

@Injectable()
export class RemoteControlService {
  constructor(
    @InjectModel(RemoteControlScript.name) private scriptModel: Model<RemoteControlScriptDocument>,
    @InjectModel(RemoteJob.name) private jobModel: Model<RemoteJobDocument>,
    @InjectModel(RemoteJobRun.name) private runModel: Model<RemoteJobRunDocument>,
  ) {}

  async getScriptByName(name: string): Promise<RemoteControlScript> {
    const script = await this.scriptModel.findOne({ name }).select('name hash content createdAt updatedAt -_id').lean();
    if (!script) throw new NotFoundException('Script not found');
    return script;
  }

  async applyAgentUpdate(
    jobId: string,
    target: string,
    dto: AgentJobUpdateDto,
    files: Express.Multer.File[] = [],
  ): Promise<void> {
    if (!(await this.runModel.exists({ jobId, target }))) throw new NotFoundException('Job run not found');
    const outputFiles = this.normalizeFiles(this.mapUploadedFiles(files));

    for (let attempt = 0; attempt < 2; attempt++) {
      const currentRun = await this.runModel.findOne({ jobId, target });
      if (!currentRun) throw new NotFoundException('Job run not found');

      const previousStatus = currentRun.status;
      const update: Record<string, unknown> = {
        status: dto.status,
        outputFiles: this.toFileMetadata(outputFiles),
      };
      if (dto.exitCode !== undefined) update.exitCode = dto.exitCode;
      if (dto.log !== undefined) update.log = dto.log;

      const run = await this.runModel.findOneAndUpdate({ jobId, target, status: previousStatus }, update, {
        new: true,
      });
      if (!run) continue;

      if (previousStatus !== dto.status) {
        await this.applyJobStatusTransition(jobId, previousStatus, dto.status);
      }
      return;
    }

    throw new NotFoundException('Job run not found');
  }

  private mapUploadedFiles(files: Express.Multer.File[]): RemoteControlFileInput[] {
    return files.map((file, index) => ({
      key: file.fieldname.startsWith('file:') ? file.fieldname.slice(5) : `file${index + 1}`,
      filename: file.originalname,
      buffer: file.buffer,
    }));
  }

  private normalizeFiles(files: RemoteControlFileInput[]) {
    const seen = new Set<string>();
    const outputFiles: RemoteControlRuntimeFile[] = files.map((file, index) => {
      const key = (file.key || `file${index + 1}`).trim();
      if (!key) throw new BadRequestException('File key is required');
      if (seen.has(key)) throw new BadRequestException(`Duplicate file key: ${key}`);
      seen.add(key);

      return {
        key,
        filename: file.filename,
        size: file.buffer.length,
        hash: createHash('sha256').update(file.buffer).digest('hex'),
        buffer: file.buffer,
      };
    });
    return outputFiles;
  }

  private toFileMetadata(files: RemoteControlRuntimeFile[]): RemoteJobFileMetadata[] {
    return files.map(({ buffer: _buffer, ...metadata }) => metadata);
  }

  private async applyJobStatusTransition(jobId: string, from: RemoteJobRunStatus, to: RemoteJobRunStatus) {
    await this.jobModel.updateOne(
      { jobId },
      {
        $inc: {
          'statusCounts.pending': this.getStatusDelta(from, to, RemoteJobRunStatus.PENDING),
          'statusCounts.running': this.getStatusDelta(from, to, RemoteJobRunStatus.RUNNING),
          'statusCounts.failed': this.getStatusDelta(from, to, RemoteJobRunStatus.FAILED),
          'statusCounts.success': this.getStatusDelta(from, to, RemoteJobRunStatus.SUCCESS),
        },
      },
    );
  }

  private getStatusDelta(from: RemoteJobRunStatus, to: RemoteJobRunStatus, value: RemoteJobRunStatus) {
    return (to === value ? 1 : 0) - (from === value ? 1 : 0);
  }
}
