import 'package:flutter/material.dart';

import '../services/agent_state.dart';
import '../services/pipeline_coordinator.dart';

// Chat that shares the global VoiceBrain & syncs to cloud-core chat_history.
class ChatScreen extends StatefulWidget {
  final AgentState agents;
  final Future<bool> Function() askMasterKey;
  const ChatScreen(
      {super.key, required this.agents, required this.askMasterKey});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatMsg {
  final String role;
  final String text;
  _ChatMsg(this.role, this.text);
}

class _ChatScreenState extends State<ChatScreen> {
  final _ctl = TextEditingController();
  final _items = <_ChatMsg>[];
  bool _sending = false;
  String get _session => 'mobile-${widget.agents.agentId}';

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    final api = widget.agents.api;
    if (api == null || api.secret.isEmpty) return;
    try {
      final h = await api.chatHistory(_session);
      if (!mounted) return;
      setState(() {
        for (final m in h.reversed.take(20)) {
          final mm = m as Map;
          _items.add(_ChatMsg('${mm['role']}', '${mm['message']}'));
        }
      });
    } catch (_) {
      // Offline mode or cloud not reached
    }
  }

  Future<void> _send(String text) async {
    final t = text.trim();
    if (t.isEmpty || _sending) return;
    final api = widget.agents.api;
    final voice = widget.agents.voice;
    setState(() {
      _items.add(_ChatMsg('user', t));
      _sending = true;
    });
    _ctl.clear();

    final pipeline = PipelineCoordinator();
    final res = await pipeline.processPipeline(t);
    String reply = res.message;

    try {
      if (api != null && api.secret.isNotEmpty) {
        // We still log to cloud history if needed
        await api.chatAppend(_session, 'user', t);
        await api.chatAppend(_session, 'assistant', reply);
      }
    } catch (e) {
      debugPrint('Cloud sync error: $e');
    } finally {
      if (mounted) {
        setState(() {
          _items.add(_ChatMsg('assistant', reply));
          _sending = false;
        });
        await voice.speak(reply);
      }
    }
  }

  // removed _localReply

  @override
  void dispose() {
    _ctl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final voice = widget.agents.voice;
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        title: Text('คุยกับ ${widget.agents.agent.name}',
            style: const TextStyle(color: Colors.white)),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: _items.length,
              itemBuilder: (_, i) {
                final m = _items[i];
                final me = m.role == 'user';
                return Align(
                  alignment: me ? Alignment.centerRight : Alignment.centerLeft,
                  child: GestureDetector(
                    onLongPress: () async {
                      final pipeline = PipelineCoordinator();
                      final success = await pipeline.ingestMemory(
                        m.text,
                        customId: 'msg_${DateTime.now().millisecondsSinceEpoch}',
                      );
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(success 
                                ? '✅ บันทึกความจำลง Supermemory สำเร็จ!' 
                                : '❌ ไม่สามารถบันทึกความจำได้ (ตรวจสอบ API Key)'),
                          ),
                        );
                      }
                    },
                    child: Container(
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: me
                            ? const Color(0xFF1E3A5F)
                            : const Color(0xFF1B1B1B),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(m.text,
                          style: const TextStyle(color: Colors.white)),
                    ),
                  ),
                );
              },
            ),
          ),
          SafeArea(
            child: Row(
              children: [
                IconButton(
                  tooltip: 'พูด',
                  icon: const Icon(Icons.mic, color: Colors.white),
                  onPressed: () => voice.toggleListen(
                    onResult: _send,
                    askMasterKey: widget.askMasterKey,
                  ),
                ),
                Expanded(
                  child: TextField(
                    controller: _ctl,
                    style: const TextStyle(color: Colors.white),
                    decoration: const InputDecoration(
                        hintText: 'พิมพ์คุยกับลูกพี่...',
                        hintStyle: TextStyle(color: Colors.white38)),
                    onSubmitted: _send,
                  ),
                ),
                _sending
                    ? const Padding(
                        padding: EdgeInsets.all(12),
                        child: SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2)),
                      )
                    : IconButton(
                        icon: const Icon(Icons.send, color: Colors.white),
                        onPressed: () => _send(_ctl.text),
                      ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
