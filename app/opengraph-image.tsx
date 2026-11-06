import { ImageResponse } from "next/og";

export const alt =
  "Workout Tracker — Record your training. Build consistency.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// A public, generic brand image. No session or database access is needed.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0f172a",
          color: "#f8fafc",
          padding: "64px 76px",
          borderTop: "12px solid #22d3ee",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 76,
              height: 76,
              borderRadius: 18,
              background: "#22d3ee",
              color: "#0f172a",
              fontSize: 48,
              fontWeight: 700,
            }}
          >
            W
          </div>
          <span style={{ fontSize: 36, fontWeight: 700 }}>
            Workout Tracker
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <span style={{ fontSize: 70, fontWeight: 700 }}>
            Record your training.
          </span>
          <span style={{ fontSize: 70, fontWeight: 700, color: "#22d3ee" }}>
            Build consistency.
          </span>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#cbd5e1" }}>
          Workouts · Sets · Rest timers · Progress
        </div>
      </div>
    ),
    size,
  );
}
