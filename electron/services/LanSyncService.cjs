const dgram = require('dgram');
const crypto = require('crypto');

class LanSyncService {
  constructor(options = {}) {
    this.port = options.port || 41235;
    this.multicastAddress = options.multicastAddress || '239.255.42.99';
    this.instanceId =
      options.instanceId ||
      (typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `lan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

    this.socket = null;
    this.started = false;
    this.messageHandler = null;
    this.seenPacketIds = new Map();
    this.maxSeenPackets = 1000;
  }

  start(onMessage) {
    if (this.started) return;

    this.messageHandler = typeof onMessage === 'function' ? onMessage : null;
    this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    this.socket.on('error', (error) => {
      console.error('[LanSync] Socket error:', error?.message || error);
    });

    this.socket.on('listening', () => {
      try {
        this.socket.addMembership(this.multicastAddress);
      } catch (error) {
        console.error('[LanSync] Failed to join multicast group:', error?.message || error);
      }

      try {
        this.socket.setMulticastTTL(1);
        this.socket.setMulticastLoopback(true);
        this.socket.setBroadcast(true);
      } catch (error) {
        console.error('[LanSync] Failed to configure socket:', error?.message || error);
      }
    });

    this.socket.on('message', (buffer, rinfo) => {
      const packet = this.parsePacket(buffer);
      if (!packet) return;
      if (!packet.channel || !packet.packetId || !packet.timestamp) return;
      if (packet.sourceId === this.instanceId) return;
      if (this.hasSeenPacket(packet.packetId)) return;

      this.markPacketSeen(packet.packetId);
      if (!this.messageHandler) return;

      try {
        this.messageHandler({ ...packet, remoteAddress: rinfo?.address || null });
      } catch (error) {
        console.error('[LanSync] Message handler failed:', error?.message || error);
      }
    });

    this.socket.bind(this.port, '0.0.0.0', () => {
      this.started = true;
      console.log(`[LanSync] Listening on udp://0.0.0.0:${this.port} group=${this.multicastAddress}`);
    });
  }

  parsePacket(buffer) {
    try {
      const raw = buffer.toString('utf8');
      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  hasSeenPacket(packetId) {
    return this.seenPacketIds.has(packetId);
  }

  markPacketSeen(packetId) {
    this.seenPacketIds.set(packetId, Date.now());
    if (this.seenPacketIds.size <= this.maxSeenPackets) return;

    const sorted = Array.from(this.seenPacketIds.entries()).sort((a, b) => a[1] - b[1]);
    const dropCount = Math.ceil(this.maxSeenPackets * 0.2);
    for (let i = 0; i < dropCount && i < sorted.length; i += 1) {
      const [id] = sorted[i];
      this.seenPacketIds.delete(id);
    }
  }

  createPacket(channel, payload) {
    const packetId =
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `pkt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    return {
      packetId,
      sourceId: this.instanceId,
      channel,
      payload,
      timestamp: new Date().toISOString(),
    };
  }

  publish(channel, payload) {
    if (!this.socket || !this.started) {
      return false;
    }

    if (!channel || typeof channel !== 'string') {
      return false;
    }

    const packet = this.createPacket(channel, payload);
    const data = Buffer.from(JSON.stringify(packet));

    try {
      this.markPacketSeen(packet.packetId);
      this.socket.send(data, 0, data.length, this.port, this.multicastAddress);
      return true;
    } catch (error) {
      console.error('[LanSync] Publish failed:', error?.message || error);
      return false;
    }
  }

  stop() {
    if (!this.socket) {
      this.started = false;
      return;
    }

    try {
      this.socket.close();
    } catch (error) {
      console.error('[LanSync] Stop failed:', error?.message || error);
    } finally {
      this.socket = null;
      this.started = false;
    }
  }
}

module.exports = { LanSyncService };
