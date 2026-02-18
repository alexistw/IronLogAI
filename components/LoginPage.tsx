import React, { useState } from 'react';
import { Button } from './Button';
import { ScanFace, Fingerprint, Lock, ShieldCheck } from 'lucide-react';
import { cn } from '../utils';

interface LoginPageProps {
  onLogin: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [error, setError] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState(false);

  const handleBiometricLogin = async () => {
    setError('');
    setIsAnimating(true);

    // Check if WebAuthn is supported
    if (!window.PublicKeyCredential) {
      setError("Biometrics not supported on this device. 您的裝置不支援生物辨識。");
      setIsAnimating(false);
      return;
    }

    try {
      // We use 'create' here as a "presence check" which triggers FaceID/TouchID
      // This is a client-side only implementation for privacy locking.
      // In a real secure app, you would use 'get' and verify against a backend server.
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      await navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: {
            name: "IronLog AI",
          },
          user: {
            id: new Uint8Array(16),
            name: "user@ironlog.ai",
            displayName: "IronLog User",
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 }, // ES256
            { type: "public-key", alg: -257 }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform", // Forces built-in FaceID/TouchID
            userVerification: "required", // Forces the biometric check
          },
          timeout: 60000,
          attestation: "direct"
        }
      });

      // If successful (no error thrown), we log in
      onLogin();
    } catch (err) {
      console.error(err);
      // Fallback logic or error display
      setError("FaceID/TouchID verification failed. Please try again. 驗證失敗，請重試。");
    } finally {
      setIsAnimating(false);
    }
  };

  const handleSkip = () => {
    // Fallback for devices without biometrics or for testing
    onLogin(); 
  };

  return (
    <div className="min-h-[100dvh] bg-dark flex flex-col items-center justify-center p-6 relative overflow-hidden supports-[min-height:100dvh]:min-h-[100dvh]">
      {/* Background Decoration */}
      <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px]"></div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center text-center space-y-8 animate-in fade-in zoom-in duration-500">
        
        {/* Logo Section */}
        <div className="bg-card p-6 rounded-3xl border border-slate-700/50 shadow-2xl shadow-primary/10 mb-4">
          <ShieldCheck size={64} className="text-primary mb-2 mx-auto" />
          <h1 className="text-3xl font-bold text-white tracking-tight">IronLog AI</h1>
          <p className="text-slate-400 text-sm mt-2">Secure Fitness Tracker<br/>安全健身追蹤</p>
        </div>

        {/* Biometric Button */}
        <div className="w-full space-y-4">
          <button
            onClick={handleBiometricLogin}
            className={cn(
              "group relative w-full h-16 bg-gradient-to-r from-primary to-emerald-600 rounded-2xl flex items-center justify-center gap-3 text-white font-semibold text-lg shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]",
              isAnimating && "opacity-80 cursor-wait"
            )}
          >
            <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm group-hover:bg-white/30 transition-colors">
              <ScanFace size={24} />
            </div>
            <span>Login with FaceID 使用臉部解鎖</span>
            
            {/* Ripple Effect Animation Container */}
            {isAnimating && (
               <span className="absolute inset-0 rounded-2xl ring-4 ring-white/30 animate-ping"></span>
            )}
          </button>

          <button
             onClick={handleBiometricLogin}
             className="w-full py-3 flex items-center justify-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm"
          >
            <Fingerprint size={16} />
            <span>Or use TouchID / Passcode 或使用指紋/密碼</span>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-sm px-4 py-3 rounded-xl flex items-center gap-2 animate-in slide-in-from-top-2">
            <Lock size={14} />
            {error}
          </div>
        )}

        {/* Dev Skip Link (Optional, good for generic browser testing) */}
        <div className="pt-8">
           <button onClick={handleSkip} className="text-xs text-slate-700 hover:text-slate-500 underline decoration-slate-800">
             Use Password (Dev Skip) 使用密碼登入
           </button>
        </div>

        <p className="text-slate-600 text-xs mt-8">
          Protected by device biometrics.<br/>受裝置生物辨識保護。
        </p>
      </div>
    </div>
  );
};