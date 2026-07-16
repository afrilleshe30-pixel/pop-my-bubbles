"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./page.module.css";

const GRID_ROWS = 8;
const GRID_COLS = 10;
const TOTAL_BUBBLES = GRID_ROWS * GRID_COLS;

const POP_SOUND_FREQ_START = 800;
const POP_SOUND_FREQ_END = 150;
const POP_SOUND_DURATION = 0.08;
const REFILL_STAGGER_MS = 15;

export default function BubbleWrapPage() {
  const [screen, setScreen] = useState("landing");
  const [bubbles, setBubbles] = useState(Array(TOTAL_BUBBLES).fill(false));
  const [isMuted, setIsMuted] = useState(false);
  const [isRefilling, setIsRefilling] = useState(false);
  
  // Timer States
  const [timerRunning, setTimerRunning] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0); // In milliseconds
  const [isCompleted, setIsCompleted] = useState(false);
  const [trials, setTrials] = useState<number[]>([]);

  const lastClickTimeRef = useRef(0);
  const audioCtxRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  // Load trials from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTrials = localStorage.getItem("bubble_trials");
      if (savedTrials) {
        try {
          setTrials(JSON.parse(savedTrials));
        } catch (e) {
          console.error("Error loading trials", e);
        }
      }
    }
  }, []);

  // Timer interval control
  useEffect(() => {
    if (timerRunning) {
      startTimeRef.current = Date.now() - timeElapsed;
      intervalRef.current = setInterval(() => {
        setTimeElapsed(Date.now() - startTimeRef.current);
      }, 10); // Update every 10ms for centisecond precision
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerRunning]);

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

  const playPopSound = () => {
    if (isMuted) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch((err: any) => console.log("Audio context resume failed:", err));
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
      console.warn("Audio play blocked:", e);
    }
  };

  const triggerHapticFeedback = () => {
    if (typeof window !== "undefined" && navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  const handlePop = (index: number) => {
    if (bubbles[index] || isRefilling || isCompleted) return;

    const now = Date.now();
    if (now - lastClickTimeRef.current < 10) return;
    lastClickTimeRef.current = now;

    // Start timer on the very first pop
    const poppedCount = bubbles.filter(Boolean).length;
    if (poppedCount === 0 && !timerRunning) {
      setTimerRunning(true);
    }

    const updatedBubbles = [...bubbles];
    updatedBubbles[index] = true;
    setBubbles(updatedBubbles);

    playPopSound();
    triggerHapticFeedback();

    // Check if game is completed
    const newPoppedCount = updatedBubbles.filter(Boolean).length;
    if (newPoppedCount === TOTAL_BUBBLES) {
      setTimerRunning(false);
      setIsCompleted(true);
      
      // Save this run's time
      const updatedTrials = [timeElapsed, ...trials].slice(0, 5); // Keep the last 5 runs
      setTrials(updatedTrials);
      localStorage.setItem("bubble_trials", JSON.stringify(updatedTrials));
    }
  };

  const handleRefill = () => {
    if (isRefilling) return;
    setIsRefilling(true);
    setIsCompleted(false);
    setTimerRunning(false);
    setTimeElapsed(0);

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

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${seconds}.${centiseconds.toString().padStart(2, "0")}s`;
  };

  const fastestTime = trials.length > 0 ? Math.min(...trials) : null;
  const isNewRecord = isCompleted && fastestTime && timeElapsed <= fastestTime;

  const handlePlayClick = () => {
    initAudio();
    setScreen("game");
  };

  // Clear trial history
  const clearHistory = () => {
    setTrials([]);
    localStorage.removeItem("bubble_trials");
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

          <button className={styles.playBtn} onClick={handlePlayClick}>
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
      <header className={styles.header}>
        <h1 className={styles.title}>pop my bubbles ✨</h1>
        
        {/* Dynamic Timer Display */}
        <div style={{
          fontSize: "1.8rem", 
          fontWeight: "bold", 
          color: "#4a6fa5", 
          fontFamily: "monospace",
          margin: "0.5rem 0"
        }}>
          ⏱️ {formatTime(timeElapsed)}
        </div>
        
        <p className={styles.subtitle}>
          {!timerRunning && !isCompleted && timeElapsed === 0 
            ? "Pop the first bubble to start the clock!" 
            : isCompleted 
            ? "Completed!" 
            : "GO GO GO!"}
        </p>
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
            aria-label={`bubble ${index + 1}`}
            disabled={isRefilling}
          >
            <div className={styles.shimmer} />
          </button>
        ))}
      </section>

      {/* Completion Modal / Message */}
      {isCompleted && (
        <div style={{
          background: "white",
          padding: "1rem",
          borderRadius: "16px",
          marginBottom: "1.5rem",
          textAlign: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          width: "100%",
          maxWidth: "420px"
        }}>
          <h3 style={{ margin: "0 0 0.5rem 0", color: "#4a6fa5" }}>
            {isNewRecord ? "🏆 NEW RECORD! 🏆" : "Finished! 🎉"}
          </h3>
          <p style={{ margin: 0, fontSize: "1.1rem" }}>
            You popped 80 bubbles in <strong>{formatTime(timeElapsed)}</strong>!
          </p>
        </div>
      )}

      {/* Footer & Actions */}
      <footer className={styles.footer}>
        <div className={styles.stats}>
          {bubbles.filter(Boolean).length} / {TOTAL_BUBBLES} popped
        </div>
        
        <div className={styles.actions}>
          <button className={styles.actionBtn} onClick={() => setScreen("landing")}>
            👈 back
          </button>

          <button className={styles.actionBtn} onClick={() => setIsMuted(!isMuted)}>
            {isMuted ? "🔇 muted" : "🔊 sound on"}
          </button>

          <button className={styles.refillBtn} onClick={handleRefill} disabled={isRefilling}>
            {isRefilling ? "filling..." : "🔄 reset & play"}
          </button>
        </div>

        {/* Trials Board */}
        {trials.length > 0 && (
          <div style={{
            marginTop: "1.5rem",
            width: "100%",
            background: "rgba(255, 255, 255, 0.5)",
            padding: "1rem",
            borderRadius: "16px",
            boxSizing: "border-box"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ fontWeight: 600, color: "#555" }}>Recent Runs</span>
              <button 
                onClick={clearHistory}
                style={{ background: "none", border: "none", color: "#ff4d4d", cursor: "pointer", fontSize: "0.8rem" }}
              >
                Clear
              </button>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {trials.map((trialTime, i) => (
                <li key={i} style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  padding: "0.3rem 0",
                  borderBottom: i < trials.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
                  fontSize: "0.9rem"
                }}>
                  <span>Run #{trials.length - i}</span>
                  <span style={{ fontWeight: "bold" }}>
                    {formatTime(trialTime)}
                    {trialTime === fastestTime && " 🏆"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </footer>
    </main>
  );
}