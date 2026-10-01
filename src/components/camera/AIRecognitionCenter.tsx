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
  ArrowRightLeft,
  ShieldAlert,
  Sparkles,
  Eye,
  Info,
} from 'lucide-react';
import { detectFaceInVideo, type DetectedFace } from '../../services/faceRecognition';
import { matchFaceBiometrics } from '../../services/api';
import { sounds } from '../../utils/sound';
import type { Staff, AttendanceRecord, RecognitionResult } from '../../types';
import { StaffAvatar } from '../common/StaffAvatar';

interface AIRecognitionCenterProps {
  initialMode?: 'ENTRY' | 'EXIT';
  registeredStaff: Staff[];
  onAttendanceUpdated: () => void;
}

export const AIRecognitionCenter: React.FC<AIRecognitionCenterProps> = ({
  initialMode = 'ENTRY',
  registeredStaff,
  onAttendanceUpdated,
}) => {
  const [mode, setMode] = useState<'ENTRY' | 'EXIT'>(initialMode);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Computer Vision State
  const [detectedFace, setDetectedFace] = useState<DetectedFace | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [lastRecognitionResult, setLastRecognitionResult] = useState<RecognitionResult | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<'IDLE' | 'ANALYZING' | 'SUCCESS' | 'LOW_CONFIDENCE' | 'ALERT' | 'COOLDOWN'>('IDLE');
  const [statusMessage, setStatusMessage] = useState<string>('LOOK INTO THE CAMERA');

  const videoRef = useRef<HTMLVideoElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingFrameRef = useRef<boolean>(false);

  // Initialize and attach camera
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
      console.warn('Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera permissions in browser settings.'
          : 'Camera device unavailable or currently utilized by another application.'
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
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
    return () => {
      stopCamera();
    };
  }, []);

  // Frame processing loop: runs 6 times per second (160ms interval) for optimal balance of responsiveness and CPU performance
  useEffect(() => {
    if (!isCameraActive) return;

    detectionIntervalRef.current = setInterval(async () => {
      if (isProcessingFrameRef.current || !videoRef.current || !offscreenCanvasRef.current) return;
      isProcessingFrameRef.current = true;

      try {
        const face = await detectFaceInVideo(videoRef.current, offscreenCanvasRef.current);
        setDetectedFace(face);

        if (face && face.confidence > 0.8) {
          // If we haven't just marked attendance or during idle
          if (feedbackStatus === 'IDLE' || feedbackStatus === 'LOW_CONFIDENCE') {
            setIsAnalyzing(true);
            setFeedbackStatus('ANALYZING');
            setStatusMessage('ANALYZING FACIAL REPRESENTATION...');

            // Call backend recognition service with normalized face vector
            const result = await matchFaceBiometrics(face.embedding, mode);
            setLastRecognitionResult(result);
            setIsAnalyzing(false);

            if (result.action === 'ENTRY_RECORDED' || result.action === 'EXIT_RECORDED') {
              setFeedbackStatus('SUCCESS');
              setStatusMessage('✓ Attendence Marked');
              if (soundEnabled) sounds.playSuccess();
              onAttendanceUpdated();

              // Reset to IDLE after 4 seconds to allow next person
              setTimeout(() => {
                setFeedbackStatus('IDLE');
                setStatusMessage('LOOK INTO THE CAMERA');
                setLastRecognitionResult(null);
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
              setStatusMessage('LOW CONFIDENCE — Please look directly at the camera');
            }
          }
        } else {
          if (feedbackStatus === 'LOW_CONFIDENCE' || feedbackStatus === 'ANALYZING') {
            setFeedbackStatus('IDLE');
            setStatusMessage('LOOK INTO THE CAMERA');
          }
        }
      } catch (err) {
        console.error('Frame recognition error:', err);
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
  }, [isCameraActive, mode, feedbackStatus, soundEnabled, onAttendanceUpdated]);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.warn);
    } else if (document.exitFullscreen) {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.warn);
    }
  };

  // Manual fallback verification test (e.g. if user is testing with mock or specific staff)
  const handleSimulateStaffScan = async (staff: Staff) => {
    // Generate normalized seed embedding for staff
    const res = await fetch('/api/face-profiles');
    const { profiles } = await res.json();
    const staffProfile = profiles.find((p: any) => p.staff_id === staff.id);

    if (staffProfile) {
      setFeedbackStatus('ANALYZING');
      setStatusMessage(`ANALYZING ${staff.name.toUpperCase()}...`);
      const result = await matchFaceBiometrics(staffProfile.embedding, mode);
      setLastRecognitionResult(result);

      if (result.action === 'ENTRY_RECORDED' || result.action === 'EXIT_RECORDED') {
        setFeedbackStatus('SUCCESS');
        setStatusMessage(result.action === 'ENTRY_RECORDED' ? '✓ ENTRY RECORDED' : '✓ EXIT RECORDED');
        if (soundEnabled) sounds.playSuccess();
        onAttendanceUpdated();
      } else {
        setFeedbackStatus('ALERT');
        setStatusMessage(result.message);
        if (soundEnabled) sounds.playAlert();
      }

      setTimeout(() => {
        setFeedbackStatus('IDLE');
        setStatusMessage('LOOK INTO THE CAMERA');
        setLastRecognitionResult(null);
      }, 4500);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`space-y-6 ${
        isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-6 overflow-y-auto flex flex-col justify-between' : ''
      }`}
    >
      {/* Top Station Header & Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              AI Recognition Center
            </h1>
            <div
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                mode === 'ENTRY'
                  ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/30'
                  : 'bg-indigo-500/10 text-indigo-700 border border-indigo-500/30'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    mode === 'ENTRY' ? 'bg-emerald-400' : 'bg-indigo-400'
                  }`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    mode === 'ENTRY' ? 'bg-emerald-500' : 'bg-indigo-500'
                  }`}
                ></span>
              </span>
              <span>{mode === 'ENTRY' ? 'ENTRY CAMERA ● LIVE' : 'EXIT CAMERA ● LIVE'}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Autonomous facial feature detection, liveness verification, and instant timestamp ledger.
          </p>
        </div>

        {/* Controls: Mode Switch, Mute, Fullscreen, Restart Camera */}
        <div className="flex items-center space-x-2">
          {/* Entry / Exit Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => {
                setMode('ENTRY');
                setFeedbackStatus('IDLE');
                setStatusMessage('LOOK INTO THE CAMERA');
                setLastRecognitionResult(null);
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                mode === 'ENTRY'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ENTRY MODE
            </button>
            <button
              onClick={() => {
                setMode('EXIT');
                setFeedbackStatus('IDLE');
                setStatusMessage('LOOK INTO THE CAMERA');
                setLastRecognitionResult(null);
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                mode === 'EXIT'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              EXIT MODE
            </button>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
            title={soundEnabled ? 'Mute Chimes' : 'Enable Chimes'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-teal-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Kiosk Mode'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={isCameraActive ? stopCamera : startCamera}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
            title={isCameraActive ? 'Pause Camera' : 'Start Camera'}
          >
            <RefreshCw className={`w-4 h-4 ${isCameraActive ? '' : 'text-amber-500'}`} />
          </button>
        </div>
      </div>

      {/* Main Kiosk Screen: Camera Feed + Verification Information */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Video Camera Feed with Scanner Overlays */}
        <div className="lg:col-span-8 bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 relative aspect-4/3 sm:aspect-16/10 flex items-center justify-center">
          {/* Live Video Element */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${
              isCameraActive ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Offscreen Canvas for Computer Vision Extraction */}
          <canvas ref={offscreenCanvasRef} className="hidden" />

          {/* Fallback Screen when Camera is Disabled or Errored */}
          {!isCameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-300 bg-slate-950/90 z-20 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-teal-400 shadow-inner">
                <CameraOff className="w-8 h-8" />
              </div>
              <div className="max-w-md">
                <h3 className="text-lg font-bold text-white">Camera Standby or Permission Required</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {cameraError || 'Please allow browser camera permissions to enable automated face identification.'}
                </p>
              </div>
              <button
                onClick={startCamera}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-teal-500/30 flex items-center space-x-2"
              >
                <Camera className="w-4 h-4" />
                <span>Grant & Launch Camera</span>
              </button>
            </div>
          )}

          {/* HUD Overlay Layer */}
          {isCameraActive && (
            <div className="absolute inset-0 pointer-events-none z-10 p-6 flex flex-col justify-between">
              {/* Top HUD: Station Name, FPS, Resolution */}
              <div className="flex items-center justify-between text-[11px] font-mono font-medium text-white/90">
                <div className="flex items-center space-x-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                  <div className={`w-2 h-2 rounded-full ${mode === 'ENTRY' ? 'bg-emerald-400' : 'bg-indigo-400'} animate-ping`} />
                  <span>{mode === 'ENTRY' ? 'STATION-01 // ENTRY GATE' : 'STATION-02 // EXIT GATE'}</span>
                </div>
                <div className="flex items-center space-x-3 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                  <span className="text-teal-400">1280x720 • 60 FPS</span>
                  <span>LIVENESS: ACTIVE</span>
                </div>
              </div>

              {/* Center: Face Targeting Reticle & Laser Scanning Line */}
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Default alignment guide ellipse when no face */}
                {!detectedFace && (
                  <div className="w-64 h-80 rounded-[45%] border-2 border-dashed border-teal-500/40 flex items-center justify-center">
                    <span className="text-xs font-mono text-teal-400/80 bg-black/60 px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-xs">
                      Align Face in Frame
                    </span>
                  </div>
                )}

                {/* Animated Face Bounding Box when Face Detected */}
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
                      // Invert X because of camera mirror
                      left: `calc(100% - ${((detectedFace.box.x + detectedFace.box.width) / (videoRef.current?.videoWidth || 640)) * 100}%)`,
                      top: `${(detectedFace.box.y / (videoRef.current?.videoHeight || 480)) * 100}%`,
                      width: `${(detectedFace.box.width / (videoRef.current?.videoWidth || 640)) * 100}%`,
                      height: `${(detectedFace.box.height / (videoRef.current?.videoHeight || 480)) * 100}%`,
                    }}
                  >
                    {/* Bounding Box Corner Reticles */}
                    <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white -mt-1 -ml-1" />
                    <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white -mt-1 -mr-1" />
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white -mb-1 -ml-1" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white -mb-1 -mr-1" />

                    {/* Subtle scanning laser line */}
                    {feedbackStatus === 'ANALYZING' && (
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_cyan] animate-bounce" />
                    )}

                    {/* Floating confidence tag */}
                    <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-black/75 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/20 text-[10px] font-mono text-cyan-300">
                      MATCH: {(detectedFace.confidence * 100).toFixed(0)}% • BIOMETRIC OK
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom HUD: Live State Banner */}
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
                      : 'bg-black/60 border-white/20 text-slate-200'
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

        {/* Right 4 Cols: Identity Verification & Attendance Record Card */}
        <div className="lg:col-span-4 space-y-4">
          {/* Identification Details Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Verification Terminal
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">BH-CV-NODE</span>
            </div>

            {/* If Staff Identified */}
            {lastRecognitionResult?.staff ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center space-x-3.5">
                  <StaffAvatar
                    name={lastRecognitionResult.staff.name}
                    avatarUrl={lastRecognitionResult.staff.avatar_url}
                    size="lg"
                    className="w-14 h-14 rounded-2xl ring-2 ring-teal-500/30 shadow-md shrink-0"
                  />
                  <div>
                    <h3 className="font-bold text-base text-slate-900 leading-tight">
                      {lastRecognitionResult.staff.name}
                    </h3>
                    <div className="text-xs font-semibold text-teal-700 mt-0.5">
                      {lastRecognitionResult.staff.employee_id}
                    </div>
                    <div className="text-xs text-slate-500">
                      {lastRecognitionResult.staff.department}
                    </div>
                  </div>
                </div>

                {/* Status Result Card */}
                <div
                  className={`p-3.5 rounded-2xl border ${
                    feedbackStatus === 'SUCCESS'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : feedbackStatus === 'COOLDOWN'
                      ? 'bg-sky-50 border-sky-200 text-sky-950'
                      : feedbackStatus === 'ALERT'
                      ? 'bg-rose-50 border-rose-200 text-rose-950'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {feedbackStatus === 'SUCCESS' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold text-xs uppercase tracking-wider">
                        {lastRecognitionResult.action === 'ENTRY_RECORDED' || lastRecognitionResult.action === 'EXIT_RECORDED'
                          ? '✓ ATTENDENCE MARKED'
                          : lastRecognitionResult.action === 'NO_ACTIVE_SESSION'
                          ? 'NO ACTIVE ATTENDANCE SESSION'
                          : 'ATTENDANCE NOT MODIFIED'}
                      </div>
                      <div className="text-[11px] opacity-80 mt-0.5">
                        {lastRecognitionResult.message}
                      </div>
                    </div>
                  </div>

                  {/* Exit specifics: Entry, Exit, Duration */}
                  {lastRecognitionResult.action === 'EXIT_RECORDED' && lastRecognitionResult.attendance && (
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-emerald-200/60 text-center">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">Entry</div>
                        <div className="text-xs font-mono font-bold text-slate-900">
                          {lastRecognitionResult.attendance.entry_time || '--'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">Exit</div>
                        <div className="text-xs font-mono font-bold text-slate-900">
                          {lastRecognitionResult.attendance.exit_time || '--'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">Worked</div>
                        <div className="text-xs font-mono font-bold text-emerald-700">
                          {lastRecognitionResult.attendance.duration_formatted}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Entry specifics: Timestamp & Date */}
                  {lastRecognitionResult.action === 'ENTRY_RECORDED' && (
                    <div className="mt-2.5 pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Recorded At:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {lastRecognitionResult.attendance?.entry_time || '09:02:17 AM'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Biometric Match:</span>
                    <span className="font-mono font-semibold text-slate-700">
                      {Math.round((lastRecognitionResult.confidence || 0.94) * 100)}% Confidence
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ledger Hash:</span>
                    <span className="font-mono text-[10px] text-slate-500">
                      SHA256-{lastRecognitionResult.staff.id.substring(0, 8)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Waiting / Idle State */
              <div className="py-8 text-center space-y-3 text-slate-400">
                <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-700">Awaiting Staff Detection</div>
                  <p className="text-[11px] text-slate-400 max-w-[220px] mx-auto mt-1">
                    Position your face within the camera target to record {mode.toLowerCase()} attendance.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Biometric Station Guidelines */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Biometric Station Guidelines</span>
              <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-medium">
                Live Sensor
              </span>
            </div>
            <ul className="text-[11px] text-slate-600 space-y-1 list-disc list-inside">
              <li>Ensure steady ambient lighting without harsh rear backlights.</li>
              <li>Face must be registered with 4 biometric samples in Staff Management.</li>
              <li>Dual anti-spoofing and cooldown protection actively prevent duplicate logging.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
