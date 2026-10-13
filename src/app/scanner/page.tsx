import { ScannerView } from "@/components/scanner/ScannerView";

export default function ScannerPage() {
  return (
    <div className="md:mb-0 max-md:-mb-[calc(4.25rem+env(safe-area-inset-bottom,0px))]">
      <ScannerView />
    </div>
  );
}
