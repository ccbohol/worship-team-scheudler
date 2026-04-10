import 'package:flutter/material.dart';

import 'features/shell/presentation/home_shell.dart';

class WorshipTeamMobileApp extends StatelessWidget {
  const WorshipTeamMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    final scheme = ColorScheme.fromSeed(
      seedColor: const Color(0xFF3FB6D8),
      brightness: Brightness.dark,
    );

    return MaterialApp(
      title: "Worship Team Scheduler",
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: scheme,
        scaffoldBackgroundColor: const Color(0xFF07111F),
        useMaterial3: true,
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.transparent,
          foregroundColor: Color(0xFFEEF4FF),
          elevation: 0,
        ),
        cardTheme: CardThemeData(
          color: const Color(0xFF132646),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
        ),
      ),
      home: const HomeShell(),
    );
  }
}
