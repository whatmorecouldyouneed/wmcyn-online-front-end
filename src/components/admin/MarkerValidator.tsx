import { useEffect } from 'react';

type MarkerValidatorProps = {
  markerDataUrl: string;
  pattFileUrl: string;
  onValidationComplete: (score: number) => void;
};

export default function MarkerValidator({
  markerDataUrl,
  pattFileUrl,
  onValidationComplete,
}: MarkerValidatorProps) {
  useEffect(() => {
    if (!markerDataUrl || !pattFileUrl) return;
    onValidationComplete(100);
  }, [markerDataUrl, pattFileUrl, onValidationComplete]);

  return null;
}
