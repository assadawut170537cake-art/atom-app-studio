import 'package:shared_preferences/shared_preferences.dart';

import '../core/config.dart';

// Thin wrapper so screens never touch SharedPreferences directly.
class SessionStore {
  static SharedPreferences? _p;

  static Future<SharedPreferences> _prefs() async {
    _p ??= await SharedPreferences.getInstance();
    return _p!;
  }

  static Future<String> baseUrl() async =>
      (await _prefs()).getString(AppConfig.prefsBaseUrl) ??
      AppConfig.defaultBaseUrl;

  static Future<String> secret() async =>
      (await _prefs()).getString(AppConfig.prefsSecret) ?? '';

  static Future<String> agent() async =>
      (await _prefs()).getString(AppConfig.prefsAgent) ?? 'atom';

  static Future<void> saveConnection(String url, String secret) async {
    final p = await _prefs();
    await p.setString(AppConfig.prefsBaseUrl, url.trim());
    await p.setString(AppConfig.prefsSecret, secret.trim());
  }

  static Future<void> saveAgent(String id) async =>
      (await _prefs()).setString(AppConfig.prefsAgent, id);

  static Future<String?> masterHash() async =>
      (await _prefs()).getString(AppConfig.prefsMasterHash);

  static Future<void> saveMasterHash(String saltedHash, String salt) async {
    final p = await _prefs();
    await p.setString(AppConfig.prefsMasterHash, saltedHash);
    await p.setString(AppConfig.prefsMasterSalt, salt);
  }

  static Future<String> masterSalt() async =>
      (await _prefs()).getString(AppConfig.prefsMasterSalt) ?? '';
}
