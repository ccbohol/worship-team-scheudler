import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../../auth/data/auth_service.dart';
import '../../schedule/data/schedule_repository.dart';
import '../../schedule/domain/shared_schedule.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  final AuthService _authService = AuthService();
  final ScheduleRepository _scheduleRepository = ScheduleRepository();

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<User?>(
      stream: _authService.authStateChanges,
      builder: (context, authSnapshot) {
        final user = authSnapshot.data;

        return Scaffold(
          appBar: AppBar(
            title: const Text("Worship Team Scheduler"),
            actions: [
              if (user != null)
                IconButton(
                  tooltip: "Sign out",
                  onPressed: _authService.signOut,
                  icon: const Icon(Icons.logout),
                ),
            ],
          ),
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: user == null
                  ? _SignedOutView(authService: _authService)
                  : _SignedInView(
                      user: user,
                      repository: _scheduleRepository,
                    ),
            ),
          ),
        );
      },
    );
  }
}

class _SignedOutView extends StatelessWidget {
  const _SignedOutView({required this.authService});

  final AuthService authService;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                "Church Production Suite",
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: const Color(0xFFE2B86F),
                      letterSpacing: 1.5,
                    ),
              ),
              const SizedBox(height: 12),
              Text(
                "Sign in to access the shared worship schedule.",
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 12),
              Text(
                "This mobile app uses the same Firebase backend as the live web scheduler.",
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: const Color(0xFFA8B7D4),
                    ),
              ),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: authService.signInWithGoogle,
                icon: const Icon(Icons.login),
                label: const Text("Sign in with Google"),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SignedInView extends StatelessWidget {
  const _SignedInView({
    required this.user,
    required this.repository,
  });

  final User user;
  final ScheduleRepository repository;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  user.email ?? "Signed in user",
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 6),
                SelectableText(
                  "UID: ${user.uid}",
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: const Color(0xFFA8B7D4),
                      ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Expanded(
          child: StreamBuilder<SharedSchedule>(
            stream: repository.watchSharedSchedule(),
            builder: (context, snapshot) {
              if (snapshot.hasError) {
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Text(
                      "Firebase access error. If rules are enabled, add this UID to allowedUsers.",
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                  ),
                );
              }

              if (!snapshot.hasData) {
                return const Center(child: CircularProgressIndicator());
              }

              final schedule = snapshot.data!;

              return ListView(
                children: [
                  Card(
                    child: ListTile(
                      title: const Text("Team Directory"),
                      subtitle: Text("${schedule.members.length} shared members"),
                    ),
                  ),
                  const SizedBox(height: 12),
                  ...schedule.services.map(
                    (service) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Card(
                        child: ListTile(
                          title: Text(service.title),
                          subtitle: Text("${service.date} • ${service.time}"),
                        ),
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ],
    );
  }
}
