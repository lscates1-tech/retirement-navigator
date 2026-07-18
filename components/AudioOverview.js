'use client';

import { useRef, useState, useEffect } from 'react';
import styles from './AudioOverview.module.css';

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Compact audio player for the site's ~90-second AI-generated overview clip.
 * variant="compact" -> small pill for the homepage hero.
 * variant="card" -> slightly larger card style for the How to Use page.
 */
export default function AudioOverview({ variant = 'compact', label = 'Listen: What is Next Horizon?' }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0-1
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
    };
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * duration;
  };

  return (
    <div className={`${styles.wrap} ${variant === 'card' ? styles.card : styles.compact}`}>
      <audio ref={audioRef} src="/audio/next-horizon-overview.m4a" preload="metadata" />

      <button
        type="button"
        onClick={togglePlay}
        className={styles.playBtn}
        aria-label={isPlaying ? 'Pause overview' : 'Play overview'}
      >
        {isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>

      <div className={styles.body}>
        <div className={styles.labelRow}>
          <span className={styles.label}>{label}</span>
          <span className={styles.time}>
            {formatTime(currentTime)} / {duration ? formatTime(duration) : '1:32'}
          </span>
        </div>
        <div className={styles.track} onClick={handleSeek} role="slider" aria-label="Seek" aria-valuenow={Math.round(progress * 100)}>
          <div className={styles.trackFill} style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
