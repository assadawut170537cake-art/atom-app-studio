import React, { useState } from 'react';
import { X, Download, Smartphone, Laptop, Check, AlertCircle, Share2, PlusSquare, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'apk' | 'pwa' | 'ios'>('apk');
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const handlePWAInstall = async () => {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => {
        setInstallSuccess(false);
        onClose();
      }, 2000);
    }
  };

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-dswb23dssu32xbecr6dnh7-665026632490.asia-southeast1.run.app';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-cyan-500/40 bg-[#0c1220] p-5 shadow-2xl shadow-cyan-950/60 text-slate-200 font-sans max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold font-tech tracking-wide text-white">
                คู่มือการติดตั้งแอป ATOM (อะตอม)
              </h2>
              <p className="text-[11px] text-slate-400">เลือกรูปแบบที่บอสสะดวกในการติดตั้งได้เลยครับ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 mt-3">
          <button
            onClick={() => setActiveTab('apk')}
            className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'apk'
                ? 'border-cyan-400 text-cyan-300 font-semibold bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>ติดตั้งจากไฟล์ APK</span>
          </button>
          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'pwa'
                ? 'border-cyan-400 text-cyan-300 font-semibold bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>ติดตั้งทันที 1 คลิก (PWA)</span>
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'ios'
                ? 'border-cyan-400 text-cyan-300 font-semibold bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>iPhone / iOS</span>
          </button>
        </div>

        {/* Tab 1: ติดตั้งจากไฟล์ APK */}
        {activeTab === 'apk' && (
          <div className="space-y-3.5 py-4 text-xs leading-relaxed">
            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30">
              <span className="font-semibold text-cyan-300 block mb-1">
                ไฟล์ APK ของบอสอยู่ที่:
              </span>
              <code className="text-[11px] font-mono text-slate-300 bg-black/50 px-2 py-1 rounded block truncate">
                C:\Users\CJN_assadawut17\Desktop\ATOM_Mobile_Ready_To_Install.apk
              </code>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs shrink-0">1</span>
                <div>
                  <strong className="text-slate-100">นำไฟล์ APK ลงโทรศัพท์มือถือ Android:</strong>
                  <p className="text-slate-400 mt-0.5">
                    เสียบสาย USB จากคอมไปยังมือถือ แล้วคัดลอกไฟล์ หรือส่งผ่าน LINE / Google Drive / Telegram เข้ามือถือ
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs shrink-0">2</span>
                <div>
                  <strong className="text-slate-100">แตะไฟล์เพื่อกดติดตั้ง (Install):</strong>
                  <p className="text-slate-400 mt-0.5">
                    เปิดแอปจัดการไฟล์ (Files) ในมือถือ แล้วแตะที่ <code className="text-cyan-300 font-mono">ATOM_Mobile_Ready_To_Install.apk</code> เพื่อทำการติดตั้ง
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs shrink-0">3</span>
                <div>
                  <strong className="text-slate-100">เปิดสิทธิ์ติดตั้งจากแหล่งไม่รู้จัก:</strong>
                  <p className="text-slate-400 mt-0.5">
                    หากมือถือแจ้งเตือนความปลอดภัย ให้เลือก <em>"อนุญาตให้ติดตั้งแอปจากแหล่งที่ไม่รู้จัก" (Allow Unknown Sources)</em>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs shrink-0">4</span>
                <div>
                  <strong className="text-slate-100">เชื่อมต่อกับระบบ Backend:</strong>
                  <p className="text-slate-400 mt-0.5">
                    แอปจะเชื่อมต่อกับเซิร์ฟเวอร์ ATOM ผ่าน URL:
                  </p>
                  <code className="text-[11px] font-mono text-cyan-300 bg-black/40 px-2 py-0.5 rounded mt-1 block truncate">
                    {appUrl}/command
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: ติดตั้งทันที 1 คลิก (PWA Web App) */}
        {activeTab === 'pwa' && (
          <div className="space-y-4 py-4 text-xs">
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-cyan-950/40 to-slate-900 border border-cyan-500/40">
              <h4 className="font-semibold text-sm text-cyan-300 mb-1 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>ติดตั้งลงหน้าจอมือถือได้ทันที (ไม่ต้องผ่านไฟล์ APK)</span>
              </h4>
              <p className="text-slate-300 text-xs leading-relaxed">
                ระบบนี้เป็น Progressive Web App (PWA) เต็มรูปแบบ สามารถติดตั้งเป็นไอคอนแอปบนหน้าจอมือถือ/แท็บเล็ต/คอมพิวเตอร์ และเปิดใช้งานแบบ Full Screen ไร้กรอบเบราว์เซอร์ได้ทันทีครับ
              </p>
            </div>

            {isInstalled ? (
              <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>แอป ATOM ได้รับการติดตั้งบนเครื่องนี้เรียบร้อยแล้วครับบอส!</span>
              </div>
            ) : isInstallable ? (
              <button
                onClick={handlePWAInstall}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-xl shadow-cyan-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>กดเพื่อติดตั้งแอป ATOM ลงบนหน้าจอทันที (1 คลิก)</span>
              </button>
            ) : (
              <div className="space-y-2 p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <strong className="text-slate-200 block">วิธีติดตั้งบนเบราว์เซอร์ Android (Chrome):</strong>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1">
                  <li>เปิดลิงก์นี้ในเบราว์เซอร์ Chrome บนมือถือ</li>
                  <li>แตะที่จุด 3 จุด (⋮) ที่มุมขวาบน</li>
                  <li>เลือกเมนู <strong>"เพิ่มไปยังหน้าจอหลัก"</strong> หรือ <strong>"ติดตั้งแอป"</strong> (Install App)</li>
                  <li>ไอคอน ATOM จะปรากฏบนหน้าจอโทรศัพท์เหมือนแอปทั่วไปทันทีครับ!</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: iPhone / iOS */}
        {activeTab === 'ios' && (
          <div className="space-y-3.5 py-4 text-xs leading-relaxed">
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2.5">
              <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-cyan-400" />
                <span>ขั้นตอนการติดตั้งบน iPhone / iPad (Safari):</span>
              </h4>

              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-black/30">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs shrink-0">1</span>
                <p className="text-slate-200">
                  เปิดลิงก์นี้ในแอป <strong>Safari</strong> บน iPhone
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-black/30">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs shrink-0">2</span>
                <p className="text-slate-200">
                  แตะที่ปุ่ม <strong>แชร์ (Share)</strong> ที่แถบด้านล่าง (ไอคอนสี่เหลี่ยมมีลูกศรชี้ขึ้น)
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-black/30">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs shrink-0">3</span>
                <p className="text-slate-200">
                  เลื่อนลงมาแล้วเลือก <strong>"เพิ่มไปยังหน้าจอหลัก" (Add to Home Screen)</strong>
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-black/30">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs shrink-0">4</span>
                <p className="text-slate-200">
                  แตะ <strong>"เพิ่ม" (Add)</strong> มุมขวาบน เป็นอันเสร็จสิ้นครับ!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
