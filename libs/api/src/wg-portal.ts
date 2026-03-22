import axios, { type AxiosInstance } from 'axios';

export type WgPortalConfigOption<T> = {
  Value: T;
  Overridable?: boolean;
};

export type WgPortalPeer = {
  Identifier: string;
  DisplayName: string;
  UserIdentifier: string;
  InterfaceIdentifier: string;
  Disabled: boolean;
  DisabledReason: string;
  ExpiresAt?: string;
  Notes: string;
  Endpoint: WgPortalConfigOption<string>;
  EndpointPublicKey: WgPortalConfigOption<string>;
  AllowedIPs: WgPortalConfigOption<string[]>;
  ExtraAllowedIPs: string[];
  PresharedKey: string;
  PersistentKeepalive: WgPortalConfigOption<number>;
  PrivateKey: string;
  PublicKey: string;
  Mode: string;
  Addresses: string[];
  CheckAliveAddress: string;
  Dns: WgPortalConfigOption<string[]>;
  DnsSearch: WgPortalConfigOption<string[]>;
  Mtu: WgPortalConfigOption<number>;
  FirewallMark: WgPortalConfigOption<number>;
  RoutingTable: WgPortalConfigOption<string>;
  PreUp: WgPortalConfigOption<string>;
  PostUp: WgPortalConfigOption<string>;
  PreDown: WgPortalConfigOption<string>;
  PostDown: WgPortalConfigOption<string>;
  Filename?: string;
};

type WgPortalApiConfig = {
  baseURL: string;
  username: string;
  password: string;
  timeout?: number;
};

export class WgPortalApi {
  private readonly instance: AxiosInstance;

  constructor({ baseURL, username, password, timeout = 10000 }: WgPortalApiConfig) {
    this.instance = axios.create({
      baseURL,
      auth: {
        username,
        password,
      },
      timeout,
    });
  }

  async getPeersByInterface(interfaceId: string): Promise<WgPortalPeer[]> {
    const response = await this.instance.get<WgPortalPeer[]>(`/peer/by-interface/${encodeURIComponent(interfaceId)}`);
    return response.data;
  }

  async preparePeer(interfaceId: string): Promise<WgPortalPeer> {
    const response = await this.instance.get<WgPortalPeer>(`/peer/prepare/${encodeURIComponent(interfaceId)}`);
    return response.data;
  }

  async createPeer(peer: WgPortalPeer): Promise<WgPortalPeer> {
    const response = await this.instance.post<WgPortalPeer>('/peer/new', peer);
    return response.data;
  }

  async updatePeer(peerId: string, peer: WgPortalPeer): Promise<WgPortalPeer> {
    const response = await this.instance.put<WgPortalPeer>(`/peer/by-id/${encodeURIComponent(peerId)}`, peer);
    return response.data;
  }

  async deletePeer(peerId: string): Promise<void> {
    await this.instance.delete(`/peer/by-id/${encodeURIComponent(peerId)}`);
  }
}
