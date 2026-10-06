import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../core/config.dart';

// 3D-feel particle orb on OLED black. Color + pulse motion + label per agent.
class AgentOrb extends StatefulWidget {
  final AgentDef agent;
  final bool speaking;
  final bool muted;
  const AgentOrb({
    super.key,
    required this.agent,
    this.speaking = false,
    this.muted = false,
  });

  @override
  State<AgentOrb> createState() => _AgentOrbState();
}

class _AgentOrbState extends State<AgentOrb>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(vsync: this, duration: const Duration(seconds: 3))
      ..repeat();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final a = widget.agent;
    final scale = widget.speaking ? 1.08 : 1.0;
    return AnimatedBuilder(
      animation: _c,
      builder: (ctx, _) {
        final t = _c.value * 2 * math.pi;
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 220 * scale,
              height: 220 * scale,
              child: CustomPaint(
                painter: _OrbPainter(
                  color: widget.muted ? Colors.grey : a.color,
                  glow: a.glow,
                  t: t,
                  speaking: widget.speaking,
                ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  widget.muted
                      ? Icons.volume_off
                      : widget.speaking
                      ? Icons.graphic_eq
                      : Icons.circle,
                  size: 14,
                  color: widget.muted ? Colors.redAccent : a.color,
                ),
                const SizedBox(width: 6),
                Text(
                  a.name,
                  style: TextStyle(
                    color: a.color,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 2,
                  ),
                ),
              ],
            ),
          ],
        );
      },
    );
  }
}

class _OrbPainter extends CustomPainter {
  final Color color;
  final Color glow;
  final double t;
  final bool speaking;
  _OrbPainter({
    required this.color,
    required this.glow,
    required this.t,
    required this.speaking,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final c = size.center(Offset.zero);
    final r = size.width / 2;
    final amp = speaking ? 6.0 : 2.5;
    for (var i = 5; i >= 1; i--) {
      final rr = r * i / 5 + math.sin(t + i) * amp * (i / 5);
      canvas.drawCircle(
        c,
        rr,
        Paint()
          ..color = (i == 5 ? glow : color).withValues(
            alpha: 0.10 + 0.06 * (5 - i),
          )
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 12),
      );
    }
    canvas.drawCircle(
      c,
      r * 0.52 + math.sin(t * 2) * amp * 0.5,
      Paint()
        ..shader = RadialGradient(
          colors: [Colors.white.withValues(alpha: 0.95), color, glow],
        ).createShader(Rect.fromCircle(center: c, radius: r * 0.6)),
    );
    final rnd = math.Random(7);
    final dot = Paint()..color = Colors.white.withValues(alpha: 0.8);
    for (var i = 0; i < 40; i++) {
      final ang =
          rnd.nextDouble() * 2 * math.pi + t * (0.2 + rnd.nextDouble() * 0.3);
      final dist = r * (0.55 + rnd.nextDouble() * 0.45);
      canvas.drawCircle(
        Offset(c.dx + math.cos(ang) * dist, c.dy + math.sin(ang) * dist),
        1.2 + rnd.nextDouble() * 1.8,
        dot,
      );
    }
  }

  @override
  bool shouldRepaint(_OrbPainter old) => old.t != t || old.color != color;
}
