import type { AnalysisResult, PoseMetrics } from "../types";
import { detectPoseForVideo } from "./poseLandmarker";

interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

interface FrameData {
  lm: Landmark[];
  t: number;
}

const POSE_LANDMARKS = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function deg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function angleABC(a: Landmark, b: Landmark, c: Landmark): number {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const dot = ba.x * bc.x + ba.y * bc.y;
  const magA = Math.sqrt(ba.x * ba.x + ba.y * ba.y);
  const magC = Math.sqrt(bc.x * bc.x + bc.y * bc.y);
  if (magA < 1e-6 || magC < 1e-6) return 0;
  const cos = dot / (magA * magC);
  return Math.acos(Math.max(-1, Math.min(1, cos)));
}

function distance(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function mapArmAlignment(angleRad: number): number {
  const angleDeg = deg(angleRad);
  const dev = Math.abs(180 - angleDeg);
  return Math.max(0, 1 - dev / 90);
}

function mapFlick(maxDeltaDeg: number): number {
  if (maxDeltaDeg < 10) return 0.3;
  if (maxDeltaDeg < 20) return 0.5;
  if (maxDeltaDeg < 30) return 0.7;
  if (maxDeltaDeg < 40) return 0.85;
  return 1.0;
}

function buildStrengths(m: PoseMetrics): string[] {
  const out: string[] = [];
  if (m.torsoStability > 0.8) {
    out.push("Excellent torso stability throughout the shot");
  }
  if (m.armAlignment > 0.8) {
    out.push("Great elbow alignment at release point");
  }
  if (m.wristFlick > 0.7) {
    out.push("Consistent wrist flick on follow-through");
  }

  while (out.length < 3) {
    if (out.length === 0) out.push("Good overall shooting mechanics");
    else if (out.length === 1) out.push("Consistent form throughout the motion");
    else out.push("Solid foundation for improvement");
  }
  return out.slice(0, 3);
}

function buildImprovements(m: PoseMetrics): string[] {
  const out: string[] = [];
  if (m.torsoStability < 0.6) {
    out.push("Focus on keeping your torso stable during the shot");
  } else if (m.torsoStability < 0.7) {
    out.push("Try to minimize lateral torso movement");
  }

  if (m.armAlignment < 0.6) {
    out.push("Work on aligning your elbow with the basket at release");
  } else if (m.armAlignment < 0.7) {
    out.push("Slight elbow adjustment needed at release point");
  }

  if (m.wristFlick < 0.5) {
    out.push("Practice snapping your wrist on the follow-through");
  } else if (m.wristFlick < 0.65) {
    out.push("Focus on a quicker wrist release for better arc");
  }

  if (out.length < 3) {
    out.push("Continue practicing your current form consistently");
  }
  if (out.length < 3) {
    out.push("Record more shots to track progress over time");
  }

  return out.slice(0, 5);
}

export async function analyzeVideo(
  videoUrl: string,
  onProgress?: (percent: number) => void
): Promise<AnalysisResult> {
  const video = document.createElement("video");
  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Failed to load video"));
  });

  const duration = video.duration;
  if (duration < 1) {
    return {
      score: 0,
      metrics: { torsoStability: 0, armAlignment: 0, wristFlick: 0 },
      strengths: [],
      improvements: [],
      isInvalid: true,
      messageIfInvalid: "Video too short. Please record at least 1 second.",
      processedFrames: 0,
      totalFrames: 0,
    };
  }

  const maxDuration = Math.min(duration, 30);
  const stepSec = 0.1;
  const validFrames: FrameData[] = [];
  let processedFrames = 0;
  const totalFrames = Math.floor(maxDuration / stepSec);

  for (let t = 0; t < maxDuration; t += stepSec) {
    video.currentTime = t;
    await new Promise<void>((r) => {
      video.onseeked = () => r();
    });

    try {
      const result = await detectPoseForVideo(video, Math.round(t * 1000));
      processedFrames++;

      if (result.landmarks && result.landmarks.length > 0) {
        const lm = result.landmarks[0];
        validFrames.push({ lm, t });
      }

      if (onProgress) {
        onProgress(Math.round((processedFrames / totalFrames) * 100));
      }
    } catch (err) {
      console.warn("Frame detection failed", err);
    }
  }

  const poseRatio = validFrames.length / processedFrames;
  if (poseRatio < 0.3 || validFrames.length < 10) {
    return {
      score: 0,
      metrics: { torsoStability: 0, armAlignment: 0, wristFlick: 0 },
      strengths: [],
      improvements: [],
      isInvalid: true,
      messageIfInvalid:
        "Unable to detect your body in the video. Please ensure you are fully visible in the frame.",
      processedFrames,
      totalFrames,
    };
  }

  const isRightHanded = validFrames.some((f) => {
    const rw = f.lm[POSE_LANDMARKS.RIGHT_WRIST];
    const lw = f.lm[POSE_LANDMARKS.LEFT_WRIST];
    return rw && lw && rw.y < lw.y;
  });

  const idx = {
    shoulder: isRightHanded ? POSE_LANDMARKS.RIGHT_SHOULDER : POSE_LANDMARKS.LEFT_SHOULDER,
    elbow: isRightHanded ? POSE_LANDMARKS.RIGHT_ELBOW : POSE_LANDMARKS.LEFT_ELBOW,
    wrist: isRightHanded ? POSE_LANDMARKS.RIGHT_WRIST : POSE_LANDMARKS.LEFT_WRIST,
    hip: isRightHanded ? POSE_LANDMARKS.RIGHT_HIP : POSE_LANDMARKS.LEFT_HIP,
  };

  const torsoCenters: { x: number; y: number }[] = [];
  for (const f of validFrames) {
    const ls = f.lm[POSE_LANDMARKS.LEFT_SHOULDER];
    const rs = f.lm[POSE_LANDMARKS.RIGHT_SHOULDER];
    const lh = f.lm[POSE_LANDMARKS.LEFT_HIP];
    const rh = f.lm[POSE_LANDMARKS.RIGHT_HIP];
    if (ls && rs && lh && rh) {
      torsoCenters.push({
        x: (ls.x + rs.x + lh.x + rh.x) / 4,
        y: (ls.y + rs.y + lh.y + rh.y) / 4,
      });
    }
  }

  let torsoStability = 1.0;
  if (torsoCenters.length > 1) {
    let sumVar = 0;
    for (let i = 1; i < torsoCenters.length; i++) {
      const dx = torsoCenters[i].x - torsoCenters[i - 1].x;
      const dy = torsoCenters[i].y - torsoCenters[i - 1].y;
      sumVar += Math.sqrt(dx * dx + dy * dy);
    }
    const avgVar = sumVar / (torsoCenters.length - 1);
    if (avgVar < 0.05) torsoStability = 1.0;
    else if (avgVar < 0.1) torsoStability = 0.8;
    else if (avgVar < 0.15) torsoStability = 0.5;
    else torsoStability = 0.3;
  }

  let releaseIdx = -1;
  let bestY = Number.POSITIVE_INFINITY;
  for (let i = 0; i < validFrames.length; i++) {
    const w = validFrames[i].lm[idx.wrist];
    if (w && Number.isFinite(w.y) && w.y < bestY) {
      bestY = w.y;
      releaseIdx = i;
    }
  }

  if (releaseIdx < 0) {
    return {
      score: 0,
      metrics: { torsoStability: 0, armAlignment: 0, wristFlick: 0 },
      strengths: [],
      improvements: [],
      isInvalid: true,
      messageIfInvalid:
        "Could not identify a clear release point. Try recording with a better angle showing your shooting arm.",
      processedFrames,
      totalFrames,
    };
  }

  const relLm = validFrames[releaseIdx].lm;
  const shoulder = relLm[idx.shoulder];
  const elbow = relLm[idx.elbow];
  const wrist = relLm[idx.wrist];

  const armAlignment = mapArmAlignment(angleABC(shoulder, elbow, wrist));

  const window = 3;
  const baseAngle = Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x);
  let maxDeltaDeg = 0;
  for (let j = 1; j <= window; j++) {
    const k = releaseIdx + j;
    if (k >= validFrames.length) break;
    const lm = validFrames[k].lm;
    const e = lm[idx.elbow];
    const w = lm[idx.wrist];
    const a = Math.atan2(w.y - e.y, w.x - e.x);
    let d = Math.abs(a - baseAngle);
    if (d > Math.PI) d = 2 * Math.PI - d;
    maxDeltaDeg = Math.max(maxDeltaDeg, deg(d));
  }
  const wristFlick = mapFlick(maxDeltaDeg);

  const metrics: PoseMetrics = {
    torsoStability: clamp01(torsoStability),
    armAlignment: clamp01(armAlignment),
    wristFlick: clamp01(wristFlick),
  };

  const score = Math.round(
    100 *
      (0.6 * metrics.torsoStability +
        0.25 * metrics.armAlignment +
        0.15 * metrics.wristFlick)
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    metrics,
    strengths: buildStrengths(metrics),
    improvements: buildImprovements(metrics),
    isInvalid: false,
    processedFrames,
    totalFrames,
  };
}
