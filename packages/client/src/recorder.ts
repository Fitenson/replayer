export class Recorder {
  private events: any[] = [];
  private endpoint =
    "https://friendly-yodel-4p995q6vxrwh7gj9-3000.app.github.dev/reports";

  private hasFlushedError = false;
  private sessionStartedAt = Date.now();

  start() {
    console.log("🔥 Recorder started");

    // Capture initial DOM snapshot
    this.captureSnapshot();

    document.addEventListener("pointerdown", this.handlePointerDown, true);
    document.addEventListener("click", this.handleClick, true);
    document.addEventListener("scroll", this.handleScroll, true);
    document.addEventListener("keydown", this.handleKeyDown, true);
    document.addEventListener("input", this.handleInput, true);

    // Flush when page is closing
    window.addEventListener("beforeunload", () => {
      this.flush({ status: "completed" });
    });

    // Flush when tab becomes hidden
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        this.flush({ status: "backgrounded" });
      }
    });

    // Flush on uncaught errors
    window.addEventListener("error", (event) => {
      if (this.hasFlushedError) return;

      this.hasFlushedError = true;

      this.flush({
        status: "failed",
        errorMessage: event.message
      });
    });
  }

  /**
   * Initial DOM snapshot
   */
  private captureSnapshot() {
    this.events.push({
      type: "snapshot",
      html: document.documentElement.outerHTML,
      url: location.href,
      title: document.title,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      timestamp: Date.now()
    });
  }

  private handlePointerDown = (e: PointerEvent) => {
    const target = e.target as HTMLElement;

    this.events.push({
      type: "pointerdown",
      x: e.clientX,
      y: e.clientY,
      button: e.button,
      tag: target?.tagName,
      id: target?.id,
      className: target?.className,
      timestamp: Date.now()
    });
  };

  private handleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;

    this.events.push({
      type: "click",
      x: e.clientX,
      y: e.clientY,
      tag: target?.tagName,
      id: target?.id,
      className: target?.className,
      timestamp: Date.now()
    });
  };

  private handleScroll = () => {
    this.events.push({
      type: "scroll",
      scrollY: window.scrollY,
      scrollX: window.scrollX,
      timestamp: Date.now()
    });
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    this.events.push({
      type: "keydown",
      key: e.key,
      code: e.code,
      timestamp: Date.now()
    });
  };

  private handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;

    // Don't capture actual value yet
    this.events.push({
      type: "input",
      tag: target?.tagName,
      id: target?.id,
      name: target?.name,
      inputType: target?.type,
      timestamp: Date.now()
    });
  };

  private async flush(meta: any = {}) {
    if (this.events.length === 0) {
      return;
    }

    const payload = {
      ...meta,
      startedAt: this.sessionStartedAt,
      endedAt: Date.now(),
      url: location.href,
      title: document.title,
      events: [...this.events],
      consoleLogs: [],
      networkLogs: [],
      videoUrl: null
    };

    this.events = [];

    try {
      // sendBeacon is ideal for page unload
      if (navigator.sendBeacon) {
        const blob = new Blob(
          [JSON.stringify(payload)],
          { type: "application/json" }
        );

        navigator.sendBeacon(this.endpoint, blob);
        return;
      }

      await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        keepalive: true
      });
    } catch (err) {
      console.error("❌ flush failed:", err);
    }
  }
}