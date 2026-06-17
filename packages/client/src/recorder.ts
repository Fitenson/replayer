export class Recorder {
  private events: any[] = [];
  private endpoint =
    "https://friendly-yodel-4p995q6vxrwh7gj9-3000.app.github.dev/reports";
  private hasFlushedError = false;

  start() {
    console.log("🔥 Recorder started");

    window.addEventListener("click", this.handleClick);
    window.addEventListener("scroll", this.handleScroll);

    window.addEventListener("error", () => {
      if (this.hasFlushedError) return;
      this.hasFlushedError = true;
      this.flush({ status: "failed" });
    });

    // FORCE FLUSH every 5 seconds (even with no events)
    setInterval(() => {
      this.flush({ status: "running" });
    }, 5000);

    // 🔥 immediate test flush (VERY IMPORTANT FOR DEBUG)
    setTimeout(() => {
      console.log("🚀 Initial force flush test");
      this.flush({ status: "init-test" });
    }, 2000);
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