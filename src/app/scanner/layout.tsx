export default function ScannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-[100dvh] w-full">{children}</div>;
}
