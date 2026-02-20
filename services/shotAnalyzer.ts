import type { AnalysisResult, ShotMetrics, CoachTip } from "../types";
import { detectPoseForVideo, resetPoseLandmarker } from "./poseLandmarker";

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
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

interface CoachFinding {
  key: string;
  severity: 1 | 2 | 3;
  metricValue: number;
  title: string;
  diagnosis: string;
  evidence: string;
  correction: string;
  drill: string;
  successCriteria: string;
  coachText: string;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function avgVisibility(lm: Landmark[], indices: number[]): number {
  let sum = 0;
  let n = 0;
  for (const idx of indices) {
    const v = lm[idx]?.visibility;
    if (typeof v === "number") {
      sum += v;
      n++;
    }
  }
  return n > 0 ? sum / n : 0;
}

function median(arr: number[]): number {
  if (arr.length === 0) return NaN;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
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

function metricLabel(key: keyof ShotMetrics): string {
  const labels: Record<keyof ShotMetrics, string> = {
    stanceWidth: "stance width",
    lateralSway: "lateral stability",
    kneeDip: "knee loading",
    verticalDrive: "vertical drive",
    elbowAlignment: "elbow alignment",
    elbowUnderBall: "elbow positioning",
    releaseHeight: "release height",
    wristFlick: "wrist snap",
    followThroughHold: "follow-through",
    landingBalance: "landing balance",
  };
  return labels[key] || key;
}

function buildFindings(m: ShotMetrics): CoachFinding[] {
  const findings: CoachFinding[] = [];

  // stanceWidth
  if (m.stanceWidth < 0.65) {
    const severity: 1 | 2 | 3 = m.stanceWidth < 0.4 ? 3 : m.stanceWidth < 0.55 ? 2 : 1;
    findings.push({
      key: "stanceWidth",
      severity,
      metricValue: m.stanceWidth,
      title: "Narrow or wide stance",
      diagnosis: "Your foot positioning affects balance and power generation.",
      evidence: `Stance width scored ${Math.round(m.stanceWidth * 100)}%.`,
      correction: "Position your feet shoulder-width apart for optimal base and balance.",
      drill: "Practice your shooting stance: feet shoulder-width, knees slightly bent, weight on balls of feet. Hold for 10 seconds, repeat 5 times.",
      successCriteria: "Stance width >75%",
      coachText: `Your foot positioning affects balance and power generation. Stance width scored ${Math.round(m.stanceWidth * 100)}%. Position your feet shoulder-width apart for optimal base and balance. Practice your shooting stance: feet shoulder-width, knees slightly bent, weight on balls of feet. Hold for 10 seconds, repeat 5 times. Target: Stance width >75%.`,
    });
  }

  // lateralSway
  if (m.lateralSway < 0.65) {
    const severity: 1 | 2 | 3 = m.lateralSway < 0.4 ? 3 : m.lateralSway < 0.55 ? 2 : 1;
    findings.push({
      key: "lateralSway",
      severity,
      metricValue: m.lateralSway,
      title: "Lateral body drift during shot",
      diagnosis: "Your torso moves sideways during the shooting motion, reducing accuracy.",
      evidence: `Lateral stability scored ${Math.round(m.lateralSway * 100)}%.`,
      correction: "Keep your torso centered and stable. Imagine shooting inside a narrow phone booth.",
      drill: "Wall drill: Stand 6 inches from a wall, shoot with one hand. If you touch the wall, you're drifting. 3×10 reps.",
      successCriteria: "Lateral stability >75%",
      coachText: `Your torso moves sideways during the shooting motion, reducing accuracy. Lateral stability scored ${Math.round(m.lateralSway * 100)}%. Keep your torso centered and stable. Imagine shooting inside a narrow phone booth. Wall drill: Stand 6 inches from a wall, shoot with one hand. If you touch the wall, you're drifting. 3×10 reps. Target: Lateral stability >75%.`,
    });
  }

  // kneeDip
  if (m.kneeDip < 0.65) {
    const severity: 1 | 2 | 3 = m.kneeDip < 0.4 ? 3 : m.kneeDip < 0.55 ? 2 : 1;
    findings.push({
      key: "kneeDip",
      severity,
      metricValue: m.kneeDip,
      title: "Insufficient knee bend",
      diagnosis: "You're not loading your legs enough, limiting power and range.",
      evidence: `Knee loading scored ${Math.round(m.kneeDip * 100)}%.`,
      correction: "Dip your knees before every shot. Your power comes from your legs, not your arms.",
      drill: "Catch-and-shoot drill: Have a partner pass you the ball. Focus on dipping knees on the catch. 3×12 reps.",
      successCriteria: "Knee loading >75%",
      coachText: `You're not loading your legs enough, limiting power and range. Knee loading scored ${Math.round(m.kneeDip * 100)}%. Dip your knees before every shot. Your power comes from your legs, not your arms. Catch-and-shoot drill: Have a partner pass you the ball. Focus on dipping knees on the catch. 3×12 reps. Target: Knee loading >75%.`,
    });
  }

  // verticalDrive
  if (m.verticalDrive < 0.65) {
    const severity: 1 | 2 | 3 = m.verticalDrive < 0.4 ? 3 : m.verticalDrive < 0.55 ? 2 : 1;
    findings.push({
      key: "verticalDrive",
      severity,
      metricValue: m.verticalDrive,
      title: "Forward or backward drift on release",
      diagnosis: "You're moving horizontally during your shot instead of going straight up.",
      evidence: `Vertical drive scored ${Math.round(m.verticalDrive * 100)}%.`,
      correction: "Jump straight up and land in the same spot. This is called 'sticking the landing'.",
      drill: "Line drill: Place a line of tape on the floor. Shoot and land on the line. 3×10 reps.",
      successCriteria: "Vertical drive >75%",
      coachText: `You're moving horizontally during your shot instead of going straight up. Vertical drive scored ${Math.round(m.verticalDrive * 100)}%. Jump straight up and land in the same spot. This is called 'sticking the landing'. Line drill: Place a line of tape on the floor. Shoot and land on the line. 3×10 reps. Target: Vertical drive >75%.`,
    });
  }

  // elbowAlignment
  if (m.elbowAlignment < 0.65) {
    const severity: 1 | 2 | 3 = m.elbowAlignment < 0.4 ? 3 : m.elbowAlignment < 0.55 ? 2 : 1;
    findings.push({
      key: "elbowAlignment",
      severity,
      metricValue: m.elbowAlignment,
      title: "Elbow flares out at release",
      diagnosis: "Your elbow isn't aligned with the basket, causing inconsistent shots.",
      evidence: `Elbow alignment scored ${Math.round(m.elbowAlignment * 100)}%.`,
      correction: "Keep your elbow under the ball and pointing at the rim throughout the shot.",
      drill: "Form shooting close to basket: Focus only on elbow alignment. 3×15 reps from 5 feet.",
      successCriteria: "Elbow alignment >75%",
      coachText: `Your elbow isn't aligned with the basket, causing inconsistent shots. Elbow alignment scored ${Math.round(m.elbowAlignment * 100)}%. Keep your elbow under the ball and pointing at the rim throughout the shot. Form shooting close to basket: Focus only on elbow alignment. 3×15 reps from 5 feet. Target: Elbow alignment >75%.`,
    });
  }

  // elbowUnderBall
  if (m.elbowUnderBall < 0.65) {
    const severity: 1 | 2 | 3 = m.elbowUnderBall < 0.4 ? 3 : m.elbowUnderBall < 0.55 ? 2 : 1;
    findings.push({
      key: "elbowUnderBall",
      severity,
      metricValue: m.elbowUnderBall,
      title: "Elbow not under wrist at release",
      diagnosis: "Your elbow position at release reduces control and accuracy.",
      evidence: `Elbow positioning scored ${Math.round(m.elbowUnderBall * 100)}%.`,
      correction: "At the set point, your elbow should be directly under your wrist, forming an 'L' shape.",
      drill: "Mirror drill: Practice your set point in front of a mirror. Check elbow position. 3×10 holds (3 seconds each).",
      successCriteria: "Elbow positioning >75%",
      coachText: `Your elbow position at release reduces control and accuracy. Elbow positioning scored ${Math.round(m.elbowUnderBall * 100)}%. At the set point, your elbow should be directly under your wrist, forming an 'L' shape. Mirror drill: Practice your set point in front of a mirror. Check elbow position. 3×10 holds (3 seconds each). Target: Elbow positioning >75%.`,
    });
  }

  // releaseHeight
  if (m.releaseHeight < 0.65) {
    const severity: 1 | 2 | 3 = m.releaseHeight < 0.4 ? 3 : m.releaseHeight < 0.55 ? 2 : 1;
    findings.push({
      key: "releaseHeight",
      severity,
      metricValue: m.releaseHeight,
      title: "Low release point",
      diagnosis: "You're releasing the ball too low, making it easier to block and harder to arc.",
      evidence: `Release height scored ${Math.round(m.releaseHeight * 100)}%.`,
      correction: "Release the ball at the peak of your jump with your arm fully extended.",
      drill: "One-motion shooting: Focus on shooting 'on the way up'. 3×12 reps from free throw line.",
      successCriteria: "Release height >75%",
      coachText: `You're releasing the ball too low, making it easier to block and harder to arc. Release height scored ${Math.round(m.releaseHeight * 100)}%. Release the ball at the peak of your jump with your arm fully extended. One-motion shooting: Focus on shooting 'on the way up'. 3×12 reps from free throw line. Target: Release height >75%.`,
    });
  }

  // wristFlick
  if (m.wristFlick < 0.65) {
    const severity: 1 | 2 | 3 = m.wristFlick < 0.4 ? 3 : m.wristFlick < 0.55 ? 2 : 1;
    findings.push({
      key: "wristFlick",
      severity,
      metricValue: m.wristFlick,
      title: "Weak or inconsistent wrist snap",
      diagnosis: "Your wrist isn't snapping through the ball, reducing backspin and arc.",
      evidence: `Wrist snap scored ${Math.round(m.wristFlick * 100)}%.`,
      correction: "Snap your wrist forward and down like you're reaching into a cookie jar on a high shelf.",
      drill: "Lying down shooting: Lie on your back, shoot ball straight up focusing on wrist snap. 3×20 reps.",
      successCriteria: "Wrist snap >75%",
      coachText: `Your wrist isn't snapping through the ball, reducing backspin and arc. Wrist snap scored ${Math.round(m.wristFlick * 100)}%. Snap your wrist forward and down like you're reaching into a cookie jar on a high shelf. Lying down shooting: Lie on your back, shoot ball straight up focusing on wrist snap. 3×20 reps. Target: Wrist snap >75%.`,
    });
  }

  // followThroughHold
  if (m.followThroughHold < 0.65) {
    const severity: 1 | 2 | 3 = m.followThroughHold < 0.4 ? 3 : m.followThroughHold < 0.55 ? 2 : 1;
    findings.push({
      key: "followThroughHold",
      severity,
      metricValue: m.followThroughHold,
      title: "Dropping hand too early after release",
      diagnosis: "You're not holding your follow-through, which affects consistency and arc.",
      evidence: `Follow-through scored ${Math.round(m.followThroughHold * 100)}%.`,
      correction: "Hold your follow-through until the ball hits the rim. 'Hand in the cookie jar' position.",
      drill: "Freeze drill: After every shot, hold follow-through for 2 full seconds. 3×10 reps.",
      successCriteria: "Follow-through >75%",
      coachText: `You're not holding your follow-through, which affects consistency and arc. Follow-through scored ${Math.round(m.followThroughHold * 100)}%. Hold your follow-through until the ball hits the rim. 'Hand in the cookie jar' position. Freeze drill: After every shot, hold follow-through for 2 full seconds. 3×10 reps. Target: Follow-through >75%.`,
    });
  }

  // landingBalance
  if (m.landingBalance < 0.65) {
    const severity: 1 | 2 | 3 = m.landingBalance < 0.4 ? 3 : m.landingBalance < 0.55 ? 2 : 1;
    findings.push({
      key: "landingBalance",
      severity,
      metricValue: m.landingBalance,
      title: "Unstable landing after shot",
      diagnosis: "You're landing off-balance, which indicates poor body control during the shot.",
      evidence: `Landing balance scored ${Math.round(m.landingBalance * 100)}%.`,
      correction: "Land softly in the same spot with feet shoulder-width apart, ready to shoot again.",
      drill: "Balance drill: After each shot, freeze your landing position for 3 seconds. 3×8 reps.",
      successCriteria: "Landing balance >75%",
      coachText: `You're landing off-balance, which indicates poor body control during the shot. Landing balance scored ${Math.round(m.landingBalance * 100)}%. Land softly in the same spot with feet shoulder-width apart, ready to shoot again. Balance drill: After each shot, freeze your landing position for 3 seconds. 3×8 reps. Target: Landing balance >75%.`,
    });
  }

  return findings.sort((a, b) => b.severity - a.severity || a.metricValue - b.metricValue);
}

function buildStrengths(m: ShotMetrics): string[] {
  const out: string[] = [];
  const entries = Object.entries(m) as [keyof ShotMetrics, number][];
  const topMetrics = entries
    .filter(([_, v]) => v >= 0.75)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  for (const [key, value] of topMetrics) {
    const pct = Math.round(value * 100);
    const label = metricLabel(key);
    out.push(`Your ${label} is excellent (${pct}%), showing strong fundamentals in this area.`);
  }

  while (out.length < 3) {
    if (out.length === 0) out.push("Good overall shooting mechanics with room to refine specific areas.");
    else if (out.length === 1) out.push("Consistent form throughout the motion provides a solid foundation.");
    else out.push("Your shooting motion shows potential with focused practice.");
  }

  return out.slice(0, 3);
}

function buildImprovements(m: ShotMetrics, findings: CoachFinding[]): string[] {
  return findings.slice(0, 5).map(f => f.coachText);
}

function pickMainFinding(findings: CoachFinding[], m: ShotMetrics): CoachFinding | null {
  if (findings.length === 0) return null;

  // Already sorted by severity, then by worst metric value
  return findings[0];
}

function computeTargetScore(currentScore: number): number {
  return Math.min(100, Math.ceil((currentScore + 5) / 5) * 5);
}

function emptyMetrics(): ShotMetrics {
  return {
    stanceWidth: 0,
    lateralSway: 0,
    kneeDip: 0,
    verticalDrive: 0,
    elbowAlignment: 0,
    elbowUnderBall: 0,
    releaseHeight: 0,
    wristFlick: 0,
    followThroughHold: 0,
    landingBalance: 0,
  };
}

export async function analyzeVideo(
  videoUrl: string,
  shotType?: string,
  onProgress?: (percent: number) => void
): Promise<AnalysisResult> {
  await resetPoseLandmarker();
  console.log("[analyzeVideo] start", { videoUrl });

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
      metrics: emptyMetrics(),
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

  // Key landmarks for "valid frame" check
  const KEY_IDX = [11, 12, 13, 14, 15, 16, 23, 24]; // shoulders, elbows, wrists, hips
  const VIS_THR = 0.55; // stricter than 0.5

  for (let t = 0; t < maxDuration; t += stepSec) {
    video.currentTime = t;
    await new Promise<void>((r) => {
      video.onseeked = () => r();
    });

    let result: any = null;
    try {
      result = await detectPoseForVideo(video, Math.round(t * 1000));
      processedFrames++;
    } catch (err) {
      console.error("[analyzeVideo] frame detection failed", err);
      try {
        await resetPoseLandmarker();
        result = await detectPoseForVideo(video, Math.round(t * 1000));
        processedFrames++;
      } catch (err2) {
        console.error("[analyzeVideo] frame retry failed", err2);
        return {
          score: 0,
          metrics: emptyMetrics(),
          strengths: [],
          improvements: [],
          isInvalid: true,
          messageIfInvalid:
            "Error interno del modelo al procesar el vídeo. Prueba con otro vídeo o vuelve a grabarlo.",
          processedFrames,
          totalFrames,
        };
      }
    }

    if (result && result.landmarks && result.landmarks.length > 0) {
      const lm = result.landmarks[0] as Landmark[];
      if (lm.length > 24) {
        const keyVis = avgVisibility(lm, KEY_IDX);
        if (keyVis >= VIS_THR) {
          validFrames.push({ lm, t });
        }
      }
    }

    if (onProgress) {
      onProgress(Math.round((processedFrames / totalFrames) * 100));
    }
  }

  console.log("[analyzeVideo] frames", {
    processedFrames,
    totalFrames,
    valid: validFrames.length,
    poseRatio: processedFrames > 0 ? validFrames.length / processedFrames : 0,
  });

  const poseRatio = validFrames.length / processedFrames;
  if (poseRatio < 0.3 || validFrames.length < 10) {
    return {
      score: 0,
      metrics: emptyMetrics(),
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
      metrics: emptyMetrics(),
      strengths: [],
      improvements: [],
      isInvalid: true,
      messageIfInvalid:
        "Could not identify a clear release point. Try recording with a better angle showing your shooting arm.",
      processedFrames,
      totalFrames,
    };
  }

  // ---------------------------
  // ShotGate (2 of 3) — "looks like a shot"
  // ---------------------------

  // Gate 1: Elbow extension at release
  const ELBOW_EXT_THR = 140; // degrees
  const relLm = validFrames[releaseIdx].lm;
  const elbowAtRelease = deg(
    angleABC(relLm[idx.shoulder], relLm[idx.elbow], relLm[idx.wrist])
  );
  const gateElbow =
    Number.isFinite(elbowAtRelease) && elbowAtRelease >= ELBOW_EXT_THR;

  // Gate 2: Wrist elevation vs baseline
  const gatePreCount = Math.min(20, releaseIdx);
  const preYs: number[] = [];
  for (let i = Math.max(0, releaseIdx - gatePreCount); i < releaseIdx; i++) {
    const y = validFrames[i].lm[idx.wrist]?.y;
    if (Number.isFinite(y)) preYs.push(y);
  }
  const baselineY = median(preYs);
  const gateReleaseY = relLm[idx.wrist]?.y;
  const wristLift =
    Number.isFinite(baselineY) && Number.isFinite(gateReleaseY)
      ? baselineY - gateReleaseY
      : 0;
  const isFT = shotType === "ft";
  const LIFT_THR = isFT ? 0.10 : 0.18;
  const gateLift = wristLift >= LIFT_THR;

  // Gate 3: Follow-through (wrist stays high after release)
  const gatePostWindow = 7;
  let gateHighCount = 0;
  const gateFollowThr = 0.22; // more tolerant: many real shots drop wrist quickly
  for (let j = 1; j <= gatePostWindow; j++) {
    const k = releaseIdx + j;
    if (k >= validFrames.length) break;
    const y = validFrames[k].lm[idx.wrist]?.y;
    if (
      Number.isFinite(y) &&
      Number.isFinite(gateReleaseY) &&
      y <= gateReleaseY + gateFollowThr
    ) {
      gateHighCount++;
    }
  }
  const gateFollow = gateHighCount >= (isFT ? 2 : 3);

  const gatesPassed = [gateElbow, gateLift, gateFollow].filter(Boolean).length;
  if (gatesPassed < 2) {
    console.log("[ShotGate] FAILED", {
      gateElbow,
      gateLift,
      gateFollow,
      elbowAtRelease,
      wristLift,
      highCount: gateHighCount,
    });
    return {
      score: 0,
      metrics: emptyMetrics(),
      strengths: [],
      improvements: [],
      isInvalid: true,
      messageIfInvalid:
        "This doesn't look like a basketball shot. Please record a full shooting motion with arm extension and follow-through.",
      processedFrames,
      totalFrames,
    };
  }

  console.log("[ShotGate] PASSED", {
    gateElbow,
    gateLift,
    gateFollow,
    elbowAtRelease,
    wristLift,
    highCount: gateHighCount,
  });

  const shoulder = relLm[idx.shoulder];
  const elbow = relLm[idx.elbow];
  const wrist = relLm[idx.wrist];

  // ========= CALCULATE 10 METRICS =========

  // 1. stanceWidth - ankle separation vs shoulder width
  const leftAnkle = relLm[POSE_LANDMARKS.LEFT_ANKLE];
  const rightAnkle = relLm[POSE_LANDMARKS.RIGHT_ANKLE];
  const leftShoulder = relLm[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = relLm[POSE_LANDMARKS.RIGHT_SHOULDER];
  const ankleWidth = leftAnkle && rightAnkle ? distance(leftAnkle, rightAnkle) : 0;
  const shoulderWidth = leftShoulder && rightShoulder ? distance(leftShoulder, rightShoulder) : 1;
  const stanceRatio = ankleWidth / (shoulderWidth || 1);
  const stanceWidth = clamp01(1 - Math.abs(stanceRatio - 1.0) / 0.5); // ideal ~1.0

  // 2. lateralSway (already calculated as torsoStability)
  const lateralSway = clamp01(torsoStability);

  // 3. kneeDip - knee angle change from pre-shot to release
  const knee = isRightHanded ? relLm[POSE_LANDMARKS.RIGHT_KNEE] : relLm[POSE_LANDMARKS.LEFT_KNEE];
  const hip = relLm[idx.hip];
  const ankle = isRightHanded ? relLm[POSE_LANDMARKS.RIGHT_ANKLE] : relLm[POSE_LANDMARKS.LEFT_ANKLE];
  const kneeAngleAtRelease = knee && hip && ankle ? deg(angleABC(hip, knee, ankle)) : 180;
  const kneePreCount = Math.min(10, releaseIdx);
  let avgPreKneeAngle = 180;
  if (kneePreCount > 0) {
    let sum = 0;
    let count = 0;
    for (let i = Math.max(0, releaseIdx - kneePreCount); i < releaseIdx; i++) {
      const preLm = validFrames[i].lm;
      const preKnee = isRightHanded ? preLm[POSE_LANDMARKS.RIGHT_KNEE] : preLm[POSE_LANDMARKS.LEFT_KNEE];
      const preHip = isRightHanded ? preLm[POSE_LANDMARKS.RIGHT_HIP] : preLm[POSE_LANDMARKS.LEFT_HIP];
      const preAnkle = isRightHanded ? preLm[POSE_LANDMARKS.RIGHT_ANKLE] : preLm[POSE_LANDMARKS.LEFT_ANKLE];
      if (preKnee && preHip && preAnkle) {
        sum += deg(angleABC(preHip, preKnee, preAnkle));
        count++;
      }
    }
    if (count > 0) avgPreKneeAngle = sum / count;
  }
  const kneeDipDeg = avgPreKneeAngle - kneeAngleAtRelease;
  const kneeDip = clamp01(kneeDipDeg / 40); // ideal: 20-40 deg dip

  // 4. verticalDrive - ratio of vertical to horizontal movement
  const verticalDrive = torsoCenters.length > releaseIdx && releaseIdx > 0
    ? (() => {
        const preCenter = torsoCenters[Math.max(0, releaseIdx - Math.min(10, releaseIdx))];
        const releaseCenter = torsoCenters[releaseIdx];
        const dx = Math.abs(releaseCenter.x - preCenter.x);
        const dy = Math.abs(releaseCenter.y - preCenter.y);
        return dy > 0.001 ? clamp01(dy / (dy + dx + 0.01)) : 0.5;
      })()
    : 0.5;

  // 5. elbowAlignment (already calculated as armAlignment)
  const elbowAlignment = mapArmAlignment(angleABC(shoulder, elbow, wrist));

  // 6. elbowUnderBall - elbow x position vs wrist x position
  const elbowXDiff = Math.abs(elbow.x - wrist.x);
  const elbowUnderBall = clamp01(1 - elbowXDiff / 0.15); // ideal: <0.05 diff

  // 7. releaseHeight (already calculated as wristLift)
  const releaseHeight = clamp01(wristLift / 0.3); // normalize wristLift

  // 8. wristFlick - snap angle (already calculated)
  const window = 3;
  const baseAngle = Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x);
  let maxDeltaDeg = 0;
  for (let j = 1; j <= window; j++) {
    const k = releaseIdx + j;
    if (k >= validFrames.length) break;
    const lm = validFrames[k].lm;
    const e = lm[idx.elbow];
    const w = lm[idx.wrist];
    if (e && w) {
      const a = Math.atan2(w.y - e.y, w.x - e.x);
      let d = Math.abs(a - baseAngle);
      if (d > Math.PI) d = 2 * Math.PI - d;
      maxDeltaDeg = Math.max(maxDeltaDeg, deg(d));
    }
  }
  const wristFlick = mapFlick(maxDeltaDeg);

  // 9. followThroughHold - wrist stays high post-release
  const followPostWindow = 7;
  let followHighCount = 0;
  const followFollowThr = 0.22;
  const followReleaseY = relLm[idx.wrist]?.y;
  for (let j = 1; j <= followPostWindow; j++) {
    const k = releaseIdx + j;
    if (k >= validFrames.length) break;
    const y = validFrames[k].lm[idx.wrist]?.y;
    if (Number.isFinite(y) && Number.isFinite(followReleaseY) && y <= followReleaseY + followFollowThr) {
      followHighCount++;
    }
  }
  const followThroughHold = clamp01(followHighCount / followPostWindow);

  // 10. landingBalance - ankle width stability post-release
  const landingPostCount = Math.min(10, validFrames.length - releaseIdx - 1);
  let avgPostAnkleWidth = ankleWidth;
  if (landingPostCount > 0) {
    let sum = 0;
    let count = 0;
    for (let i = releaseIdx + 1; i < Math.min(validFrames.length, releaseIdx + landingPostCount + 1); i++) {
      const postLm = validFrames[i].lm;
      const la = postLm[POSE_LANDMARKS.LEFT_ANKLE];
      const ra = postLm[POSE_LANDMARKS.RIGHT_ANKLE];
      if (la && ra) {
        sum += distance(la, ra);
        count++;
      }
    }
    if (count > 0) avgPostAnkleWidth = sum / count;
  }
  const landingDelta = Math.abs(avgPostAnkleWidth - ankleWidth);
  const landingBalance = clamp01(1 - landingDelta / (shoulderWidth * 0.5));

  const metrics: ShotMetrics = {
    stanceWidth,
    lateralSway,
    kneeDip,
    verticalDrive,
    elbowAlignment: clamp01(elbowAlignment),
    elbowUnderBall,
    releaseHeight,
    wristFlick: clamp01(wristFlick),
    followThroughHold,
    landingBalance,
  };

  // ========= WEIGHTED SCORE =========
  const weights: Record<keyof ShotMetrics, number> = {
    stanceWidth: 0.08,
    lateralSway: 0.12,
    kneeDip: 0.10,
    verticalDrive: 0.10,
    elbowAlignment: 0.18,
    elbowUnderBall: 0.10,
    releaseHeight: 0.12,
    wristFlick: 0.08,
    followThroughHold: 0.07,
    landingBalance: 0.05,
  };
  const weighted = (Object.keys(metrics) as Array<keyof ShotMetrics>)
    .reduce((acc, k) => acc + (metrics[k] ?? 0) * (weights[k] ?? 0), 0);
  const score = Math.max(0, Math.min(100, Math.round(100 * weighted)));

  // ========= COACH FEEDBACK =========
  const findings = buildFindings(metrics);
  const strengths = buildStrengths(metrics);
  const improvements = buildImprovements(metrics, findings);

  const mainFinding = pickMainFinding(findings, metrics);
  const targetScore = computeTargetScore(score);
  const aiCoachTip: CoachTip = mainFinding
    ? {
        title: "AI Coach Tip",
        targetScore,
        mainIssueTitle: mainFinding.title,
        body: mainFinding.coachText,
      }
    : {
        title: "AI Coach Tip",
        targetScore,
        mainIssueTitle: "Keep refining your technique",
        body: `Your shooting form is well-balanced across all metrics. Focus on consistency and repetition. With continued practice maintaining this form, you can reach ${targetScore}.`,
      };

  return {
    score,
    metrics,
    strengths,
    improvements,
    isInvalid: false,
    processedFrames,
    totalFrames,
    aiCoachTip,
  };
}
