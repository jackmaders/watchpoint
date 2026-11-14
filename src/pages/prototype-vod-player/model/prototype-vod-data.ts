import { useCallback, useEffect, useRef, useState } from "react";

export type SkillCategory = "Strategy" | "Tactics" | "Awareness" | "Tracking";

export interface PrototypePromptOption {
  id: string;
  label: string;
}

export interface PrototypeCheckpoint {
  id: string;
  timeSec: number;
  title: string;
  skillCategory: SkillCategory;
  question: string;
  options: PrototypePromptOption[];
  correctOptionId: string;
  explanation: string;
}

export interface PrototypeVod {
  id: string;
  title: string;
  hero: string;
  role: "Tank" | "Damage" | "Support";
  tier: "Ranked GM" | "Ranked Champion" | "FACEIT" | "OWCS";
  map: string;
  youtubeVideoId: string;
  checkpoints: PrototypeCheckpoint[];
}

export const PROTOTYPE_VOD: PrototypeVod = {
  id: "proto-tracer-ilios",
  title: "Proper Tracer — Ilios Control (Well)",
  hero: "Tracer",
  role: "Damage",
  tier: "OWCS",
  map: "Ilios",
  // Official Overwatch 2 / Blizzard video placeholder; replaceable in prototype bar
  youtubeVideoId: "LGgqyer-qr4",
  checkpoints: [
    {
      id: "cp-1",
      timeSec: 18,
      title: "Pre-fight flank scout",
      skillCategory: "Awareness",
      question:
        "Both teams are rotating toward Well. Before blinking across main, what threat has not been accounted for on the killfeed or sightlines?",
      options: [
        { id: "a", label: "Enemy Ana is holding high ground behind point" },
        { id: "b", label: "Enemy Tracer is missing from main and likely staging coast" },
        { id: "c", label: "Enemy Tank already used movement cooldowns" },
        { id: "d", label: "Your Support line is fully setup on point" },
      ],
      correctOptionId: "b",
      explanation:
        "Four enemies are visible on main/windmill while the opposing Tracer is unseen. Clearing the coast lane first prevents your backline from getting isolated.",
    },
    {
      id: "cp-2",
      timeSec: 42,
      title: "Defensive cooldown window",
      skillCategory: "Tracking",
      question:
        "Your Winston just forced Kiriko's Protection Suzu on the point lip. What is the correct immediate follow-up?",
      options: [
        { id: "a", label: "Wait for Pulse Bomb before committing any blinks" },
        { id: "b", label: "Hard-commit with 2 blinks onto Kiriko while Suzu is down (~14s)" },
        { id: "c", label: "Fall back to health pack and poke the Tank" },
        { id: "d", label: "Swap targets to the full-HP Orisa" },
      ],
      correctOptionId: "b",
      explanation:
        "With Suzu on cooldown for ~14 seconds, Kiriko only has Swift Step if a teammate is in range. Pressuring her immediately either secures the pick or forces her out of the fight.",
    },
    {
      id: "cp-3",
      timeSec: 68,
      title: "Micro angle & Recall discipline",
      skillCategory: "Tactics",
      question:
        "You are at 95 HP on the enemy side of Well with Recall available and 1 blink left. Where should you play the next 3 seconds?",
      options: [
        { id: "a", label: "Blink straight through main choke toward your Supports" },
        { id: "b", label: "Hold the pillar cover to bait attention, then Recall if pressured" },
        { id: "c", label: "Stand on the center point edge to contest capture progress" },
        { id: "d", label: "Drop into the lower mega room before the fight starts" },
      ],
      correctOptionId: "b",
      explanation:
        "Playing tight around pillar cover keeps off-angle pressure on their backline without spending Recall prematurely; you still hold Recall as a safe reset.",
    },
    {
      id: "cp-4",
      timeSec: 95,
      title: "Ultimate economy at 85% vs 85%",
      skillCategory: "Strategy",
      question:
        "Your team is down one early pick at 85% capture, and you have Pulse Bomb. Should you invest Pulse Bomb to try to stabilize this fight?",
      options: [
        { id: "a", label: "Yes — stick the Tank immediately to stall progress" },
        {
          id: "b",
          label: "Hold Pulse Bomb, kite out alive, and pair it with Nano/Primal next fight",
        },
        { id: "c", label: "Solo-ult the enemy Lucio on coast" },
        { id: "d", label: "Force Recall on point to burn 2 seconds" },
      ],
      correctOptionId: "b",
      explanation:
        "At 85%–85%, losing one early puts you at a steep disadvantage; saving Pulse Bomb guarantees an opening win condition for the final decisive re-contest.",
    },
  ],
};

export interface CheckpointAnswerRecord {
  selectedOptionId: string;
  isCorrect: boolean;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        options: {
          videoId: string;
          host?: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: () => void;
            onStateChange?: (event: { data: number }) => void;
          };
        },
      ) => {
        getCurrentTime: () => number;
        seekTo: (seconds: number, allowSeekAhead: boolean) => void;
        playVideo: () => void;
        pauseVideo: () => void;
        destroy: () => void;
      };
      PlayerState?: {
        PLAYING: number;
        PAUSED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export function usePrototypeVodPlayer(vod: PrototypeVod) {
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<ReturnType<NonNullable<typeof window.YT>["Player"]> | null>(null);
  const prevTimeRef = useRef(0);

  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [activeCheckpointId, setActiveCheckpointId] = useState<string | null>(null);
  const [draftOptionId, setDraftOptionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, CheckpointAnswerRecord>>({});

  const answersRef = useRef(answers);
  answersRef.current = answers;

  useEffect(() => {
    let cancelled = false;

    const mountPlayer = () => {
      if (cancelled || !playerHostRef.current || !window.YT?.Player) {
        return;
      }

      playerRef.current = new window.YT.Player(playerHostRef.current, {
        videoId: vod.youtubeVideoId,
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          controls: 1,
          enablejsapi: 1,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (!cancelled) {
              setPlayerReady(true);
            }
          },
          onStateChange: (event) => {
            if (!cancelled) {
              setIsPlaying(event.data === 1);
            }
          },
        },
      });
    };

    if (window.YT?.Player) {
      mountPlayer();
    } else {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src="https://www.youtube.com/iframe_api"]',
      );
      if (!existingScript) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
      const prevReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prevReady?.();
        mountPlayer();
      };
    }

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [vod.youtubeVideoId]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    let frameId = 0;
    const tick = () => {
      const player = playerRef.current;
      if (player) {
        const now = player.getCurrentTime();
        const prev = prevTimeRef.current;
        prevTimeRef.current = now;
        setCurrentTimeSec(now);

        const hit = vod.checkpoints.find(
          (cp) => !answersRef.current[cp.id] && prev < cp.timeSec && now >= cp.timeSec,
        );
        if (hit) {
          player.pauseVideo();
          setIsPlaying(false);
          setActiveCheckpointId(hit.id);
          setDraftOptionId(null);
          return;
        }
      }
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [isPlaying, vod.checkpoints]);

  const activeCheckpoint = vod.checkpoints.find((cp) => cp.id === activeCheckpointId) ?? null;

  const nextUnansweredCheckpoint = vod.checkpoints.find((cp) => !answers[cp.id]) ?? null;

  const jumpToCheckpoint = useCallback(
    (checkpointId: string) => {
      const target = vod.checkpoints.find((cp) => cp.id === checkpointId);
      if (!target) {
        return;
      }
      prevTimeRef.current = target.timeSec;
      setCurrentTimeSec(target.timeSec);
      setActiveCheckpointId(target.id);
      setDraftOptionId(answers[target.id]?.selectedOptionId ?? null);
      if (playerRef.current) {
        playerRef.current.seekTo(target.timeSec, true);
        playerRef.current.pauseVideo();
      }
      setIsPlaying(false);
    },
    [answers, vod.checkpoints],
  );

  const submitAnswer = useCallback(() => {
    if (!activeCheckpoint || !draftOptionId || answers[activeCheckpoint.id]) {
      return;
    }
    setAnswers((prev) => ({
      ...prev,
      [activeCheckpoint.id]: {
        selectedOptionId: draftOptionId,
        isCorrect: draftOptionId === activeCheckpoint.correctOptionId,
      },
    }));
  }, [activeCheckpoint, answers, draftOptionId]);

  const resumeVod = useCallback(() => {
    setActiveCheckpointId(null);
    setDraftOptionId(null);
    if (playerRef.current) {
      playerRef.current.playVideo();
    }
    setIsPlaying(true);
  }, []);

  const answeredCount = Object.keys(answers).length;
  const correctCount = Object.values(answers).filter((a) => a.isCorrect).length;

  return {
    playerHostRef,
    playerReady,
    isPlaying,
    currentTimeSec,
    activeCheckpoint,
    nextUnansweredCheckpoint,
    draftOptionId,
    setDraftOptionId,
    answers,
    answeredCount,
    correctCount,
    jumpToCheckpoint,
    submitAnswer,
    resumeVod,
  };
}
