/**
 * Audio Player Type Definitions
 * Types for audio playback, controls, and synchronization
 */

// ============================================
// AUDIO PLAYER TYPES
// ============================================

/**
 * Audio player state
 */
export interface AudioPlayerState {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  playbackRate: number
  isMuted: boolean
  isLoading: boolean
  error?: string
}

/**
 * Playback status
 */
export type PlaybackStatus = 
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'ended'
  | 'error'

/**
 * Audio player event handlers
 */
export interface AudioPlayerHandlers {
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
  onTimeUpdate?: (time: number) => void
  onDurationChange?: (duration: number) => void
  onVolumeChange?: (volume: number) => void
  onPlaybackRateChange?: (rate: number) => void
  onError?: (error: Error) => void
  onLoadStart?: () => void
  onLoadedData?: () => void
  onSeeking?: (time: number) => void
  onSeeked?: (time: number) => void
}

/**
 * Audio player configuration
 */
export interface AudioPlayerConfig {
  src: string
  autoPlay?: boolean
  loop?: boolean
  volume?: number
  playbackRate?: number
  preload?: 'none' | 'metadata' | 'auto'
  crossOrigin?: 'anonymous' | 'use-credentials'
}

// ============================================
// PLAYBACK CONTROL TYPES
// ============================================

/**
 * Playback control actions
 */
export interface PlaybackControls {
  play: () => void
  pause: () => void
  toggle: () => void
  stop: () => void
  seek: (time: number) => void
  skipForward: (seconds: number) => void
  skipBackward: (seconds: number) => void
  setVolume: (volume: number) => void
  setPlaybackRate: (rate: number) => void
  toggleMute: () => void
}

/**
 * Playback rate options
 */
export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const
export type PlaybackRate = typeof PLAYBACK_RATES[number]

/**
 * Skip interval options (in seconds)
 */
export const SKIP_INTERVALS = {
  SHORT: 5,
  MEDIUM: 10,
  LONG: 30,
} as const

// ============================================
// AUDIO METADATA TYPES
// ============================================

/**
 * Audio file metadata
 */
export interface AudioMetadata {
  duration: number
  bitrate?: number
  sampleRate?: number
  channels?: number
  codec?: string
  format: string
  size: number
}

/**
 * Audio quality information
 */
export interface AudioQuality {
  bitrate: number
  sampleRate: number
  quality: 'low' | 'medium' | 'high'
  isLossless: boolean
}

// ============================================
// TRANSCRIPT SYNCHRONIZATION TYPES
// ============================================

/**
 * Synchronized transcript segment
 */
export interface SyncedTranscriptSegment {
  id: string
  text: string
  start: number
  end: number
  isActive?: boolean
  speaker?: string
}

/**
 * Transcript sync state
 */
export interface TranscriptSyncState {
  segments: SyncedTranscriptSegment[]
  activeSegmentId?: string
  activeSegmentIndex?: number
  scrollToActive: boolean
  highlightColor?: string
}

/**
 * Sync configuration
 */
export interface SyncConfig {
  enabled: boolean
  autoScroll: boolean
  highlightActive: boolean
  offsetMs?: number // Timing offset in milliseconds
}

// ============================================
// WAVEFORM AND VISUALIZATION TYPES
// ============================================

/**
 * Waveform data point
 */
export interface WaveformDataPoint {
  time: number
  amplitude: number
}

/**
 * Waveform configuration
 */
export interface WaveformConfig {
  height: number
  color: string
  progressColor: string
  cursorColor: string
  responsive: boolean
  barWidth?: number
  barGap?: number
  barRadius?: number
}

/**
 * Waveform region (for marking segments)
 */
export interface WaveformRegion {
  id: string
  start: number
  end: number
  color?: string
  label?: string
  draggable?: boolean
  resizable?: boolean
}

// ============================================
// KEYBOARD SHORTCUTS TYPES
// ============================================

/**
 * Keyboard shortcut configuration
 */
export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  action: () => void
  description: string
  enabled: boolean
}

/**
 * Default keyboard shortcuts
 */
export const DEFAULT_SHORTCUTS = {
  PLAY_PAUSE: { key: ' ', description: 'Play/Pause' },
  SKIP_FORWARD: { key: 'ArrowRight', description: 'Skip forward 5s' },
  SKIP_BACKWARD: { key: 'ArrowLeft', description: 'Skip backward 5s' },
  VOLUME_UP: { key: 'ArrowUp', description: 'Volume up' },
  VOLUME_DOWN: { key: 'ArrowDown', description: 'Volume down' },
  MUTE: { key: 'm', description: 'Mute/Unmute' },
  SPEED_UP: { key: '>', shiftKey: true, description: 'Increase speed' },
  SPEED_DOWN: { key: '<', shiftKey: true, description: 'Decrease speed' },
  SEEK_TO_START: { key: 'Home', description: 'Jump to start' },
  SEEK_TO_END: { key: 'End', description: 'Jump to end' },
} as const

// ============================================
// PROGRESS AND BUFFERING TYPES
// ============================================

/**
 * Buffer state
 */
export interface BufferState {
  loaded: number // Percentage loaded (0-100)
  buffered: TimeRange[]
  isBuffering: boolean
}

/**
 * Time range (similar to native TimeRanges)
 */
export interface TimeRange {
  start: number
  end: number
}

/**
 * Progress state
 */
export interface ProgressState {
  currentTime: number
  duration: number
  percentage: number // 0-100
  remaining: number // Seconds remaining
}

// ============================================
// UI COMPONENT TYPES
// ============================================

/**
 * Time display format
 */
export type TimeDisplayFormat = 
  | 'mm:ss'
  | 'hh:mm:ss'
  | 'percentage'
  | 'remaining'

/**
 * Player theme
 */
export interface PlayerTheme {
  primary: string
  secondary: string
  background: string
  text: string
  accent: string
  error: string
}

/**
 * Player size variant
 */
export type PlayerSize = 'compact' | 'default' | 'large'

/**
 * Control visibility options
 */
export interface ControlsVisibility {
  playButton: boolean
  timeline: boolean
  volume: boolean
  playbackRate: boolean
  download: boolean
  fullscreen: boolean
  currentTime: boolean
  duration: boolean
}

// ============================================
// ACCESSIBILITY TYPES
// ============================================

/**
 * Accessibility labels
 */
export interface A11yLabels {
  play: string
  pause: string
  mute: string
  unmute: string
  volumeSlider: string
  timeSlider: string
  playbackRateButton: string
  skipForward: string
  skipBackward: string
  currentTime: string
  duration: string
}

/**
 * Screen reader announcements
 */
export interface ScreenReaderAnnouncement {
  message: string
  priority: 'polite' | 'assertive'
  delay?: number
}

// ============================================
// ERROR HANDLING TYPES
// ============================================

/**
 * Audio error types
 */
export enum AudioErrorType {
  ABORTED = 'ABORTED',
  NETWORK = 'NETWORK',
  DECODE = 'DECODE',
  SRC_NOT_SUPPORTED = 'SRC_NOT_SUPPORTED',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Audio error details
 */
export interface AudioError {
  type: AudioErrorType
  message: string
  code?: number
  recoverable: boolean
  timestamp: Date
}

// ============================================
// PERFORMANCE TYPES
// ============================================

/**
 * Audio loading metrics
 */
export interface LoadingMetrics {
  startTime: number
  loadTime: number
  bufferTime: number
  totalTime: number
  cacheHit: boolean
}

/**
 * Playback quality metrics
 */
export interface PlaybackMetrics {
  bufferingEvents: number
  totalBufferingTime: number
  dropouts: number
  averageLatency: number
  bandwidth?: number
}

