import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:http/http.dart' as http;

// All cloud calls in one place. Auth header + uniform error shape.
class CloudApi {
  final String baseUrl;
  final String secret;
  CloudApi({required this.baseUrl, required this.secret});

  Map<String, String> get _h => {
        'Content-Type': 'application/json',
        'X-Atom-Secret': secret,
      };

  String _url(String path) =>
      '${baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl}$path';

  void _throwOnError(http.Response r) {
    if (r.statusCode < 200 || r.statusCode >= 300) {
      var msg = 'HTTP ${r.statusCode}';
      try {
        final b = jsonDecode(r.body);
        if (b is Map && b['error'] is Map) {
          msg = '${b['error']['code']}: ${b['error']['message']}';
        }
      } catch (_) {}
      throw Exception(msg);
    }
  }

  Future<Map<String, dynamic>> ping(String agent) async {
    final r = await http.get(Uri.parse(_url('/api/v1/$agent/ping')), headers: _h);
    _throwOnError(r);
    return jsonDecode(r.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> push(List<Map<String, String>> updates) async {
    final r = await http.post(Uri.parse(_url('/api/v1/sync/push')),
        headers: _h, body: jsonEncode({'updates': updates}));
    _throwOnError(r);
    return jsonDecode(r.body) as Map<String, dynamic>;
  }

  Future<List<dynamic>> pull() async {
    final r = await http.get(Uri.parse(_url('/api/v1/sync/pull')), headers: _h);
    _throwOnError(r);
    final b = jsonDecode(r.body);
    return (b as Map<String, dynamic>)['updates'] as List<dynamic>;
  }

  Future<void> chatAppend(String session, String role, String msg) async {
    final r = await http.post(Uri.parse(_url('/api/v1/sync/chat/append')),
        headers: _h,
        body: jsonEncode(
            {'session_id': session, 'role': role, 'message': msg}));
    _throwOnError(r);
  }

  Future<List<dynamic>> chatHistory(String session) async {
    final r = await http.get(
        Uri.parse(_url('/api/v1/sync/chat/history?session_id=$session')),
        headers: _h);
    _throwOnError(r);
    final b = jsonDecode(r.body);
    return (b as Map<String, dynamic>)['history'] as List<dynamic>;
  }

  Future<List<dynamic>> getProviders(String customBaseUrl, String customSecret) async {
    final baseUrlUse = customBaseUrl.endsWith('/') ? customBaseUrl.substring(0, customBaseUrl.length - 1) : customBaseUrl;
    final r = await http.get(
      Uri.parse('$baseUrlUse/api/v1/providers'),
      headers: {
        'Content-Type': 'application/json',
        'X-Atom-Secret': customSecret,
      },
    );
    _throwOnError(r);
    final b = jsonDecode(r.body);
    return (b as Map<String, dynamic>)['providers'] as List<dynamic>;
  }

  Future<Map<String, dynamic>> cortexTurn(String session, String message, String forceSpeaker) async {
    final r = await http.post(
      Uri.parse(_url('/api/v1/cortex/turn')),
      headers: _h,
      body: jsonEncode({
        'session_id': session,
        'message': message,
        'force_speaker': forceSpeaker,
      }),
    );
    _throwOnError(r);
    return jsonDecode(r.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> voiceHook() async {
    final r =
        await http.get(Uri.parse(_url('/voice/session-hook')), headers: _h);
    _throwOnError(r);
    return jsonDecode(r.body) as Map<String, dynamic>;
  }

  static String sha256Of(String s) => sha256.convert(utf8.encode(s)).toString();

  // Approvals ride on sync keys: approve/deny = push decision record.
  Future<void> decide(String approvalId, String title, bool approve) async {
    final now = DateTime.now().toUtc().toIso8601String();
    await push([
      {
        'key': 'approval_dec/$approvalId',
        'value': jsonEncode({
          'decision': approve ? 'approve' : 'deny',
          'title': title,
          'hash': sha256Of('$approvalId|$title'),
        }),
        'updated_at': now,
        'updated_by': 'mobile',
      }
    ]);
  }
}
