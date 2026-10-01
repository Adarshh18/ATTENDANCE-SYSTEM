import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Trash2, RefreshCw, X, Link as LinkIcon, Check } from 'lucide-react';
import { StaffAvatar } from '../common/StaffAvatar';

interface StaffImageUploaderProps {
  currentImageUrl?: string;
  staffName?: string;
  onImageSelected: (base64OrUrl: string) => void;
  onImageRemoved: () => void;
}

export const StaffImageUploader: React.FC<StaffImageUploaderProps> = ({
  currentImageUrl,
  staffName = 'Staff Member',
  onImageSelected,
  onImageRemoved,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'camera' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Resize and compress uploaded or captured image
  const compressImage = (dataUrl: string, maxDim: number = 320): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPEG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawDataUrl = event.target?.result as string;
      if (rawDataUrl) {
        const compressed = await compressImage(rawDataUrl);
        onImageSelected(compressed);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Start webcam for instant snap
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.warn);
      }
      setIsCameraActive(true);
    } catch (err: any) {
      setCameraError(err.message || 'Camera access denied or unavailable');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleCapturePhoto = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontal if front camera
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    const rawData = canvas.toDataURL('image/jpeg', 0.9);
    const compressed = await compressImage(rawData);
    onImageSelected(compressed);
    stopCamera();
    setActiveTab('upload');
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    onImageSelected(urlInput.trim());
    setUrlInput('');
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
          <span>Staff Profile Photo</span>
          <span className="text-[11px] font-normal text-slate-500">(Optional • No default photo)</span>
        </label>
        {currentImageUrl && (
          <button
            type="button"
            onClick={onImageRemoved}
            className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center space-x-1"
          >
            <Trash2 className="w-3 h-3" />
            <span>Remove Photo</span>
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Current / Preview Avatar */}
        <div className="shrink-0 flex flex-col items-center">
          <StaffAvatar
            name={staffName || 'Staff'}
            avatarUrl={currentImageUrl}
            size="lg"
            className="border-2 border-white shadow-md ring-2 ring-teal-500/30"
          />
          <span className="text-[10px] text-slate-400 font-medium mt-1">
            {currentImageUrl ? 'Photo Set' : 'Initials Fallback'}
          </span>
        </div>

        {/* Input Methods Tabs */}
        <div className="flex-1 w-full space-y-2.5">
          <div className="flex rounded-xl bg-slate-200/80 p-0.5 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setActiveTab('upload');
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                activeTab === 'upload' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload File</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('camera');
                startCamera();
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                activeTab === 'camera' ? 'bg-white text-teal-700 font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Take Photo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                stopCamera();
                setActiveTab('url');
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                activeTab === 'url' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Image URL</span>
            </button>
          </div>

          {/* Upload File Panel */}
          {activeTab === 'upload' && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 px-3 border border-dashed border-teal-500/60 rounded-xl bg-teal-50/50 hover:bg-teal-50 text-teal-800 text-xs font-semibold flex items-center justify-center space-x-2 transition-colors"
              >
                <Upload className="w-4 h-4 text-teal-600" />
                <span>Choose photo from device (PNG, JPG)</span>
              </button>
            </div>
          )}

          {/* Camera Capture Panel */}
          {activeTab === 'camera' && (
            <div className="space-y-2">
              <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 max-h-40 flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                {!isCameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center text-xs text-slate-400 bg-slate-950/80">
                    <p>{cameraError || 'Starting webcam...'}</p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="mt-1 px-3 py-1 bg-teal-600 text-white rounded-lg text-[11px]"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>

              {isCameraActive && (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    className="flex-1 py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center space-x-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Snap & Use Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="p-1.5 text-slate-500 hover:text-slate-700 rounded-xl bg-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* URL Input Panel */}
          {activeTab === 'url' && (
            <div className="flex items-center space-x-1.5">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                disabled={!urlInput.trim()}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl"
              >
                Set
              </button>
            </div>
          )}
        </div>
      </div>
      <p className="text-[11px] text-slate-500 italic">
        Note: Unlike before, no default/stock picture of a stranger is ever added. If no photo is provided, the staff member&apos;s initials will cleanly represent them.
      </p>
    </div>
  );
};
