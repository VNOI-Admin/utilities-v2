import { internalClient } from './api';
import type { Contestant } from '~/stores/contestants';

export interface CreateContestantDto {
  name: string;
  contestantId: string;
  streamUrl?: string;
  webcamUrl?: string;
  status?: 'online' | 'offline' | 'error';
  metadata?: Record<string, any>;
  thumbnailUrl?: string;
}

export interface UpdateContestantDto {
  name?: string;
  streamUrl?: string;
  webcamUrl?: string;
  status?: 'online' | 'offline' | 'error';
  metadata?: Record<string, any>;
  thumbnailUrl?: string;
}

export interface StreamResponse {
  contestantId: string;
  contestantName: string;
  streamUrl?: string;
  webcamUrl?: string;
  status: 'online' | 'offline' | 'error';
  lastActiveAt?: string;
}

export const contestantService = {
  async getAll(): Promise<Contestant[]> {
    const response = await internalClient.get<Contestant[]>('/contestants');
    return response.data;
  },

  async getById(id: string): Promise<Contestant> {
    const response = await internalClient.get<Contestant>(`/contestants/${id}`);
    return response.data;
  },

  async create(data: CreateContestantDto): Promise<Contestant> {
    const response = await internalClient.post<Contestant>('/contestants', data);
    return response.data;
  },

  async update(id: string, data: UpdateContestantDto): Promise<Contestant> {
    const response = await internalClient.patch<Contestant>(`/contestants/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await internalClient.delete(`/contestants/${id}`);
  },

  async getStreams(contestantId: string): Promise<StreamResponse> {
    const response = await internalClient.get<StreamResponse>(`/streams/${contestantId}`);
    return response.data;
  },

  async updateStreamStatus(
    contestantId: string,
    status: 'online' | 'offline' | 'error'
  ): Promise<StreamResponse> {
    const response = await internalClient.post<StreamResponse>(
      `/streams/${contestantId}/status`,
      { status }
    );
    return response.data;
  },
};
