import 'package:flutter/foundation.dart';

import '../core/config.dart';
import '../services/cloud_api.dart';
import '../services/session_store.dart';
import '../services/voice_brain.dart';

// Holds active agent + cloud handles. Handoff keeps one stream (no cut).
class AgentState extends ChangeNotifier {
  String agentId = 'atom';
  String baseUrl = AppConfig.defaultBaseUrl;
  String secret = '';
  CloudApi? api;
  late final VoiceBrain voice = VoiceBrain(this);
  bool muted = false;
  bool speaking = false;
  bool busy = false;
  String? error;

  AgentDef get agent => AppConfig.agentOf(agentId);

  Future<void> load() async {
    agentId = await SessionStore.agent();
    baseUrl = await SessionStore.baseUrl();
    secret = await SessionStore.secret();
    api = CloudApi(baseUrl: baseUrl, secret: secret);
    notifyListeners();
  }

  Future<void> updateConnection(String url, String s) async {
    await SessionStore.saveConnection(url, s);
    await load();
  }

  Future<void> switchAgent(String id) async {
    agentId = id;
    speaking = false; // cut TTS immediately, background task keeps running
    await SessionStore.saveAgent(id);
    notifyListeners();
  }

  void setMuted(bool m) {
    muted = m;
    notifyListeners();
  }

  void setSpeaking(bool s) {
    speaking = s;
    notifyListeners();
  }

  @override
  void dispose() {
    voice.dispose();
    super.dispose();
  }
}
