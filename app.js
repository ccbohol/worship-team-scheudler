import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  doc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const STORAGE_KEY = "worship-team-scheduler-v1";

const roleSlots = [
  { role: "Worship Leader" },
  { role: "Singer", label: "Singer 1" },
  { role: "Singer", label: "Singer 2" },
  { role: "Bass Player" },
  { role: "Keyboardist" },
  { role: "Electric Guitar Player" },
  { role: "Drummer" },
  { role: "Acoustic Guitar Player" },
  { role: "Audio Tech" },
  { role: "Multimedia Tech" },
  { role: "Livestream Tech" },
];

const defaultMembers = [
  { name: "Chris B.", defaultRole: "Worship Leader" },
  { name: "Isabelle D.", defaultRole: "Worship Leader" },
  { name: "Heather R.", defaultRole: "Worship Leader" },
  { name: "Susie H.", defaultRole: "Worship Leader" },
  { name: "Sheri J.", defaultRole: "Singer" },
  { name: "Grace H.", defaultRole: "Keyboardist" },
  { name: "Mark J.", defaultRole: "Electric Guitar Player" },
  { name: "Reggie C.", defaultRole: "Bass Player" },
  { name: "Cathi M.", defaultRole: "Drummer" },
  { name: "Matt A.", defaultRole: "Drummer" },
  { name: "Amanda C.", defaultRole: "Multimedia Tech" },
  { name: "Jacob R.", defaultRole: "Multimedia Tech" },
  { name: "Lilly C.", defaultRole: "Multimedia Tech" },
  { name: "Fanny B.", defaultRole: "Multimedia Tech" },
  { name: "Dy B.", defaultRole: "Livestream Tech" },
  { name: "Jesus M.", defaultRole: "Audio Tech" },
  { name: "Harry M.", defaultRole: "Audio Tech" },
];

const initialState = {
  members: [],
  services: [],
};

const state = loadState();

const roleSummary = document.querySelector("#roleSummary");
const memberRole = document.querySelector("#memberRole");
const memberList = document.querySelector("#memberList");
const memberForm = document.querySelector("#memberForm");
const serviceForm = document.querySelector("#serviceForm");
const serviceList = document.querySelector("#serviceList");
const emptyState = document.querySelector("#emptyState");
const serviceCardTemplate = document.querySelector("#serviceCardTemplate");
const seedDemoButton = document.querySelector("#seedDemoButton");
const clearAllButton = document.querySelector("#clearAllButton");
const exportPdfButton = document.querySelector("#exportPdfButton");
const exportWordButton = document.querySelector("#exportWordButton");
const syncStatus = document.querySelector("#syncStatus");
const signInButton = document.querySelector("#signInButton");
const signOutButton = document.querySelector("#signOutButton");
const authInfo = document.querySelector("#authInfo");
const authUser = document.querySelector("#authUser");
const authUid = document.querySelector("#authUid");

let firebaseApp = null;
let firebaseAuth = null;
let firestoreDb = null;
let sharedDocRef = null;
let googleProvider = null;
let isRemoteSyncEnabled = false;
let isApplyingRemoteState = false;
let remoteUnsubscribe = null;
let isFirebaseConfigured = false;
let currentUser = null;

applyNormalizedState(state);
updateSyncStatus("Sync mode: local browser storage");
renderRoleSummary();
renderRoleOptions();
render();
setDefaultServiceDate();
initFirebaseSync();

signInButton.addEventListener("click", async () => {
  if (!firebaseAuth || !googleProvider) {
    return;
  }

  try {
    await signInWithPopup(firebaseAuth, googleProvider);
  } catch (error) {
    updateSyncStatus("Sign-in failed. Check Google sign-in settings and authorized domains.");
  }
});

signOutButton.addEventListener("click", async () => {
  if (!firebaseAuth) {
    return;
  }

  await firebaseSignOut(firebaseAuth);
});

memberForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(memberForm);
  const name = formData.get("memberName").toString().trim();
  const defaultRole = formData.get("memberRole").toString();

  if (!name) {
    return;
  }

  state.members.push({
    id: crypto.randomUUID(),
    name,
    defaultRole,
  });

  persistState();
  memberForm.reset();
  renderRoleOptions();
  render();
});

serviceForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(serviceForm);
  const serviceTitle = formData.get("serviceTitle").toString().trim();
  const serviceDate = formData.get("serviceDate").toString();
  const serviceTime = formData.get("serviceTime").toString();
  const sundayRehearsalDate = formData.get("sundayRehearsalDate").toString();
  const sundayRehearsalTime = formData.get("sundayRehearsalTime").toString();
  const thursdayRehearsalDate = formData.get("thursdayRehearsalDate").toString();
  const thursdayRehearsalTime = formData.get("thursdayRehearsalTime").toString();
  const songList = formData.get("songList").toString().trim();
  const reminders = formData.get("serviceReminders").toString().trim();
  const serviceNotes = formData.get("serviceNotes").toString().trim();

  if (!serviceTitle || !serviceDate || !serviceTime) {
    return;
  }

  state.services.unshift({
    id: crypto.randomUUID(),
    title: serviceTitle,
    date: serviceDate,
    time: serviceTime,
    sundayRehearsalDate,
    sundayRehearsalTime,
    thursdayRehearsalDate,
    thursdayRehearsalTime,
    songList,
    reminders,
    notes: serviceNotes,
    assignments: Object.fromEntries(
      roleSlots.map((slot, index) => [getAssignmentKey(slot.role, index), ""])
    ),
  });

  sortServices();
  persistState();
  serviceForm.reset();
  setDefaultServiceDate();
  render();
});

seedDemoButton.addEventListener("click", () => {
  if (state.members.length === 0) {
    state.members = defaultMembers.map((member) => ({
      id: crypto.randomUUID(),
      ...member,
    }));
  }

  if (state.services.length === 0) {
    state.services = [
      createDemoService("Sunday Morning Worship", 0, "09:00", "Call time: 7:45 AM"),
      createDemoService("Midweek Prayer Night", 4, "19:00", "Keep the set acoustic and reflective"),
    ];
  }

  persistState();
  render();
});

clearAllButton.addEventListener("click", () => {
  state.members = [];
  state.services = [];
  persistState();
  render();
  renderRoleOptions();
});

exportPdfButton.addEventListener("click", () => {
  if (state.services.length === 0) {
    return;
  }

  exportScheduleAsPdf();
});

exportWordButton.addEventListener("click", () => {
  if (state.services.length === 0) {
    return;
  }

  exportScheduleAsWord();
});

function render() {
  renderMembers();
  renderServices();
  syncExportButtons();
  syncInteractionLock();
}

function renderRoleSummary() {
  roleSummary.innerHTML = "";

  getRoleSummaryLabels().forEach((role) => {
    const item = document.createElement("li");
    item.textContent = role;
    roleSummary.append(item);
  });
}

function renderRoleOptions() {
  memberRole.innerHTML = [...new Set(roleSlots.map((slot) => slot.role))]
    .map((role) => `<option value="${role}">${role}</option>`)
    .join("");
}

function renderMembers() {
  memberList.innerHTML = "";

  if (state.members.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "section-note";
    emptyMessage.textContent = "No team members added yet.";
    memberList.append(emptyMessage);
    return;
  }

  const sortedMembers = [...state.members].sort((left, right) =>
    left.name.localeCompare(right.name)
  );

  sortedMembers.forEach((member) => {
    const chip = document.createElement("div");
    chip.className = "member-chip";

    const copy = document.createElement("div");
    const name = document.createElement("p");
    name.textContent = member.name;
    const role = document.createElement("p");
    role.className = "member-role";
    role.textContent = member.defaultRole;

    copy.append(name, role);

    const removeButton = document.createElement("button");
    removeButton.className = "ghost-button";
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => removeMember(member.id));

    chip.append(copy, removeButton);
    memberList.append(chip);
  });
}

function renderServices() {
  serviceList.innerHTML = "";

  if (state.services.length === 0) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  state.services.forEach((service) => {
    const fragment = serviceCardTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".service-card");
    const date = fragment.querySelector(".service-date");
    const title = fragment.querySelector(".service-title");
    const notes = fragment.querySelector(".service-notes");
    const details = fragment.querySelector(".service-details");
    const deleteButton = fragment.querySelector(".delete-service-button");
    const assignmentGrid = fragment.querySelector(".assignment-grid");

    date.textContent = `${formatDate(service.date)} at ${formatTime(service.time)}`;
    title.textContent = service.title;
    notes.textContent = service.notes || "No notes added yet.";
    renderServiceDetails(details, service);

    deleteButton.addEventListener("click", () => {
      state.services = state.services.filter((item) => item.id !== service.id);
      persistState();
      render();
    });
    deleteButton.disabled = !canEditSharedData();

    roleSlots.forEach((slot, index) => {
      const assignmentCard = document.createElement("div");
      assignmentCard.className = "assignment-card";

      const label = document.createElement("label");
      const roleLabel = document.createElement("span");
      roleLabel.textContent = slot.label || slot.role;

      const select = document.createElement("select");
      const roleKey = getAssignmentKey(slot.role, index);
      const assignedMemberId = service.assignments[roleKey] || "";
      select.innerHTML = buildMemberOptions(slot.role, assignedMemberId);
      select.addEventListener("change", (event) => {
        service.assignments[roleKey] = event.target.value;
        persistState();
        render();
      });
      select.disabled = !canEditSharedData();

      const status = document.createElement("span");
      status.className = "status-pill";
      status.textContent = assignedMemberId ? "Assigned" : "Needs coverage";

      label.append(roleLabel, select);
      assignmentCard.append(label, status);
      assignmentGrid.append(assignmentCard);
    });

    serviceList.append(card);
  });
}

function buildMemberOptions(roleName, assignedMemberId) {
  const roleMatches = state.members.filter((member) => member.defaultRole === roleName);
  const otherMembers = state.members.filter((member) => member.defaultRole !== roleName);
  const orderedMembers = [...roleMatches, ...otherMembers];

  const options = ['<option value="">Select a team member</option>'];

  orderedMembers.forEach((member) => {
    const selected = member.id === assignedMemberId ? "selected" : "";
    options.push(
      `<option value="${member.id}" ${selected}>${member.name} (${member.defaultRole})</option>`
    );
  });

  return options.join("");
}

function syncExportButtons() {
  const hasServices = state.services.length > 0;
  exportPdfButton.disabled = !hasServices;
  exportWordButton.disabled = !hasServices;
}

function syncInteractionLock() {
  const editingEnabled = canEditSharedData();
  toggleFormDisabled(serviceForm, !editingEnabled);
  toggleFormDisabled(memberForm, !editingEnabled);
  seedDemoButton.disabled = !editingEnabled;
  clearAllButton.disabled = !editingEnabled;
}

function toggleFormDisabled(formElement, disabled) {
  Array.from(formElement.elements).forEach((element) => {
    element.disabled = disabled;
  });
}

function renderServiceDetails(container, service) {
  container.innerHTML = "";

  const detailItems = [
    {
      label: "Sunday Rehearsal",
      value: formatRehearsal(service.sundayRehearsalDate, service.sundayRehearsalTime),
    },
    {
      label: "Thursday Rehearsal",
      value: formatRehearsal(service.thursdayRehearsalDate, service.thursdayRehearsalTime),
    },
    {
      label: "Song List",
      list: getSongListItems(service.songList),
      empty: "No song list added.",
    },
    {
      label: "Reminders",
      value: service.reminders || "No reminders added.",
    },
  ];

  detailItems.forEach((item) => {
    const detailCard = document.createElement("div");
    detailCard.className = "detail-card";

    const label = document.createElement("p");
    label.className = "detail-label";
    label.textContent = item.label;

    const value = item.list ? renderDetailList(item.list, item.empty) : document.createElement("p");

    if (!item.list) {
      value.textContent = item.value;
    }

    detailCard.append(label, value);
    container.append(detailCard);
  });
}

function removeMember(memberId) {
  state.members = state.members.filter((member) => member.id !== memberId);

  state.services.forEach((service) => {
    roleSlots.forEach((slot, index) => {
      const role = slot.role;
      const roleKey = getAssignmentKey(role, index);
      if (service.assignments[roleKey] === memberId) {
        service.assignments[roleKey] = "";
      }
    });
  });

  persistState();
  render();
}

function persistState() {
  persistLocalState();

  if (isRemoteSyncEnabled && !isApplyingRemoteState) {
    syncRemoteState();
  }
}

function persistLocalState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const storedValue = localStorage.getItem(STORAGE_KEY);
    if (!storedValue) {
      return structuredClone(initialState);
    }

    const parsed = JSON.parse(storedValue);

    return parsed;
  } catch (error) {
    return structuredClone(initialState);
  }
}

function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(timeString) {
  return new Date(`2000-01-01T${timeString}`).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function setDefaultServiceDate() {
  const dateInput = document.querySelector("#serviceDate");
  const timeInput = document.querySelector("#serviceTime");

  if (!dateInput.value) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }

  if (!timeInput.value) {
    timeInput.value = "09:00";
  }
}

function sortServices() {
  state.services.sort((left, right) => {
    const leftValue = `${left.date}T${left.time}`;
    const rightValue = `${right.date}T${right.time}`;
    return leftValue.localeCompare(rightValue);
  });
}

function createDemoService(title, daysFromToday, time, notes) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  const serviceDate = date.toISOString().slice(0, 10);
  const assignments = Object.fromEntries(
    roleSlots.map((slot, index) => [getAssignmentKey(slot.role, index), ""])
  );

  defaultMembers.forEach((member) => {
    const roleIndex = roleSlots.findIndex(
      (slot, index) =>
        slot.role === member.defaultRole && !assignments[getAssignmentKey(slot.role, index)]
    );

    if (roleIndex !== -1) {
      assignments[getAssignmentKey(member.defaultRole, roleIndex)] = getMemberIdByName(member.name);
    }
  });

  return {
    id: crypto.randomUUID(),
    title,
    date: serviceDate,
    time,
    sundayRehearsalDate: serviceDate,
    sundayRehearsalTime: "07:45",
    thursdayRehearsalDate: "",
    thursdayRehearsalTime: "",
    songList: "",
    reminders: "",
    notes,
    assignments,
  };
}

function getAssignmentKey(role, index) {
  return `${role}-${index}`;
}

function migrateService(service) {
  const assignments = Object.fromEntries(
    roleSlots.map((slot, index) => [getAssignmentKey(slot.role, index), ""])
  );

  if (service.assignments && typeof service.assignments === "object") {
    roleSlots.forEach((slot, index) => {
      const role = slot.role;
      const roleKey = getAssignmentKey(role, index);
      const legacyValue =
        role === "Singer"
          ? service.assignments["Singer-0"] ||
            service.assignments["Singer-1"] ||
            service.assignments["Singer 1"] ||
            service.assignments["Singer 2"] ||
            service.assignments.Singer
          : service.assignments[role] ||
            service.assignments[getLegacyRoleName(role)];

      assignments[roleKey] = service.assignments[roleKey] || legacyValue || "";
    });
  }

  return {
    ...service,
    sundayRehearsalDate: service.sundayRehearsalDate || service.rehearsalDate || "",
    sundayRehearsalTime: service.sundayRehearsalTime || service.rehearsalTime || "",
    thursdayRehearsalDate: service.thursdayRehearsalDate || "",
    thursdayRehearsalTime: service.thursdayRehearsalTime || "",
    songList: service.songList || "",
    reminders: service.reminders || "",
    assignments,
  };
}

function getRoleSummaryLabels() {
  const counts = new Map();

  roleSlots.forEach((slot) => {
    counts.set(slot.role, (counts.get(slot.role) || 0) + 1);
  });

  return Array.from(counts.entries()).map(([role, count]) =>
    count > 1 ? `${role} x${count}` : role
  );
}

function renderDetailList(items, emptyText) {
  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = emptyText;
    return empty;
  }

  const list = document.createElement("ol");
  list.className = "detail-list";

  items.forEach((item) => {
    const row = document.createElement("li");
    row.textContent = item;
    list.append(row);
  });

  return list;
}

function getSongListItems(songList) {
  return songList
    .split("\n")
    .map((item) => item.replace(/^\s*\d+[\).\-\s]*/, "").trim())
    .filter(Boolean);
}

function applyNormalizedState(sourceState) {
  const normalized = normalizeIncomingState(sourceState);
  state.members = normalized.members;
  state.services = normalized.services;
}

function normalizeIncomingState(sourceState) {
  const normalizedMembers = Array.isArray(sourceState.members)
    ? sourceState.members.map((member) => ({
        ...member,
        defaultRole: normalizeRoleName(member.defaultRole),
      }))
    : [];

  const existingNames = new Set(
    normalizedMembers.map((member) => member.name.trim().toLowerCase())
  );

  const missingMembers = defaultMembers
    .filter((member) => !existingNames.has(member.name.trim().toLowerCase()))
    .map((member) => ({
      id: crypto.randomUUID(),
      ...member,
    }));

  return {
    members: [...normalizedMembers, ...missingMembers],
    services: Array.isArray(sourceState.services)
      ? sourceState.services.map((service) => migrateService(service))
      : [],
  };
}

function normalizeRoleName(roleName) {
  if (roleName === "Singer 1" || roleName === "Singer 2") {
    return "Singer";
  }

  if (roleName === "Keyboard Player") {
    return "Keyboardist";
  }

  if (roleName === "Sound Tech") {
    return "Audio Tech";
  }

  return roleName;
}

function getLegacyRoleName(roleName) {
  if (roleName === "Keyboardist") {
    return "Keyboard Player";
  }

  if (roleName === "Audio Tech") {
    return "Sound Tech";
  }

  return roleName;
}

function getMemberIdByName(name) {
  const member = state.members.find((item) => item.name === name);
  return member ? member.id : "";
}

async function initFirebaseSync() {
  try {
    const firebaseModule = await import("./firebase-config.js");
    const firebaseConfig = firebaseModule.firebaseConfig;
    const firestoreCollection = firebaseModule.firestoreCollection || "worshipScheduler";
    const firestoreDocument = firebaseModule.firestoreDocument || "sharedState";

    if (!firebaseConfig || !firebaseConfig.projectId) {
      updateSyncStatus("Sync mode: local browser storage");
      updateAuthUI();
      return;
    }

    firebaseApp = initializeApp(firebaseConfig);
    firebaseAuth = getAuth(firebaseApp);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });
    firestoreDb = getFirestore(firebaseApp);
    sharedDocRef = doc(firestoreDb, firestoreCollection, firestoreDocument);
    isFirebaseConfigured = true;
    updateSyncStatus("Authentication required: sign in with Google to access shared team data");
    updateAuthUI();

    onAuthStateChanged(firebaseAuth, (user) => {
      currentUser = user;
      updateAuthUI();
      attachSharedStateListener();
      syncInteractionLock();
      render();
    });
  } catch (error) {
    updateSyncStatus("Sync mode: local browser storage");
    updateAuthUI();
  }
}

async function syncRemoteState() {
  if (!sharedDocRef || !currentUser) {
    return;
  }

  try {
    await setDoc(sharedDocRef, {
      members: state.members,
      services: state.services,
      updatedAt: serverTimestamp(),
    });
    updateSyncStatus("Sync mode: Firebase shared team data connected");
  } catch (error) {
    if (error && error.code === "permission-denied") {
      updateSyncStatus("Signed in, but this account is not approved yet. Add this UID to allowedUsers.");
    } else {
      updateSyncStatus("Sync mode: Firebase error. Using local browser storage");
    }
  }
}

function updateSyncStatus(message) {
  syncStatus.textContent = message;
}

function updateAuthUI() {
  const signedIn = Boolean(currentUser);
  signInButton.hidden = signedIn || !isFirebaseConfigured;
  signOutButton.hidden = !signedIn;
  authInfo.hidden = !signedIn;

  if (signedIn) {
    authUser.textContent = `Signed in as ${currentUser.email || currentUser.displayName || "Firebase user"}`;
    authUid.textContent = `User UID: ${currentUser.uid}`;
  } else {
    authUser.textContent = "";
    authUid.textContent = "";
  }
}

function attachSharedStateListener() {
  if (remoteUnsubscribe) {
    remoteUnsubscribe();
    remoteUnsubscribe = null;
  }

  isRemoteSyncEnabled = false;

  if (!isFirebaseConfigured || !currentUser || !sharedDocRef) {
    updateSyncStatus(
      isFirebaseConfigured
        ? "Authentication required: sign in with Google to access shared team data"
        : "Sync mode: local browser storage"
    );
    return;
  }

  updateSyncStatus("Checking Firebase access...");

  remoteUnsubscribe = onSnapshot(
    sharedDocRef,
    (snapshot) => {
      isRemoteSyncEnabled = true;

      if (!snapshot.exists()) {
        updateSyncStatus("Sync mode: Firebase connected. Creating shared team data...");
        syncRemoteState();
        return;
      }

      const remoteState = {
        members: Array.isArray(snapshot.data().members) ? snapshot.data().members : [],
        services: Array.isArray(snapshot.data().services) ? snapshot.data().services : [],
      };

      isApplyingRemoteState = true;
      applyNormalizedState(remoteState);
      persistLocalState();
      renderRoleOptions();
      render();
      isApplyingRemoteState = false;
      updateSyncStatus("Sync mode: Firebase shared team data connected");
    },
    (error) => {
      isRemoteSyncEnabled = false;
      if (error && error.code === "permission-denied") {
        updateSyncStatus("Signed in, but this account is not approved yet. Add this UID to allowedUsers.");
      } else {
        updateSyncStatus("Sync mode: Firebase error. Using local browser storage");
      }
    }
  );
}

function canEditSharedData() {
  if (!isFirebaseConfigured) {
    return true;
  }

  return Boolean(currentUser && isRemoteSyncEnabled);
}

function exportScheduleAsPdf() {
  const exportWindow = window.open("", "_blank", "noopener,noreferrer");

  if (!exportWindow) {
    window.alert("Please allow pop-ups to export the schedule as PDF.");
    return;
  }

  exportWindow.document.write(buildExportDocument("print"));
  exportWindow.document.close();
  exportWindow.focus();
  exportWindow.onload = () => {
    exportWindow.print();
  };
}

function exportScheduleAsWord() {
  const documentHtml = buildExportDocument("word");
  const blob = new Blob(["\ufeff", documentHtml], {
    type: "application/msword",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.href = url;
  link.download = `worship-team-schedule-${getExportDateStamp()}.doc`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildExportDocument(mode) {
  const servicesMarkup = state.services
    .map((service) => {
      const assignments = roleSlots
        .map((slot, index) => {
          const memberId = service.assignments[getAssignmentKey(slot.role, index)] || "";
          const memberName = getMemberName(memberId);
          return `
            <tr>
              <td>${escapeHtml(slot.label || slot.role)}</td>
              <td>${escapeHtml(memberName || "Unassigned")}</td>
            </tr>
          `;
        })
        .join("");

      return `
        <section class="service-export">
          <h2>${escapeHtml(service.title)}</h2>
          <p class="meta">${escapeHtml(formatDate(service.date))} at ${escapeHtml(
        formatTime(service.time)
      )}</p>
          <p class="notes"><strong>Sunday Rehearsal:</strong> ${escapeHtml(
            formatRehearsal(service.sundayRehearsalDate, service.sundayRehearsalTime)
          )}</p>
          <p class="notes"><strong>Thursday Rehearsal:</strong> ${escapeHtml(
            formatRehearsal(service.thursdayRehearsalDate, service.thursdayRehearsalTime)
          )}</p>
          <p class="notes"><strong>Song List:</strong> ${escapeHtml(
            formatSongListForExport(service.songList)
          )}</p>
          <p class="notes"><strong>Reminders:</strong> ${escapeHtml(
            service.reminders || "No reminders provided."
          )}</p>
          <p class="notes"><strong>Notes:</strong> ${escapeHtml(
            service.notes || "No notes provided."
          )}</p>
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Assigned Team Member</th>
              </tr>
            </thead>
            <tbody>
              ${assignments}
            </tbody>
          </table>
        </section>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Worship Team Schedule</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        color: #2f241b;
        margin: 32px;
        line-height: 1.45;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 28px;
      }
      .summary {
        margin: 0 0 24px;
        color: #765f49;
      }
      .service-export {
        margin: 0 0 28px;
        page-break-inside: avoid;
      }
      h2 {
        margin: 0 0 6px;
        font-size: 20px;
      }
      .meta {
        margin: 0 0 8px;
        font-weight: bold;
      }
      .notes {
        margin: 0 0 12px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        border: 1px solid #cdb79e;
        padding: 8px 10px;
        text-align: left;
        vertical-align: top;
      }
      th {
        background: #f4e7d6;
      }
      ${mode === "print" ? "@media print { body { margin: 18mm; } }" : ""}
    </style>
  </head>
  <body>
    <h1>Worship Team Schedule</h1>
    <p class="summary">Generated ${escapeHtml(
      new Date().toLocaleString()
    )}. Services included: ${state.services.length}.</p>
    ${servicesMarkup}
  </body>
</html>`;
}

function getMemberName(memberId) {
  const member = state.members.find((item) => item.id === memberId);
  return member ? member.name : "";
}

function getExportDateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatRehearsal(service) {
  const [dateValue, timeValue] = arguments;

  if (dateValue && timeValue) {
    return `${formatDate(dateValue)} at ${formatTime(timeValue)}`;
  }

  if (dateValue) {
    return formatDate(dateValue);
  }

  if (timeValue) {
    return formatTime(timeValue);
  }

  return "No rehearsal scheduled.";
}

function formatSongListForExport(songList) {
  const items = getSongListItems(songList);

  if (items.length === 0) {
    return "No song list provided.";
  }

  return items.map((item, index) => `${index + 1}. ${item}`).join(" | ");
}
