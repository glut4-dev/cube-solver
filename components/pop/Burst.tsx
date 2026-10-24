/** Comic-book "POW!" starburst with text in the middle. */
export function Burst({
  children,
  size = 150,
  fill = "#ff2e88",
  rotate = -8,
  className = "",
}: {
  children: React.ReactNode;
  size?: number;
  fill?: string;
  rotate?: number;
  className?: string;
}) {
  const spikes = 14;
  const pts = Array.from({ length: spikes * 2 }, (_, i) => {
    const r = i % 2 === 0 ? 50 : 36 + ((i * 7) % 5);
    const a = (Math.PI * i) / spikes;
    return `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`;
  }).join(" ");
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size, transform: `rotate(${rotate}deg)` }}>
      <svg viewBox="-4 -4 108 108" className="absolute inset-0 h-full w-full drop-shadow-[4px_4px_0_#111]" aria-hidden>
        <polygon points={pts} fill={fill} stroke="#111" strokeWidth="3" strokeLinejoin="round" />
      </svg>
      <span className="font-pop relative text-center leading-none text-white" style={{ fontSize: size / 5, textShadow: "2px 2px 0 #111" }}>
        {children}
      </span>
    </div>
  );
}
