export class Recorder {
  private events: any[] = [];
  private endpoint =
    "https://friendly-yodel-4p995q6vxrwh7gj9-3000.app.github.dev/reports";
  private hasFlushedError = false;

  start() {
    console.log("🔥 Recorder started");

    /**
     * 🔥 Use DOCUMENT + CAPTURE PHASE (IMPORTANT FIX)
     */
    document.addEventListener("click", this.handleClick, true);
    document.addEventListener("pointerdown", this.handlePointerDown, true);
    document.addEventListener("scroll", this.handleScroll, true);
    document.addEventListener("keydown", this.handleKeyDown, true);
    document.addEventListener("input", this.handleInput, true);

    window.addEventListener("error", () => {
      if (this.hasFlushedError) return;
      this.hasFlushedError = true;
      this.flush({ status: "failed" });
    });

    /**
     * FORCE FLUSH LOOP
     */
    setInterval(() => {
      this.flush({ status: "running" });
    }, 5000);

    /**
     * DEBUG FLUSH
     */
    setTimeout(() => {
      console.log("🚀 Initial force flush test");
      this.flush({ status: "init-test" });
    }, 2000);
  }

  /**
   * 🔥 Better than click (fires earlier + more reliable)
   */
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

  /**
   * Click fallback (still useful)
   */
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
      timestamp: Date.now()
    });
  };

  /**
   * 🔥 captures typing
   */
  private handleKeyDown = (e: KeyboardEvent) => {
    this.events.push({
      type: "keydown",
      key: e.key,
      code: e.code,
      timestamp: Date.now()
    });
  };

  /**
   * 🔥 captures input changes (VERY IMPORTANT)
   */
  private handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;

    this.events.push({
      type: "input",
      value: target?.value,
      name: target?.name,
      id: target?.id,
      tag: target?.tagName,
      timestamp: Date.now()
    });
  };

  private async flush(meta: any = {}) {
    console.log("📡 flush triggered", {
      eventCount: this.events.length,
      meta
    });

    const payload = {
      ...meta,
      events: [...this.events],
      consoleLogs: [],
      networkLogs: [],
      videoUrl: null
    };

    this.events = [];

    try {
      console.log("📤 sending payload to:", this.endpoint);

      await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        keepalive: true
      });

      console.log("✅ flush sent successfully");
    } catch (err) {
      console.error("❌ flush failed:", err);
    }
  }
}