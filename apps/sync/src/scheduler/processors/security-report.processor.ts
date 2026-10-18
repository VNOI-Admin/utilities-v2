import { SecurityReportService } from '@libs/common/remote-control/security-report.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { QUEUE_NAMES } from '../constants';

@Processor(QUEUE_NAMES.SECURITY_REPORT)
export class SecurityReportProcessor extends WorkerHost {
  private readonly logger = new Logger(SecurityReportProcessor.name);

  constructor(private readonly securityReportService: SecurityReportService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.id} - ${job.name}`);

    const started = await this.securityReportService.runSecurityReport('system:scheduler');
    if (!started) {
      this.logger.warn('Security report skipped: no eligible target machines');
      return;
    }
    this.logger.log(`Security report job ${started.jobId} dispatched to ${started.targets.length} machines`);
  }
}
