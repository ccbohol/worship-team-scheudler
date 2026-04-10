import 'package:cloud_firestore/cloud_firestore.dart';

import '../domain/shared_schedule.dart';

class ScheduleRepository {
  ScheduleRepository()
      : _sharedDoc = FirebaseFirestore.instance
            .collection("worshipScheduler")
            .doc("sharedState");

  final DocumentReference<Map<String, dynamic>> _sharedDoc;

  Stream<SharedSchedule> watchSharedSchedule() {
    return _sharedDoc.snapshots().map((snapshot) {
      final data = snapshot.data() ?? const <String, dynamic>{};
      return SharedSchedule.fromMap(data);
    });
  }
}
