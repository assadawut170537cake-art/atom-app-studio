import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:speech_to_text/speech_to_text.dart';

import 'agent_state.dart';
import 'master_gate.dart';

// Optimized Voice brain: High-quality Input (STT) + Output (TTS) streaming.
class VoiceBrain extends ChangeNotifier {
  final AgentState agents;
  final FlutterTts tts = FlutterTts();
  final SpeechToText stt = SpeechToText();
  bool listening = false;
  String lastHeard = '';

  VoiceBrain(this.agents) {
    _initTts();
  }

  Future<void> _initTts() async {
    await tts.setLanguage('th-TH');
    await tts.setSpeechRate(0.92);
    await tts.setVolume(1.0);
    await tts.setPitch(1.0);
    await tts.awaitSpeakCompletion(true);
    
    // Callbacks to ensure Orb state resets when TTS finishes, cancels, or errors
    tts.setCompletionHandler(() {
      agents.setSpeaking(false);
      notifyListeners();
    });

    tts.setCancelHandler(() {
      agents.setSpeaking(false);
      notifyListeners();
    });

    tts.setErrorHandler((msg) {
      agents.setSpeaking(false);
      notifyListeners();
    });
  }

  Future<void> speak(String text) async {
    if (agents.muted || text.trim().isEmpty) return;
    agents.setSpeaking(true);
    notifyListeners();
    await tts.speak(text);
  }

  Future<void> stopSpeak() async {
    await tts.stop();
    agents.setSpeaking(false);
    notifyListeners();
  }

  // Returns 'ultron_locked' when Master Key is required first.
  Future<String> handleCommand(
    String text, {
    required Future<bool> Function() askMasterKey,
  }) async {
    final t = text.toLowerCase().replaceAll('.', '').replaceAll(' ', '');
    if (t.contains('ไฟรเดย') || t.contains('friday') || t.contains('ฟรายเดย')) {
      await stopSpeak();
      await agents.switchAgent('friday');
      await speak('ต่อสายให้ไฟรเดย์แล้วค่ะลูกพี่');
      return 'friday';
    }
    if (t.contains('อัลตรอน') || t.contains('ultron') || t.contains('อัลตอล') || t.contains('เอาตรอน')) {
      final ok = await askMasterKey();
      if (!ok) {
        await speak('รหัสมาสเตอร์ไม่ถูกต้องค่ะลูกพี่');
        return 'ultron_locked';
      }
      await stopSpeak();
      await agents.switchAgent('ultron');
      await speak('อัลตรอนพร้อมลุย สั่งมา');
      return 'ultron';
    }
    if (t.contains('อะตอม') || t.contains('atom') || t.contains('กลับมา')) {
      await stopSpeak();
      await agents.switchAgent('atom');
      await speak('กลับมาอะตอมแล้วครับลูกพี่');
      return 'atom';
    }
    return 'chat';
  }

  Future<void> toggleListen({
    required Future<void> Function(String) onResult,
    required Future<bool> Function() askMasterKey,
  }) async {
    if (listening) {
      await stt.stop();
      listening = false;
      notifyListeners();
      return;
    }

    // Stop TTS before listening to prevent mic feedback
    await stopSpeak();

    final ok = await stt.initialize(
      onError: (e) {
        listening = false;
        notifyListeners();
      },
      onStatus: (status) {
        if (status == 'done' || status == 'notListening') {
          listening = false;
          notifyListeners();
        }
      },
    );

    if (!ok) {
      listening = false;
      notifyListeners();
      return;
    }

    listening = true;
    notifyListeners();

    await stt.listen(
      listenOptions: SpeechListenOptions(
        localeId: 'th-TH',
        listenMode: ListenMode.dictation,
        partialResults: true,
        pauseFor: const Duration(seconds: 3),
      ),
      onResult: (r) async {
        lastHeard = r.recognizedWords;
        notifyListeners();
        if (r.finalResult && lastHeard.isNotEmpty) {
          listening = false;
          notifyListeners();
          final route = await handleCommand(
            lastHeard,
            askMasterKey: askMasterKey,
          );
          if (route == 'chat') await onResult(lastHeard);
        }
      },
    );
  }

  Future<bool> ensureMasterPin(String pin) async {
    if (!await MasterGate.hasPin()) {
      await MasterGate.setPin(pin); // first-time setup
      return true;
    }
    return MasterGate.verify(pin);
  }
}
