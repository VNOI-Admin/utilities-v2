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
  role: 'contestant' | 'coach' | 'admin' | 'guest';
  isActive?: boolean;
}

export interface UpdateUserDto {
  password?: string;
  fullName?: string;
  /** @default "contestant" */
  role?: 'contestant' | 'coach' | 'admin' | 'guest';
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

export type AdjustGuestCountDto = object;

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

export interface GlobalConfig {
  contestId: string;
  fullViewMode: boolean;
  showSubmissionQueue: boolean;
  showFooter: boolean;
  footerContentType: 'announcements' | 'ranking';
  currentLayout: string;
}

export interface GlobalConfigDto {
  /** ID of the contest bound to this overlay */
  contestId: string;
  /** Show/hide all components (full view mode) */
  fullViewMode: boolean;
  /** Show/hide submission queue */
  showSubmissionQueue: boolean;
  /** Show/hide footer */
  showFooter: boolean;
  /** Type of content to display in footer */
  footerContentType: 'announcements' | 'ranking';
  /** Current main view layout type (single, multi, or none) */
  currentLayout: string;
}

export interface SingleContestantConfig {
  username: string;
  displayMode: 'both' | 'stream_only' | 'webcam_only';
  swapSources: boolean;
}

export interface SingleContestantConfigDto {
  /** Username of the contestant */
  username: string;
  /**
   * Display mode for sources
   * @default "both"
   */
  displayMode: 'both' | 'stream_only' | 'webcam_only';
  /**
   * Swap stream and webcam positions
   * @default false
   */
  swapSources: boolean;
}

export interface MultiContestantConfig {
  usernames: string[];
  layoutMode: 'side_by_side' | 'quad';
}

export interface MultiContestantConfigDto {
  /** Array of usernames (max 4) */
  usernames: string[];
  /**
   * Layout mode for displaying multiple contestants
   * @default "side_by_side"
   */
  layoutMode: 'side_by_side' | 'quad';
}

export interface AnnouncementItem {
  /** Unique ID for this announcement */
  id: string;
  /** Announcement text content */
  text: string;
  /**
   * Priority level (higher shows first)
   * @default 0
   */
  priority: number;
  /** Timestamp when announcement was created */
  timestamp: number;
}

export interface AnnouncementConfig {
  announcements: AnnouncementItem[];
}

export interface AnnouncementConfigDto {
  /** Array of announcements */
  announcements: AnnouncementItem[];
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

export interface PaginationMetadata {
  /** Current page number */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of items */
  total: number;
  /** Total number of pages */
  totalPages: number;
}

export interface PaginatedSubmissionsResponse {
  /** Array of submissions */
  data: object[];
  /** Pagination metadata */
  pagination: PaginationMetadata;
}

export interface LinkParticipantDto {
  user?: string;
}

export interface AddParticipantDto {
  /** Mode for adding participant */
  mode: 'existing_user' | 'csv_import' | 'create_user';
  /** Participant username (VNOJ username) - required for existing_user and create_user modes */
  participantUsername?: string;
  /** User ID to link to - required for existing_user mode */
  userId?: string;
  /** CSV string with format: participant_username,backend_username (one per line) - required for csv_import mode */
  csvData?: string;
  /** Full name for new user - required for create_user mode */
  fullName?: string;
  /** Backend username for new user - required for create_user mode */
  backendUsername?: string;
  /** Password for new user - required for create_user mode */
  password?: string;
}

export interface AddParticipantResponseDto {
  /** Number of participants successfully added */
  added: number;
  /** Number of participants that were skipped (already exist) */
  skipped: number;
  /** Total number of participants processed */
  total: number;
  /** Array of errors that occurred during processing */
  errors: string[];
}

export interface PrintJobEntity {
  jobId: string;
  filename: string;
  username: string;
  clientId: string;
  priority: number;
  status: object;
  /** @format date-time */
  requestedAt: string;
}

export interface UpdatePrintJobDto {
  status?: 'queued' | 'done';
  username?: string;
  clientId?: string;
  priority?: number;
}

export interface CreatePrintClientDto {
  clientId: string;
  authKey?: string;
  isActive?: boolean;
}

export interface PrintClientEntity {
  clientId: string;
  authKey: string;
  isActive: boolean;
  isOnline: boolean;
  /** @format date-time */
  lastReportedAt: string;
}

export interface UpdatePrintClientDto {
  clientId?: string;
  authKey?: string;
  isActive?: boolean;
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
        role?: 'contestant' | 'coach' | 'admin' | 'guest';
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
  guests = {
    /**
     * No description
     *
     * @name GetGuests
     * @request GET:/guests
     */
    getGuests: (params: RequestParams = {}) =>
      this.request<any, any>({
        path: `/guests`,
        method: 'GET',
        ...params,
      }),

    /**
     * No description
     *
     * @name GetGuestCount
     * @request GET:/guests/count
     */
    getGuestCount: (params: RequestParams = {}) =>
      this.request<any, any>({
        path: `/guests/count`,
        method: 'GET',
        ...params,
      }),

    /**
     * No description
     *
     * @name AdjustGuestCount
     * @request POST:/guests/adjust
     */
    adjustGuestCount: (data: AdjustGuestCountDto, params: RequestParams = {}) =>
      this.request<any, any>({
        path: `/guests/adjust`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
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

    /**
     * No description
     *
     * @tags Overlay
     * @name GetGlobalConfig
     * @summary Get global overlay configuration
     * @request GET:/overlay/config/global
     * @secure
     */
    getGlobalConfig: (params: RequestParams = {}) =>
      this.request<GlobalConfig, any>({
        path: `/overlay/config/global`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Overlay
     * @name SetGlobalConfig
     * @summary Set global overlay configuration
     * @request POST:/overlay/config/global
     * @secure
     */
    setGlobalConfig: (data: GlobalConfigDto, params: RequestParams = {}) =>
      this.request<GlobalConfig, any>({
        path: `/overlay/config/global`,
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
     * @name GetSingleContestantConfig
     * @summary Get single contestant overlay configuration
     * @request GET:/overlay/config/single-contestant
     * @secure
     */
    getSingleContestantConfig: (params: RequestParams = {}) =>
      this.request<SingleContestantConfig, any>({
        path: `/overlay/config/single-contestant`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Overlay
     * @name SetSingleContestantConfig
     * @summary Set single contestant overlay configuration
     * @request POST:/overlay/config/single-contestant
     * @secure
     */
    setSingleContestantConfig: (data: SingleContestantConfigDto, params: RequestParams = {}) =>
      this.request<SingleContestantConfig, any>({
        path: `/overlay/config/single-contestant`,
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
     * @name GetMultiContestantConfig
     * @summary Get multi contestant overlay configuration
     * @request GET:/overlay/config/multi-contestant
     * @secure
     */
    getMultiContestantConfig: (params: RequestParams = {}) =>
      this.request<MultiContestantConfig, any>({
        path: `/overlay/config/multi-contestant`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Overlay
     * @name SetMultiContestantConfig
     * @summary Set multi contestant overlay configuration
     * @request POST:/overlay/config/multi-contestant
     * @secure
     */
    setMultiContestantConfig: (data: MultiContestantConfigDto, params: RequestParams = {}) =>
      this.request<MultiContestantConfig, any>({
        path: `/overlay/config/multi-contestant`,
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
     * @name GetAnnouncements
     * @summary Get announcements configuration
     * @request GET:/overlay/announcements
     * @secure
     */
    getAnnouncements: (params: RequestParams = {}) =>
      this.request<AnnouncementConfig, any>({
        path: `/overlay/announcements`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Overlay
     * @name SetAnnouncements
     * @summary Set announcements configuration
     * @request POST:/overlay/announcements
     * @secure
     */
    setAnnouncements: (data: AnnouncementConfigDto, params: RequestParams = {}) =>
      this.request<AnnouncementConfig, any>({
        path: `/overlay/announcements`,
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
     * @name GetRecentSubmissions
     * @summary Get recent submissions for a contest
     * @request GET:/overlay/submissions/{contestCode}
     * @secure
     */
    getRecentSubmissions: (
      contestCode: string,
      query: {
        limit: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<any, any>({
        path: `/overlay/submissions/${contestCode}`,
        method: 'GET',
        query: query,
        secure: true,
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
    getSubmissions: (
      code: string,
      query?: {
        /**
         * Page number (1-indexed)
         * @default 1
         */
        page?: number;
        /**
         * Number of submissions per page
         * @default 100
         */
        limit?: number;
        /** Search by author or problem code */
        search?: string;
        /** Filter by submission status */
        status?: 'AC' | 'WA' | 'RTE' | 'RE' | 'IR' | 'OLE' | 'MLE' | 'TLE' | 'IE' | 'AB' | 'CE' | 'UNKNOWN';
      },
      params: RequestParams = {},
    ) =>
      this.request<PaginatedSubmissionsResponse, any>({
        path: `/contests/${code}/submissions`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
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
     * @name AddParticipants
     * @summary Manually add participants to contest
     * @request POST:/contests/{code}/participants
     * @secure
     */
    addParticipants: (code: string, data: AddParticipantDto, params: RequestParams = {}) =>
      this.request<AddParticipantResponseDto, any>({
        path: `/contests/${code}/participants`,
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
      this.request<any, any>({
        path: `/contests/${code}/sync-participants`,
        method: 'POST',
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Contest
     * @name ResyncContest
     * @summary Resync contest information, problems, and participants from VNOJ API
     * @request POST:/contests/{code}/resync
     * @secure
     */
    resyncContest: (code: string, params: RequestParams = {}) =>
      this.request<any, any>({
        path: `/contests/${code}/resync`,
        method: 'POST',
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Contest
     * @name RemoveParticipant
     * @summary Remove participant from contest
     * @request DELETE:/contests/participants/{participantId}
     * @secure
     */
    removeParticipant: (participantId: string, params: RequestParams = {}) =>
      this.request<any, any>({
        path: `/contests/participants/${participantId}`,
        method: 'DELETE',
        secure: true,
        ...params,
      }),
  };
  printing = {
    /**
     * No description
     *
     * @tags Printing
     * @name GetPrintJobs
     * @summary Get all print jobs
     * @request GET:/printing/jobs
     * @secure
     */
    getPrintJobs: (
      query?: {
        status?: 'queued' | 'done';
        username?: string;
        clientId?: string;
        priority?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<PrintJobEntity[], any>({
        path: `/printing/jobs`,
        method: 'GET',
        query: query,
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Printing
     * @name GetPrintJob
     * @summary Get one print job
     * @request GET:/printing/jobs/{id}
     * @secure
     */
    getPrintJob: (id: string, params: RequestParams = {}) =>
      this.request<PrintJobEntity, any>({
        path: `/printing/jobs/${id}`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Printing
     * @name UpdatePrintJob
     * @summary Update one print job
     * @request PATCH:/printing/jobs/{id}
     * @secure
     */
    updatePrintJob: (id: string, data: UpdatePrintJobDto, params: RequestParams = {}) =>
      this.request<PrintJobEntity, any>({
        path: `/printing/jobs/${id}`,
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
     * @tags Printing
     * @name DeletePrintJob
     * @summary Delete one print job
     * @request DELETE:/printing/jobs/{id}
     * @secure
     */
    deletePrintJob: (id: string, params: RequestParams = {}) =>
      this.request<
        {
          success?: boolean;
        },
        any
      >({
        path: `/printing/jobs/${id}`,
        method: 'DELETE',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Printing
     * @name GetPrintJobFile
     * @summary Get print job file
     * @request GET:/printing/jobs/{id}/file
     * @secure
     */
    getPrintJobFile: (id: string, params: RequestParams = {}) =>
      this.request<any, any>({
        path: `/printing/jobs/${id}/file`,
        method: 'GET',
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Printing
     * @name CreatePrintClient
     * @summary Create print client
     * @request POST:/printing/clients
     * @secure
     */
    createPrintClient: (data: CreatePrintClientDto, params: RequestParams = {}) =>
      this.request<PrintClientEntity, any>({
        path: `/printing/clients`,
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
     * @tags Printing
     * @name GetPrintClients
     * @summary Get all print clients
     * @request GET:/printing/clients
     * @secure
     */
    getPrintClients: (params: RequestParams = {}) =>
      this.request<PrintClientEntity[], any>({
        path: `/printing/clients`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Printing
     * @name GetPrintClient
     * @summary Get one print client
     * @request GET:/printing/clients/{clientId}
     * @secure
     */
    getPrintClient: (clientId: string, params: RequestParams = {}) =>
      this.request<PrintClientEntity, any>({
        path: `/printing/clients/${clientId}`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Printing
     * @name UpdatePrintClient
     * @summary Update one print client
     * @request PATCH:/printing/clients/{clientId}
     * @secure
     */
    updatePrintClient: (clientId: string, data: UpdatePrintClientDto, params: RequestParams = {}) =>
      this.request<PrintClientEntity, any>({
        path: `/printing/clients/${clientId}`,
        method: 'PATCH',
        body: data,
        secure: true,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),
  };
}
