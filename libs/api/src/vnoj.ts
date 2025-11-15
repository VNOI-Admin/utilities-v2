/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## VNOJ API CLIENT                                           ##
 * ## Based on VNOJ Sync API v2                                 ##
 * ---------------------------------------------------------------
 */

// Export the injection token for the VNOJ API client
export const VNOJ_API_CLIENT = 'VNOJ_API_CLIENT';

// Contest metadata response
export interface VnojContestMetadata {
  code: string;
  start_time: string; // ISO 8601 datetime
  end_time: string; // ISO 8601 datetime
  frozen_at?: string | null; // ISO 8601 datetime
}

// Problem response
export interface VnojProblem {
  code: string;
  contest: string;
}

// Participant response
export interface VnojParticipant {
  user: string;
  contest: string;
  rank: number;
}

// Submission response
export interface VnojSubmission {
  id: string;
  submittedAt: string; // ISO 8601 datetime
  judgedAt?: string; // ISO 8601 datetime
  author: string;
  submissionStatus: string; // AC, WA, TLE, MLE, etc.
  contest_code: string;
  problem_code: string;
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
  protected globalApiKey?: string;

  constructor({ securityWorker, secure, format, ...axiosConfig }: ApiConfig<SecurityDataType> = {}) {
    this.instance = axios.create({ ...axiosConfig, baseURL: axiosConfig.baseURL || 'https://oj.vnoi.info' });
    this.secure = secure;
    this.format = format;
    this.securityWorker = securityWorker;
  }

  public setGlobalApiKey = (apiKey: string | undefined) => {
    this.globalApiKey = apiKey;
  };

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

    // Add global_api_key to query params if available
    const queryParams = { ...query };
    if (this.globalApiKey) {
      queryParams.global_api_key = this.globalApiKey;
    }

    return this.instance
      .request({
        ...requestParams,
        headers: {
          ...(requestParams.headers || {}),
          ...(type ? { 'Content-Type': type } : {}),
        },
        params: queryParams,
        responseType: responseFormat,
        data: body,
        url: path,
      })
      .then((response) => response.data);
  };
}

/**
 * @title VNOJ Sync API Client
 * @version 2.0
 * @baseUrl https://oj.vnoi.info
 *
 * Client for VNOJ contest sync API
 */
export class VNOJApi<SecurityDataType extends unknown> extends HttpClient<SecurityDataType> {
  contest = {
    /**
     * @name GetContestMetadata
     * @summary Get contest metadata
     * @request GET:/api/v2/sync/contest/{contest_code}
     */
    getContestMetadata: (contestCode: string, params: RequestParams = {}) =>
      this.request<VnojContestMetadata, any>({
        path: `/api/v2/sync/contest/${contestCode}`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * @name GetProblems
     * @summary Get list of problems for a contest
     * @request GET:/api/v2/sync/contest/{contest_code}/problems
     */
    getProblems: (contestCode: string, params: RequestParams = {}) =>
      this.request<VnojProblem[], any>({
        path: `/api/v2/sync/contest/${contestCode}/problems`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * @name GetParticipants
     * @summary Get live participant ranking
     * @request GET:/api/v2/sync/contest/{contest_code}/participants
     */
    getParticipants: (contestCode: string, params: RequestParams = {}) =>
      this.request<VnojParticipant[], any>({
        path: `/api/v2/sync/contest/${contestCode}/participants`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * @name GetSubmissions
     * @summary Get incremental submission feed
     * @request GET:/api/v2/sync/contest/{contest_code}/submissions
     */
    getSubmissions: (
      contestCode: string,
      query?: {
        /** Unix timestamp in milliseconds. Returns submissions after this time */
        from_timestamp?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<VnojSubmission[], any>({
        path: `/api/v2/sync/contest/${contestCode}/submissions`,
        method: 'GET',
        query: query,
        format: 'json',
        ...params,
      }),
  };
}
