import { Recorder } from "./recorder";

export function createRecorder() {
  const recorder = new Recorder();
  recorder.start();

  return recorder;
}