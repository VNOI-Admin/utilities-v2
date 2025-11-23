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

export interface FileUploadDto {
  /** @format binary */
  file: File;
}

export interface PrintJobEntity {
  jobId: string;
  filename: string;
  username: string;
  clientId: string;
  priority: number;
  status: 'queued' | 'done';
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

export interface UpdatePrintJobStatusDto {
  status: 'queued' | 'done';
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
    this.instance = axios.create({ ...axiosConfig, baseURL: axiosConfig.baseURL || 'http://localhost:8004' });
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
 * @title Utilities V2 Printing API Docs
 * @version 1.0
 * @baseUrl http://localhost:8004
 * @contact
 *
 * Utilities V2 Printing API Docs
 */
export class PrintingApi<SecurityDataType extends unknown> extends HttpClient<SecurityDataType> {
  printing = {
    /**
     * No description
     *
     * @tags Printing
     * @name CreatePrintJob
     * @summary Send print job
     * @request POST:/printing/jobs
     */
    createPrintJob: (data: FileUploadDto, params: RequestParams = {}) =>
      this.request<any, any>({
        path: `/printing/jobs`,
        method: 'POST',
        body: data,
        type: ContentType.FormData,
        ...params,
      }),

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
      this.request<any, any>({
        path: `/printing/jobs/${id}`,
        method: 'DELETE',
        secure: true,
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
      this.request<File, any>({
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

    /**
     * No description
     *
     * @tags Printing
     * @name GetPrintClientQueue
     * @summary Get print client's queued jobs
     * @request GET:/printing/clients/{clientId}/queue
     */
    getPrintClientQueue: (
      clientId: string,
      query: {
        authKey: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<PrintJobEntity[], any>({
        path: `/printing/clients/${clientId}/queue`,
        method: 'GET',
        query: query,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Printing
     * @name PrintClientHeartbeat
     * @summary Print client heartbeat
     * @request POST:/printing/clients/{clientId}/heartbeat
     */
    printClientHeartbeat: (
      clientId: string,
      query: {
        authKey: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          success?: boolean;
        },
        any
      >({
        path: `/printing/clients/${clientId}/heartbeat`,
        method: 'POST',
        query: query,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Printing
     * @name GetClientPrintJobFile
     * @summary Get print job file
     * @request GET:/printing/clients/{clientId}/jobs/{jobId}/file
     */
    getClientPrintJobFile: (
      clientId: string,
      jobId: string,
      query: {
        authKey: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<File, any>({
        path: `/printing/clients/${clientId}/jobs/${jobId}/file`,
        method: 'GET',
        query: query,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Printing
     * @name UpdatePrintJobStatus
     * @summary Update print job status
     * @request PATCH:/printing/clients/{clientId}/jobs/{jobId}/status
     */
    updatePrintJobStatus: (
      clientId: string,
      jobId: string,
      query: {
        authKey: string;
      },
      data: UpdatePrintJobStatusDto,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          success?: boolean;
        },
        any
      >({
        path: `/printing/clients/${clientId}/jobs/${jobId}/status`,
        method: 'PATCH',
        query: query,
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),
  };
}
