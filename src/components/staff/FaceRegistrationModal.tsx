import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  CheckCircle2,
  X,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { detectFaceInVideo, aggregateRegistrationSamples, type DetectedFace } from '../../services/faceRecognition';
import { registerStaffFace } from '../../services/api';
import { sounds } from '../../utils/sound';
import type { Staff } from '../../types';

interface FaceRegistrationModalProps {
  staff: Staff;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const FaceRegistrationModal: React.FC<FaceRegistrationModalProps> = ({
  staff,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0); // 0 to 4
  const [capturedSamples, setCapturedSamples] = useState<number[][]>([]);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [detectedFace, setDetectedFace] = useState<DetectedFace | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionLoopRef = useRef<NodeJS.Timeout | null>(null);

  const sampleInstructions = [
    { title: 'Sample 1: Direct Frontal', desc: 'Look directly straight into the camera with a neutral expression.' },
    { title: 'Sample 2: Natural Expression', desc: 'Maintain eye contact and smile gently or relax facial muscles.' },
    { title: 'Sample 3: Slight Head Angle', desc: 'Turn head 5-10 degrees slightly to the left or right.' },
    { title: 'Sample 4: Confirmation Sample', desc: 'Return to center for final spatial alignment and biometric capture.' },
  ];

  // Start video stream
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    async function initCamera() {
      try {
        setErrorMsg(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false,
        });
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.warn);
        }
      } catch (err: any) {
        setErrorMsg('Camera access is required for biometric face registration.');
      }
    }

    initCamera();

    // Detection loop for live face reticle
    detectionLoopRef.current = setInterval(async () => {
      if (videoRef.current && canvasRef.current && videoRef.current.readyState >= 2) {
        const face = await detectFaceInVideo(videoRef.current, canvasRef.current);
        setDetectedFace(face);
      }
    }, 200);

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (detectionLoopRef.current) {
        clearInterval(detectionLoopRef.current);
      }
    };
  }, [isOpen]);

  const handleCaptureSample = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsCapturing(true);

    const face = await detectFaceInVideo(videoRef.current, canvasRef.current);
    if (!face || face.confidence < 0.75) {
      setErrorMsg('No clear face detected. Please ensure good lighting and position face within the frame.');
      setIsCapturing(false);
      return;
    }

    setErrorMsg(null);
    sounds.playSuccess();

    const newSamples = [...capturedSamples, face.embedding];
    setCapturedSamples(newSamples);
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    setIsCapturing(false);

    // If all 4 samples collected, aggregate & submit to backend
    if (nextStep >= 4) {
      setIsSubmitting(true);
      try {
        const masterEmbedding = aggregateRegistrationSamples(newSamples);
        await registerStaffFace(staff.id, masterEmbedding, 4);
        sounds.playSuccess();
        setTimeout(() => {
          setIsSubmitting(false);
          onSuccess();
          onClose();
        }, 1200);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to save biometric profile.');
        setIsSubmitting(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-base text-slate-900">Register Biometric Face</h3>
            <p className="text-xs text-slate-500">
              Staff: <span className="font-semibold text-slate-800">{staff.name}</span> ({staff.employee_id})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Camera View with Oval Reticle */}
        <div className="p-5 space-y-4">
          <div className="relative aspect-4/3 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover transform -scale-x-100"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Oval Face Guide */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div
                className={`w-48 h-64 rounded-[50%] border-2 border-dashed transition-colors ${
                  detectedFace ? 'border-emerald-400 bg-emerald-500/10' : 'border-teal-400/50'
                }`}
              />
            </div>

            {/* Live Status Tag */}
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] font-mono text-white flex items-center space-x-1.5">
              <div className={`w-2 h-2 rounded-full ${detectedFace ? 'bg-emerald-400' : 'bg-amber-400'} animate-ping`} />
              <span>{detectedFace ? 'FACE POSITION OK' : 'ALIGN FACE'}</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 4-Sample Progress Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Biometric Samples ({currentStep}/4)</span>
              <span>{Math.round((currentStep / 4) * 100)}% Complete</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((stepIdx) => {
                const isDone = stepIdx < currentStep;
                const isCurrent = stepIdx === currentStep;
                return (
                  <div
                    key={stepIdx}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      isDone
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : isCurrent
                        ? 'bg-teal-50 border-teal-400 text-teal-900 ring-2 ring-teal-400/20'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <span className="text-xs font-bold">{stepIdx + 1}</span>
                      )}
                    </div>
                    <div className="text-[10px] font-medium leading-none">
                      {isDone ? 'Sample ✓' : `Sample ${stepIdx + 1}`}
                    </div>
                  </div>
                );
              })}
            </div>

            {currentStep < 4 && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-left">
                <div className="text-xs font-bold text-slate-800">{sampleInstructions[currentStep]?.title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{sampleInstructions[currentStep]?.desc}</div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            {currentStep < 4 ? (
              <button
                onClick={handleCaptureSample}
                disabled={isCapturing || !detectedFace}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold flex items-center space-x-2 shadow-sm shadow-teal-600/30"
              >
                {isCapturing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                <span>Capture Sample {currentStep + 1}</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2 text-emerald-700 font-bold text-xs">
                <Sparkles className="w-4 h-4 animate-spin text-emerald-500" />
                <span>Aggregating Normalized Biometrics...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
