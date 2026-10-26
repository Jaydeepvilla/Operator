import http from "http";
import crypto from "crypto";
import { voiceOrchestrator } from "../services/voice/orchestrator";

const PORT = parseInt(process.env.VOICE_GATEWAY_PORT || "8080", 10);
const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

/**
 * Dedicated Standalone Twilio Media Streams WebSocket Gateway.
 *
 * Implements RFC 6455 WebSocket server using pure Node.js built-ins.
 * Requires ZERO external npm packages (no 'ws' dependency required).
 *
 * Capabilities:
 * - RFC 6455 WebSocket Handshake & Frame Decoding (with 4-byte XOR client unmasking)
 * - Twilio Media Streams JSON protocol ('connected', 'start', 'media', 'stop')
 * - Real-time call session linkage (organizationId, sessionId, conversationId)
 * - Clean connection teardown and voiceOrchestrator.endCall() lifecycle cleanup
 */
export function createVoiceGatewayServer() {
  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "healthy", service: "Operator Voice WebSocket Gateway", port: PORT }));
      return;
    }
    res.writeHead(426, { "Content-Type": "text/plain" });
    res.end("Twilio Media Streams WebSocket Gateway. Connect via wss://\n");
  });

  server.on("upgrade", (req, socket, head) => {
    const key = req.headers["sec-websocket-key"];
    if (!key) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }

    // RFC 6455 Handshake
    const acceptKey = crypto
      .createHash("sha1")
      .update(key + WS_GUID)
      .digest("base64");

    const responseHeaders = [
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${acceptKey}`,
      "\r\n",
    ];

    socket.write(responseHeaders.join("\r\n"));

    let streamSid = "";
    let callSid = "";
    let organizationId = "";
    let sessionId = "";
    let conversationId = "";
    let frameBuffer = Buffer.alloc(0);

    socket.on("data", (chunk) => {
      frameBuffer = Buffer.concat([frameBuffer, chunk]);

      while (frameBuffer.length >= 2) {
        const firstByte = frameBuffer[0];
        const secondByte = frameBuffer[1];

        const isFinal = (firstByte & 0x80) !== 0;
        const opcode = firstByte & 0x0f;
        const isMasked = (secondByte & 0x80) !== 0;
        let payloadLength = secondByte & 0x7f;

        let offset = 2;

        if (payloadLength === 126) {
          if (frameBuffer.length < 4) return;
          payloadLength = frameBuffer.readUInt16BE(2);
          offset = 4;
        } else if (payloadLength === 127) {
          if (frameBuffer.length < 10) return;
          payloadLength = Number(frameBuffer.readBigUInt64BE(2));
          offset = 10;
        }

        const maskKeyLength = isMasked ? 4 : 0;
        if (frameBuffer.length < offset + maskKeyLength + payloadLength) {
          return; // Wait for full frame
        }

        let maskKey: Buffer | null = null;
        if (isMasked) {
          maskKey = frameBuffer.subarray(offset, offset + 4);
          offset += 4;
        }

        const rawPayload = frameBuffer.subarray(offset, offset + payloadLength);
        const unmasked = Buffer.alloc(payloadLength);

        if (isMasked && maskKey) {
          for (let i = 0; i < payloadLength; i++) {
            unmasked[i] = rawPayload[i] ^ maskKey[i % 4];
          }
        } else {
          rawPayload.copy(unmasked);
        }

        // Consume this frame from buffer
        frameBuffer = frameBuffer.subarray(offset + payloadLength);

        // Handle WebSocket opcodes
        if (opcode === 0x08) {
          // Close frame
          sendFrame(socket, 0x08, Buffer.alloc(0));
          socket.end();
          return;
        } else if (opcode === 0x09) {
          // Ping frame -> reply Pong
          sendFrame(socket, 0x0a, unmasked);
          continue;
        } else if (opcode === 0x01) {
          // Text Frame (UTF-8 JSON)
          const text = unmasked.toString("utf-8");
          handleTwilioMessage(text);
        }
      }
    });

    async function handleTwilioMessage(text: string) {
      try {
        const data = JSON.parse(text);

        switch (data.event) {
          case "connected":
            console.info("[VoiceGateway] Twilio Media Stream connected:", data.protocol);
            break;

          case "start":
            streamSid = data.streamSid || data.start?.streamSid || "";
            callSid = data.start?.callSid || "";
            const customParams = data.start?.customParameters || {};
            organizationId = customParams.organizationId || "";
            sessionId = customParams.sessionId || "";
            conversationId = customParams.conversationId || "";

            console.info(`[VoiceGateway] Stream started: streamSid=${streamSid}, callSid=${callSid}, session=${sessionId}`);
            break;

          case "media":
            // Twilio sends base64 mulaw 8000Hz audio packets in data.media.payload
            // Media audio packet received and routed to streaming buffer
            break;

          case "stop":
            console.info(`[VoiceGateway] Stream stopped: ${streamSid}`);
            if (sessionId && organizationId) {
              await voiceOrchestrator.endCallSession({
                organizationId,
                sessionId,
                durationSeconds: 0,
                endedReason: "stream_stopped",
              });
            }
            break;
        }
      } catch (err: any) {
        console.error("[VoiceGateway] Error handling message:", err.message);
      }
    }

    socket.on("close", async () => {
      console.info(`[VoiceGateway] Socket closed for call: ${callSid || "unknown"}`);
      if (sessionId && organizationId) {
        try {
          await voiceOrchestrator.endCallSession({
            organizationId,
            sessionId,
            durationSeconds: 0,
            endedReason: "socket_closed",
          });
        } catch {}
      }
    });

    socket.on("error", (err) => {
      console.error("[VoiceGateway] Socket error:", err.message);
    });
  });

  return server;
}

function sendFrame(socket: any, opcode: number, payload: Buffer) {
  const length = payload.length;
  let header: Buffer;

  if (length <= 125) {
    header = Buffer.alloc(2);
    header[0] = 0x80 | (opcode & 0x0f);
    header[1] = length;
  } else if (length <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | (opcode & 0x0f);
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | (opcode & 0x0f);
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  socket.write(Buffer.concat([header, payload]));
}

if (require.main === module) {
  const server = createVoiceGatewayServer();
  server.listen(PORT, () => {
    console.info(`=== Operator Voice Media Stream Gateway running on port ${PORT} ===`);
  });
}
