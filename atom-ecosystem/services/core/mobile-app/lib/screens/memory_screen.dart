import 'package:flutter/material.dart';
import '../widgets/memory_settings_form.dart';

class MemoryScreen extends StatelessWidget {
  const MemoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        iconTheme: const IconThemeData(color: Colors.white),
        title: const Text('ความทรงจำ', style: TextStyle(color: Colors.white)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'ไฟล์ JSON เดียว อ่านได้และเป็นของคุณเอง แอป Mac ก็ส่งออกไฟล์รูปแบบเดียวกัน ความทรงจำจึงย้ายไปมาได้ทั้งสองทาง',
              style: TextStyle(color: Colors.white70, fontSize: 14),
            ),
            const SizedBox(height: 24),
            
            // Re-using the memory form component we built earlier
            const MemorySettingsForm(),

            const SizedBox(height: 32),
            _buildListTile('ทุกอย่างที่ Jarvis จำได้', 'เปิด', context),
            _buildListTile('ส่งออกความทรงจำเป็นไฟล์', 'แชร์', context),
            _buildListTile('นำเข้าจาก Mac หรือโทรศัพท์เครื่องอื่น', 'เลือกไฟล์', context),
          ],
        ),
      ),
    );
  }

  Widget _buildListTile(String title, String action, BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Colors.white12)),
      ),
      child: ListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(title, style: const TextStyle(color: Colors.white)),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(action, style: const TextStyle(color: Colors.blueAccent)),
            const SizedBox(width: 4),
            const Icon(Icons.chevron_right, color: Colors.blueAccent, size: 20),
          ],
        ),
        onTap: () {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('ฟีเจอร์ "$title" กำลังพัฒนา')),
          );
        },
      ),
    );
  }
}
