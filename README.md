# Karaoke Bass 🎤

Turn your phone into a wireless microphone for your laptop. Play YouTube on the laptop and receive the phone microphone over WebRTC so both can come out of the same speaker system.

## Stack
- React + TypeScript + Vite
- PeerJS / WebRTC for microphone streaming and peer signaling
- Web Audio API for microphone bass and volume controls
- GitHub Pages for static hosting

## Run locally
```bash
npm install
npm run dev
```

## Publish on GitHub Pages
1. Open **Settings → Pages** in this repository.
2. Under **Build and deployment**, choose **GitHub Actions**.
3. Push to `main`; the workflow deploys the app.
4. Open https://nabilagx.github.io/karaoke-bass/

## Pairing
1. Open the app on the laptop. Keep the tab open.
2. Scan the QR code using the phone camera.
3. Allow microphone access and tap **Mulai Mic**.
4. When the laptop shows the incoming mic, click **ENABLE AUDIO** once to allow browser audio output.
5. Play a YouTube song on the laptop and choose the bass speaker as the laptop audio output.

## Notes
- Microphone access requires HTTPS (GitHub Pages provides HTTPS) or localhost.
- PeerJS uses its public signaling service to establish WebRTC connections. Both devices need internet access.
- YouTube plays in its official embedded player; its audio is not captured or processed by this app. Both audio streams are played by the laptop and routed to the selected output device.
- Use a headset on the phone or keep the phone away from the speaker to reduce acoustic feedback.
- Browser/device latency can vary. This is a first MVP; do a sound check before singing.
- Never expose private API keys in frontend code.
