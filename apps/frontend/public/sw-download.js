// Service Worker for streaming downloads (emulates a server-sent stream in the client)
const activeStreams = new Map();

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === "REGISTER_STREAM") {
    const { streamId } = data;
    const port = event.ports[0];
    if (port) {
      activeStreams.set(streamId, port);
    }
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.pathname === "/files/download-stream") {
    const streamId = url.searchParams.get("id");
    const name = url.searchParams.get("name") || "download";
    const type = url.searchParams.get("type") || "application/octet-stream";
    const size = url.searchParams.get("size");

    const port = activeStreams.get(streamId);
    if (!port) {
      event.respondWith(
        new Response("Stream channel not registered or expired.", {
          status: 400,
          headers: { "Content-Type": "text/plain" },
        })
      );
      return;
    }

    const stream = new ReadableStream({
      start(controller) {
        port.onmessage = (evt) => {
          const msg = evt.data;
          if (!msg) return;

          if (msg.type === "chunk") {
            controller.enqueue(new Uint8Array(msg.chunk));
            port.postMessage({ type: "ack" });
          } else if (msg.type === "done") {
            controller.close();
            activeStreams.delete(streamId);
          } else if (msg.type === "error") {
            controller.error(new Error(msg.error || "Unknown stream error"));
            activeStreams.delete(streamId);
          }
        };

        // Notify client we are ready to receive chunks
        port.postMessage({ type: "ready" });
      },
      cancel() {
        port.postMessage({ type: "cancel" });
        activeStreams.delete(streamId);
      },
    });

    const headers = new Headers({
      "Content-Type": type,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });

    if (size && parseInt(size, 10) > 0) {
      headers.set("Content-Length", size);
    }

    event.respondWith(new Response(stream, { headers }));
  }
});
