import React, { useState, useEffect } from 'react';
import { ScanFace, Fingerprint, Lock, ShieldCheck } from 'lucide-react';
import { cn } from '../utils';
import { NativeBiometric } from '@capacitor-community/native-biometric';

interface LoginPageProps {
  onLogin: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  // Check if biometrics are available on mount
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const result = await NativeBiometric.isAvailable();
        setIsAvailable(result.isAvailable);
      } catch (e) {
        console.log("Biometric check failed or plugin not installed", e);
        setIsAvailable(false);
      }
    };
    checkAvailability();
  }, []);

  const handleBiometricLogin = async () => {
    setError('');
    setIsProcessing(true);

    try {
      const result = await NativeBiometric.isAvailable();

      if (!result.isAvailable) {
        setError("Biometrics not set up or not available on this device. 此裝置未設定生物辨識。");
        setIsProcessing(false);
        return;
      }

      const verified = await NativeBiometric.verifyIdentity({
        reason: "Access your IronLog workout history",
        title: "IronLog Login",
        subtitle: "Log in",
        description: "Please use Face ID or Touch ID to continue",
      });

      if (verified) {
        onLogin();
      } else {
        setError("Verification failed.");
      }
    } catch (err: any) {
      console.error(err);
      // Handle user cancellation or errors
      if (err?.message?.includes('Cancel') || err?.code === 10 || err?.code === 13) {
         // User cancelled, do nothing specific
      } else {
         setError("Authentication failed. Please try again or use password.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = () => {
    // Fallback for dev/testing
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
            disabled={isProcessing}
            className={cn(
              "group relative w-full h-16 bg-gradient-to-r from-primary to-emerald-600 rounded-2xl flex items-center justify-center gap-3 text-white font-semibold text-lg shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]",
              isProcessing && "opacity-80 cursor-wait",
              !isAvailable && "opacity-50 grayscale"
            )}
          >
            <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm group-hover:bg-white/30 transition-colors">
              <ScanFace size={24} />
            </div>
            <span>{isProcessing ? "Verifying..." : "Login with FaceID"}</span>
          </button>

          <button
             onClick={handleBiometricLogin} // In a real app, this might toggle a password field
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

        {/* Dev Skip Link */}
        <div className="pt-8">
           <button onClick={handleSkip} className="text-xs text-slate-700 hover:text-slate-500 underline decoration-slate-800">
             Developer Skip (No Auth) 開發者略過
           </button>
        </div>

        <p className="text-slate-600 text-xs mt-8">
          Protected by device biometrics.<br/>受裝置生物辨識保護。
        </p>
      </div>
    </div>
  );
};