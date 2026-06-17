export class Recorder {
  private events: any[] = [];
  private endpoint =
    "https://friendly-yodel-4p995q6vxrwh7gj9-3000.app.github.dev/reports";

  private hasFlushedError = false;
  private sessionStartedAt = Date.now();

  // Cursor tracking — throttled to avoid event flood
  private lastMouseMoveAt = 0;
  private readonly MOUSE_THROTTLE_MS = 50;

  // Scroll tracking — throttled
  private lastScrollAt = 0;
  private readonly SCROLL_THROTTLE_MS = 100;

  // MutationObserver for DOM diffs
  private mutationObserver: MutationObserver | null = null;

  // Periodic flush
  private flushInterval: ReturnType<typeof setInterval> | null = null;

  start() {
    console.log("🔥 Recorder started");

    this.captureSnapshot();
    this.startMutationObserver();

    document.addEventListener("pointermove", this.handlePointerMove, {
      capture: true,
      passive: true
    });
    document.addEventListener("pointerdown", this.handlePointerDown, true);
    document.addEventListener("click", this.handleClick, true);
    document.addEventListener("scroll", this.handleScroll, {
      capture: true,
      passive: true
    });
    document.addEventListener("keydown", this.handleKeyDown, true);
    document.addEventListener("input", this.handleInput, true);
    window.addEventListener("resize", this.handleResize, { passive: true });

    window.addEventListener("beforeunload", () => {
      this.flush({ status: "completed" });
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        this.flush({ status: "backgrounded" });
      }
    });

    window.addEventListener("error", (event) => {
      if (this.hasFlushedError) return;
      this.hasFlushedError = true;
      this.flush({
        status: "failed",
        errorMessage: event.message
      });
    });

    // Flush every 10 seconds so events aren't lost mid-session
    this.flushInterval = setInterval(() => {
      this.flush({ status: "inprogress" });
    }, 10_000);
  }

  stop() {
    if (this.flushInterval !== null) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    this.flush({ status: "stopped" });

    this.mutationObserver?.disconnect();
    document.removeEventListener("pointermove", this.handlePointerMove, true);
    document.removeEventListener("pointerdown", this.handlePointerDown, true);
    document.removeEventListener("click", this.handleClick, true);
    document.removeEventListener("scroll", this.handleScroll, true);
    document.removeEventListener("keydown", this.handleKeyDown, true);
    document.removeEventListener("input", this.handleInput, true);
    window.removeEventListener("resize", this.handleResize);
  }

  // ---------------------------------------------------------------------------
  // Snapshot
  // ---------------------------------------------------------------------------

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
      scroll: {
        x: window.scrollX,
        y: window.scrollY
      },
      timestamp: Date.now()
    });
  }

  // ---------------------------------------------------------------------------
  // DOM mutations — gives the replay player enough to reconstruct page changes
  // ---------------------------------------------------------------------------

  private startMutationObserver() {
    this.mutationObserver = new MutationObserver((records) => {
      const mutations: any[] = [];

      for (const record of records) {
        if (record.type === "characterData") {
          mutations.push({
            kind: "text",
            path: this.getNodePath(record.target),
            value: record.target.textContent
          });
        } else if (record.type === "attributes") {
          mutations.push({
            kind: "attr",
            path: this.getNodePath(record.target),
            attr: record.attributeName,
            value: (record.target as Element).getAttribute(
              record.attributeName!
            )
          });
        } else if (record.type === "childList") {
          for (const node of Array.from(record.removedNodes)) {
            mutations.push({
              kind: "remove",
              path: this.getNodePath(record.target),
              html:
                node.nodeType === Node.ELEMENT_NODE
                  ? (node as Element).outerHTML
                  : node.textContent
            });
          }
          for (const node of Array.from(record.addedNodes)) {
            mutations.push({
              kind: "add",
              path: this.getNodePath(record.target),
              html:
                node.nodeType === Node.ELEMENT_NODE
                  ? (node as Element).outerHTML
                  : node.textContent,
              nextSiblingPath: record.nextSibling
                ? this.getNodePath(record.nextSibling)
                : null
            });
          }
        }
      }

      if (mutations.length > 0) {
        this.events.push({
          type: "mutation",
          mutations,
          timestamp: Date.now()
        });
      }
    });

    this.mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
      attributeOldValue: false,
      characterDataOldValue: false
    });
  }

  /**
   * Returns a stable CSS-selector-like path to a node so the replay player
   * can locate it in the reconstructed DOM.
   */
  private getNodePath(node: Node): string {
    const parts: string[] = [];
    let current: Node | null = node;

    while (current && current !== document.documentElement) {
      if (current.nodeType === Node.ELEMENT_NODE) {
        const el = current as Element;
        let segment = el.tagName.toLowerCase();

        if (el.id) {
          segment += `#${el.id}`;
          parts.unshift(segment);
          break; // id is unique enough — stop here
        }

        const siblings = Array.from(el.parentNode?.children ?? []).filter(
          (c) => c.tagName === el.tagName
        );

        if (siblings.length > 1) {
          segment += `:nth-of-type(${siblings.indexOf(el) + 1})`;
        }

        parts.unshift(segment);
      }

      current = current.parentNode;
    }

    return parts.join(" > ");
  }

  // ---------------------------------------------------------------------------
  // Pointer / mouse
  // ---------------------------------------------------------------------------

  private handlePointerMove = (e: PointerEvent) => {
    const now = Date.now();
    if (now - this.lastMouseMoveAt < this.MOUSE_THROTTLE_MS) return;
    this.lastMouseMoveAt = now;

    this.events.push({
      type: "mousemove",
      x: e.clientX,
      y: e.clientY,
      nx: e.clientX / window.innerWidth,
      ny: e.clientY / window.innerHeight,
      timestamp: now
    });
  };

  private handlePointerDown = (e: PointerEvent) => {
    const target = e.target as HTMLElement;

    this.events.push({
      type: "pointerdown",
      x: e.clientX,
      y: e.clientY,
      button: e.button,
      ...this.describeTarget(target),
      timestamp: Date.now()
    });
  };

  private handleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const rect = target?.getBoundingClientRect();

    this.events.push({
      type: "click",
      x: e.clientX,
      y: e.clientY,
      targetRect: rect
        ? {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
          }
        : null,
      ...this.describeTarget(target),
      timestamp: Date.now()
    });
  };

  // ---------------------------------------------------------------------------
  // Scroll
  // ---------------------------------------------------------------------------

  private handleScroll = (e: Event) => {
    const now = Date.now();
    if (now - this.lastScrollAt < this.SCROLL_THROTTLE_MS) return;
    this.lastScrollAt = now;

    const target = e.target as HTMLElement;
    const isWindow =
      e.target === document || target === document.documentElement;

    this.events.push({
      type: "scroll",
      scrollY: isWindow ? window.scrollY : target.scrollTop,
      scrollX: isWindow ? window.scrollX : target.scrollLeft,
      path: isWindow ? null : this.getNodePath(target),
      timestamp: now
    });
  };

  // ---------------------------------------------------------------------------
  // Keyboard
  // ---------------------------------------------------------------------------

  private handleKeyDown = (e: KeyboardEvent) => {
    this.events.push({
      type: "keydown",
      key: this.sanitiseKey(e.key),
      code: e.code,
      timestamp: Date.now()
    });
  };

  /**
   * Replaces printable characters with a placeholder so the replay shows
   * _that_ the user typed without capturing actual keystrokes.
   * Special keys (Enter, Backspace, Tab, arrows …) pass through as-is.
   */
  private sanitiseKey(key: string): string {
    if (key.length === 1) return "[char]";
    return key;
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  private handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;

    this.events.push({
      type: "input",
      tag: target?.tagName,
      id: target?.id,
      name: target?.name,
      inputType: target?.type,
      valueLength: target?.value?.length ?? 0,
      timestamp: Date.now()
    });
  };

  // ---------------------------------------------------------------------------
  // Viewport resize
  // ---------------------------------------------------------------------------

  private handleResize = () => {
    this.events.push({
      type: "resize",
      width: window.innerWidth,
      height: window.innerHeight,
      timestamp: Date.now()
    });
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private describeTarget(target: HTMLElement | null) {
    if (!target) return {};

    return {
      tag: target.tagName,
      id: target.id || null,
      className: target.className || null,
      label:
        target.getAttribute("aria-label") ||
        target.getAttribute("title") ||
        target.textContent?.trim().slice(0, 80) ||
        null,
      path: this.getNodePath(target)
    };
  }

  // ---------------------------------------------------------------------------
  // Flush
  // ---------------------------------------------------------------------------

  private async flush(meta: any = {}) {
    if (this.events.length === 0) return;

    const payload = {
      ...meta,
      startedAt: this.sessionStartedAt,
      endedAt: Date.now(),
      url: location.href,
      title: document.title,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      events: [...this.events],
      consoleLogs: [],
      networkLogs: [],
      videoUrl: null
    };

    this.events = [];

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], {
          type: "application/json"
        });
        navigator.sendBeacon(this.endpoint, blob);
        return;
      }

      await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true
      });
    } catch (err) {
      console.error("❌ flush failed:", err);
    }
  }
}