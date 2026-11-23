import { useEffect, useRef, useState } from 'react'
import Peer, { type MediaConnection } from 'peerjs'
import { QRCodeSVG } from 'qrcode.react'
import { AudioLines, Radio, Mic, MicOff, Copy, Check, Music2, Volume2, Headphones, Wifi, WifiOff, Play, ExternalLink } from 'lucide-react'

const BASE = import.meta.env.BASE_URL
function videoId(value: string) {
  try { const u = new URL(value); if (u.hostname.includes('youtu.be')) return u.pathname.slice(1); return u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop() || '' } catch { return value.trim() }
}

export default function App() {
  const joinId = new URLSearchParams(location.search).get('join')
  const isPhone = Boolean(joinId)
  const [peerId, setPeerId] = useState('')
  const [status, setStatus] = useState('Menyiapkan koneksi…')
  const [connected, setConnected] = useState(false)
  const [micOn, setMicOn] = useState(false)
  const [youtube, setYoutube] = useState('')
  const [video, setVideo] = useState('')
  const [bass, setBass] = useState(65)
  const [volume, setVolume] = useState(85)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [outputReady, setOutputReady] = useState(false)
  const peerRef = useRef<Peer | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const callRef = useRef<MediaConnection | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const bassRef = useRef<BiquadFilterNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)

  useEffect(() => {
    const peer = new Peer('', {
      debug: 2,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun.cloudflare.com:3478' },
        ],
        iceCandidatePoolSize: 10,
      },
    })
    peerRef.current = peer
    peer.on('open', id => {
      setPeerId(id)
      setStatus(isPhone ? 'Siap mengirim suara' : 'Laptop siap menerima mic')
      if (!isPhone) setConnected(false)
    })
    peer.on('call', call => {
      call.answer()
      call.on('stream', stream => {
        if (audioRef.current) {
          const ctx = new AudioContext()
          const source = ctx.createMediaStreamSource(stream)
          const low = ctx.createBiquadFilter(); low.type = 'lowshelf'; low.frequency.value = 120; low.gain.value = bass
          const gain = ctx.createGain(); gain.gain.value = volume / 100
          source.connect(low).connect(gain).connect(ctx.destination)
          ctxRef.current = ctx; bassRef.current = low; gainRef.current = gain
          setConnected(true); setStatus('Mic HP terhubung!')
        }
      })
      call.on('close', () => { setConnected(false); setStatus('Mic terputus') })
      call.on('error', err => { setError('Streaming mic gagal: ' + err.message); setConnected(false); setStatus('Streaming gagal') })
      callRef.current = call
    })
    peer.on('disconnected', () => {
      setStatus('Sinyal terputus, mencoba menyambung ulang…')
      if (!peer.destroyed) peer.reconnect()
    })
    peer.on('error', err => {
      const message = err.type === 'peer-unavailable'
        ? 'Room laptop tidak ditemukan. Refresh halaman laptop lalu scan QR baru.'
        : err.type === 'network'
          ? 'Server sinyal tidak terjangkau. Coba ganti jaringan atau muat ulang.'
          : err.message
      setError(message)
      setStatus('Koneksi bermasalah')
    })
    return () => { callRef.current?.close(); streamRef.current?.getTracks().forEach(t => t.stop()); ctxRef.current?.close(); peer.destroy() }
  }, [])

  useEffect(() => { if (bassRef.current) bassRef.current.gain.value = bass }, [bass])
  useEffect(() => { if (gainRef.current) gainRef.current.gain.value = volume / 100 }, [volume])

  async function startMic() {
    try {
      setError('')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false }, video: false })
      streamRef.current = stream
      const peer = peerRef.current
      if (!peer || !joinId) throw new Error('Koneksi belum siap. Muat ulang halaman.')
      const call = peer.call(joinId, stream)
      if (!call) throw new Error('Gagal memulai panggilan.')
      callRef.current = call
      setMicOn(true); setStatus('Menghubungkan ke laptop…')
      call.on('close', () => {
        streamRef.current?.getTracks().forEach(track => track.stop())
        streamRef.current = null
        setMicOn(false); setConnected(false); setStatus('Koneksi berakhir')
      })
      call.on('error', err => {
        setError('Koneksi audio gagal: ' + err.message)
        setMicOn(false); setConnected(false); setStatus('Gagal tersambung')
      })
    } catch (e) { setError(e instanceof Error ? e.message : 'Tidak bisa mengakses mikrofon.') }
  }
  function stopMic() {
    callRef.current?.close()
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null; setMicOn(false); setConnected(false); setStatus('Mic dimatikan')
  }
  async function enableOutput() { await ctxRef.current?.resume(); setOutputReady(true) }
  function copyLink() {
    navigator.clipboard.writeText(location.origin + BASE + '?join=' + peerId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) })
  }
  function loadVideo() { const id = videoId(youtube); if (id) setVideo(id) }

  if (isPhone) return <main className="phone-shell">
    <div className="brand"><div className="brand-icon"><AudioLines /></div><span>KARAOKE<span className="brand-accent">BASS</span></span></div>
    <div className="phone-card">
      <div className="phone-orb"><Mic size={38}/></div>
      <p className="eyebrow">REMOTE MICROPHONE</p>
      <h1>HP jadi<br/><span className="gradient">mikrofonmu.</span></h1>
      <p className="muted">Suaramu dikirim langsung ke laptop. Pastikan laptop sudah membuka Karaoke Bass.</p>
      <div className="connection"><span className={connected || micOn ? 'dot live' : 'dot'} />{status}</div>
      {error && <p className="error">{error}</p>}
      <button className={micOn ? 'mic-button active' : 'mic-button'} disabled={!peerId && !micOn} onClick={micOn ? stopMic : startMic}>
        {micOn ? <><MicOff/> MATIKAN MIC</> : <><Mic/> MULAI MIC</>}
      </button>
      <p className="tiny">Izinkan akses mikrofon saat browser memintanya.</p>
    </div>
    <p className="footer-note">KARAOKE BASS · SING IT LOUD 🎤</p>
  </main>

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-icon"><AudioLines /></div><span>KARAOKE<span className="brand-accent">BASS</span></span><span className="version">BETA</span></div>
      <div className="top-status"><span className={connected ? 'dot live' : 'dot'} />{connected ? 'PHONE CONNECTED' : 'READY TO PAIR'}</div>
    </header>
    <section className="hero">
      <div><p className="eyebrow"><span className="pulse"/> YOUR PERSONAL KARAOKE STATION</p><h1>Feel the beat.<br/><span className="gradient">Own the mic.</span></h1><p className="hero-copy">Ubah HP jadi mikrofon wireless. Putar lagu YouTube dari laptop, nyanyi lewat HP, dan keluarkan semuanya ke speaker bass-mu.</p></div>
      <div className="visualizer" aria-label="Audio visualizer">{Array.from({length:32},(_,i)=><i key={i} style={{'--i':i} as React.CSSProperties}/>)}</div>
    </section>
    <div className="dashboard">
      <section className="panel pair-panel">
        <div className="panel-heading"><div className="panel-icon"><Radio/></div><div><p className="eyebrow">01 / CONNECT DEVICE</p><h2>Pair your phone</h2></div><span className="live-tag"><span className="dot live"/> LIVE</span></div>
        <p className="muted">Scan QR ini menggunakan kamera HP untuk menjadikannya mikrofon.</p>
        <div className="qr-wrap">{peerId ? <QRCodeSVG value={location.origin + BASE + '?join=' + peerId} size={174} bgColor="#ffffff" fgColor="#10131b" level="H"/> : <div className="qr-loading"><span className="spinner"/>Connecting…</div>}</div>
        <div className="pair-link"><span>{peerId ? peerId.slice(0,18)+'…' : 'Generating room ID'}</span><button onClick={copyLink} disabled={!peerId} aria-label="Copy pairing link">{copied ? <Check/> : <Copy/>}</button></div>
        <div className="hint"><Wifi size={15}/> HP dan laptop perlu koneksi internet. Buka link hasil scan di browser HP.</div>
        {error && <p className="error">{error}</p>}
      </section>
      <section className="panel music-panel">
        <div className="panel-heading"><div className="panel-icon purple"><Music2/></div><div><p className="eyebrow">02 / MUSIC PLAYER</p><h2>Choose your song</h2></div></div>
        <p className="muted">Tempel link video atau lagu dari YouTube.</p>
        <div className="youtube-input"><input value={youtube} onChange={e=>setYoutube(e.target.value)} onKeyDown={e=>e.key==='Enter'&&loadVideo()} placeholder="https://www.youtube.com/watch?v=…"/><button onClick={loadVideo}><Play size={16}/></button></div>
        {video ? <div className="video-frame"><iframe src={'https://www.youtube-nocookie.com/embed/'+video+'?autoplay=0&rel=0'} title="YouTube karaoke player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/></div> : <div className="music-empty"><Music2 size={32}/><span>YOUR NEXT FAVORITE SONG</span><small>Video YouTube akan tampil di sini</small></div>}
        <a className="youtube-link" href="https://www.youtube.com" target="_blank" rel="noreferrer">Browse YouTube <ExternalLink size={13}/></a>
      </section>
      <section className="panel mixer-panel">
        <div className="panel-heading"><div className="panel-icon green"><Volume2/></div><div><p className="eyebrow">03 / SOUND CONTROL</p><h2>Audio mixer</h2></div></div>
        <div className="mixer-row"><div className="mixer-label"><span>BASS BOOST</span><strong>{bass > 0 ? '+' : ''}{bass} dB</strong></div><input type="range" min="0" max="15" value={bass} onChange={e=>setBass(Number(e.target.value))}/><div className="range-labels"><span>NEUTRAL</span><span>DEEP BASS</span></div></div>
        <div className="mixer-row"><div className="mixer-label"><span>MIC VOLUME</span><strong>{volume}%</strong></div><input type="range" min="0" max="150" value={volume} onChange={e=>setVolume(Number(e.target.value))}/><div className="range-labels"><span>LOW</span><span>LOUD</span></div></div>
        <div className="output-card"><div className="output-icon"><Headphones/></div><div><b>Speaker output</b><small>Pilih speaker bass sebagai output audio laptop</small></div>{connected ? (outputReady ? <span className="output-state on">ACTIVE</span> : <button className="enable-output" onClick={enableOutput}>ENABLE AUDIO</button>) : <span className="output-state">WAITING</span>}</div>
      </section>
    </div>
    <footer className="bottom"><span>MADE FOR LOUD NIGHTS.</span><span><WifiOff size={13}/> AUDIO STREAM VIA WEBRTC</span></footer>
    <audio ref={audioRef} autoPlay playsInline/>
  </main>
}