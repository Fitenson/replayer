import { ReplayEvent } from "./types/replayEvent";

export class Recorder {
  private events: ReplayEvent[] = [];

  start() {
    window.addEventListener("click", this.handleClick);
    window.addEventListener("scroll", this.handleScroll);
  }

  stop() {
    window.removeEventListener("click", this.handleClick);
    window.removeEventListener("scroll", this.handleScroll);
  }

  private handleClick = (e: MouseEvent) => {
    this.events.push({
      type: "click",
      x: e.clientX,
      y: e.clientY,
      timestamp: Date.now()
    });
  };

  private handleScroll = () => {
    this.events.push({
      type: "scroll",
      scrollY: window.scrollY,
      timestamp: Date.now()
    });
  };

  getEvents() {
    return this.events;
  }
}