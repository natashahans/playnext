"use client";

import Image from "next/image";

export default function RecommendationPreview() {
  return (
    <div className="landing-product-stage">
      <div className="landing-product-window">
        <img
          src="/landing-dashboard.png"
          alt="PlayNext dashboard showing a personalised game recommendation"
          className="landing-dashboard-media"
        />
      </div>
    </div>
  );
}