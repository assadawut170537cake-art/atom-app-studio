import 'package:flutter/material.dart';

import '../core/config.dart';
import '../services/agent_state.dart';
import '../services/master_gate.dart';
import '../widgets/agent_orb.dart';
import '../widgets/memory_save_button.dart';
import 'chat_screen.dart';
import 'memory_screen.dart';

// OLED black home: interactive orb + global voice brain + settings.
class HomeScreen extends StatefulWidget {
  final AgentState agents;
  final Future<bool> Function() askMasterKey;
  final void Function(int) go;
  const HomeScreen({
    super.key,
    required this.agents,
    required this.askMasterKey,
    required this.go,
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _lastTranscript = 'แตะที่ลูกแก้ว หรือปุ่มไมค์ด้านล่างเพื่อเริ่มพูด';
  String _lastAIResponse = '';
  List<String> _availableModels = [];
  bool _isLoadingModels = false;
  String _selectedModel = '';

  Future<void> _fetchModels(String baseUrl, String secret) async {
    if (baseUrl.isEmpty || secret.isEmpty) return;
    setState(() => _isLoadingModels = true);
    try {
      final models = await widget.agents.api?.getProviders(baseUrl, secret);
      if (models != null && models.isNotEmpty) {
        setState(() {
          _availableModels = models.cast<String>();
          if (!_availableModels.contains(_selectedModel)) {
            _selectedModel = _availableModels.first;
          }
        });
      }
    } catch (e) {
      debugPrint('Error fetching models: $e');
      setState(() {
        _availableModels = [];
      });
    } finally {
      if (mounted) setState(() => _isLoadingModels = false);
    }
  }

  Future<void> _handleVoiceResult(String text) async {
    if (!mounted) return;
    setState(() {
      _lastTranscript = text;
      _lastAIResponse = 'กำลังประมวลผล...';
    });
    
    final api = widget.agents.api;
    String reply = '';
    
    try {
      if (api != null && api.secret.isNotEmpty) {
        final session = 'mobile-${widget.agents.agentId}';
        final response = await api.cortexTurn(session, text, widget.agents.agentId);
        reply = response['reply'] ?? '';
      } else {
        reply = 'ไม่ได้เชื่อมต่อกับระบบคลาวด์ค่ะ กรุณาตั้งค่า API Key';
      }
    } catch (e) {
      reply = 'เกิดข้อผิดพลาดในการเชื่อมต่อ: $e';
    }

    if (reply.isEmpty) {
      reply = 'ขออภัยค่ะ ระบบไม่สามารถประมวลผลได้ในขณะนี้';
    }

    if (!mounted) return;
    setState(() => _lastAIResponse = reply);
    await widget.agents.voice.speak(reply);
  }

  Future<void> _switch(BuildContext ctx, String id) async {
    final messenger = ScaffoldMessenger.of(ctx);
    if (id == 'ultron') {
      if (!await MasterGate.hasPin()) {
        if (!ctx.mounted) return;
        await _setupPin(ctx);
        return;
      }
      final ok = await widget.askMasterKey();
      if (!ok) {
        messenger.showSnackBar(
          const SnackBar(content: Text('รหัสมาสเตอร์ไม่ถูกต้อง')),
        );
        return;
      }
    }
    await widget.agents.switchAgent(id);
  }

  Future<void> _setupPin(BuildContext ctx) async {
    final messenger = ScaffoldMessenger.of(ctx);
    final c = TextEditingController();
    final pin = await showDialog<String>(
      context: ctx,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF141414),
        title: const Text(
          'ตั้งรหัส Master Key',
          style: TextStyle(color: Colors.white),
        ),
        content: TextField(
          controller: c,
          obscureText: true,
          keyboardType: TextInputType.number,
          style: const TextStyle(color: Colors.white),
          decoration: const InputDecoration(hintText: 'ตั้งรหัส 4-8 หลัก'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('ยกเลิก'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, c.text.trim()),
            child: const Text('บันทึก'),
          ),
        ],
      ),
    );
    if (pin != null && pin.length >= 4) {
      await MasterGate.setPin(pin);
      messenger.showSnackBar(
        const SnackBar(content: Text('ตั้งรหัส Master Key แล้ว')),
      );
    }
  }

  Future<void> _setupConnection(BuildContext ctx) async {
    final urlController = TextEditingController(text: widget.agents.baseUrl);
    final secretController = TextEditingController(text: widget.agents.secret);
    final messenger = ScaffoldMessenger.of(ctx);

    // Initial fetch if already configured
    if (urlController.text.isNotEmpty && secretController.text.isNotEmpty) {
      _fetchModels(urlController.text, secretController.text);
    }

    final saved = await showDialog<bool>(
      context: ctx,
      builder: (BuildContext dialogContext) {
        return StatefulBuilder(builder: (context, setStateDialog) {
          return AlertDialog(
            backgroundColor: const Color(0xFF141414),
            title: const Text(
              'ตั้งค่าการเชื่อมต่อ Cloud',
              style: TextStyle(color: Colors.white),
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    controller: urlController,
                    style: const TextStyle(color: Colors.white),
                    decoration: const InputDecoration(
                      labelText: 'Cloud URL',
                      labelStyle: TextStyle(color: Colors.white70),
                      hintText: 'https://assadawut-jarvis.online',
                    ),
                    onChanged: (v) {
                      if (v.isNotEmpty && secretController.text.isNotEmpty) {
                        _fetchModels(v, secretController.text).then((_) => setStateDialog(() {}));
                      }
                    },
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: secretController,
                    obscureText: true,
                    style: const TextStyle(color: Colors.white),
                    decoration: const InputDecoration(
                      labelText: 'ATOM Secret (X-Atom-Secret)',
                      labelStyle: TextStyle(color: Colors.white70),
                      hintText: 'ใส่คีย์ความลับ',
                    ),
                    onChanged: (v) {
                      if (v.isNotEmpty && urlController.text.isNotEmpty) {
                        _fetchModels(urlController.text, v).then((_) => setStateDialog(() {}));
                      }
                    },
                  ),
                  const SizedBox(height: 24),
                  const Text('โมเดลที่ใช้งานได้:', style: TextStyle(color: Colors.white70)),
                  const SizedBox(height: 8),
                  if (_isLoadingModels)
                    const Center(child: CircularProgressIndicator())
                  else if (_availableModels.isEmpty)
                    const Text('ไม่พบโมเดล หรือการเชื่อมต่อผิดพลาด', style: TextStyle(color: Colors.redAccent))
                  else
                    DropdownButtonFormField<String>(
                      value: _selectedModel.isNotEmpty && _availableModels.contains(_selectedModel) ? _selectedModel : _availableModels.first,
                      dropdownColor: const Color(0xFF1F1F1F),
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      items: _availableModels.map((model) {
                        return DropdownMenuItem(
                          value: model,
                          child: Text(model),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setStateDialog(() {
                            _selectedModel = val;
                          });
                        }
                      },
                    ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext, false),
                child: const Text('ยกเลิก'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(dialogContext, true),
                child: const Text('บันทึก'),
              ),
            ],
          );
        });
      },
    );

    if (saved == true) {
      await widget.agents.updateConnection(
        urlController.text.trim(),
        secretController.text.trim(),
      );
      // In a real app, you might save _selectedModel to preferences and send it in API calls.
      messenger.showSnackBar(
        const SnackBar(content: Text('บันทึกการตั้งค่าการเชื่อมต่อแล้ว')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final a = widget.agents.agent;
    final voice = widget.agents.voice;
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        title: Text(a.name, style: TextStyle(color: a.color)),
        actions: [
          IconButton(
            tooltip: 'ตั้งค่าการเชื่อมต่อ Cloud',
            icon: const Icon(Icons.settings, color: Colors.white),
            onPressed: () => _setupConnection(context),
          ),
          IconButton(
            tooltip: widget.agents.muted ? 'เปิดเสียง' : 'Emergency Mute',
            icon: Icon(
              widget.agents.muted ? Icons.volume_off : Icons.volume_up,
              color: widget.agents.muted ? Colors.redAccent : Colors.white,
            ),
            onPressed: () => widget.agents.setMuted(!widget.agents.muted),
          ),
        ],
      ),
      body: ListenableBuilder(
        listenable: widget.agents,
        builder: (_, _) => Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                // Tappable Agent Orb!
                GestureDetector(
                  onTap: () => voice.toggleListen(
                    onResult: _handleVoiceResult,
                    askMasterKey: widget.askMasterKey,
                  ),
                  child: ListenableBuilder(
                    listenable: voice,
                    builder: (_, __) => AgentOrb(
                      agent: widget.agents.agent,
                      speaking: widget.agents.speaking,
                      muted: widget.agents.muted,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                
                // Voice status indicator
                ListenableBuilder(
                  listenable: voice,
                  builder: (_, __) {
                    if (voice.listening) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.red.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.redAccent),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.mic, color: Colors.redAccent, size: 16),
                            SizedBox(width: 6),
                            Text(
                              'กำลังฟังเสียงของคุณ...',
                              style: TextStyle(color: Colors.redAccent, fontSize: 13, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      );
                    }
                    if (widget.agents.speaking) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: a.color.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: a.color),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.volume_up, color: a.color, size: 16),
                            const SizedBox(width: 6),
                            Text(
                              '${a.name} กำลังพูด...',
                              style: TextStyle(color: a.color, fontSize: 13, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      );
                    }
                    return Text(
                      '⚡ แตะลูกแก้ว Orb หรือปุ่มไมค์เพื่อสั่งงานด้วยเสียง',
                      style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 12),
                    );
                  },
                ),
                
                const SizedBox(height: 16),
                
                // Live transcript & Memory Save Button
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF141414),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white12),
                  ),
                  child: Column(
                    children: [
                      if (_lastTranscript.isNotEmpty) ...[
                        Text(
                          _lastTranscript,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Colors.white70, fontSize: 14),
                        ),
                        const SizedBox(height: 8),
                      ],
                      if (_lastAIResponse.isNotEmpty) ...[
                        Text(
                          '${a.name}: "$_lastAIResponse"',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: a.color, fontSize: 14, fontWeight: FontWeight.w500),
                        ),
                        const SizedBox(height: 16),
                        MemorySaveButton(textToSave: _lastAIResponse),
                      ],
                    ],
                  ),
                ),

                const SizedBox(height: 20),
                
                // Memory Settings Custom Input Form
                // (Moved to Memory Screen)
                const SizedBox(height: 20),

                Wrap(
                  spacing: 8,
                  alignment: WrapAlignment.center,
                  children: [
                    for (final ag in AppConfig.agents)
                      ChoiceChip(
                        label: Text(ag.name),
                        selected: widget.agents.agentId == ag.id,
                        selectedColor: ag.color.withValues(alpha: 0.35),
                        onSelected: (_) => _switch(context, ag.id),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                const Text(
                  'พูดว่า "ต่อสายไฟรเดย์" / "ต่อสายอัลตรอน" / "ตัดสายกลับมาอะตอม"',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white54, fontSize: 12),
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    ListenableBuilder(
                      listenable: voice,
                      builder: (_, __) => FloatingActionButton.extended(
                        backgroundColor: voice.listening ? Colors.redAccent : a.color,
                        onPressed: () => voice.toggleListen(
                          onResult: _handleVoiceResult,
                          askMasterKey: widget.askMasterKey,
                        ),
                        icon: Icon(
                          voice.listening ? Icons.mic_off : Icons.mic,
                          color: Colors.black,
                        ),
                        label: Text(
                          voice.listening ? 'กำลังฟัง...' : 'กดเพื่อพูด',
                          style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    FilledButton.icon(
                      onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ChatScreen(
                            agents: widget.agents,
                            askMasterKey: widget.askMasterKey,
                          ),
                        ),
                      ),
                      icon: const Icon(Icons.chat),
                      label: const Text('แชทพิมพ์'),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    OutlinedButton.icon(
                      onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const MemoryScreen()),
                      ),
                      icon: const Icon(Icons.auto_awesome_mosaic, color: Colors.blueAccent),
                      label: const Text('จัดการความทรงจำ', style: TextStyle(color: Colors.blueAccent)),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Colors.blueAccent),
                      ),
                    ),
                  ],
                ),
                if (widget.agents.error != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    widget.agents.error!,
                    style: const TextStyle(color: Colors.redAccent),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
