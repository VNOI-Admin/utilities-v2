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

export interface GroupEntity {
  groupCodeName: string;
  groupFullName: string;
}

export interface UserEntity {
  username: string;
  fullName: string;
  isActive: boolean;
  vpnIpAddress: string;
  role: string;
  machineUsage: MachineUsageEntity;
  group: GroupEntity;
}

export interface CreateUserDto {
  username: string;
  fullName: string;
  password: string;
  role: 'contestant' | 'coach' | 'admin';
}

export interface UpdateUserDto {
  fullName?: string;
  password?: string;
  usernameNew?: string;
  /** @default "contestant" */
  role?: 'contestant' | 'coach' | 'admin';
  group?: string;
}

export interface ReportUsageDto {
  cpu: number;
  memory: number;
  disk: number;
}

export interface CreateGroupDto {
  groupCodeName: string;
  groupFullName: string;
}

export interface UpdateGroupDto {
  groupCodeName?: string;
  groupFullName?: string;
}

export interface VpnConfig {
  config: string;
}

import type {
  AxiosInstance,
  AxiosRequestConfig,
  HeadersDefaults,
  ResponseType,
} from 'axios';
import axios from 'axios';

export type QueryParamsType = Record<string | number, any>;

export interface FullRequestParams
  extends Omit<AxiosRequestConfig, 'data' | 'params' | 'url' | 'responseType'> {
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

export type RequestParams = Omit<
  FullRequestParams,
  'body' | 'method' | 'query' | 'path'
>;

export interface ApiConfig<SecurityDataType = unknown>
  extends Omit<AxiosRequestConfig, 'data' | 'cancelToken'> {
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

  constructor({
    securityWorker,
    secure,
    format,
    ...axiosConfig
  }: ApiConfig<SecurityDataType> = {}) {
    this.instance = axios.create({
      ...axiosConfig,
      baseURL: axiosConfig.baseURL || 'http://localhost:8001',
    });
    this.secure = secure;
    this.format = format;
    this.securityWorker = securityWorker;
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected mergeRequestParams(
    params1: AxiosRequestConfig,
    params2?: AxiosRequestConfig,
  ): AxiosRequestConfig {
    const method = params1.method || (params2 && params2.method);

    return {
      ...this.instance.defaults,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...((method &&
          this.instance.defaults.headers[
            method.toLowerCase() as keyof HeadersDefaults
          ]) ||
          {}),
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
      const propertyContent: any[] =
        property instanceof Array ? property : [property];

      for (const formItem of propertyContent) {
        const isFileType = formItem instanceof Blob || formItem instanceof File;
        formData.append(
          key,
          isFileType ? formItem : this.stringifyFormItem(formItem),
        );
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

    if (
      type === ContentType.FormData &&
      body &&
      body !== null &&
      typeof body === 'object'
    ) {
      body = this.createFormData(body as Record<string, unknown>);
    }

    if (
      type === ContentType.Text &&
      body &&
      body !== null &&
      typeof body !== 'string'
    ) {
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
 * @title Utilities V2 User API Docs
 * @version 1.0
 * @baseUrl http://localhost:8001
 * @contact
 *
 * Utilities V2 User API Docs
 */
export class UserApi<
  SecurityDataType extends unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * No description
   *
   * @name GetStatus
   * @request GET:/
   */
  getStatus = (params: RequestParams = {}) =>
    this.request<any, any>({
      path: `/`,
      method: 'GET',
      ...params,
    });

  user = {
    /**
     * No description
     *
     * @tags User
     * @name GetUsers
     * @summary Get all users
     * @request GET:/user
     * @secure
     */
    getUsers: (
      query?: {
        /** Sort by field, 1 for ascending, -1 for descending. Example: key1:1,key2:-1 */
        orderBy?: string;
        q?: string;
        role?: 'contestant' | 'coach' | 'admin';
      },
      params: RequestParams = {},
    ) =>
      this.request<UserEntity[], any>({
        path: `/user`,
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
     * @name GetCurrentUser
     * @summary Get current user
     * @request GET:/user/me
     * @secure
     */
    getCurrentUser: (params: RequestParams = {}) =>
      this.request<UserEntity, any>({
        path: `/user/me`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags User
     * @name GetUser
     * @summary Get user by username
     * @request GET:/user/{username}
     * @secure
     */
    getUser: (username: string, params: RequestParams = {}) =>
      this.request<UserEntity, any>({
        path: `/user/${username}`,
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
     * @request PATCH:/user/{username}
     * @secure
     */
    updateUser: (
      username: string,
      data: UpdateUserDto,
      params: RequestParams = {},
    ) =>
      this.request<UserEntity, any>({
        path: `/user/${username}`,
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
     * @request DELETE:/user/{username}
     * @secure
     */
    deleteUser: (username: string, params: RequestParams = {}) =>
      this.request<
        {
          success?: boolean;
        },
        any
      >({
        path: `/user/${username}`,
        method: 'DELETE',
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
     * @request POST:/user/new
     * @secure
     */
    createUser: (data: CreateUserDto, params: RequestParams = {}) =>
      this.request<UserEntity, any>({
        path: `/user/new`,
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
     * @name GetMachineUsage
     * @summary Get machine usage of user
     * @request GET:/user/{username}/machine
     * @secure
     */
    getMachineUsage: (username: string, params: RequestParams = {}) =>
      this.request<MachineUsageEntity, any>({
        path: `/user/${username}/machine`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags User
     * @name Report
     * @summary Receive machine status report from contestant. Verified by IP.
     * @request POST:/user/report
     */
    report: (data: ReportUsageDto, params: RequestParams = {}) =>
      this.request<any, any>({
        path: `/user/report`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags User
     * @name Print
     * @summary Send print job
     * @request POST:/user/print
     */
    print: (params: RequestParams = {}) =>
      this.request<any, any>({
        path: `/user/print`,
        method: 'POST',
        ...params,
      }),
  };
  group = {
    /**
     * No description
     *
     * @tags Group
     * @name GetGroups
     * @summary Get all groups
     * @request GET:/group
     * @secure
     */
    getGroups: (params: RequestParams = {}) =>
      this.request<GroupEntity[], any>({
        path: `/group`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Group
     * @name CreateGroup
     * @summary Create new group
     * @request POST:/group/new
     * @secure
     */
    createGroup: (data: CreateGroupDto, params: RequestParams = {}) =>
      this.request<GroupEntity, any>({
        path: `/group/new`,
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
     * @request PATCH:/group/{groupCodeName}
     * @secure
     */
    updateGroup: (
      groupCodeName: string,
      data: UpdateGroupDto,
      params: RequestParams = {},
    ) =>
      this.request<GroupEntity, any>({
        path: `/group/${groupCodeName}`,
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
     * @request DELETE:/group/{groupCodeName}
     * @secure
     */
    deleteGroup: (groupCodeName: string, params: RequestParams = {}) =>
      this.request<
        {
          success?: boolean;
        },
        any
      >({
        path: `/group/${groupCodeName}`,
        method: 'DELETE',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Group
     * @name GetUsers
     * @summary Get users in group
     * @request GET:/group/{groupCodeName}/users
     * @secure
     */
    getUsers: (groupCodeName: string, params: RequestParams = {}) =>
      this.request<UserEntity[], any>({
        path: `/group/${groupCodeName}/users`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params,
      }),
  };
  vpn = {
    /**
     * No description
     *
     * @tags VPN
     * @name GetWireGuardConfig
     * @summary Get WireGuard configuration
     * @request GET:/vpn/config
     * @secure
     */
    getWireGuardConfig: (params: RequestParams = {}) =>
      this.request<VpnConfig, any>({
        path: `/vpn/config`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags VPN
     * @name GetWireGuardConfigByUsername
     * @summary Get WireGuard configuration
     * @request GET:/vpn/config/{username}
     * @secure
     */
    getWireGuardConfigByUsername: (
      username: string,
      params: RequestParams = {},
    ) =>
      this.request<VpnConfig, any>({
        path: `/vpn/config/${username}`,
        method: 'GET',
        secure: true,
        format: 'json',
        ...params,
      }),
  };
}
