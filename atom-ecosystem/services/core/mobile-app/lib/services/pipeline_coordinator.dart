import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:google_generative_ai/google_generative_ai.dart';

enum ExecutionMode { localFirst, cloudNative }

enum IntentType { directAction, contextMemorySearch, conversationFallback, unknown }

class RouterDecision {
  final IntentType intent;
  final double confidenceScore;
  final String? actionTarget;
  final Map<String, String>? actionPayload;
  final String extractedQuery;
  final String rawResponse;

  RouterDecision({
    required this.intent,
    required this.confidenceScore,
    this.actionTarget,
    this.actionPayload,
    required this.extractedQuery,
    this.rawResponse = '',
  });
}

class VectorRecord {
  final String id;
  final String content;
  final double similarityScore;

  VectorRecord({
    required this.id,
    required this.content,
    required this.similarityScore,
  });
}

class PipelineExecutionResult {
  final bool success;
  final String message;
  final String executedStep;
  final ExecutionMode modeUsed;
  final double confidenceScore;
  final List<VectorRecord> contextData;
  final String? errorDetails;

  PipelineExecutionResult({
    required this.success,
    required this.message,
    required this.executedStep,
    required this.modeUsed,
    required this.confidenceScore,
    this.contextData = const [],
    this.errorDetails,
  });
}

class PipelineCoordinator {
  ExecutionMode defaultMode;
  final double relevanceThreshold = 0.65;
  final String baseUrl;
  final String secret;

  PipelineCoordinator({
    this.defaultMode = ExecutionMode.localFirst,
    this.baseUrl = 'https://assadawut-jarvis.online',
    this.secret = '',
  });

  final List<MapEntry<RegExp, String>> _directActionPatterns = [
    MapEntry(RegExp(r'(เปิด|ปิด)\s*(ไฟฉาย|ไฟห้อง|ไฟสว่าง|โคมไฟ)', caseSensitive: false), 'device_torch'),
    MapEntry(RegExp(r'(เปิด|ปิด|สลับ)\s*(ไวไฟ|wifi|wi-fi|บลูทูธ|bluetooth)', caseSensitive: false), 'device_connectivity'),
    MapEntry(RegExp(r'(เพิ่ม|ลด|หรี่|เงียบ|ปิด)\s*(เสียง|ความดัง|ลำโพง)', caseSensitive: false), 'device_volume'),
    MapEntry(RegExp(r'(เพิ่ม|ลด|ปรับ)\s*(แสง|ความสว่าง|หน้าจอ)', caseSensitive: false), 'device_brightness'),
    MapEntry(RegExp(r'^(เปิด|launch|open)\s+([a-zA-Z0-9ก-๙]+)$', caseSensitive: false), 'app_launch'),
    MapEntry(RegExp(r'(ถ่ายรูป|เปิดกล้อง|สแกน)', caseSensitive: false), 'device_camera'),
  ];

  final List<String> _memoryKeywords = [
    'จำได้ไหม', 'บันทึกอะไรไว้', 'ค้นหา', 'โน้ต', 'สรุป', 'เคยบอกว่า', 
    'เมื่อวาน', 'ข้อมูลของ', 'ประวัติ', 'ใครคือ', 'หมายเลข', 'จดไว้ว่า',
    'search', 'remember', 'recall', 'memory', 'note', 'summary', 'find'
  ];

  Future<PipelineExecutionResult> processPipeline(String userPrompt) async {
    var currentMode = defaultMode;

    try {
      // Step 1: Input & Fast Routing
      final routerDecision = await _evaluateStep1Routing(userPrompt, currentMode);

      // Step 2: Direct Short-Circuit for Device Control
      if (routerDecision.intent == IntentType.directAction) {
        return _executeStep2DirectShortCircuit(routerDecision, currentMode);
      }

      // Step 3: Vector Retrieval & Cosine Search
      final retrievedRecords = await _executeStep3VectorRetrieval(routerDecision, currentMode);

      // Step 4: Decision & Relevance Filter & Final Execution
      return await _executeStep4DecisionAndSynthesis(userPrompt, routerDecision, retrievedRecords, currentMode);

    } catch (e) {
      if (currentMode == ExecutionMode.cloudNative) {
        // Fail-safe automatic fallback to Local
        return await _processFallbackLocalPipeline(userPrompt, e.toString());
      }

      return PipelineExecutionResult(
        success: false,
        message: 'เกิดข้อผิดพลาดในการประมวลผลเครือข่าย: $e',
        executedStep: 'NETWORK_ERROR',
        modeUsed: currentMode,
        confidenceScore: 0.0,
        errorDetails: e.toString(),
      );
    }
  }

  Future<RouterDecision> _evaluateStep1Routing(String prompt, ExecutionMode mode) async {
    final trimmed = prompt.trim();
    if (trimmed.isEmpty) {
      return RouterDecision(
        intent: IntentType.unknown,
        confidenceScore: 0.0,
        extractedQuery: '',
      );
    }

    // Step 1 Fast Regex Rule Match
    for (final entry in _directActionPatterns) {
      final match = entry.key.firstMatch(trimmed);
      if (match != null) {
        final isTurnOff = trimmed.contains('ปิด') || trimmed.contains('ลด');
        return RouterDecision(
          intent: IntentType.directAction,
          confidenceScore: 0.99,
          actionTarget: entry.value,
          actionPayload: {
            'command': match.group(0) ?? '',
            'state': isTurnOff ? 'OFF' : 'ON',
          },
          extractedQuery: trimmed,
          rawResponse: 'Matched rule: ${entry.value}',
        );
      }
    }

    for (final kw in _memoryKeywords) {
      if (trimmed.toLowerCase().contains(kw.toLowerCase())) {
        return RouterDecision(
          intent: IntentType.contextMemorySearch,
          confidenceScore: 0.92,
          extractedQuery: trimmed,
          rawResponse: 'Matched keyword: $kw',
        );
      }
    }

    return RouterDecision(
      intent: IntentType.conversationFallback,
      confidenceScore: 0.80,
      extractedQuery: trimmed,
    );
  }

  PipelineExecutionResult _executeStep2DirectShortCircuit(
    RouterDecision decision,
    ExecutionMode mode,
  ) {
    final target = decision.actionTarget ?? 'unknown';
    final payload = decision.actionPayload ?? {};
    final state = payload['state'] ?? 'ON';

    String msg = 'ดำเนินการคำสั่ง $target ($state) เรียบร้อยแล้วค่ะ';
    if (target == 'device_torch') {
      msg = 'ดำเนินการเปลี่ยนสถานะไฟฉายเป็น $state เรียบร้อยแล้วค่ะ';
    } else if (target == 'app_launch') {
      msg = 'กำลังเปิดแอปพลิเคชัน ${decision.extractedQuery} ให้ค่ะ';
    }

    return PipelineExecutionResult(
      success: true,
      message: msg,
      executedStep: 'STEP_2_DIRECT_SHORT_CIRCUIT',
      modeUsed: mode,
      confidenceScore: decision.confidenceScore,
    );
  }

  Future<List<VectorRecord>> _executeStep3VectorRetrieval(
    RouterDecision decision,
    ExecutionMode mode,
  ) async {
    const apiKey = String.fromEnvironment('SUPERMEMORY_API_KEY');
    if (apiKey.isEmpty) {
      debugPrint('No SUPERMEMORY_API_KEY set. Returning empty vector records.');
      return [];
    }

    try {
      final res = await http.post(
        Uri.parse('https://api.supermemory.ai/v3/search'),
        headers: {
          'Authorization': 'Bearer $apiKey',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'q': decision.extractedQuery,
          'containerTag': 'jarvis_core',
        }),
      );

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final results = data['results'] as List? ?? [];
        return results.map((item) {
          final content = item['memory'] ?? item['chunk'] ?? item['content'] ?? '';
          final score = (item['similarity'] as num?)?.toDouble() ?? (item['score'] as num?)?.toDouble() ?? 1.0;
          return VectorRecord(
            id: item['id']?.toString() ?? '',
            content: content.toString(),
            similarityScore: score,
          );
        }).toList();
      } else {
        debugPrint('Supermemory search failed: ${res.statusCode} ${res.body}');
      }
    } catch (e) {
      debugPrint('Supermemory search error: $e');
    }

    return [];
  }

  Future<bool> ingestMemory(String content, {String customId = '', String containerTag = 'jarvis_core', String taskType = 'memory'}) async {
    const apiKey = String.fromEnvironment('SUPERMEMORY_API_KEY');
    if (apiKey.isEmpty) {
      debugPrint('No SUPERMEMORY_API_KEY set. Cannot ingest memory.');
      return false;
    }

    try {
      final res = await http.post(
        Uri.parse('https://api.supermemory.ai/v3/documents'),
        headers: {
          'Authorization': 'Bearer $apiKey',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'content': content,
          'containerTag': containerTag,
          'taskType': taskType,
          'dreaming': 'instant',
          if (customId.isNotEmpty) 'customId': customId,
        }),
      );

      if (res.statusCode == 200 || res.statusCode == 201) {
        debugPrint('Successfully ingested memory to Supermemory');
        return true;
      } else {
        debugPrint('Supermemory ingest failed: ${res.statusCode} ${res.body}');
      }
    } catch (e) {
      debugPrint('Supermemory ingest error: $e');
    }
    return false;
  }

  Future<PipelineExecutionResult> _executeStep4DecisionAndSynthesis(
    String prompt,
    RouterDecision decision,
    List<VectorRecord> records,
    ExecutionMode mode,
  ) async {
    final relevant = records.where((r) => r.similarityScore >= relevanceThreshold).toList();
    String contextStr = "";
    
    if (relevant.isNotEmpty) {
      final sb = StringBuffer('ข้อมูลอ้างอิงจาก Supermemory:\n');
      for (var i = 0; i < relevant.length; i++) {
        sb.writeln('- ${relevant[i].content}');
      }
      contextStr = sb.toString();
    }

    const apiKey = String.fromEnvironment('GEMINI_API_KEY');
    if (apiKey.isEmpty) {
      return PipelineExecutionResult(
        success: false,
        message: 'ระบบขาด GEMINI_API_KEY กรุณาเพิ่มคีย์ก่อนใช้งานครับบอส',
        executedStep: 'STEP_4_LLM_GENERATION',
        modeUsed: mode,
        confidenceScore: decision.confidenceScore,
        contextData: relevant,
      );
    }

    try {
      final fullPrompt = contextStr.isNotEmpty 
          ? '$contextStr\n\nคำสั่งล่าสุดจากบอส: $prompt'
          : 'คำสั่งล่าสุดจากบอส: $prompt';

      final requestBody = {
        "model": "MiniMaxAI/MiniMax-M2.7",
        "messages": [
          {
            "role": "system",
            "content": '''คุณคือผู้ช่วย AI ส่วนตัวของ "อัษฎาวุธ เมืองซอง (ลูกพี่/บอส)" ทำงานร่วมกับระบบนิเวศ J.A.R.V.I.S. และ F.R.I.D.A.Y.
หน้าที่ของคุณคือตอบคำถามและทำงานตามที่ได้รับมอบหมาย โดยใช้ข้อมูลอ้างอิงจากความจำในอดีต (ถ้ามี)
ตอบให้กระชับ ชาญฉลาด และเรียกผู้ใช้ว่า "ลูกพี่" หรือ "บอส" เสมอ'''
          },
          {
            "role": "user",
            "content": fullPrompt
          }
        ]
      };

      final res = await http.post(
        Uri.parse('https://inference.dahl.global/v1/chat/completions'),
        headers: {
          'Authorization': 'Bearer $apiKey',
          'Content-Type': 'application/json',
        },
        body: jsonEncode(requestBody),
      );

      String reply = 'ไม่มีการตอบสนองจากสมองหลักครับ';
      if (res.statusCode == 200) {
        final data = jsonDecode(utf8.decode(res.bodyBytes));
        if (data['choices'] != null && data['choices'].isNotEmpty) {
          reply = data['choices'][0]['message']['content'] ?? reply;
        }
      } else {
        debugPrint('Dahl API failed: ${res.statusCode} ${res.body}');
        reply = 'เกิดข้อผิดพลาดจาก API: ${res.statusCode}';
      }

      if (reply.isNotEmpty && res.statusCode == 200) {
         await ingestMemory("สรุปการตอบกลับ: $reply", containerTag: "jarvis_core", taskType: "memory");
      }

      return PipelineExecutionResult(
        success: res.statusCode == 200,
        message: reply,
        executedStep: 'STEP_4_LLM_GENERATION',
        modeUsed: mode,
        confidenceScore: decision.confidenceScore,
        contextData: relevant,
      );
    } catch (e) {
      return PipelineExecutionResult(
        success: false,
        message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ AI: $e',
        executedStep: 'STEP_4_LLM_GENERATION',
        modeUsed: mode,
        confidenceScore: 0.0,
        contextData: relevant,
      );
    }
  }

  Future<PipelineExecutionResult> _processFallbackLocalPipeline(
    String prompt,
    String failureReason,
  ) async {
    final decision = await _evaluateStep1Routing(prompt, ExecutionMode.localFirst);
    if (decision.intent == IntentType.directAction) {
      return _executeStep2DirectShortCircuit(decision, ExecutionMode.localFirst);
    }
    final records = await _executeStep3VectorRetrieval(decision, ExecutionMode.localFirst);
    final res = await _executeStep4DecisionAndSynthesis(prompt, decision, records, ExecutionMode.localFirst);

    return PipelineExecutionResult(
      success: res.success,
      message: res.message,
      executedStep: res.executedStep,
      modeUsed: ExecutionMode.localFirst,
      confidenceScore: res.confidenceScore,
      contextData: res.contextData,
      errorDetails: 'Cloud failure triggered local fallback: $failureReason',
    );
  }
}
