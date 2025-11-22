/**
 * Yilmaz Network Protocol
 * Ethernet/TCP-IP communication for Yilmaz machines
 * Supports real-time machine control and status monitoring
 */

export interface YilmazNetworkConfig {
  host: string;
  port: number;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface YilmazCommand {
  command: string;
  parameters: Record<string, string | number>;
  timestamp: Date;
  id: string;
}

export interface YilmazResponse {
  success: boolean;
  commandId: string;
  data?: any;
  error?: string;
  timestamp: Date;
}

export interface MachineStatus {
  machineId: string;
  status: 'idle' | 'running' | 'paused' | 'error' | 'maintenance';
  currentOperation?: string;
  progress: number; // 0-100
  errorCode?: string;
  errorMessage?: string;
  temperature?: number;
  spindleSpeed?: number;
  feedRate?: number;
  toolNumber?: number;
  lastUpdate: Date;
}

export class YilmazNetworkProtocol {
  private config: YilmazNetworkConfig;
  private socket?: WebSocket | null;
  private isConnected: boolean = false;
  private commandQueue: Map<string, { command: YilmazCommand; resolve: (value: YilmazResponse) => void; reject: (error: Error) => void }> = new Map();
  private statusCallbacks: Set<(status: MachineStatus) => void> = new Set();
  private reconnectTimer?: NodeJS.Timeout;

  constructor(config: YilmazNetworkConfig) {
    this.config = {
      host: config.host,
      port: config.port || 8080,
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000
    };
  }

  /**
   * Connect to Yilmaz machine via TCP/IP
   */
  async connect(): Promise<boolean> {
    try {
      // In browser environment, WebSocket is used
      // In Node.js, this would use net.Socket
      const wsUrl = `ws://${this.config.host}:${this.config.port}`;
      
      return new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          this.socket = ws;
          this.isConnected = true;
          this.setupMessageHandlers();
          resolve(true);
        };

        ws.onerror = (error) => {
          this.isConnected = false;
          reject(new Error(`Connection failed: ${error}`));
        };

        ws.onclose = () => {
          this.isConnected = false;
          this.handleReconnect();
        };
      });
    } catch (error) {
      console.error('Yilmaz network connection error:', error);
      return false;
    }
  }

  /**
   * Disconnect from machine
   */
  async disconnect(): Promise<boolean> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.isConnected = false;
    return true;
  }

  /**
   * Send command to machine
   */
  async sendCommand(command: YilmazCommand): Promise<YilmazResponse> {
    if (!this.isConnected || !this.socket) {
      throw new Error('Not connected to machine');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.commandQueue.delete(command.id);
        reject(new Error(`Command timeout: ${command.command}`));
      }, this.config.timeout);

      this.commandQueue.set(command.id, {
        command,
        resolve: (response) => {
          clearTimeout(timeout);
          resolve(response);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        }
      });

      const message = JSON.stringify({
        id: command.id,
        command: command.command,
        parameters: command.parameters,
        timestamp: command.timestamp.toISOString()
      });

      this.socket!.send(message);
    });
  }

  /**
   * Setup message handlers
   */
  private setupMessageHandlers(): void {
    if (!this.socket) return;

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle command response
        if (data.id && this.commandQueue.has(data.id)) {
          const { resolve } = this.commandQueue.get(data.id)!;
          this.commandQueue.delete(data.id);
          
          resolve({
            success: data.success || false,
            commandId: data.id,
            data: data.data,
            error: data.error,
            timestamp: new Date(data.timestamp || Date.now())
          });
        }

        // Handle status updates
        if (data.type === 'status') {
          const status: MachineStatus = {
            machineId: data.machineId,
            status: data.status,
            currentOperation: data.currentOperation,
            progress: data.progress || 0,
            errorCode: data.errorCode,
            errorMessage: data.errorMessage,
            temperature: data.temperature,
            spindleSpeed: data.spindleSpeed,
            feedRate: data.feedRate,
            toolNumber: data.toolNumber,
            lastUpdate: new Date(data.timestamp || Date.now())
          };

          this.statusCallbacks.forEach(callback => callback(status));
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };
  }

  /**
   * Subscribe to status updates
   */
  subscribeToStatus(callback: (status: MachineStatus) => void): () => void {
    this.statusCallbacks.add(callback);

    // Request initial status
    this.requestStatus();

    // Return unsubscribe function
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  /**
   * Request current machine status
   */
  async requestStatus(): Promise<MachineStatus> {
    const command: YilmazCommand = {
      command: 'GET_STATUS',
      parameters: {},
      timestamp: new Date(),
      id: this.generateCommandId()
    };

    const response = await this.sendCommand(command);
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get status');
    }

    return response.data as MachineStatus;
  }

  /**
   * Upload cutting list file
   */
  async uploadCuttingList(fileData: string | Buffer, filename: string): Promise<boolean> {
    const command: YilmazCommand = {
      command: 'UPLOAD_FILE',
      parameters: {
        filename,
        data: typeof fileData === 'string' ? fileData : fileData.toString('base64'),
        format: filename.endsWith('.csv') ? 'csv' : 'mdb'
      },
      timestamp: new Date(),
      id: this.generateCommandId()
    };

    const response = await this.sendCommand(command);
    return response.success;
  }

  /**
   * Start cutting operation
   */
  async startOperation(operationId: string): Promise<boolean> {
    const command: YilmazCommand = {
      command: 'START_OPERATION',
      parameters: {
        operationId
      },
      timestamp: new Date(),
      id: this.generateCommandId()
    };

    const response = await this.sendCommand(command);
    return response.success;
  }

  /**
   * Pause current operation
   */
  async pauseOperation(): Promise<boolean> {
    const command: YilmazCommand = {
      command: 'PAUSE_OPERATION',
      parameters: {},
      timestamp: new Date(),
      id: this.generateCommandId()
    };

    const response = await this.sendCommand(command);
    return response.success;
  }

  /**
   * Resume paused operation
   */
  async resumeOperation(): Promise<boolean> {
    const command: YilmazCommand = {
      command: 'RESUME_OPERATION',
      parameters: {},
      timestamp: new Date(),
      id: this.generateCommandId()
    };

    const response = await this.sendCommand(command);
    return response.success;
  }

  /**
   * Stop current operation
   */
  async stopOperation(): Promise<boolean> {
    const command: YilmazCommand = {
      command: 'STOP_OPERATION',
      parameters: {},
      timestamp: new Date(),
      id: this.generateCommandId()
    };

    const response = await this.sendCommand(command);
    return response.success;
  }

  /**
   * Handle reconnection
   */
  private handleReconnect(): void {
    if (this.reconnectTimer) {
      return; // Already attempting to reconnect
    }

    let attempts = 0;
    const tryReconnect = () => {
      attempts++;
      
      if (attempts > this.config.retryAttempts) {
        console.error('Max reconnection attempts reached');
        this.reconnectTimer = undefined;
        return;
      }

      this.connect()
        .then(() => {
          console.log('Reconnected successfully');
          this.reconnectTimer = undefined;
        })
        .catch(() => {
          this.reconnectTimer = setTimeout(tryReconnect, this.config.retryDelay);
        });
    };

    this.reconnectTimer = setTimeout(tryReconnect, this.config.retryDelay);
  }

  /**
   * Generate unique command ID
   */
  private generateCommandId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check connection status
   */
  isConnectedToMachine(): boolean {
    return this.isConnected && this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection info
   */
  getConnectionInfo(): { host: string; port: number; connected: boolean } {
    return {
      host: this.config.host,
      port: this.config.port,
      connected: this.isConnected
    };
  }
}

