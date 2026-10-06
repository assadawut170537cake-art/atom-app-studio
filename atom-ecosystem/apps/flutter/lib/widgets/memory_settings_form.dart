import 'package:flutter/material.dart';
import '../services/pipeline_coordinator.dart';

class MemorySettingsForm extends StatefulWidget {
  const MemorySettingsForm({super.key});

  @override
  State<MemorySettingsForm> createState() => _MemorySettingsFormState();
}

class _MemorySettingsFormState extends State<MemorySettingsForm> {
  final _controller = TextEditingController();
  String _status = 'idle'; // 'idle', 'loading', 'success', 'error'

  Future<void> _handleSubmit() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    setState(() => _status = 'loading');

    try {
      final pipeline = PipelineCoordinator();
      // Simulate or call real memory ingestion
      await Future.delayed(const Duration(seconds: 1)); // Mock Network Call

      if (mounted) {
        setState(() {
          _status = 'success';
          _controller.clear();
        });

        // Hide success message after 3 seconds
        Future.delayed(const Duration(seconds: 3), () {
          if (mounted) setState(() => _status = 'idle');
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _status = 'error');
        debugPrint("Failed to save memory: $e");
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF141414), // Darker gray surface
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          const Row(
            children: [
              Icon(Icons.psychology, color: Colors.blueAccent, size: 24),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'สิ่งที่ต้องการให้ AI จำเกี่ยวกับคุณ',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'ข้อมูลตรงนี้จะช่วยให้ AI เข้าใจบริบทและตอบคำถามคุณได้ดียิ่งขึ้นในอนาคต',
            style: TextStyle(color: Colors.white54, fontSize: 13),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _controller,
            maxLines: 4,
            style: const TextStyle(color: Colors.white, fontSize: 14),
            decoration: InputDecoration(
              hintText: 'เช่น ฉันแพ้อาหารทะเล, ฉันชอบเขียนโค้ดภาษา Python...',
              hintStyle: const TextStyle(color: Colors.white38),
              filled: true,
              fillColor: Colors.black45,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Colors.white24),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Colors.white12),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Colors.blueAccent),
              ),
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _status == 'loading' || _controller.text.trim().isEmpty 
                  ? null 
                  : _handleSubmit,
              style: FilledButton.styleFrom(
                backgroundColor: Colors.blue[600],
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: Text(
                _status == 'loading' ? 'กำลังบันทึกข้อมูล...' : 'เพิ่มลงในความจำ',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ),
          if (_status == 'success') ...[
            const SizedBox(height: 12),
            const Center(
              child: Text(
                '✓ อัปเดตความจำสำเร็จ!',
                style: TextStyle(color: Colors.greenAccent, fontSize: 13, fontWeight: FontWeight.bold),
              ),
            ),
          ],
          if (_status == 'error') ...[
            const SizedBox(height: 12),
            const Center(
              child: Text(
                'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
                style: TextStyle(color: Colors.redAccent, fontSize: 13, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
