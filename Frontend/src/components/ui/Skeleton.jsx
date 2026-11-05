import React from "react";

export default function Skeleton({ width = "100%", height = "20px", borderRadius = "8px", style = {} }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: "linear-gradient(90deg, #f0f5ed 25%, #e4ede0 50%, #f0f5ed 75%)",
        backgroundSize: "200% 100%",
        animation: "skeletonPulse 1.5s infinite",
        ...style,
      }}
    />
  );
}
