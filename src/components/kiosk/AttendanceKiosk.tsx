import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  RefreshCw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Lock,
  Hospital,
  ShieldCheck,
  Eye,
  Info,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { detectFaceInVideo, type DetectedFace } from '../../services/faceRecognition';
import { matchFaceBiometrics } from '../../services/api';
import { sounds } from '../../utils/sound';
import type { Staff, AttendanceRecord, RecognitionResult } from '../../types';
import { StaffAvatar } from '../common/StaffAvatar';

interface AttendanceKioskProps {
  onOpenAdminLogin: () => void;
  timezone?: string;
  onAttendanceRecorded?: () => void;
}

export const AttendanceKiosk: React.FC<AttendanceKioskProps> = ({
  onOpenAdminLogin,
  timezone = 'Asia/Kolkata',
  onAttendanceRecorded,
}) => {
  const [mode, setMode] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Time state
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  // CV state
  const [detectedFace, setDetectedFace] = useState<DetectedFace | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<RecognitionResult | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<'IDLE' | 'ANALYZING' | 'SUCCESS' | 'LOW_CONFIDENCE' | 'ALERT' | 'COOLDOWN'>('IDLE');
  const [statusMessage, setStatusMessage] = useState<string>('LOOK INTO THE CAMERA');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingFrameRef = useRef<boolean>(false);

  // Real-time second-by-second clock
  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const timeFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });

        const dateFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

        setCurrentTime(timeFormatter.format(now));
        setCurrentDate(dateFormatter.format(now));
      } catch {
        const now = new Date();
        setCurrentTime(now.toLocaleTimeString());
        setCurrentDate(now.toLocaleDateString());
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [timezone]);

  // Camera initialization
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.warn);
          setIsCameraActive(true);
        };
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please click the camera icon in browser URL bar to allow camera access.'
          : 'Unable to connect to camera device. Please verify your camera is connected.'
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setIsCameraActive(false);
    setDetectedFace(null);
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Frame processing loop (6 times / sec)
  useEffect(() => {
    if (!isCameraActive) return;

    detectionIntervalRef.current = setInterval(async () => {
      if (isProcessingFrameRef.current || !videoRef.current || !canvasRef.current) return;
      isProcessingFrameRef.current = true;

      try {
        const face = await detectFaceInVideo(videoRef.current, canvasRef.current);
        setDetectedFace(face);

        if (face && face.confidence > 0.8) {
          if (feedbackStatus === 'IDLE' || feedbackStatus === 'LOW_CONFIDENCE') {
            setIsAnalyzing(true);
            setFeedbackStatus('ANALYZING');
            setStatusMessage('ANALYZING FACE BIOMETRICS...');

            const result = await matchFaceBiometrics(face.embedding, mode);
            setLastResult(result);
            setIsAnalyzing(false);

            if (result.action === 'ENTRY_RECORDED' || result.action === 'EXIT_RECORDED') {
              setFeedbackStatus('SUCCESS');
              setStatusMessage('✓ Attendence Marked');
              if (soundEnabled) sounds.playSuccess();
              if (onAttendanceRecorded) onAttendanceRecorded();

              // Auto-reset after 4.5s
              setTimeout(() => {
                setFeedbackStatus('IDLE');
                setStatusMessage('LOOK INTO THE CAMERA');
                setLastResult(null);
              }, 4500);
            } else if (result.action === 'COOLDOWN_ACTIVE' || result.action === 'ALREADY_RECORDED') {
              setFeedbackStatus('COOLDOWN');
              setStatusMessage(result.message);
              if (soundEnabled) sounds.playAlert();
              setTimeout(() => {
                setFeedbackStatus('IDLE');
                setStatusMessage('LOOK INTO THE CAMERA');
              }, 3500);
            } else if (result.action === 'NO_ACTIVE_SESSION') {
              setFeedbackStatus('ALERT');
              setStatusMessage('NO ACTIVE ATTENDANCE SESSION');
              if (soundEnabled) sounds.playAlert();
              setTimeout(() => {
                setFeedbackStatus('IDLE');
                setStatusMessage('LOOK INTO THE CAMERA');
              }, 4000);
            } else if (result.action === 'LOW_CONFIDENCE') {
              setFeedbackStatus('LOW_CONFIDENCE');
              setStatusMessage('LOW CONFIDENCE — Look directly at camera');
            }
          }
        } else {
          if (feedbackStatus === 'LOW_CONFIDENCE' || feedbackStatus === 'ANALYZING') {
            setFeedbackStatus('IDLE');
            setStatusMessage('LOOK INTO THE CAMERA');
          }
        }
      } catch (err) {
        console.error('Kiosk recognition error:', err);
      } finally {
        isProcessingFrameRef.current = false;
      }
    }, 160);

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, [isCameraActive, mode, feedbackStatus, soundEnabled, onAttendanceRecorded]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.warn);
    } else if (document.exitFullscreen) {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.warn);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-teal-500 selection:text-white ${
        isFullscreen ? 'fixed inset-0 z-50 p-6' : 'p-4 sm:p-6 lg:p-8'
      }`}
    >
      {/* Top Kiosk Header */}
      <header className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        {/* Hospital Branding */}
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Hospital className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold tracking-tight text-white">BANARAS HOSPITAL</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30">
                Attendance Station
              </span>
            </div>
            <p className="text-xs text-slate-400">Automated Biometric Facial Recognition Gateway</p>
          </div>
        </div>

        {/* Center Clock */}
        <div className="flex items-center space-x-3 bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-2xl shadow-sm">
          <Clock className="w-4 h-4 text-teal-400 animate-pulse" />
          <div className="text-left">
            <div className="font-mono text-base font-bold text-white tracking-tight leading-tight">
              {currentTime || '09:02:17 AM'}
            </div>
            <div className="text-[10px] font-medium text-slate-400 leading-none">
              {currentDate || 'Wednesday, 30 September 2026'} • IST
            </div>
          </div>
        </div>

        {/* Right Tools: Sound, Fullscreen, and Admin Portal Entry */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={soundEnabled ? 'Mute Chimes' : 'Enable Chimes'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-teal-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Station Mode'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={isCameraActive ? stopCamera : startCamera}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Restart Camera"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>

          {/* Secure Admin Portal Button */}
          <button
            onClick={onOpenAdminLogin}
            className="ml-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-teal-600 text-slate-200 hover:text-white text-xs font-bold transition-all border border-slate-700/80 shadow-md flex items-center space-x-2 group"
          >
            <Lock className="w-3.5 h-3.5 text-teal-400 group-hover:text-white transition-colors" />
            <span>Admin Portal</span>
          </button>
        </div>
      </header>

      {/* Main Kiosk Body */}
      <main className="flex-1 my-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center max-w-7xl mx-auto w-full">
        {/* Left 8 Cols: Camera Workstation with Reticle */}
        <div className="lg:col-span-8 space-y-4">
          {/* Mode Switcher */}
          <div className="flex items-center justify-center px-1">
            <div className="bg-slate-900 w-full max-w-md sm:w-auto p-1.5 rounded-2xl border border-slate-800 flex items-center justify-center space-x-2 shadow-inner">
              <button
                onClick={() => {
                  setMode('ENTRY');
                  setFeedbackStatus('IDLE');
                  setStatusMessage('LOOK INTO THE CAMERA');
                  setLastResult(null);
                }}
                className={`flex-1 sm:flex-none px-3.5 sm:px-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-2 ${
                  mode === 'ENTRY'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${mode === 'ENTRY' ? 'bg-white animate-ping' : 'bg-slate-600'}`} />
                <span>ENTRY</span>
              </button>

              <button
                onClick={() => {
                  setMode('EXIT');
                  setFeedbackStatus('IDLE');
                  setStatusMessage('LOOK INTO THE CAMERA');
                  setLastResult(null);
                }}
                className={`flex-1 sm:flex-none px-3.5 sm:px-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-2 ${
                  mode === 'EXIT'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${mode === 'EXIT' ? 'bg-white animate-ping' : 'bg-slate-600'}`} />
                <span>EXIT</span>
              </button>
            </div>
          </div>

          {/* Camera Frame */}
          <div className="relative aspect-4/3 sm:aspect-16/10 rounded-3xl overflow-hidden bg-slate-900 border-2 border-slate-800 shadow-2xl flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${
                isCameraActive ? 'opacity-100' : 'opacity-0'
              }`}
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Offline/Error placeholder */}
            {!isCameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 z-20 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-teal-400">
                  <CameraOff className="w-8 h-8" />
                </div>
                <div className="max-w-md">
                  <h3 className="text-lg font-bold text-white">Camera Standby or Permission Required</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {cameraError || 'Please allow camera access in your browser to enable contactless attendance.'}
                  </p>
                </div>
                <button
                  onClick={startCamera}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow-lg shadow-teal-500/30 flex items-center space-x-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Connect Camera</span>
                </button>
              </div>
            )}

            {/* Live HUD Overlays */}
            {isCameraActive && (
              <div className="absolute inset-0 pointer-events-none z-10 p-5 flex flex-col justify-between">
                {/* Station Tag */}
                <div className="flex items-center justify-between text-[11px] font-mono font-medium">
                  <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${mode === 'ENTRY' ? 'bg-emerald-400' : 'bg-indigo-400'} animate-ping`} />
                    <span className="text-white">{mode === 'ENTRY' ? 'ENTRY GATE STATION' : 'EXIT GATE STATION'}</span>
                  </div>
                  <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-teal-400">
                    OPTICAL LIVENESS: ACTIVE
                  </div>
                </div>

                {/* Reticle / Face Box */}
                <div className="relative w-full h-full flex items-center justify-center">
                  {!detectedFace && (
                    <div className="w-60 h-76 rounded-[45%] border-2 border-dashed border-teal-500/40 flex items-center justify-center">
                      <span className="text-[11px] font-mono text-teal-400 bg-black/60 px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-xs">
                        Position Face in Reticle
                      </span>
                    </div>
                  )}

                  {detectedFace && (
                    <div
                      className={`absolute rounded-2xl border-2 transition-all duration-100 ${
                        feedbackStatus === 'SUCCESS'
                          ? 'border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.6)] bg-emerald-500/10'
                          : feedbackStatus === 'LOW_CONFIDENCE'
                          ? 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.5)]'
                          : feedbackStatus === 'ALERT'
                          ? 'border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.5)]'
                          : 'border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.4)] bg-cyan-500/5'
                      }`}
                      style={{
                        left: `calc(100% - ${((detectedFace.box.x + detectedFace.box.width) / (videoRef.current?.videoWidth || 640)) * 100}%)`,
                        top: `${(detectedFace.box.y / (videoRef.current?.videoHeight || 480)) * 100}%`,
                        width: `${(detectedFace.box.width / (videoRef.current?.videoWidth || 640)) * 100}%`,
                        height: `${(detectedFace.box.height / (videoRef.current?.videoHeight || 480)) * 100}%`,
                      }}
                    >
                      {/* Laser Line */}
                      {feedbackStatus === 'ANALYZING' && (
                        <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_cyan] animate-bounce" />
                      )}

                      <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-black/80 px-2.5 py-0.5 rounded-full border border-white/20 text-[10px] font-mono text-cyan-300">
                        MATCH: {(detectedFace.confidence * 100).toFixed(0)}% • BIOMETRIC DETECTED
                      </div>
                    </div>
                  )}
                </div>

                {/* Status Pill */}
                <div className="flex items-center justify-center">
                  <div
                    className={`px-5 py-2 rounded-2xl backdrop-blur-md border text-xs font-bold uppercase tracking-wider shadow-lg transition-all flex items-center space-x-2 ${
                      feedbackStatus === 'SUCCESS'
                        ? 'bg-emerald-600/90 border-emerald-400 text-white shadow-emerald-500/30'
                        : feedbackStatus === 'LOW_CONFIDENCE'
                        ? 'bg-amber-600/90 border-amber-400 text-white shadow-amber-500/30'
                        : feedbackStatus === 'ALERT'
                        ? 'bg-rose-600/90 border-rose-400 text-white shadow-rose-500/30'
                        : feedbackStatus === 'COOLDOWN'
                        ? 'bg-sky-600/90 border-sky-400 text-white shadow-sky-500/30'
                        : 'bg-black/70 border-white/20 text-slate-200'
                    }`}
                  >
                    {feedbackStatus === 'ANALYZING' && <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-300" />}
                    {feedbackStatus === 'SUCCESS' && <CheckCircle2 className="w-4 h-4 text-emerald-200" />}
                    {feedbackStatus === 'ALERT' && <AlertCircle className="w-4 h-4 text-white" />}
                    <span>{statusMessage}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 4 Cols: Instant Verification Card */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Biometric Terminal
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">ID-LEDGER</span>
            </div>

            {/* When Face Matched */}
            {lastResult?.staff ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center space-x-3.5">
                  <StaffAvatar
                    name={lastResult.staff.name}
                    avatarUrl={lastResult.staff.avatar_url}
                    size="lg"
                    className="w-16 h-16 rounded-2xl ring-2 ring-teal-500 shadow-md shrink-0"
                  />
                  <div>
                    <h3 className="font-bold text-base text-white leading-tight">
                      {lastResult.staff.name}
                    </h3>
                    <div className="text-xs font-mono font-bold text-teal-400 mt-0.5">
                      {lastResult.staff.employee_id}
                    </div>
                    <div className="text-xs text-slate-400">
                      {lastResult.staff.department}
                    </div>
                  </div>
                </div>

                {/* Result Card */}
                <div
                  className={`p-4 rounded-2xl border ${
                    feedbackStatus === 'SUCCESS'
                      ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200'
                      : feedbackStatus === 'COOLDOWN'
                      ? 'bg-sky-950/60 border-sky-500/60 text-sky-200'
                      : feedbackStatus === 'ALERT'
                      ? 'bg-rose-950/60 border-rose-500/60 text-rose-200'
                      : 'bg-slate-800 border-slate-700 text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {feedbackStatus === 'SUCCESS' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold text-xs uppercase tracking-wider">
                        {lastResult.action === 'ENTRY_RECORDED' || lastResult.action === 'EXIT_RECORDED'
                          ? '✓ ATTENDENCE MARKED'
                          : lastResult.action === 'NO_ACTIVE_SESSION'
                          ? 'NO ACTIVE ATTENDANCE SESSION'
                          : 'ATTENDANCE NOTICE'}
                      </div>
                      <div className="text-[11px] opacity-80 mt-0.5">
                        {lastResult.message}
                      </div>
                    </div>
                  </div>

                  {/* Exit specifics: Entry, Exit, Duration */}
                  {lastResult.action === 'EXIT_RECORDED' && lastResult.attendance && (
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-emerald-500/30 text-center">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase">Entry</div>
                        <div className="text-xs font-mono font-bold text-white">
                          {lastResult.attendance.entry_time || '--'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase">Exit</div>
                        <div className="text-xs font-mono font-bold text-white">
                          {lastResult.attendance.exit_time || '--'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase">Worked</div>
                        <div className="text-xs font-mono font-bold text-emerald-400">
                          {lastResult.attendance.duration_formatted}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Entry specifics */}
                  {lastResult.action === 'ENTRY_RECORDED' && (
                    <div className="mt-2.5 pt-2 border-t border-emerald-500/30 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Timestamp:</span>
                      <span className="font-mono font-bold text-emerald-300">
                        {lastResult.attendance?.entry_time || currentTime}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Idle state */
              <div className="py-10 text-center space-y-3 text-slate-500">
                <div className="w-14 h-14 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-300">Awaiting Staff Detection</div>
                  <p className="text-[11px] text-slate-500 max-w-[220px] mx-auto mt-1">
                    Approach camera to record {mode.toLowerCase()} attendance.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Guidance Box */}
          <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800/80 space-y-2 text-xs text-slate-400">
            <div className="flex items-center space-x-2 text-teal-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Contactless Biometric Instructions</span>
            </div>
            <ul className="space-y-1 text-[11px] list-disc list-inside text-slate-400">
              <li>Select <strong className="text-slate-200">ENTRY</strong> upon arrival or <strong className="text-slate-200">EXIT</strong> at end of shift.</li>
              <li>Position face in the reticle with good ambient light.</li>
              <li>Wait 1 second for the confirmation chime.</li>
            </ul>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-500 text-[11px]">
        <div>
          HospitalAI Workforce Biometrics • Authorized Hospital Personnel Only
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={onOpenAdminLogin}
            className="hover:text-teal-400 flex items-center space-x-1"
          >
            <Lock className="w-3 h-3" />
            <span>Administrator Access</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
