export default function QrCode({
  data,
  size = 200,
  alt = "QR code",
}: {
  data: string;
  size?: number;
  alt?: string;
}) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="rounded-md border border-ink-100 bg-white p-2"
    />
  );
}
