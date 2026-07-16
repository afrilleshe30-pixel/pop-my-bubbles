"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./page.module.css";

// ==========================================
// CONFIGURABLE CONSTANTS (Tweak these to your liking!)
// ==========================================
const GRID_ROWS = 8;
const GRID_COLS = 10;
const TOTAL_BUBBLES = GRID_ROWS * GRID_COLS;

const POP_SOUND_FREQ_START = 800; // Starting frequency of pop in Hz
const POP_SOUND_FREQ_END = 150;   // Ending frequency of pop in Hz
const POP_SOUND_DURATION = 0.08;  // Sound duration in seconds
const REFILL_STAGGER_MS = 15;      // Delay between each bubble refilling

export default function BubbleWrapPage() {
  // Screen state: "landing" or "game"
  const [screen, setScreen] = useState("landing");
  
  // Array of booleans representing if a bubble at index is popped (true) or unpopped (false)
  const [bubbles, setBubbles] = useState(Array(TOTAL_BUBBLES).fill(false));
  const [isMuted, setIsMuted] = useState(false);
  const [isRefilling, setIsRefilling] = useState(false);
  
  // Track high-frequency/rapid clicks to prevent UI glitches
  const lastClickTimeRef = useRef(0);
  
  // Create Web Audio context lazily on first user interaction
  const audioCtxRef = useRef(null);

  // Initialize Audio Context on first interaction safely
  // Initialize Audio Context on first interaction safely
  const initAudio = () => {
    try {
      if (typeof window !== "undefined" && !audioCtxRef.current) {
        // @ts-ignore
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          audioCtxRef.current = new AudioContext();
        }
      }
    } catch (err) {
      console.warn("Could not initialize audio context:", err);
    }
  };

  // Synthesize a natural, cute "pop" sound using Web Audio API oscillators
  const playPopSound = () => {
    if (isMuted) return;
    initAudio();
    
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch((err) => console.log("Audio context resume failed:", err));
    }

    try {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      const now = ctx.currentTime;
      osc.type = "sine";
      osc.frequency.setValueAtTime(POP_SOUND_FREQ_START, now);
      osc.frequency.exponentialRampToValueAtTime(POP_SOUND_FREQ_END, now + POP_SOUND_DURATION);

      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + POP_SOUND_DURATION);

      osc.start(now);
      osc.stop(now + POP_SOUND_DURATION);
    } catch (e) {
      console.warn("Audio play blocked or failed to initialize:", e);
    }
  };

  // Trigger mobile vibration if supported
  const triggerHapticFeedback = () => {
    if (typeof window !== "undefined" && navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  // Handle bubble popping logic safely
  const handlePop = (index) => {
    if (bubbles[index] || isRefilling) return;

    const now = Date.now();
    if (now - lastClickTimeRef.current < 10) return;
    lastClickTimeRef.current = now;

    setBubbles((prev) => {
      const updated = [...prev];
      updated[index] = true;
      return updated;
    });

    playPopSound();
    triggerHapticFeedback();
  };

  // Smooth staggered refill animation
  const handleRefill = () => {
    if (isRefilling) return; 
    setIsRefilling(true);

    bubbles.forEach((_, index) => {
      setTimeout(() => {
        setBubbles((prev) => {
          const updated = [...prev];
          updated[index] = false;
          return updated;
        });
      }, index * REFILL_STAGGER_MS);
    });

    const totalRefillDuration = TOTAL_BUBBLES * REFILL_STAGGER_MS + 200;
    setTimeout(() => {
      setIsRefilling(false);
    }, totalRefillDuration);
  };

  // Count popped bubbles
  const poppedCount = bubbles.filter(Boolean).length;

  // Safe Play Button Handler
  const handlePlayClick = () => {
    initAudio(); // Try to start audio
    setScreen("game"); // Go to game instantly, no matter what
  };

  // ----------------------------------------------------
  // SCREEN 1: LANDING PAGE
  // ----------------------------------------------------
  if (screen === "landing") {
    return (
      <main className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>pop my bubbles ✨</h1>
          
          <div className={styles.introText}>
            <p>
              Hey! My name is <strong>Afrille Macabudbud</strong> and I created this pop-my-bubbles game.
            </p>
            <p>
              This is my very first game-kinda project, designed to be something that can distract you when you're anxious. I didn't do much research on this, I just had a thought and then made it.
            </p>
            <p className={styles.heartText}>
              So for people who suffer the way I do, use this to redirect your attention. 🤍
            </p>
          </div>

          <button 
            className={styles.playBtn} 
            onClick={handlePlayClick}
          >
            PRESS THIS BUTTON TO PLAY
          </button>
        </div>
      </main>
    );
  }

  // ----------------------------------------------------
  // SCREEN 2: ACTUAL GAME
  // ----------------------------------------------------
  return (
    <main className={styles.container}>
      {/* Soft Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>pop my bubbles ✨</h1>
        <p className={styles.subtitle}>no rules, just pop</p>
      </header>

      {/* Grid Container */}
      <section 
        className={styles.grid}
        style={{
          gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
        }}
      >
        {bubbles.map((isPopped, index) => (
          <button
            key={index}
            className={`${styles.bubble} ${isPopped ? styles.popped : styles.unpopped}`}
            onClick={() => handlePop(index)}
            aria-label={`bubble ${index + 1}, ${isPopped ? "popped" : "unpopped"}`}
            disabled={isPopped || isRefilling}
          >
            <div className={styles.shimmer} />
          </button>
        ))}
      </section>

      {/* Unobtrusive Dashboard & Actions */}
      <footer className={styles.footer}>
        <div className={styles.stats}>
          {poppedCount} / {TOTAL_BUBBLES} popped
        </div>
        
        <div className={styles.actions}>
          <button 
            className={styles.actionBtn} 
            onClick={() => setScreen("landing")}
            aria-label="Go back to landing page"
          >
            👈 back
          </button>

          <button 
            className={styles.actionBtn} 
            onClick={() => setIsMuted(!isMuted)}
            aria-label={isMuted ? "Unmute sounds" : "Mute sounds"}
          >
            {isMuted ? "🔇 muted" : "🔊 sound on"}
          </button>

          <button 
            className={styles.refillBtn} 
            onClick={handleRefill}
            disabled={isRefilling}
            aria-label="Refill all bubbles"
          >
            {isRefilling ? "filling..." : "🔄 refill wrap"}
          </button>
        </div>
      </footer>
    </main>
  );
}