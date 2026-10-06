import 'package:flutter/material.dart';

// Single source of truth: agent identity, colors, wake phrases.
class AgentDef {
  final String id;
  final String name;
  final String wake;
  final Color color;
  final Color glow;
  const AgentDef(this.id, this.name, this.wake, this.color, this.glow);
}

class AppConfig {
  static const defaultBaseUrl = 'https://assadawut-jarvis.online';
  static const agents = <AgentDef>[
    AgentDef('atom', 'A.T.O.M.', 'ตัดสายกลับมาอะตอม',
        Color(0xFF29B6F6), Color(0xFF01579B)),
    AgentDef('friday', 'F.R.I.D.A.Y.', 'ต่อสายไฟรเดย์',
        Color(0xFF00E676), Color(0xFF004D40)),
    AgentDef('ultron', 'U.L.T.R.O.N.', 'ต่อสายอัลตรอน',
        Color(0xFFFF3D00), Color(0xFF3E0A00)),
  ];

  static const prefsBaseUrl = 'atom_base_url';
  static const prefsSecret = 'atom_secret';
  static const prefsAgent = 'atom_agent';
  static const prefsMasterHash = 'atom_master_hash';
  static const prefsMasterSalt = 'atom_master_salt';

  static AgentDef agentOf(String id) =>
      agents.firstWhere((a) => a.id == id, orElse: () => agents.first);
}
