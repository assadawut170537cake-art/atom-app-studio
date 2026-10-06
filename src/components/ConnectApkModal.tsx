import React, { useState } from 'react';
import { X, Smartphone, Copy, Check, Terminal, Play, Server, Zap, Radio, Globe, Shield, Code2 } from 'lucide-react';

interface ConnectApkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectApkModal: React.FC<ConnectApkModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'kotlin' | 'rest'>('kotlin');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedKotlin, setCopiedKotlin] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const commandEndpoint = `${currentHost}/command`;
  const mobileWebUrl = 'https://ais-pre-dswb23dssu32xbecr6dnh7-665026632490.asia-southeast1.run.app';

  const kotlinMainActivityCode = `// MainActivity.kt (ในโปรเจกต์ Android Studio ของบอส)
import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private val AUDIO_PERMISSION_CODE = 101

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // เช็คและขอสิทธิ์ไมโครโฟนจากผู้ใช้ (Runtime Permission)
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.RECORD_AUDIO), AUDIO_PERMISSION_CODE)
        }

        val webView = WebView(this)
        setContentView(webView)

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.mediaPlaybackRequiresUserGesture = false

        // เปิดสิทธิ์ให้ WebView ใช้งานไมค์
        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                // อนุญาตคำขอของ WebView เสมอ (ถ้าแอปหลักได้สิทธิ์แล้ว)
                request.grant(request.resources)
            }
        }

        // โหลดหน้าจอ ATOM UI
        webView.loadUrl("${mobileWebUrl}")
    }
}`;

  const curlExample = `curl -X POST "${commandEndpoint}" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "ขอดูตัวอย่าง code ครับ"}'`;

  const handleCopy = (text: string, type: 'url' | 'curl' | 'kotlin') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else if (type === 'curl') {
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    } else {
      setCopiedKotlin(true);
      setTimeout(() => setCopiedKotlin(false), 2000);
    }
  };

  const handleTestEndpoint = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);

      const res = await fetch('/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'ทดสอบการเชื่อมต่อจากแอป ATOM Mobile',
        }),
      });

      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ status: 'error', message: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-cyan-500/40 bg-[#0c1220] p-4 sm:p-5 shadow-2xl shadow-cyan-950/60 text-slate-200 font-sans max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold font-tech tracking-wide text-white">
                เชื่อมต่อแอป ATOM Mobile (.apk)
              </h2>
              <p className="text-[11px] text-slate-400">Android Studio Kotlin & REST Command Endpoint สำหรับลูกพี่</p>
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
        <div className="flex border-b border-slate-800 mt-3 text-xs">
          <button
            onClick={() => setActiveTab('kotlin')}
            className={`flex-1 py-2 font-medium border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'kotlin'
                ? 'border-cyan-400 text-cyan-300 font-semibold bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>MainActivity.kt (Android WebView + Mic)</span>
          </button>
          <button
            onClick={() => setActiveTab('rest')}
            className={`flex-1 py-2 font-medium border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'rest'
                ? 'border-cyan-400 text-cyan-300 font-semibold bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            <span>REST Command Endpoint (/command)</span>
          </button>
        </div>

        {/* Tab 1: Kotlin MainActivity */}
        {activeTab === 'kotlin' && (
          <div className="space-y-3.5 py-3.5 text-xs">
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200/90 leading-relaxed text-[11px]">
              🚀 <strong>โค้ด Android พร้อมคอมไพล์เป็น .APK:</strong> วางโค้ดนี้ในโปรเจกต์ Android Studio ของบอส WebView จะขอสิทธิ์ไมโครโฟนอัตโนมัติ (<code className="text-emerald-300 font-mono">RECORD_AUDIO</code>) และเปิดหน้าจอ UI ผู้ช่วยคุยสดได้ทันที!
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-mono text-cyan-300 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>MainActivity.kt</span>
                </span>
                <button
                  onClick={() => handleCopy(kotlinMainActivityCode, 'kotlin')}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[11px] flex items-center gap-1 transition-colors"
                >
                  {copiedKotlin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKotlin ? 'คัดลอกโค้ดแล้ว' : 'คัดลอก Kotlin Code'}</span>
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-black/75 border border-slate-800 text-[10.5px] font-mono text-slate-300 overflow-x-auto max-h-72 leading-relaxed select-text">
                {kotlinMainActivityCode}
              </pre>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300 space-y-1">
              <strong>📌 อย่าลืมเพิ่มใน AndroidManifest.xml:</strong>
              <pre className="p-2 rounded bg-black/60 text-cyan-300 font-mono text-[10px]">{`<uses-permission android:name="android.permission.INTERNET" />\n<uses-permission android:name="android.permission.RECORD_AUDIO" />\n<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />`}</pre>
            </div>
          </div>
        )}

        {/* Tab 2: REST Command API */}
        {activeTab === 'rest' && (
          <div className="space-y-3.5 py-3.5 text-xs">
            {/* Status info */}
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-300">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="font-semibold">Backend Server: เปิดรับคำสั่ง 24 ชม. พร้อม CORS เต็มรูปแบบ</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                ONLINE
              </span>
            </div>

            {/* Primary Endpoint URL */}
            <div>
              <label className="block text-[11px] font-semibold text-cyan-300 uppercase tracking-wider mb-1.5">
                URL สำหรับให้แอป ATOM ส่งคำสั่งเข้ามา (FastAPI / Command Compatible):
              </label>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/90 border border-cyan-500/30 font-mono text-cyan-300 text-xs">
                <span className="flex-1 truncate">{commandEndpoint}</span>
                <button
                  onClick={() => handleCopy(commandEndpoint, 'url')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 transition-colors shrink-0"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                </button>
              </div>
            </div>

            {/* Supported Payload Formats */}
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>รูปแบบ JSON ที่ส่งมาได้ (รองรับทั้งหมด):</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 rounded bg-black/40 border border-slate-800">
                  <span className="text-slate-400">// แบบในคลิป (FastAPI)</span>
                  <pre className="text-cyan-300 mt-1">{`{\n  "name": "คำสั่งเสียง"\n}`}</pre>
                </div>
                <div className="p-2 rounded bg-black/40 border border-slate-800">
                  <span className="text-slate-400">// แบบ Chat API มาตรฐาน</span>
                  <pre className="text-cyan-300 mt-1">{`{\n  "message": "คำสั่งเสียง"\n}`}</pre>
                </div>
              </div>
            </div>

            {/* Live Test Button */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-slate-300">
                  ทดสอบส่งคำสั่งไปยัง /command ทันที:
                </label>
                <button
                  onClick={handleTestEndpoint}
                  disabled={isTesting}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{isTesting ? 'กำลังทดสอบ...' : 'ทดสอบ Ping & Command'}</span>
                </button>
              </div>

              {testResult && (
                <div className="p-2.5 rounded-xl bg-[#080d18] border border-cyan-500/30 font-mono text-[11px] max-h-36 overflow-y-auto">
                  <div className="flex items-center justify-between text-emerald-400 mb-1">
                    <span>สถานะการตอบกลับ: 200 OK</span>
                    <span>Emotion: {testResult.emotion || 'normal'}</span>
                  </div>
                  <div className="text-slate-300 whitespace-pre-wrap">{testResult.text || JSON.stringify(testResult, null, 2)}</div>
                </div>
              )}
            </div>

            {/* cURL Snippet */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-400">cURL สำหรับทดสอบใน Terminal:</span>
                <button
                  onClick={() => handleCopy(curlExample, 'curl')}
                  className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                >
                  {copiedCurl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCurl ? 'คัดลอกแล้ว' : 'คัดลอก cURL'}</span>
                </button>
              </div>
              <pre className="p-2.5 rounded-xl bg-black/60 border border-slate-800 text-[10px] font-mono text-slate-300 overflow-x-auto">
                {curlExample}
              </pre>
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
