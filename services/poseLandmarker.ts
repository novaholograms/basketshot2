import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";

const TASKS_VERSION = "0.10.32";
const WASM_ROOT = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VERSION}/wasm`;

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

let landmarkerPromise: Promise<PoseLandmarker> | null = null;
let lastTimestampMs = -1;

async function createLandmarker(delegate: "GPU" | "CPU") {
  const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate,
    },
    runningMode: "VIDEO",
    numPoses: 1,
  });
}

export async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      try {
        return await createLandmarker("GPU");
      } catch {
        return await createLandmarker("CPU");
      }
    })();
  }
  return landmarkerPromise;
}

export async function resetPoseLandmarker(): Promise<void> {
  lastTimestampMs = -1;
  if (landmarkerPromise) {
    try {
      const lm = await landmarkerPromise;
      lm.close();
    } catch {
      // ignore
    }
  }
  landmarkerPromise = null;
}

export async function detectPoseForVideo(
  videoEl: HTMLVideoElement,
  timestampMs: number
): Promise<PoseLandmarkerResult> {
  const landmarker = await getPoseLandmarker();
  const safeTs = timestampMs <= lastTimestampMs ? lastTimestampMs + 1 : timestampMs;
  lastTimestampMs = safeTs;
  return landmarker.detectForVideo(videoEl, safeTs);
}
