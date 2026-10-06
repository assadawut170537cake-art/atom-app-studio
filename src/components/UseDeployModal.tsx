import React, { useState } from 'react';
import { X, Rocket, Copy, Check, Smartphone, Terminal, Globe, Code, Layers, ExternalLink, Cpu } from 'lucide-react';

interface UseDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UseDeployModal: React.FC<UseDeployModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'ways' | 'android' | 'local' | 'prompts'>('ways');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const sharedUrl = 'https://ais-pre-dswb23dssu32xbecr6dnh7-665026632490.asia-southeast1.run.app';
  const devUrl = 'https://ais-dev-dswb23dssu32xbecr6dnh7-665026632490.asia-southeast1.run.app';

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const androidWebViewCode = `// MainActivity.kt (ในโปรเจกต์ Android Studio ของบอส)
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
        webView.loadUrl("${sharedUrl}")
    }
}`;

  const localRunBash = `# 1. ติดตั้ง Dependencies
npm install

# 2. ตั้งค่าไฟล์ .env (ใส่ API Key)
echo "GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE" > .env

# 3. สั่งรัน Dev Server ทันที
npm run dev

# 4. เปิดเบราว์เซอร์ไปที่ http://localhost:3000`;

  const dockerRunBash = `# สร้าง Docker Image สำหรับ ATOM
docker build -t atom-ai-assistant .

# รันคอนเทนเนอร์บนพอร์ต 3000
docker run -d -p 3000:3000 -e GEMINI_API_KEY="YOUR_KEY" --name atom atom-ai-assistant`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-cyan-500/40 bg-[#0c1220] p-5 shadow-2xl shadow-cyan-950/60 text-slate-200 font-sans max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold font-tech tracking-wide text-white">
                วิธีนำหน้า UI นี้ไปใช้งาน & คำสั่งพัฒนา
              </h2>
              <p className="text-[11px] text-slate-400">คู่มือการนำไปใช้บนมือถือ, ในแอป APK และรันบนเครื่องตัวเอง</p>
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
            onClick={() => setActiveTab('ways')}
            className={`flex-1 py-2.5 font-medium border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'ways'
                ? 'border-cyan-400 text-cyan-300 font-semibold bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>3 วิธีนำไปใช้</span>
          </button>
          <button
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-2.5 font-medium border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'android'
                ? 'border-cyan-400 text-cyan-300 font-semibold bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>ใส่ในแอป APK</span>
          </button>
          <button
            onClick={() => setActiveTab('local')}
            className={`flex-1 py-2.5 font-medium border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'local'
                ? 'border-cyan-400 text-cyan-300 font-semibold bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>รันบนเครื่อง/เซิร์ฟเวอร์</span>
          </button>
          <button
            onClick={() => setActiveTab('prompts')}
            className={`flex-1 py-2.5 font-medium border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'prompts'
                ? 'border-cyan-400 text-cyan-300 font-semibold bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>คำสั่งสร้างฟีเจอร์</span>
          </button>
        </div>

        {/* Tab 1: 3 วิธีนำไปใช้ */}
        {activeTab === 'ways' && (
          <div className="space-y-3.5 py-4 text-xs leading-relaxed">
            {/* Live Shared URL */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-cyan-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-cyan-300">1. ลิงก์สาธารณะ (เปิดใช้ได้ทุกเครื่องทันที):</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px]">
                  LIVE ONLINE
                </span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-black/60 font-mono text-cyan-300 text-xs">
                <span className="flex-1 truncate">{sharedUrl}</span>
                <button
                  onClick={() => copy(sharedUrl, 'sharedUrl')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 transition-colors shrink-0"
                >
                  {copiedKey === 'sharedUrl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'sharedUrl' ? 'คัดลอกแล้ว' : 'คัดลอก URL'}</span>
                </button>
              </div>
              <p className="text-slate-400 text-[11px]">
                บอสสามารถส่งลิงก์นี้เข้ามือถือ หรือเปิดในแท็บเล็ต/คอมพิวเตอร์ เพื่อสั่งงานด้วยเสียงได้ทันที ไม่ต้องติดตั้งโปรแกรมใดๆ
              </p>
            </div>

            {/* PWA 1 Click */}
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-start gap-2.5">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs shrink-0">2</span>
              <div>
                <strong className="text-slate-200">ติดตั้งเป็นแอปมือถือ (PWA Full-screen):</strong>
                <p className="text-slate-400 mt-0.5">
                  เมื่อเปิดลิงก์บนมือถือ ให้แตะปุ่ม <strong>"ติดตั้ง"</strong> (หรือจุด 3 จุดใน Chrome แล้วเลือก <em>เพิ่มไปยังหน้าจอหลัก</em>) หน้าจอ UI นี้จะกลายเป็นไอคอนแอปบนมือถือทันที เปิดมาเป็นแอปเต็มจอ ไม่มีแถบเบราว์เซอร์
                </p>
              </div>
            </div>

            {/* Native APK Bridge */}
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-start gap-2.5">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs shrink-0">3</span>
              <div>
                <strong className="text-slate-200">เชื่อมเข้ากับแอป APK ของบอส:</strong>
                <p className="text-slate-400 mt-0.5">
                  สามารถนำหน้าเว็บนี้ไปใส่ใน <strong>WebView</strong> ของแอป Android หรือให้แอปส่งคำสั่งเสียงมาที่ Endpoint <code className="text-cyan-300 font-mono">/command</code> ได้เลยครับ
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Android APK WebView Code */}
        {activeTab === 'android' && (
          <div className="space-y-3 py-4 text-xs">
            <p className="text-slate-300">
              นำโค้ดด้านล่างนี้ไปวางในไฟล์ <code className="text-cyan-300 font-mono">MainActivity.kt</code> ของแอป Android เพื่อให้เปิดหน้าจอ UI ของ ATOM เสมือนแอปแท้ 100%:
            </p>
            <div className="relative">
              <button
                onClick={() => copy(androidWebViewCode, 'android')}
                className="absolute right-2 top-2 flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] transition-colors"
              >
                {copiedKey === 'android' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'android' ? 'คัดลอกแล้ว' : 'คัดลอกโค้ด'}</span>
              </button>
              <pre className="p-3 rounded-xl bg-black/70 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-64">
                {androidWebViewCode}
              </pre>
            </div>
            <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-[11px] text-cyan-300">
              💡 อย่าลืมเพิ่มสิทธิ์ <code className="font-mono bg-black/40 px-1 py-0.5 rounded">&lt;uses-permission android:name="android.permission.RECORD_AUDIO" /&gt;</code> ใน AndroidManifest.xml เพื่อให้ใช้เสียงได้ครับ
            </div>
          </div>
        )}

        {/* Tab 3: Local / Server Run */}
        {activeTab === 'local' && (
          <div className="space-y-3 py-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-300">คำสั่งรันบนคอมพิวเตอร์ (Node.js):</span>
                <button
                  onClick={() => copy(localRunBash, 'local')}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  {copiedKey === 'local' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'local' ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                </button>
              </div>
              <pre className="p-2.5 rounded-xl bg-black/70 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                {localRunBash}
              </pre>
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-300">คำสั่งรันผ่าน Docker:</span>
                <button
                  onClick={() => copy(dockerRunBash, 'docker')}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  {copiedKey === 'docker' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'docker' ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                </button>
              </div>
              <pre className="p-2.5 rounded-xl bg-black/70 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                {dockerRunBash}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 4: Prompt สั่งสร้างฟีเจอร์ */}
        {activeTab === 'prompts' && (
          <div className="space-y-3 py-4 text-xs">
            <p className="text-slate-300">
              ชุดข้อความคำสั่ง (Prompts) ที่บอสสามารถพิมพ์บอกผมในแชทนี้ เพื่อให้สร้างฟีเจอร์ระดับสูงตามข้อเสนอแนะได้ทันที:
            </p>

            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                <div>
                  <strong className="text-cyan-300 block">1. ระบบ Wake Word สั่งด้วยเสียง:</strong>
                  <span className="text-slate-400 text-[11px]">"เปิดโหมดตรวจจับเสียง Wake Word 'หวัดดีอะตอม' ให้เปิดไมค์และตอบกลับอัตโนมัติ"</span>
                </div>
                <button
                  onClick={() => copy("ช่วยเปิดโหมดตรวจจับเสียง Wake Word ให้พูดว่า 'หวัดดีอะตอม' แล้วเปิดไมค์ตอบกลับอัตโนมัติให้หน่อยครับ", "p1")}
                  className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 shrink-0"
                >
                  {copiedKey === 'p1' ? 'คัดลอกแล้ว' : 'คัดลอก'}
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                <div>
                  <strong className="text-cyan-300 block">2. แนบรูปถ่ายหน้าจอโค้ด/Error:</strong>
                  <span className="text-slate-400 text-[11px]">"เพิ่มปุ่มอัปโหลดรูปภาพในช่องแชท ให้ส่งภาพโค้ดหรือบั๊กมาให้อะตอมวิเคราะห์"</span>
                </div>
                <button
                  onClick={() => copy("ช่วยเพิ่มปุ่มอัปโหลดรูปภาพในช่องแชท ให้ส่งรูปภาพหน้าจอโค้ดหรือบั๊กมาให้อะตอมวิเคราะห์ด้วย Gemini Vision ให้หน่อยครับ", "p2")}
                  className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 shrink-0"
                >
                  {copiedKey === 'p2' ? 'คัดลอกแล้ว' : 'คัดลอก'}
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                <div>
                  <strong className="text-cyan-300 block">3. คลังสมองจดจำข้อมูลบอส:</strong>
                  <span className="text-slate-400 text-[11px]">"เพิ่มระบบจำข้อมูลส่วนตัว (Tech Stack, สไตล์โค้ด) บันทึกไว้ในเครื่อง"</span>
                </div>
                <button
                  onClick={() => copy("ช่วยเพิ่มหน้าตั้งค่า Profile & Memory สำหรับบันทึกความชอบ ภาษาที่ชอบ และ Tech Stack ของบอสลงในระบบหน่อยครับ", "p3")}
                  className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 shrink-0"
                >
                  {copiedKey === 'p3' ? 'คัดลอกแล้ว' : 'คัดลอก'}
                </button>
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
