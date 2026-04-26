"use client";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

type ShareData = {
  champion: { name: string; flag: string } | null;
  runnerUp: { name: string; flag: string } | null;
  thirdPlace: { name: string; flag: string } | null;
  poolName: string;
};

export function InstagramShareButton({ data }: { data: ShareData }) {
  const t = useTranslations("share");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendering, setRendering] = useState(false);

  const render = async (): Promise<Blob | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const W = 1080, H = 1920;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#1a1a1a");
    grad.addColorStop(1, "#2d2d2d");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Watermark FP text (bottom-left, low opacity)
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.font = "bold 480px system-ui";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("FP", -20, H - 60);
    ctx.restore();

    // FUTPUL logo text (centered top)
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 96px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("FUTPUL", W / 2, 200);
    ctx.restore();

    // Subtitle
    ctx.save();
    ctx.fillStyle = "#888888";
    ctx.font = "48px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("World Cup 2026", W / 2, 280);
    ctx.restore();

    // Trophy emoji (center accent)
    ctx.save();
    ctx.font = "200px serif";
    ctx.textAlign = "center";
    ctx.fillText("🏆", W / 2, 700);
    ctx.restore();

    // Champion
    if (data.champion) {
      ctx.save();
      ctx.font = "120px serif";
      ctx.textAlign = "center";
      ctx.fillText(data.champion.flag, W / 2, 920);
      ctx.restore();

      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 88px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(data.champion.name, W / 2, 1040);
      ctx.restore();

      ctx.save();
      ctx.fillStyle = "#00E676";
      ctx.font = "52px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("Campeón predicho", W / 2, 1120);
      ctx.restore();
    }

    // Podium row
    const podium = [
      data.runnerUp ? `2. ${data.runnerUp.flag} ${data.runnerUp.name}` : null,
      data.thirdPlace ? `3. ${data.thirdPlace.flag} ${data.thirdPlace.name}` : null,
    ].filter(Boolean) as string[];

    ctx.save();
    ctx.fillStyle = "#999999";
    ctx.font = "52px system-ui";
    ctx.textAlign = "center";
    podium.forEach((line, i) => {
      ctx.fillText(line, W / 2, 1320 + i * 80);
    });
    ctx.restore();

    // Tagline
    const tagline = t("instagram.tagline");
    ctx.save();
    ctx.fillStyle = "#666666";
    ctx.font = "48px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(tagline, W / 2, H - 160);
    ctx.restore();

    // futpul.com
    ctx.save();
    ctx.fillStyle = "#555555";
    ctx.font = "40px system-ui";
    ctx.textAlign = "right";
    ctx.fillText("futpul.com", W - 60, H - 60);
    ctx.restore();

    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
  };

  const handleShare = async () => {
    setRendering(true);
    try {
      const blob = await render();
      if (!blob) return;
      const file = new File([blob], "futpul-prediccion.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "FUTPUL — Mi predicción" });
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "futpul-prediccion.png"; a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setRendering(false);
    }
  };

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      <button
        onClick={handleShare}
        disabled={rendering}
        className="w-full h-[52px] rounded-[14px] font-bold text-base flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white disabled:opacity-40"
      >
        {rendering ? `⏳ ${t("instagram.generating")}` : `📸 ${t("instagram.button")}`}
      </button>
    </>
  );
}
