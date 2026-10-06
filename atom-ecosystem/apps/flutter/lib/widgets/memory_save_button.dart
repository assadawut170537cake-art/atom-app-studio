import 'package:flutter/material.dart';
import '../services/pipeline_coordinator.dart';

// Button to save a specific text (like last chat message) to the vector memory.
class MemorySaveButton extends StatefulWidget {
  final String textToSave;
  
  const MemorySaveButton({super.key, required this.textToSave});

  @override
  State<MemorySaveButton> createState() => _MemorySaveButtonState();
}

class _MemorySaveButtonState extends State<MemorySaveButton> {
  bool _isSaving = false;
  bool _isSaved = false;

  Future<void> _handleSaveMemory() async {
    if (widget.textToSave.trim().isEmpty) return;
    
    setState(() {
      _isSaving = true;
      _isSaved = false;
    });

    try {
      final pipeline = PipelineCoordinator();
      
      // Simulate memory ingestion or real API call via PipelineCoordinator
      // Replace with actual memory upload/vector storage call if needed.
      await Future.delayed(const Duration(seconds: 1)); // Mock Network Call
      
      if (mounted) {
        setState(() {
          _isSaved = true;
          _isSaving = false;
        });
        
        // Reset button state after 3 seconds
        Future.delayed(const Duration(seconds: 3), () {
          if (mounted) setState(() => _isSaved = false);
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSaving = false);
        debugPrint("Failed to save memory: $e");
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.textToSave.trim().isEmpty) {
      return const SizedBox.shrink();
    }

    final bgColor = _isSaved 
        ? Colors.green.withOpacity(0.2) 
        : Colors.white.withOpacity(0.1);
    
    final textColor = _isSaved ? Colors.greenAccent : Colors.white70;

    return InkWell(
      onTap: _isSaving ? null : _handleSaveMemory,
      borderRadius: BorderRadius.circular(8),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_isSaving)
              const SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white70),
              )
            else if (_isSaved)
              const Icon(Icons.check, size: 16, color: Colors.greenAccent)
            else
              const Icon(Icons.psychology, size: 16, color: Colors.white70),
              
            const SizedBox(width: 8),
            Text(
              _isSaving ? 'กำลังบันทึก...' : _isSaved ? 'บันทึกเข้าความจำแล้ว' : 'จำข้อความนี้',
              style: TextStyle(color: textColor, fontSize: 13, fontWeight: FontWeight.w500),
            ),
          ],
        ),
      ),
    );
  }
}
