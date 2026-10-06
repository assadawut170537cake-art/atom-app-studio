import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';

import 'session_store.dart';

// Master Key gate for ULTRON. Salted SHA-256 kept in local prefs,
// never sent to any LLM or log (Blueprint Law 2).
class MasterGate {
  static String _salt() {
    final r = Random.secure();
    final b = List<int>.generate(16, (_) => r.nextInt(256));
    return base64Url.encode(b);
  }

  static String hash(String pin, String salt) =>
      sha256.convert(utf8.encode('$salt|$pin')).toString();

  static Future<bool> hasPin() async =>
      (await SessionStore.masterHash()) != null;

  static Future<void> setPin(String pin) async {
    final salt = _salt();
    await SessionStore.saveMasterHash(hash(pin, salt), salt);
  }

  static Future<bool> verify(String pin) async {
    final h = await SessionStore.masterHash();
    if (h == null) return false;
    final salt = await SessionStore.masterSalt();
    return hash(pin, salt) == h;
  }
}
