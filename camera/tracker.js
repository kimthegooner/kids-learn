/* MediaPipe runs in a classic worker so inference never blocks camera controls.
 * Runtime and models are same-origin assets. No image is uploaded. */
importScripts("./mediapipe/vision_bundle.js");

let face;
let pose;
self.onmessage = async ({ data }) => {
  try {
    if (data.type === "init") {
      const assets = new URL("./", self.location.href).href;
      const files = await Vision.FilesetResolver.forVisionTasks(`${assets}mediapipe/wasm`);
      face = await Vision.FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: `${assets}models/face_landmarker.task`, delegate: "CPU" },
        canvas: new OffscreenCanvas(640, 480), runningMode: "VIDEO", numFaces: 1,
      });
      pose = await Vision.PoseLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: `${assets}models/pose_landmarker_lite.task`, delegate: "CPU" },
        canvas: new OffscreenCanvas(640, 480), runningMode: "VIDEO", numPoses: 1,
        outputSegmentationMasks: false,
      });
      self.postMessage({ type: "ready" });
    } else if (data.type === "frame") {
      if (!face || !pose) throw new Error("Tracker is not ready");
      const result = {
        face: data.mode !== "body" ? face.detectForVideo(data.bitmap, data.time).faceLandmarks[0] || [] : [],
        pose: data.mode !== "face" ? pose.detectForVideo(data.bitmap, data.time).landmarks[0] || [] : [],
      };
      self.postMessage({ type: "result", mode: data.mode, ...result });
    }
  } catch (error) {
    self.postMessage({ type: "error", message: error instanceof Error ? error.message : "Tracking failed" });
  } finally {
    data.bitmap?.close();
  }
};
