import { useEffect, useRef, useState } from 'react';
import { Button } from '../../../components/ui/Button.jsx';
import { Icon } from '../../../components/ui/Icon.jsx';
import { createQrReader } from '../../../lib/qrReader.js';

const FRAME =
  'M4 54V16A12 12 0 0 1 16 4h38M176 4h38a12 12 0 0 1 12 12v38M226 176v38a12 12 0 0 1-12 12h-38M54 226H16A12 12 0 0 1 4 214v-38';

/** Same QR code seen again within this time is ignored (the camera sees it many times a second). */
const REPEAT_MS = 3000;

const STATUS = {
  off: { dot: 'bg-ink-faint', text: 'text-ink-muted', label: 'Camera off' },
  starting: { dot: 'bg-warning', text: 'text-warning-text', label: 'Starting camera…' },
  on: { dot: 'bg-success', text: 'text-success-text', label: 'Camera on' },
  error: { dot: 'bg-danger', text: 'text-danger-text', label: 'Camera problem' },
};

function cameraError(error) {
  if (error?.name === 'NotAllowedError')
    return 'The camera is blocked. Click the camera icon in the address bar and choose Allow.';
  if (error?.name === 'NotFoundError') return 'No camera was found on this computer.';
  if (error?.name === 'NotReadableError')
    return 'Another program is using the camera. Close it and try again.';
  return 'The camera could not start. Use the USB scanner or type the Member ID below.';
}

/**
 * QR Code Scanner card body (docs/design/Attendance.dc.html): camera picture with the orange frame.
 * Reads codes with lib/qrReader.js: the browser's built-in reader where it exists (Mac, Android),
 * otherwise jsQR, which is what works on the Windows front-desk PC.
 * @param {{ onScan: (text: string) => void }} props
 */
export function CameraScanner({ onScan }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const onScanRef = useRef(onScan);
  const [status, setStatus] = useState('off');
  const [message, setMessage] = useState('');
  const mountedRef = useRef(true);

  useEffect(() => {
    onScanRef.current = onScan;
  });

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStatus('off');
    setMessage('');
  }

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('error');
      setMessage('This browser cannot use the camera. Use the USB scanner or type the Member ID.');
      return;
    }
    setStatus('starting');
    setMessage('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
        audio: false,
      });
      // Staff left the page while the camera was starting: turn it straight off again.
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStatus('on');
    } catch (error) {
      setStatus('error');
      setMessage(cameraError(error));
    }
  }

  // Read QR codes from the picture a few times a second while the camera is on.
  useEffect(() => {
    if (status !== 'on') return undefined;
    let read = null;
    let stopped = false;
    createQrReader()
      .then((reader) => {
        if (!stopped) read = reader;
      })
      .catch(() => {
        if (!stopped) {
          setMessage(
            "The camera can't read QR codes here. Use the USB scanner or type the Member ID.",
          );
        }
      });
    let last = { text: '', at: 0 };
    let busy = false;
    const timer = setInterval(async () => {
      const video = videoRef.current;
      if (busy || !read || !video || video.readyState < 2) return;
      busy = true;
      try {
        const text = await read(video);
        const now = Date.now();
        if (text && (text !== last.text || now - last.at > REPEAT_MS)) {
          last = { text, at: now };
          onScanRef.current(text);
        }
      } catch {
        // A frame that can't be read is normal; try the next one.
      } finally {
        busy = false;
      }
    }, 250);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [status]);

  // Turn the camera off when leaving the page.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const s = STATUS[status];
  const live = status === 'on';

  return (
    <>
      <div className="-mt-2 flex items-center justify-end">
        <span className={`inline-flex items-center gap-2 text-[13px] font-medium ${s.text}`}>
          <i
            className={`h-2 w-2 rounded-full ${s.dot} ${live ? 'motion-safe:animate-pulse' : ''}`}
          />
          {s.label}
        </span>
      </div>
      <div className="relative flex h-[340px] items-center justify-center overflow-hidden rounded-card border border-line bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            live ? 'opacity-60' : 'opacity-0'
          }`}
        />
        <div className="relative h-[230px] w-[230px]">
          <svg
            width="230"
            height="230"
            viewBox="0 0 230 230"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            aria-hidden="true"
            className={`stroke-brand transition-opacity duration-300 ${live ? '' : 'opacity-50'}`}
          >
            <path d={FRAME} />
          </svg>
          <div
            className={`absolute inset-x-4 top-[112px] h-[3px] rounded-sm bg-brand shadow-[0_0_18px_3px_rgba(255,61,10,0.55)] ${
              live ? 'motion-safe:animate-scan-line' : 'opacity-40'
            }`}
          />
        </div>
        <p className="absolute inset-x-0 bottom-3.5 px-4 text-center text-sm text-ink-soft">
          {live
            ? message || 'Hold the member’s QR code inside the frame'
            : 'Hold the QR code to the USB scanner, or open the camera'}
        </p>
      </div>
      <Button
        icon={live ? 'close' : 'camera'}
        onClick={live ? stop : start}
        busy={status === 'starting'}
        className="h-[50px] w-full text-[15px]"
      >
        {live ? 'Close Camera' : 'Open Camera'}
      </Button>
      {status === 'error' && (
        <p
          role="alert"
          className="-mt-2 flex items-center gap-2 text-[13px] text-danger-text motion-safe:animate-drop-in"
        >
          <Icon name="alert" size={14} />
          {message}
        </p>
      )}
    </>
  );
}
