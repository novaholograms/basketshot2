export type Landmark = {
  x: number; // 0..1
  y: number; // 0..1
  z?: number;
  visibility?: number;
};

export function setupCanvasWithDPR(
  canvas: HTMLCanvasElement,
  displayWidth: number,
  displayHeight: number
): CanvasRenderingContext2D | null {
  const dprRaw = window.devicePixelRatio || 1;
  const dpr = Math.min(dprRaw, 2);

  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;

  const nextW = Math.max(1, Math.floor(displayWidth * dpr));
  const nextH = Math.max(1, Math.floor(displayHeight * dpr));
  if (canvas.width !== nextW) canvas.width = nextW;
  if (canvas.height !== nextH) canvas.height = nextH;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

// Conexiones básicas (MediaPipe Pose 33 landmarks)
export const POSE_CONNECTIONS: Array<[number, number]> = [
  // Cara (mínimo)
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],

  // Hombros / torso
  [11, 12],
  [11, 23],
  [12, 24],
  [23, 24],

  // Brazos
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],

  // Piernas
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],

  // Pies (simplificado)
  [27, 31],
  [28, 32],
  [27, 29],
  [28, 30],
];

export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  width: number,
  height: number
) {
  ctx.clearRect(0, 0, width, height);
  if (!landmarks || landmarks.length < 17) return;

  const visOK = (i: number) => (landmarks[i]?.visibility ?? 0) >= 0.5;
  const toPx = (lm: Landmark) => ({ x: lm.x * width, y: lm.y * height });

  // Estilo (usar el "primary" de la app: naranja)
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(249,128,6,0.85)";
  ctx.fillStyle = "rgba(249,128,6,0.90)";

  // Líneas
  ctx.beginPath();
  for (const [a, b] of POSE_CONNECTIONS) {
    if (!visOK(a) || !visOK(b)) continue;
    const pa = toPx(landmarks[a]);
    const pb = toPx(landmarks[b]);
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
  }
  ctx.stroke();

  // Puntos
  for (let i = 0; i < landmarks.length; i++) {
    if (!visOK(i)) continue;
    const p = toPx(landmarks[i]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}
