import { Recorder } from "./recorder";

export function createRecorder() {
  const recorder = new Recorder();
  recorder.start();

  console.log("Hello World");
  return recorder;
}