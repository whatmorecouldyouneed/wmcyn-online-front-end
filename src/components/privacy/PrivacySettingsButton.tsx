import { usePrivacy } from './PrivacyProvider';

type PrivacySettingsButtonProps = {
  className?: string;
};

export default function PrivacySettingsButton({ className }: PrivacySettingsButtonProps) {
  const { openPreferences } = usePrivacy();
  return (
    <button type="button" onClick={openPreferences} className={className}>
      cookie settings
    </button>
  );
}
