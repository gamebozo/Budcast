import { Socket } from 'socket.io-client';

class SyncEngine {
  private socket: Socket | null = null;
  private clockOffset: number = 0; // serverTime - localClientTime
  private rtt: number = 0; // Round trip time in ms
  private pingInterval: any = null;
  private offsetHistory: number[] = [];

  public init(socket: Socket) {
    this.socket = socket;
    this.offsetHistory = [];
    this.setupListeners();
    this.startSync();
  }

  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('ntp_pong', (data: { clientSendTime: number; serverReceiveTime: number; serverSendTime: number }) => {
      const clientReceiveTime = Date.now();
      const roundTripTime = clientReceiveTime - data.clientSendTime;
      // Offset calculation
      const offset = ((data.serverReceiveTime - data.clientSendTime) + (data.serverSendTime - clientReceiveTime)) / 2;

      this.rtt = roundTripTime;
      this.offsetHistory.push(offset);
      if (this.offsetHistory.length > 8) {
        this.offsetHistory.shift();
      }

      // Median offset filtering to reject outlier network spikes
      const sorted = [...this.offsetHistory].sort((a, b) => a - b);
      this.clockOffset = sorted[Math.floor(sorted.length / 2)];
    });
  }

  public startSync() {
    this.sendPing();
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, 4000);
  }

  public sendPing() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('ntp_ping', { clientSendTime: Date.now() });
    }
  }

  // Returns current estimated server time in milliseconds
  public getServerTime(): number {
    return Date.now() + this.clockOffset;
  }

  // Returns current clock drift and RTT for diagnostics
  public getDiagnostics() {
    return {
      clockOffset: Math.round(this.clockOffset),
      rtt: Math.round(this.rtt),
      quality: this.rtt < 50 ? 'Excellent' : this.rtt < 150 ? 'Good' : 'Moderate'
    };
  }

  public destroy() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

export const syncEngine = new SyncEngine();
