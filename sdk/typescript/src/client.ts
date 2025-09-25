/**
 * Almona Industrial API Client
 * TypeScript SDK for interacting with the Almona Industrial API
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  AlmonaAPIConfig,
  RequestOptions,
  APIError,
  Token,
  TicketResponse,
  UnifiedTicketCreate,
  TicketFilters,
  QuoteCreateRequest,
  QuoteCreateResponse,
  QuoteLookupResponse,
  QuoteFilters,
  PaginationParams,
  PaginatedResponse
} from './types';

export class AlmonaAPIError extends Error {
  public readonly code: string;
  public readonly details?: any;
  public readonly context?: any;
  public readonly status?: number;

  constructor(error: APIError, status?: number) {
    super(error.error.message);
    this.name = 'AlmonaAPIError';
    this.code = error.error.code;
    this.details = error.error.details;
    this.context = error.error.context;
    this.status = status;
  }
}

export class AlmonaAPIClient {
  private axios: AxiosInstance;
  private config: AlmonaAPIConfig;
  private accessToken?: string;
  private refreshToken?: string;

  constructor(config: AlmonaAPIConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      debug: false,
      ...config
    };

    this.axios = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AlmonaAPI-Client-TypeScript/2.0.0'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axios.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        
        if (this.config.apiKey) {
          config.headers['X-API-Key'] = this.config.apiKey;
        }

        if (this.config.debug) {
          console.log(`[AlmonaAPI] ${config.method?.toUpperCase()} ${config.url}`, {
            headers: config.headers,
            data: config.data
          });
        }

        return config;
      },
      (error) => {
        if (this.config.debug) {
          console.error('[AlmonaAPI] Request error:', error);
        }
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axios.interceptors.response.use(
      (response) => {
        if (this.config.debug) {
          console.log(`[AlmonaAPI] ${response.status} ${response.config.url}`, response.data);
        }
        return response;
      },
      async (error) => {
        if (this.config.debug) {
          console.error('[AlmonaAPI] Response error:', error.response?.data || error.message);
        }

        // Handle 401 errors with token refresh
        if (error.response?.status === 401 && this.refreshToken) {
          try {
            await this.refreshAccessToken();
            // Retry the original request
            const originalRequest = error.config;
            originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;
            return this.axios(originalRequest);
          } catch (refreshError) {
            // Refresh failed, clear tokens
            this.clearTokens();
            throw new AlmonaAPIError(
              {
                error: {
                  code: 'AUTHENTICATION_FAILED',
                  message: 'Authentication failed and token refresh unsuccessful'
                }
              },
              401
            );
          }
        }

        // Convert API errors to AlmonaAPIError
        if (error.response?.data?.error) {
          throw new AlmonaAPIError(error.response.data, error.response.status);
        }

        throw error;
      }
    );
  }

  /**
   * Set authentication tokens
   */
  public setTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  /**
   * Clear authentication tokens
   */
  public clearTokens(): void {
    this.accessToken = undefined;
    this.refreshToken = undefined;
  }

  /**
   * Check if client is authenticated
   */
  public isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  /**
   * Authenticate with email and password
   */
  public async authenticate(email: string, password: string): Promise<Token> {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    const response = await this.axios.post<Token>('/api/v2/auth/token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const token = response.data;
    this.setTokens(token.access_token, token.refresh_token);
    return token;
  }

  /**
   * Refresh access token using refresh token
   */
  public async refreshAccessToken(): Promise<Token> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.axios.post<Token>('/api/v2/auth/refresh', {
      refresh_token: this.refreshToken
    });

    const token = response.data;
    this.setTokens(token.access_token, token.refresh_token);
    return token;
  }

  /**
   * Get current user information
   */
  public async getCurrentUser(): Promise<any> {
    const response = await this.axios.get('/api/v2/auth/users/me');
    return response.data;
  }

  /**
   * Create a support ticket
   */
  public async createSupportTicket(ticket: UnifiedTicketCreate): Promise<TicketResponse> {
    const response = await this.axios.post<TicketResponse>('/api/v2/tickets/support', ticket);
    return response.data;
  }

  /**
   * Create a preventive maintenance ticket
   */
  public async createPreventiveMaintenanceTicket(ticket: UnifiedTicketCreate): Promise<TicketResponse> {
    const response = await this.axios.post<TicketResponse>('/api/v2/tickets/maintenance/preventive', ticket);
    return response.data;
  }

  /**
   * Create a scheduled maintenance ticket
   */
  public async createScheduledMaintenanceTicket(ticket: UnifiedTicketCreate): Promise<TicketResponse> {
    const response = await this.axios.post<TicketResponse>('/api/v2/tickets/maintenance/scheduled', ticket);
    return response.data;
  }

  /**
   * Create an emergency service ticket
   */
  public async createEmergencyTicket(ticket: UnifiedTicketCreate): Promise<TicketResponse> {
    const response = await this.axios.post<TicketResponse>('/api/v2/tickets/emergency', ticket);
    return response.data;
  }

  /**
   * Create a product quote ticket
   */
  public async createProductQuoteTicket(ticket: UnifiedTicketCreate): Promise<TicketResponse> {
    const response = await this.axios.post<TicketResponse>('/api/v2/tickets/product-quote', ticket);
    return response.data;
  }

  /**
   * Create an add-to-quote ticket
   */
  public async createAddToQuoteTicket(ticket: UnifiedTicketCreate): Promise<TicketResponse> {
    const response = await this.axios.post<TicketResponse>('/api/v2/tickets/add-to-quote', ticket);
    return response.data;
  }

  /**
   * Get a ticket by ID
   */
  public async getTicket(ticketId: string): Promise<TicketResponse> {
    const response = await this.axios.get<TicketResponse>(`/api/v2/tickets/${ticketId}`);
    return response.data;
  }

  /**
   * List tickets with optional filters
   */
  public async listTickets(filters?: TicketFilters, pagination?: PaginationParams): Promise<TicketResponse[]> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
    }

    if (pagination) {
      if (pagination.page) params.append('page', String(pagination.page));
      if (pagination.limit) params.append('limit', String(pagination.limit));
      if (pagination.offset) params.append('offset', String(pagination.offset));
    }

    const response = await this.axios.get<TicketResponse[]>(`/api/v2/tickets?${params.toString()}`);
    return response.data;
  }

  /**
   * Update ticket status
   */
  public async updateTicketStatus(ticketId: string, status: string, resolutionSummary?: string): Promise<TicketResponse> {
    const response = await this.axios.post<TicketResponse>(`/api/v2/tickets/${ticketId}/status`, {
      status,
      resolution_summary: resolutionSummary
    });
    return response.data;
  }

  /**
   * Assign ticket to a user
   */
  public async assignTicket(ticketId: string, assigneeId: string): Promise<TicketResponse> {
    const response = await this.axios.post<TicketResponse>(`/api/v2/tickets/${ticketId}/assign/${assigneeId}`);
    return response.data;
  }

  /**
   * Add message to ticket
   */
  public async addTicketMessage(ticketId: string, message: string, messageType: string = 'message', isInternal: boolean = false): Promise<any> {
    const response = await this.axios.post(`/api/v2/tickets/${ticketId}/messages`, {
      message,
      message_type: messageType,
      is_internal: isInternal
    });
    return response.data;
  }

  /**
   * Get ticket messages
   */
  public async getTicketMessages(ticketId: string): Promise<any[]> {
    const response = await this.axios.get(`/api/v2/tickets/${ticketId}/messages`);
    return response.data;
  }

  /**
   * Create a quote
   */
  public async createQuote(quote: QuoteCreateRequest): Promise<QuoteCreateResponse> {
    const response = await this.axios.post<QuoteCreateResponse>('/api/v2/quotes/create', quote);
    return response.data;
  }

  /**
   * Lookup quotes
   */
  public async lookupQuotes(query: string): Promise<QuoteLookupResponse> {
    const response = await this.axios.get<QuoteLookupResponse>('/api/v2/quotes/lookup', {
      params: { q: query }
    });
    return response.data;
  }

  /**
   * Get system health status
   */
  public async getHealthStatus(): Promise<any> {
    const response = await this.axios.get('/health');
    return response.data;
  }

  /**
   * Get system metrics
   */
  public async getMetrics(): Promise<any> {
    const response = await this.axios.get('/metrics/json');
    return response.data;
  }

  /**
   * Make a raw API request
   */
  public async request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axios.request<T>(config);
  }
}

// Factory function for creating client instances
export function createAlmonaAPIClient(config: AlmonaAPIConfig): AlmonaAPIClient {
  return new AlmonaAPIClient(config);
}

// Default export
export default AlmonaAPIClient;
