import type { MessageEvent } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { finalize, type Observable, Subject } from 'rxjs';

type JobStream = {
  subject: Subject<MessageEvent>;
  subscribers: number;
};

@Injectable()
export class RemoteControlEventsService {
  private jobStreams = new Map<string, JobStream>();

  subscribe(jobId: string): Observable<MessageEvent> {
    const stream = this.getOrCreateStream(jobId);
    stream.subscribers += 1;

    return stream.subject.asObservable().pipe(
      finalize(() => {
        const existing = this.jobStreams.get(jobId);
        if (!existing) {
          return;
        }

        existing.subscribers -= 1;
        if (existing.subscribers <= 0) {
          existing.subject.complete();
          this.jobStreams.delete(jobId);
        }
      }),
    );
  }

  emitJobRunUpdated(jobId: string, payload: any) {
    const stream = this.jobStreams.get(jobId);
    if (!stream) {
      return;
    }

    stream.subject.next({
      type: 'jobRun.updated',
      data: payload,
    });
  }

  private getOrCreateStream(jobId: string): JobStream {
    const existing = this.jobStreams.get(jobId);
    if (existing) {
      return existing;
    }

    const stream: JobStream = { subject: new Subject<MessageEvent>(), subscribers: 0 };
    this.jobStreams.set(jobId, stream);
    return stream;
  }
}

