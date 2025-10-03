'use client'

/**
 * Audio Player Component
 * HTML5 audio player with custom controls and transcript synchronization
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import type { AudioPlayerState, PlaybackRate, PLAYBACK_RATES } from '@/types/audio'

interface AudioPlayerProps {
  src: string
  onTimeUpdate?: (time: number) => void
  onDurationChange?: (duration: number) => void
  className?: string
  timestamps?: Array<{ start: number; end: number; text: string }>
}

const PLAYBACK_RATES: ReadonlyArray<PlaybackRate> = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

export default function AudioPlayer({
  src,
  onTimeUpdate,
  onDurationChange,
  className = '',
  timestamps,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playerState, setPlayerState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackRate: 1,
    isMuted: false,
    isLoading: true,
  })

  // Update current time
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime
      setPlayerState((prev) => ({ ...prev, currentTime: time }))
      onTimeUpdate?.(time)
    }
  }, [onTimeUpdate])

  // Update duration
  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      const duration = audioRef.current.duration
      setPlayerState((prev) => ({ ...prev, duration, isLoading: false }))
      onDurationChange?.(duration)
    }
  }, [onDurationChange])

  // Play/Pause toggle
  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (playerState.isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setPlayerState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }))
    }
  }, [playerState.isPlaying])

  // Seek to specific time
  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setPlayerState((prev) => ({ ...prev, currentTime: time }))
    }
  }, [])

  // Skip forward/backward
  const skip = useCallback((seconds: number) => {
    if (audioRef.current) {
      const newTime = Math.max(
        0,
        Math.min(playerState.duration, audioRef.current.currentTime + seconds)
      )
      seekTo(newTime)
    }
  }, [playerState.duration, seekTo])

  // Change playback rate
  const changePlaybackRate = useCallback(() => {
    if (audioRef.current) {
      const currentIndex = PLAYBACK_RATES.indexOf(playerState.playbackRate)
      const nextIndex = (currentIndex + 1) % PLAYBACK_RATES.length
      const newRate = PLAYBACK_RATES[nextIndex]
      audioRef.current.playbackRate = newRate
      setPlayerState((prev) => ({ ...prev, playbackRate: newRate }))
    }
  }, [playerState.playbackRate])

  // Change volume
  const changeVolume = useCallback((volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = volume
      setPlayerState((prev) => ({ ...prev, volume, isMuted: volume === 0 }))
    }
  }, [])

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      const newMuted = !playerState.isMuted
      audioRef.current.muted = newMuted
      setPlayerState((prev) => ({ ...prev, isMuted: newMuted }))
    }
  }, [playerState.isMuted])

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case ' ':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          e.preventDefault()
          skip(-5)
          break
        case 'ArrowRight':
          e.preventDefault()
          skip(5)
          break
        case 'm':
          e.preventDefault()
          toggleMute()
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [togglePlay, skip, toggleMute])

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${className}`}>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setPlayerState((prev) => ({ ...prev, isPlaying: true }))}
        onPause={() => setPlayerState((prev) => ({ ...prev, isPlaying: false }))}
        onEnded={() => setPlayerState((prev) => ({ ...prev, isPlaying: false }))}
      />

      {/* Progress bar */}
      <div className="mb-4">
        <div className="relative w-full h-2 bg-gray-200 rounded-full cursor-pointer group">
          {/* Buffer bar (optional) */}
          <div className="absolute h-full bg-gray-300 rounded-full" style={{ width: '100%' }} />
          
          {/* Progress bar */}
          <div
            className="absolute h-full bg-blue-600 rounded-full transition-all"
            style={{
              width: `${(playerState.currentTime / playerState.duration) * 100}%`,
            }}
          />
          
          {/* Clickable overlay */}
          <input
            type="range"
            min="0"
            max={playerState.duration || 100}
            value={playerState.currentTime}
            onChange={(e) => seekTo(parseFloat(e.target.value))}
            className="absolute w-full h-full opacity-0 cursor-pointer"
            aria-label="Seek audio"
          />
        </div>

        {/* Time display */}
        <div className="flex justify-between items-center mt-2 text-sm text-gray-600">
          <span>{formatTime(playerState.currentTime)}</span>
          <span>{formatTime(playerState.duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Left: Main controls */}
        <div className="flex items-center space-x-3">
          {/* Skip backward */}
          <button
            onClick={() => skip(-10)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Skip backward 10 seconds"
            title="Skip backward 10s"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"
              />
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="p-3 bg-blue-600 text-white hover:bg-blue-700 rounded-full transition-colors shadow-md"
            aria-label={playerState.isPlaying ? 'Pause' : 'Play'}
            title={playerState.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {playerState.isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Skip forward */}
          <button
            onClick={() => skip(10)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Skip forward 10 seconds"
            title="Skip forward 10s"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"
              />
            </svg>
          </button>
        </div>

        {/* Right: Secondary controls */}
        <div className="flex items-center space-x-3">
          {/* Playback rate */}
          <button
            onClick={changePlaybackRate}
            className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors font-medium"
            aria-label="Change playback speed"
            title="Playback speed"
          >
            {playerState.playbackRate}x
          </button>

          {/* Volume */}
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleMute}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
              aria-label={playerState.isMuted ? 'Unmute' : 'Mute'}
              title={playerState.isMuted ? 'Unmute (M)' : 'Mute (M)'}
            >
              {playerState.isMuted || playerState.volume === 0 ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                </svg>
              )}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={playerState.isMuted ? 0 : playerState.volume}
              onChange={(e) => changeVolume(parseFloat(e.target.value))}
              className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              aria-label="Volume"
              title="Volume"
            />
          </div>
        </div>
      </div>

      {/* Loading state */}
      {playerState.isLoading && (
        <div className="mt-3 text-center text-sm text-gray-500">Loading audio...</div>
      )}

      {/* Keyboard shortcuts hint */}
      <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
        <span className="font-medium">Keyboard shortcuts:</span> Space (play/pause), ← → (skip), M (mute)
      </div>
    </div>
  )
}

