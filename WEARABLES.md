# Meta glasses prototype

Cross-repo feature: /wearables/ displays poses; iOS Account > Meta glasses captures DAT frames and hosts /wearables/tracker/index.html; backend pairing binds new receivers to a secret.

## Setup / order
1. Deploy backend Functions (npm test, then firebase deploy --only functions). Merge database.wearables.rules.json under the existing Realtime Database rules root in wmcyn-online-mobile. Preserve newsletter rules; this fragment is deliberately not wired to firebase.json. Verify the instance exists. Never grant public root reads/writes.
2. Web main deploys through existing GitHub Pages workflow. Optional NEXT_PUBLIC_WEARABLES_DATABASE_URL must point to the backend project.
3. iOS: xcodegen generate, resolve DAT 1.0.1 with Xcode, build on device. Minimum iOS is now 17.2. Use Meta AI Developer Mode; for registered release channels put META_APP_ID and META_CLIENT_TOKEN in private Signing.xcconfig. Optional WEARABLES_DATABASE_URL overrides the default instance. No credentials are committed.
4. Add https://wmcyn.online/wearables/ to glasses. Generate code, enter it in iOS Account > Meta glasses. Register glasses with Meta AI. Run synthetic mode first; it is not camera tracking.
5. Measure banner graphic width; enter metres. Start banner tracking. Keep iPhone foregrounded. Confirm camera-only DAT and glasses web app coexist. Stop on session/thermal errors.

## Calibration and limitations
Default HUD preview is head-fixed. Experimental marker mode uses manual display FOV and camera-to-eye translation/rotation. Camera intrinsics JSON accepts fx,fy,cx,cy,width,height; omission uses MindAR approximate 45-degree projection. DAT stabilization remains uncompensated; no spatial-lock or 30-fps guarantee. Record distinct frames, processing duration, relay age, and physical alignment. receivedAtMs is phone frame receipt time, not sensor exposure time. Test motion and 15-minute sustained operation on real hardware.

MindAR is pinned to 1.2.5 and uses its controller ABI. Frames are JPEG bridged locally at 360x640; never uploaded. Queues are bounded. RTDB retains only latest pose; at most four writes are outstanding. Stale frames are hidden. Thirty-minute runs require restart. Foreground-only iOS deliberately stops on background; no background claims.

## Verification limits
Linux cannot compile Apple SDK/SwiftUI/DAT or test physical glasses. Local checks and device testing are distinct. Existing storefront and VR flows are preserved. Backend RTDB rules must be merged and tested before real use.
