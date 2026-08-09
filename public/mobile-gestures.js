(function attachMobileGestures(global) {
  "use strict";

  function createCanvasGestureController(options = {}) {
    const pointers = new Map();
    let pendingEvent = null;
    let pendingTimer = null;
    let drawingPointerId = null;
    let pinching = false;
    let consumed = false;
    let startDistance = 0;
    let startZoom = 1;
    let suppressClickUntil = 0;

    function enabled(event) {
      return Boolean(options.isEnabled?.(event));
    }

    function snapshot(event) {
      return {
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        button: event.button,
        clientX: event.clientX,
        clientY: event.clientY,
        shiftKey: event.shiftKey,
        target: event.currentTarget || event.target,
        preventDefault() {},
      };
    }

    function clear() {
      global.clearTimeout(pendingTimer);
      pointers.clear();
      pendingEvent = null;
      pendingTimer = null;
      drawingPointerId = null;
      pinching = false;
      consumed = false;
      startDistance = 0;
    }

    function pinchMetrics() {
      const points = [...pointers.values()].slice(0, 2);
      if (points.length < 2) return null;
      return {
        distance: Math.max(1, Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y)),
        centerX: (points[0].x + points[1].x) / 2,
        centerY: (points[0].y + points[1].y) / 2,
      };
    }

    function beginPendingDraw() {
      if (!pendingEvent || pinching || consumed) return;
      const event = pendingEvent;
      pendingEvent = null;
      pendingTimer = null;
      drawingPointerId = event.pointerId;
      options.onDrawStart?.(event);
    }

    function handlePointerDown(event) {
      if (!enabled(event)) return false;
      event.preventDefault();
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      try {
        event.currentTarget?.setPointerCapture?.(event.pointerId);
      } catch {}

      if (pointers.size === 1) {
        consumed = false;
        pendingEvent = snapshot(event);
        pendingTimer = global.setTimeout(beginPendingDraw, options.drawDelay ?? 90);
        return true;
      }

      if (pointers.size === 2) {
        global.clearTimeout(pendingTimer);
        pendingTimer = null;
        pendingEvent = null;
        consumed = true;
        options.onPinchStart?.();
        const pinch = pinchMetrics();
        pinching = true;
        startDistance = pinch?.distance || 1;
        startZoom = Number(options.getZoom?.()) || 1;
      }
      return true;
    }

    function handlePointerMove(event) {
      if (!enabled(event)) return false;
      if (!pointers.has(event.pointerId)) return true;
      event.preventDefault();
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pinching) {
        const pinch = pinchMetrics();
        if (pinch) {
          options.onPinchMove?.({
            zoom: startZoom * (pinch.distance / startDistance),
            centerX: pinch.centerX,
            centerY: pinch.centerY,
          });
        }
        return true;
      }

      if (consumed) return true;
      if (pendingEvent?.pointerId === event.pointerId) {
        const distance = Math.hypot(event.clientX - pendingEvent.clientX, event.clientY - pendingEvent.clientY);
        if (distance < (options.drawThreshold ?? 5)) return true;
        global.clearTimeout(pendingTimer);
        beginPendingDraw();
      }
      if (drawingPointerId === event.pointerId) options.onDrawMove?.(event);
      return true;
    }

    function handlePointerUp(event) {
      if (!enabled(event)) return false;
      event.preventDefault();
      const wasPending = pendingEvent?.pointerId === event.pointerId;
      const wasDrawing = drawingPointerId === event.pointerId;

      if (pinching || consumed) {
        suppressClickUntil = performance.now() + (options.clickSuppressionMs ?? 450);
        pointers.delete(event.pointerId);
        if (pointers.size < 2) pinching = false;
        if (!pointers.size) clear();
        return true;
      }

      if (wasPending) {
        global.clearTimeout(pendingTimer);
        pendingTimer = null;
        if (event.type !== "pointercancel") {
          beginPendingDraw();
          options.onDrawEnd?.(event);
        }
      } else if (wasDrawing) {
        options.onDrawEnd?.(event);
      }

      pointers.delete(event.pointerId);
      if (!pointers.size) clear();
      return true;
    }

    return {
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
      shouldSuppressClick() {
        return performance.now() < suppressClickUntil;
      },
      reset: clear,
    };
  }

  global.XiaomaiMobileGestures = Object.freeze({ createCanvasGestureController });
})(window);
