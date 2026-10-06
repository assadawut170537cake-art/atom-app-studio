import 'package:flutter/material.dart';

import 'screens/home_screen.dart';
import 'services/agent_state.dart';
import 'services/master_gate.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const AtomApp());
}

class AtomApp extends StatefulWidget {
  const AtomApp({super.key});

  @override
  State<AtomApp> createState() => _AtomAppState();
}

class _AtomAppState extends State<AtomApp> {
  final AgentState _agents = AgentState();
  late final Future<void> _load = _agents.load();

  Future<bool> _askMasterKey() async {
    final controller = TextEditingController();
    final pin = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('ยืนยัน Master Key'),
        content: TextField(
          controller: controller,
          autofocus: true,
          obscureText: true,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'รหัส Master Key'),
          onSubmitted: (value) => Navigator.of(context).pop(value),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('ยกเลิก'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(controller.text.trim()),
            child: const Text('ยืนยัน'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (pin == null) return false;
    return MasterGate.verify(pin);
  }

  @override
  void dispose() {
    _agents.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'A.T.O.M.',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF29B6F6),
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: Colors.black,
      ),
      home: FutureBuilder<void>(
        future: _load,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Scaffold(
              body: Center(
                child: Text('โหลดการตั้งค่าไม่สำเร็จ: ${snapshot.error}'),
              ),
            );
          }
          if (snapshot.connectionState != ConnectionState.done) {
            return const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            );
          }
          return HomeScreen(
            agents: _agents,
            askMasterKey: _askMasterKey,
            go: (_) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('หน้าอนุมัติยังไม่พร้อมใช้งาน')),
              );
            },
          );
        },
      ),
    );
  }
}
