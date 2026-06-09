export class Recorder {
  private events: any[] = [];
  private endpoint = "https://toolkit-strict-homepage-trusts.trycloudflare.com";

  start() {
    window.addEventListener("click", this.handleClick);
    window.addEventListener("scroll", this.handleScroll);

    window.addEventListener("error", () => this.flush({ status: "failed" }));

    setInterval(() => {
      this.flush({ status: "running" });
    }, 5000);
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

  private async flush(meta: any = {}) {
    if (this.events.length === 0) return;

    const payload = {
      ...meta,
      events: [...this.events],
      consoleLogs: [],
      networkLogs: [],
      videoUrl: null
    };

    this.events = [];

    navigator.sendBeacon?.(
      this.endpoint,
      JSON.stringify(payload)
    ) || fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }
}