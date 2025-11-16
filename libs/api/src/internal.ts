/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface MachineUsageEntity {
  cpu: number;
  memory: number;
  disk: number;
  ping: number;
  isOnline: boolean;
  /** @format date-time */
  lastReportedAt: string;
}

export interface UserEntity {
  username: string;
  fullName: string;
  isActive: boolean;
  vpnIpAddress: string;
  role: string;
  machineUsage: MachineUsageEntity;
  group: string;
  streamUrl?: string;
  webcamUrl?: string;
}

export interface CreateUserDto {
  username: string;
  fullName: string;
  password: string;
  /** @default "contestant" */
  role: 'contestant' | 'coach' | 'admin';
}

export interface UpdateUserDto {
  password?: string;
  fullName?: string;
  /** @default "contestant" */
  role?: 'contestant' | 'coach' | 'admin';
  group?: string;
  isActive?: boolean;
}

export interface CreateGroupDto {
  code: string;
  name: string;
}

export interface GroupEntity {
  code: string;
  name: string;
}

export interface UpdateGroupDto {
  code?: string;
  name?: string;
}

export interface UserStream {
  username: string;
  streamUrl?: string;
  webcamUrl?: string;
}

export interface OverlayLayoutResponse {
  key: string;
  data: object;
  current: boolean;
}

export interface MultiUserStreamDto {
  usernames: string[];
}

export interface SingleUserStreamDto {
  username: string;
  stream?: boolean;
  webcam?: boolean;
}

export interface WebcamLayout {
  enabled: boolean;
}

export interface WebcamLayoutDto {
  enabled: boolean;
}

export interface CreateContestDto {
  /** Contest code from VNOJ (e.g., vnoicup25_r2) */
  code: string;
}

export interface UpdateContestDto {
  name?: string;
  start_time?: string;
  end_time?: string;
  frozen_at?: string;
}

export interface LinkParticipantDto {
  user?: string;
}

import type { AxiosInstance, AxiosRequestConfig, HeadersDefaults, ResponseType } from 'axios';
import axios from 'axios';

export type QueryParamsType = Record<string | number, any>;

export interface FullRequestParams extends Omit<AxiosRequestConfig, 'data' | 'params' | 'url' | 'responseType'> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseType;
  /** request body */
  body?: unknown;
}

export type RequestParams = Omit<FullRequestParams, 'body' | 'method' | 'query' | 'path'>;

export interface ApiConfig<SecurityDataType = unknown> extends Omit<AxiosRequestConfig, 'data' | 'cancelToken'> {
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<AxiosRequestConfig | void> | AxiosRequestConfig | void;
  secure?: boolean;
  format?: ResponseType;
}

export enum ContentType {
  Json = 'application/json',
  FormData = 'multipart/form-data',
  UrlEncoded = 'application/x-www-form-urlencoded',
  Text = 'text/plain',
}

export class HttpClient<SecurityDataType = unknown> {
  public instance: AxiosInstance;
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>['securityWorker'];
  private secure?: boolean;
  private format?: ResponseType;

  constructor({ securityWorker, secure, format, ...axiosConfig }: ApiConfig<SecurityDataType> = {}) {
    this.instance = axios.create({ ...axiosConfig, baseURL: axiosConfig.baseURL || 'http://localhost:8003' });
    this.secure = secure;
    this.format = format;
    this.securityWorker = securityWorker;
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected mergeRequestParams(params1: AxiosRequestConfig, params2?: AxiosRequestConfig): AxiosRequestConfig {
    const method = params1.method || (params2 && params2.method);

    return {
      ...this.instance.defaults,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...((method && this.instance.defaults.headers[method.toLowerCase() as keyof HeadersDefaults]) || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected stringifyFormItem(formItem: unknown) {
    if (typeof formItem === 'object' && formItem !== null) {
      return JSON.stringify(formItem);
    } else {
      return `${formItem}`;
    }
  }

  protected createFormData(input: Record<string, unknown>): FormData {
    if (input instanceof FormData) {
      return input;
    }
    return Object.keys(input || {}).reduce((formData, key) => {
      const property = input[key];
      const propertyContent: any[] = property instanceof Array ? property : [property];

      for (const formItem of propertyContent) {
        const isFileType = formItem instanceof Blob || formItem instanceof File;
        formData.append(key, isFileType ? formItem : this.stringifyFormItem(formItem));
      }

      return formData;
    }, new FormData());
  }

  public request = async <T = any, _E = any>({
    secure,
    path,
    type,
    query,
    format,
    body,
    ...params
  }: FullRequestParams): Promise<T> => {
    const secureParams =
      ((typeof secure === 'boolean' ? secure : this.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const responseFormat = format || this.format || undefined;

    if (type === ContentType.FormData && body && body !== null && typeof body === 'object') {
      body = this.createFormData(body as Record<string, unknown>);
    }

    if (type === ContentType.Text && body && body !== null && typeof body !== 'string') {
      body = JSON.stringify(body);
    }

    return this.instance
      .request({
        ...requestParams,
        headers: {
          ...(requestParams.headers || {}),
          ...(type ? { 'Content-Type': type } : {}),
        },
        params: query,
        responseType: responseFormat,
        data: body,
        url: path,
      })
      .then((response) => response.data);
  };
}

/**
 * @title Utilities V2 Internal API Docs
 * @version 1.0
 * @baseUrl http://localhost:8003
 * @contact
 *
 * Utilities V2 Internal API Docs
 */
export class InternalApi<SecurityDataType extends unknown> extends HttpClient<SecurityDataType> {
  user = {
    /**
     * No description
     *
     * @tags User
     * @name GetUsers
     * @summary Get all users
     * @request GET:/users
     * @secure
     */
    getUsers: (
      query?: {
        /** Sort by field, 1 for ascending, -1 for descending. Example: key1:1,key2:-1 */
        orderBy?: string;
        /** Search query */
        q?: string;
        role?: 'contestant' | 'coach' | 'admin';
        /** Return current user based on access token */
        me?: boolean;
        /**
         * Return only active users. Default is true.
         * @default true
         */
        isActive?: boolean;
        /** Return only online users */
        isOnline?: boolean;
        /**
         * Include stream URLs (streamUrl and webcamUrl) in response
         * @default false
         */
        withStream?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<UserEntity[], any>({
        path: `/users`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags User
     * @name CreateUser
     * @summary Create new user
     * @request POST:/users
     * @secure
     */
    createUser: (data: CreateUserDto, params: RequestParams = {}) =>
      this.request<UserEntity, any>({
        path: `/users`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags User
     * @name GetUser
     * @summary Get user by username
     * @request GET:/users/{username}
     * @secure
     */
    getUser: (username: string, params: RequestParams = {}) =>
      this.request<UserEntity, any>({
        path: `/users/${username}`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags User
     * @name UpdateUser
     * @summary Update user
     * @request PATCH:/users/{username}
     * @secure
     */
    updateUser: (username: string, data: UpdateUserDto, params: RequestParams = {}) =>
      this.request<UserEntity, any>({
        path: `/users/${username}`,
        method: 'PATCH',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags User
     * @name DeleteUser
     * @summary Delete user
     * @request DELETE:/users/{username}
     * @secure
     */
    deleteUser: (username: string, params: RequestParams = {}) =>
      this.request<
        {
          success?: boolean;
        },
        any
      >({
        path: `/users/${username}`,
        method: 'DELETE',
        secure: true,
        format: 'json',
        ...params,
      }),
  };
  group = {
    /**
     * No description
     *
     * @tags Group
     * @name CreateGroup
     * @summary Create new group
     * @request POST:/groups
     * @secure
     */
    createGroup: (data: CreateGroupDto, params: RequestParams = {}) =>
      this.request<GroupEntity, any>({
        path: `/groups`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Group
     * @name UpdateGroup
     * @summary Update group
     * @request PATCH:/groups/{code}
     * @secure
     */
    updateGroup: (code: string, data: UpdateGroupDto, params: RequestParams = {}) =>
      this.request<GroupEntity, any>({
        path: `/groups/${code}`,
        method: 'PATCH',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Group
     * @name DeleteGroup
     * @summary Delete group
     * @request DELETE:/groups/{code}
     * @secure
     */
    deleteGroup: (code: string, params: RequestParams = {}) =>
      this.request<
        {
          success?: boolean;
        },
        any
      >({
        path: `/groups/${code}`,
        method: 'DELETE',
        secure: true,
        format: 'json',
        ...params,
      }),
  };
  overlay = {
    /**
     * No description
     *
     * @tags Overlay
     * @name GetStreamSourceByUsername
     * @summary Get stream source by username
     * @request GET:/overlay/source/{username}
     * @secure
     */
    getStreamSourceByUsername: (username: string, params: RequestParams = {}) =>
      this.request<UserStream, any>({
        path: `/overlay/source/${username}`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Overlay
     * @name GetCurrentLayout
     * @summary Get current layout
     * @request GET:/overlay/current
     * @secure
     */
    getCurrentLayout: (params: RequestParams = {}) =>
      this.request<OverlayLayoutResponse, any>({
        path: `/overlay/current`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Overlay
     * @name GetMultiUserStream
     * @summary Get multiple users to user stream display
     * @request GET:/overlay/user-stream/multi
     * @secure
     */
    getMultiUserStream: (params: RequestParams = {}) =>
      this.request<UserStream[], any>({
        path: `/overlay/user-stream/multi`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Overlay
     * @name SetMultiUserStream
     * @summary Set multiple users to user stream display
     * @request POST:/overlay/user-stream/multi
     * @secure
     */
    setMultiUserStream: (data: MultiUserStreamDto, params: RequestParams = {}) =>
      this.request<UserStream[], any>({
        path: `/overlay/user-stream/multi`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Overlay
     * @name GetUserStream
     * @summary Get current user stream display
     * @request GET:/overlay/user-stream/single
     * @secure
     */
    getUserStream: (params: RequestParams = {}) =>
      this.request<UserStream, any>({
        path: `/overlay/user-stream/single`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Overlay
     * @name SetUserStream
     * @summary Set current user to user stream display
     * @request POST:/overlay/user-stream/single
     * @secure
     */
    setUserStream: (data: SingleUserStreamDto, params: RequestParams = {}) =>
      this.request<UserStream, any>({
        path: `/overlay/user-stream/single`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Overlay
     * @name GetWebcamLayout
     * @summary Get current webcam layout
     * @request GET:/overlay/webcam-layout
     * @secure
     */
    getWebcamLayout: (params: RequestParams = {}) =>
      this.request<WebcamLayout, any>({
        path: `/overlay/webcam-layout`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Overlay
     * @name SetWebcamLayout
     * @summary Set current webcam layout
     * @request POST:/overlay/webcam-layout
     * @secure
     */
    setWebcamLayout: (data: WebcamLayoutDto, params: RequestParams = {}) =>
      this.request<WebcamLayout, any>({
        path: `/overlay/webcam-layout`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),
  };
  scraping = {
    /**
     * No description
     *
     * @name GetVnoiRanking
     * @request GET:/scraping/vnoi-ranking
     */
    getVnoiRanking: (params: RequestParams = {}) =>
      this.request<any, any>({
        path: `/scraping/vnoi-ranking`,
        method: 'GET',
        ...params,
      }),

    /**
     * No description
     *
     * @name GetVnoiSubmissions
     * @request GET:/scraping/vnoi-submissions
     */
    getVnoiSubmissions: (params: RequestParams = {}) =>
      this.request<any, any>({
        path: `/scraping/vnoi-submissions`,
        method: 'GET',
        ...params,
      }),
  };
  contest = {
    /**
     * No description
     *
     * @tags Contest
     * @name FindAll
     * @summary Get all contests
     * @request GET:/contests
     * @secure
     */
    findAll: (
      query?: {
        /** @default "all" */
        filter?: 'ongoing' | 'past' | 'future' | 'all';
      },
      params: RequestParams = {},
    ) =>
      this.request<any, any>({
        path: `/contests`,
        method: 'GET',
        query: query,
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Contest
     * @name Create
     * @summary Create new contest
     * @request POST:/contests
     * @secure
     */
    create: (data: CreateContestDto, params: RequestParams = {}) =>
      this.request<any, any>({
        path: `/contests`,
        method: 'POST',
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Contest
     * @name FindOne
     * @summary Get contest by code
     * @request GET:/contests/{code}
     * @secure
     */
    findOne: (code: string, params: RequestParams = {}) =>
      this.request<any, any>({
        path: `/contests/${code}`,
        method: 'GET',
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Contest
     * @name Update
     * @summary Update contest
     * @request PATCH:/contests/{code}
     * @secure
     */
    update: (code: string, data: UpdateContestDto, params: RequestParams = {}) =>
      this.request<any, any>({
        path: `/contests/${code}`,
        method: 'PATCH',
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Contest
     * @name Delete
     * @summary Delete contest
     * @request DELETE:/contests/{code}
     * @secure
     */
    delete: (code: string, params: RequestParams = {}) =>
      this.request<any, any>({
        path: `/contests/${code}`,
        method: 'DELETE',
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Contest
     * @name GetSubmissions
     * @summary Get submissions for contest
     * @request GET:/contests/{code}/submissions
     * @secure
     */
    getSubmissions: (code: string, params: RequestParams = {}) =>
      this.request<any, any>({
        path: `/contests/${code}/submissions`,
        method: 'GET',
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Contest
     * @name GetParticipants
     * @summary Get participants for contest
     * @request GET:/contests/{code}/participants
     * @secure
     */
    getParticipants: (code: string, params: RequestParams = {}) =>
      this.request<any, any>({
        path: `/contests/${code}/participants`,
        method: 'GET',
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Contest
     * @name GetProblems
     * @summary Get problems for contest
     * @request GET:/contests/{code}/problems
     * @secure
     */
    getProblems: (code: string, params: RequestParams = {}) =>
      this.request<any, any>({
        path: `/contests/${code}/problems`,
        method: 'GET',
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Contest
     * @name LinkParticipant
     * @summary Link participant to internal user
     * @request PATCH:/contests/participants/{participantId}/link-user
     * @secure
     */
    linkParticipant: (participantId: string, data: LinkParticipantDto, params: RequestParams = {}) =>
      this.request<any, any>({
        path: `/contests/participants/${participantId}/link-user`,
        method: 'PATCH',
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Contest
     * @name SyncParticipants
     * @summary Sync participants from VNOJ API
     * @request POST:/contests/{code}/sync-participants
     * @secure
     */
    syncParticipants: (code: string, params: RequestParams = {}) =>
      this.request<{ added: number; skipped: number; total: number }, any>({
        path: `/contests/${code}/sync-participants`,
        method: 'POST',
        secure: true,
        ...params,
      }),
  };
}
