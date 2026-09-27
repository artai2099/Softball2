"use client";

import { useEffect, useRef, useState } from "react";
import {
  createLocalTracks,
  LocalAudioTrack,
  LocalVideoTrack,
  Room,
  RoomEvent,
  Track,
} from "livekit-client";

type Props = {
  gameId: string;
  role: "viewer" | "broadcaster";
};

export function LiveRoom({ gameId, role }: Props) {
  const [status, setStatus] = useState("Ready");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraMode, setCameraMode] = useState<"environment" | "user">(
    "environment",
  );
  const [videoCount, setVideoCount] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const [error, setError] = useState("");

  const roomRef = useRef<Room | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<LocalVideoTrack | null>(null);
  const localAudioRef = useRef<LocalAudioTrack | null>(null);

  function clearStage() {
    if (stageRef.current) {
      stageRef.current.innerHTML = "";
    }
    setVideoCount(0);
  }

  function attachVideoTrack(track: LocalVideoTrack | any, muted = false) {
    if (!stageRef.current) return;

    const element = track.attach() as HTMLVideoElement;

    element.autoplay = true;
    element.playsInline = true;
    element.muted = muted;
    element.controls = false;
    element.className = "gdpVideoElement";

    stageRef.current.appendChild(element);
    setVideoCount((count) => count + 1);
  }

  function attachAudioTrack(track: any) {
    if (!stageRef.current) return;

    const element = track.attach() as HTMLAudioElement;

    element.autoplay = true;
    element.controls = false;
    element.className = "gdpAudioElement";

    stageRef.current.appendChild(element);
  }

  function cleanupTracks() {
    try {
      localVideoRef.current?.stop();
    } catch {}

    try {
      localAudioRef.current?.stop();
    } catch {}

    localVideoRef.current = null;
    localAudioRef.current = null;
  }

  async function disconnect() {
    setConnecting(false);

    try {
      await roomRef.current?.disconnect();
    } catch {}

    roomRef.current = null;
    cleanupTracks();
    clearStage();

    setConnected(false);
    setMuted(false);
    setViewerCount(0);
    setStatus("Disconnected");
  }

  async function connect() {
    if (connecting || connected) return;

    setConnecting(true);
    setError("");
    setStatus("Connecting to live video…");

    try {
      const response = await fetch("/api/livekit/token", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          gameId,
          role,
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || "Video connection failed.");
      }

      if (!body.serverUrl || !body.token) {
        throw new Error("Live video server did not return a valid connection.");
      }

      const serverUrl = new URL(body.serverUrl);

      const browserIsLocal = [
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
      ].includes(window.location.hostname);

      const liveKitIsLocal = [
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
      ].includes(serverUrl.hostname);

      if (liveKitIsLocal && !browserIsLocal) {
        throw new Error(
          "Live video is configured for a local server. Use the public LiveKit URL in production.",
        );
      }

      clearStage();

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        stopLocalTrackOnUnpublish: true,
      });

      roomRef.current = room;

      room.on(
        RoomEvent.TrackSubscribed,
        (track, _publication, participant) => {
          if (track.kind === Track.Kind.Video) {
            attachVideoTrack(track, false);
            setStatus(
              participant.identity
                ? `Live video · ${participant.identity}`
                : "Live video",
            );
          }

          if (track.kind === Track.Kind.Audio) {
            attachAudioTrack(track);
          }

          setViewerCount(room.remoteParticipants.size);
        },
      );

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((element) => element.remove());

        if (track.kind === Track.Kind.Video) {
          setVideoCount((count) => Math.max(0, count - 1));
        }
      });

      room.on(RoomEvent.ParticipantConnected, () => {
        setViewerCount(room.remoteParticipants.size);
      });

      room.on(RoomEvent.ParticipantDisconnected, () => {
        setViewerCount(room.remoteParticipants.size);
      });

      room.on(RoomEvent.Reconnecting, () => {
        setStatus("Connection interrupted · reconnecting…");
      });

      room.on(RoomEvent.Reconnected, () => {
        setStatus(
          role === "broadcaster"
            ? "Camera is live"
            : "Watching live game",
        );
      });

      room.on(RoomEvent.Disconnected, () => {
        setConnected(false);
        setViewerCount(0);
        setStatus("Disconnected");
      });

      await room.connect(body.serverUrl, body.token);

      if (role === "broadcaster") {
        setStatus("Starting camera…");

        const tracks = await createLocalTracks({
          audio: true,
          video: {
            facingMode: cameraMode,
            resolution: { width: 1280, height: 720 },
          },
        });

        for (const track of tracks) {
          if (track.kind === Track.Kind.Video) {
            const videoTrack = track as LocalVideoTrack;
            localVideoRef.current = videoTrack;

            await room.localParticipant.publishTrack(videoTrack);

            attachVideoTrack(videoTrack, true);
          }

          if (track.kind === Track.Kind.Audio) {
            const audioTrack = track as LocalAudioTrack;
            localAudioRef.current = audioTrack;

            await room.localParticipant.publishTrack(audioTrack);
          }
        }

        setStatus("Camera is live");
      } else {
        setStatus("Connected · waiting for live video…");
      }

      setConnected(true);
      setViewerCount(room.remoteParticipants.size);
    } catch (cause) {
      await roomRef.current?.disconnect().catch(() => undefined);
      roomRef.current = null;
      cleanupTracks();
      clearStage();

      const message =
        cause instanceof Error ? cause.message : "Video failed.";

      setError(message);
      setStatus("Unable to connect");
      setConnected(false);
    } finally {
      setConnecting(false);
    }
  }

  async function flipCamera() {
    const track = localVideoRef.current;

    if (!track || !connected) return;

    try {
      const nextMode =
        cameraMode === "environment" ? "user" : "environment";

      await track.restartTrack({
        facingMode: nextMode,
        resolution: { width: 1280, height: 720 },
      });

      setCameraMode(nextMode);
      setStatus("Camera switched");
    } catch {
      setError("Unable to switch camera.");
    }
  }

  async function toggleMute() {
    const track = localAudioRef.current;

    if (!track) return;

    try {
      if (muted) {
        track.unmute();
        setMuted(false);
        setStatus("Microphone on");
      } else {
        track.mute();
        setMuted(true);
        setStatus("Microphone muted");
      }
    } catch {
      setError("Unable to change microphone state.");
    }
  }

  async function fullscreen() {
    const stage = stageRef.current;

    if (!stage) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await stage.requestFullscreen();
      }
    } catch {
      setError("Fullscreen is not available in this browser.");
    }
  }

  useEffect(() => {
    return () => {
      try {
        roomRef.current?.disconnect();
      } catch {}

      cleanupTracks();
    };
  }, []);

  return (
    <section className="gdpVideoPanel">
      <style>{`
        .gdpVideoPanel {
          margin-top: 16px;
          background: #09090b;
          border: 1px solid #28282e;
          border-radius: 16px;
          overflow: hidden;
        }

        .gdpVideoHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          border-bottom: 1px solid #24242a;
          background: #101014;
        }

        .gdpVideoTitle {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .gdpLiveDot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #ff315f;
          box-shadow: 0 0 14px rgba(255,49,95,.7);
        }

        .gdpVideoTitle strong {
          color: #fff;
          font-size: 14px;
        }

        .gdpVideoStatus {
          color: #9a9aa5;
          font-size: 12px;
          margin-top: 2px;
        }

        .gdpVideoStats {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .gdpVideoBadge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 9px;
          border-radius: 999px;
          background: #18181d;
          color: #c9c9d2;
          border: 1px solid #303038;
          font-size: 11px;
          font-weight: 800;
        }

        .gdpVideoStageWrap {
          padding: 12px;
          background:
            radial-gradient(circle at 50% 0%, rgba(124,44,255,.12), transparent 40%),
            #050506;
        }

        .gdpVideoStage {
          position: relative;
          min-height: 290px;
          border-radius: 12px;
          overflow: hidden;
          background: #000;
          display: grid;
          place-items: center;
        }

        .gdpVideoElement {
          width: 100%;
          height: 100%;
          min-height: 290px;
          max-height: 68vh;
          object-fit: cover;
          background: #000;
        }

        .gdpVideoElement + .gdpVideoElement {
          border-top: 1px solid #222;
        }

        .gdpVideoEmpty {
          display: grid;
          place-items: center;
          min-height: 290px;
          width: 100%;
          padding: 40px 20px;
          text-align: center;
          background:
            radial-gradient(circle at center, rgba(124,44,255,.10), transparent 50%),
            #08080a;
        }

        .gdpVideoEmptyIcon {
          font-size: 42px;
          margin-bottom: 10px;
        }

        .gdpVideoEmpty strong {
          color: #fff;
          font-size: 18px;
        }

        .gdpVideoEmpty p {
          color: #92929c;
          margin: 7px 0 0;
          font-size: 13px;
        }

        .gdpVideoError {
          margin: 0 12px 12px;
          padding: 10px 12px;
          border-radius: 9px;
          background: #32101a;
          border: 1px solid #72243b;
          color: #ffb8c8;
          font-size: 12px;
        }

        .gdpVideoControls {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          padding: 12px;
          background: #0c0c0f;
          border-top: 1px solid #24242a;
        }

        .gdpVideoButton {
          min-height: 44px;
          border: 1px solid #34343c;
          border-radius: 9px;
          background: #17171c;
          color: #fff;
          font-size: 12px;
          font-weight: 850;
          cursor: pointer;
        }

        .gdpVideoButton:hover {
          background: #202026;
          border-color: #494953;
        }

        .gdpVideoButton.primary {
          background: #7c2cff;
          border-color: #7c2cff;
        }

        .gdpVideoButton.danger {
          background: #5a1023;
          border-color: #8c1b3a;
          color: #ffcad7;
        }

        .gdpVideoButton:disabled {
          opacity: .5;
          cursor: default;
        }

        .gdpAudioElement {
          display: none;
        }

        @media (max-width: 680px) {
          .gdpVideoHeader {
            align-items: flex-start;
            flex-direction: column;
          }

          .gdpVideoStats {
            justify-content: flex-start;
          }

          .gdpVideoControls {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .gdpVideoStage {
            min-height: 240px;
          }

          .gdpVideoElement {
            min-height: 240px;
          }
        }

        @media (min-width: 1000px) {
          .gdpVideoElement {
            max-height: 620px;
          }
        }
      `}</style>

      <div className="gdpVideoHeader">
        <div className="gdpVideoTitle">
          <span className="gdpLiveDot" />
          <div>
            <strong>
              {role === "broadcaster" ? "GAME CAMERA" : "LIVE VIDEO"}
            </strong>
            <div className="gdpVideoStatus">{status}</div>
          </div>
        </div>

        <div className="gdpVideoStats">
          {connected && (
            <span className="gdpVideoBadge">
              ● LIVE
            </span>
          )}

          {connected && (
            <span className="gdpVideoBadge">
              👁 {viewerCount}
            </span>
          )}

          {role === "broadcaster" && connected && (
            <span className="gdpVideoBadge">
              {cameraMode === "environment" ? "Rear camera" : "Front camera"}
            </span>
          )}
        </div>
      </div>

      <div className="gdpVideoStageWrap">
        <div className="gdpVideoStage" ref={stageRef}>
          {!videoCount && (
            <div className="gdpVideoEmpty">
              <div>
                <div className="gdpVideoEmptyIcon">
                  {role === "broadcaster" ? "📹" : "📺"}
                </div>

                <strong>
                  {role === "broadcaster"
                    ? "Game camera ready"
                    : "Live video ready"}
                </strong>

                <p>
                  {role === "broadcaster"
                    ? "Start the camera when the game is ready."
                    : "Connect to watch the live game video."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <div className="gdpVideoError">{error}</div>}

      <div className="gdpVideoControls">
        {!connected ? (
          <button
            className="gdpVideoButton primary"
            onClick={() => void connect()}
            disabled={connecting}
          >
            {connecting
              ? "Connecting…"
              : role === "broadcaster"
                ? "▶ Start Live Video"
                : "▶ Watch Live"}
          </button>
        ) : (
          <button
            className="gdpVideoButton danger"
            onClick={() => void disconnect()}
          >
            ■ Stop Video
          </button>
        )}

        <button
          className="gdpVideoButton"
          onClick={() => void fullscreen()}
          disabled={!connected}
        >
          ⛶ Fullscreen
        </button>

        {role === "broadcaster" && (
          <>
            <button
              className="gdpVideoButton"
              onClick={() => void flipCamera()}
              disabled={!connected || !localVideoRef.current}
            >
              🔄 Flip Camera
            </button>

            <button
              className="gdpVideoButton"
              onClick={() => void toggleMute()}
              disabled={!connected || !localAudioRef.current}
            >
              {muted ? "🎤 Unmute" : "🔇 Mute"}
            </button>
          </>
        )}

        {role === "viewer" && connected && (
          <button
            className="gdpVideoButton"
            onClick={() => {
              setError("");
              setStatus("Refreshing live connection…");
              void disconnect().then(() => connect());
            }}
          >
            ↻ Reconnect
          </button>
        )}
      </div>
    </section>
  );
}
