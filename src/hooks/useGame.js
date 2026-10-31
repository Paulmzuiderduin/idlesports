import { useCallback, useEffect, useReducer, useRef, useState } from 'react';

import { ACTIVE_AWAY_GRACE_SECONDS, LOCAL_SAVE_INTERVAL_MS, MAX_ACTIVE_GAP_SECONDS, TICK_MS } from '../game/config.js';
import { applyOffline, gameReducer } from '../game/engine.js';
import { clearLocalState, loadLocalMeta, loadLocalState, persistLocal } from '../game/persistence.js';

const initializeGame = () => {
  const now = Date.now();
  const loaded = loadLocalState(now);
  return applyOffline(loaded, now);
};

export const useGame = () => {
  const [state, dispatch] = useReducer(gameReducer, undefined, initializeGame);
  const stateRef = useRef(state);
  const [savedAt, setSavedAt] = useState(() => loadLocalMeta().savedAt);
  const [saveError, setSaveError] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const saveNow = useCallback(() => {
    const result = persistLocal(stateRef.current, Date.now());
    if (result.savedAt) {
      setSavedAt(result.savedAt);
      setSaveError('');
    } else if (result.error) {
      setSaveError(result.error);
    }
  }, []);

  useEffect(() => {
    saveNow();
  }, [saveNow]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const interval = window.setInterval(saveNow, LOCAL_SAVE_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [saveNow]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') saveNow();
    };
    const handleBeforeUnload = () => saveNow();
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveNow]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let timer = null;

    const tick = () => {
      const now = Date.now();
      const previous = stateRef.current;
      if (previous.lastOffline) return;
      const elapsed = Math.max(0, (now - previous.lastUpdated) / 1000);
      if (elapsed <= 0) return;
      if (elapsed > MAX_ACTIVE_GAP_SECONDS) {
        dispatch({ type: 'SYNC_OFFLINE', now });
      } else {
        dispatch({ type: 'TICK', now, seconds: elapsed });
      }
    };

    const start = () => {
      if (timer) return;
      timer = window.setInterval(tick, TICK_MS);
    };
    const stop = () => {
      if (!timer) return;
      window.clearInterval(timer);
      timer = null;
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stop();
        saveNow();
      } else {
        const now = Date.now();
        const elapsed = Math.max(0, (now - stateRef.current.lastUpdated) / 1000);
        if (!stateRef.current.lastOffline) {
          if (elapsed <= ACTIVE_AWAY_GRACE_SECONDS) {
            dispatch({ type: 'TICK', now, seconds: elapsed });
          } else {
            dispatch({ type: 'SYNC_OFFLINE', now });
          }
        }
        start();
      }
    };

    if (document.visibilityState !== 'hidden') start();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [saveNow]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const sample = () => {
      const current = stateRef.current;
      setHistory((previous) => [
        ...previous,
        {
          t: current.lastUpdated,
          score: current.run.score,
          data: current.resources.data,
          insights: current.resources.insights,
          wins: current.resources.wins,
          fans: current.resources.fans,
          rate: current.run.scoreRate
        }
      ].slice(-60));
    };
    const interval = window.setInterval(sample, 5000);
    return () => window.clearInterval(interval);
  }, []);

  const resetGame = useCallback(() => {
    clearLocalState();
    dispatch({ type: 'RESET', now: Date.now() });
    setHistory([]);
  }, []);

  return {
    state,
    dispatch,
    stateRef,
    savedAt,
    saveError,
    saveNow,
    history,
    resetGame
  };
};
