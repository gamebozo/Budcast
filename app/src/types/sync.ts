export type MediaMode = 'video' | 'audio';

export interface MediaItem {
  id: string;
  title: string;
  type: MediaMode;
  url: string;
  duration?: number;
  filename?: string;
  mimetype?: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  playbackRate: number;
  lastUpdatedServerTime: number;
}

export interface ListenerInfo {
  socketId: string;
  name: string;
  device: string;
  joinedAt: number;
}

export interface RoomData {
  id: string;
  title: string;
  mode: MediaMode;
  hostSocketId?: string;
  media: MediaItem;
  playbackState: PlaybackState;
  channel?: string;
  channels?: Record<string, MediaItem>;
  listeners?: ListenerInfo[];
  createdAt?: number;
}

export interface SyncEvent {
  action: 'PLAY' | 'PAUSE' | 'SEEK' | 'SET_MEDIA' | 'CHANGE_CHANNEL' | 'SET_RATE';
  scheduledStartServerTime?: number;
  currentTime?: number;
  isPlaying?: boolean;
  serverTime: number;
  media?: MediaItem;
  channel?: string;
  playbackRate?: number;
}

export interface ReactionItem {
  id: string;
  emoji: string;
  senderName: string;
  timestamp: number;
}
