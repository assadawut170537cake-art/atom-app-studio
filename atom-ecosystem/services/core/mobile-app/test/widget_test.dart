import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:atom_app/main.dart';

void main() {
  testWidgets('starts on the ATOM agent', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const AtomApp());
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    final atomChip =
        tester.widget<ChoiceChip>(find.widgetWithText(ChoiceChip, 'A.T.O.M.'));
    final fridayChip = tester
        .widget<ChoiceChip>(find.widgetWithText(ChoiceChip, 'F.R.I.D.A.Y.'));
    expect(atomChip.selected, isTrue);
    expect(fridayChip.selected, isFalse);
  });
}
