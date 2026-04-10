class SharedSchedule {
  SharedSchedule({
    required this.members,
    required this.services,
  });

  final List<ScheduleMember> members;
  final List<ScheduleService> services;

  factory SharedSchedule.fromMap(Map<String, dynamic> data) {
    final rawMembers = (data["members"] as List<dynamic>? ?? const [])
        .cast<Map<String, dynamic>>();
    final rawServices = (data["services"] as List<dynamic>? ?? const [])
        .cast<Map<String, dynamic>>();

    return SharedSchedule(
      members: rawMembers.map(ScheduleMember.fromMap).toList(),
      services: rawServices.map(ScheduleService.fromMap).toList(),
    );
  }
}

class ScheduleMember {
  ScheduleMember({
    required this.id,
    required this.name,
    required this.defaultRole,
  });

  final String id;
  final String name;
  final String defaultRole;

  factory ScheduleMember.fromMap(Map<String, dynamic> data) {
    return ScheduleMember(
      id: data["id"] as String? ?? "",
      name: data["name"] as String? ?? "",
      defaultRole: data["defaultRole"] as String? ?? "",
    );
  }
}

class ScheduleService {
  ScheduleService({
    required this.id,
    required this.title,
    required this.date,
    required this.time,
  });

  final String id;
  final String title;
  final String date;
  final String time;

  factory ScheduleService.fromMap(Map<String, dynamic> data) {
    return ScheduleService(
      id: data["id"] as String? ?? "",
      title: data["title"] as String? ?? "",
      date: data["date"] as String? ?? "",
      time: data["time"] as String? ?? "",
    );
  }
}
