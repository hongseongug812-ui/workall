import type {
  Attachment,
  Attendance,
  AppNotification,
  Channel,
  ChannelNote,
  ChecklistItem,
  Message,
  Project,
  Space,
  Subtask,
  Task,
  TaskComment,
  TaskPriority,
  TaskStatus,
  TeamAttendanceEntry,
  User,
  CrmActivity,
  CrmActivityType,
  CrmCustomField,
  CrmCustomer,
  CrmFieldType,
  CrmLead,
  CrmLeadStage,
  CalendarEvent,
  DashboardWidget,
  DriveFile,
  DriveFolder,
  Mail,
  MailBox,
  PermissionModule,
  Role,
  RolePermission,
  FinanceInvoice,
  FinanceInvoiceItem,
  FinanceInvoiceStatus,
  FinanceKind,
  FinanceProgressWidgetData,
  FinanceSubscription,
  FinanceSummary,
  FinanceTransaction,
  MyTasksWidgetData,
  NewLeadsWidgetData,
  RecentWikiWidgetData,
  WidgetConfig,
  WidgetSize,
  WidgetType,
  WikiBacklink,
  WikiBlock,
  WikiPage,
  WikiPageVersion,
  WikiTemplate,
} from "./types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(body.error || `요청 실패 (${res.status})`, res.status);
  }
  return body as T;
}

export const api = {
  register: (data: { email: string; password: string; name: string; department: string }) =>
    request<{ token: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  me: () => request<{ user: User }>("/api/auth/me"),
  updateProfile: (data: { name?: string; department?: string; avatarUrl?: string | null }) =>
    request<{ user: User }>("/api/auth/me", { method: "PATCH", body: JSON.stringify(data) }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ ok: boolean }>("/api/auth/change-password", { method: "POST", body: JSON.stringify(data) }),
  forgotPassword: (email: string) =>
    request<{ ok: boolean }>("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (token: string, newPassword: string) =>
    request<{ ok: boolean }>("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, newPassword }) }),
  listUsers: () => request<{ users: User[] }>("/api/users"),
  listChannels: () => request<{ channels: Channel[] }>("/api/channels"),
  openDm: (otherUserId: string) =>
    request<{ channel: Channel }>("/api/channels", {
      method: "POST",
      body: JSON.stringify({ type: "dm", memberIds: [otherUserId] }),
    }),
  createGroup: (name: string, memberIds: string[]) =>
    request<{ channel: Channel }>("/api/channels", {
      method: "POST",
      body: JSON.stringify({ type: "group", name, memberIds }),
    }),
  listMessages: (channelId: string, opts?: { before?: string }) => {
    const params = opts?.before ? `?before=${encodeURIComponent(opts.before)}` : "";
    return request<{ messages: Message[] }>(`/api/channels/${channelId}/messages${params}`);
  },
  markRead: (channelId: string) =>
    request<{ lastReadAt: string }>(`/api/channels/${channelId}/read`, { method: "POST" }),
  addMembers: (channelId: string, memberIds: string[]) =>
    request<{ channel: Channel }>(`/api/channels/${channelId}/members`, {
      method: "POST",
      body: JSON.stringify({ memberIds }),
    }),
  leaveChannel: (channelId: string) =>
    request<void>(`/api/channels/${channelId}/members/me`, { method: "DELETE" }),
  getThread: (channelId: string, messageId: string) =>
    request<{ parent: Message; replies: Message[] }>(
      `/api/channels/${channelId}/messages/${messageId}/thread`
    ),
  getPinnedMessages: (channelId: string) =>
    request<{ messages: Message[] }>(`/api/channels/${channelId}/pinned`),
  setMuted: (channelId: string, muted: boolean) =>
    request<{ muted: boolean }>(`/api/channels/${channelId}/mute`, {
      method: "POST",
      body: JSON.stringify({ muted }),
    }),
  setFavorite: (channelId: string, favorite: boolean) =>
    request<{ favorite: boolean }>(`/api/channels/${channelId}/favorite`, {
      method: "POST",
      body: JSON.stringify({ favorite }),
    }),
  search: (query: string) =>
    request<{ messages: Message[]; directory: User[] }>(`/api/search?${new URLSearchParams({ q: query })}`),
  async uploadFile(file: File): Promise<Attachment> {
    const form = new FormData();
    form.append("file", file);
    const headers: Record<string, string> = {};
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    const res = await fetch(`${API_BASE}/api/uploads`, { method: "POST", headers, body: form });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(body.error || `업로드 실패 (${res.status})`, res.status);
    return body as Attachment;
  },
  getTodayAttendance: () => request<{ attendance: Attendance | null }>("/api/attendance/today"),
  checkIn: () => request<{ attendance: Attendance }>("/api/attendance/check-in", { method: "POST" }),
  checkOut: () => request<{ attendance: Attendance }>("/api/attendance/check-out", { method: "POST" }),
  getAttendanceHistory: (limit = 30) =>
    request<{ history: Attendance[] }>(`/api/attendance/history?limit=${limit}`),
  getTeamAttendanceToday: () =>
    request<{ team: TeamAttendanceEntry[]; date: string }>("/api/attendance/team-today"),
  getChannelNote: (channelId: string) =>
    request<{ note: ChannelNote }>(`/api/channels/${channelId}/notes`),
  setChannelNote: (channelId: string, content: string) =>
    request<{ note: ChannelNote }>(`/api/channels/${channelId}/notes`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    }),
  listChecklist: (channelId: string) =>
    request<{ items: ChecklistItem[] }>(`/api/channels/${channelId}/checklist`),
  addChecklistItem: (channelId: string, text: string) =>
    request<{ item: ChecklistItem }>(`/api/channels/${channelId}/checklist`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  setChecklistItemDone: (channelId: string, itemId: string, done: boolean) =>
    request<{ item: ChecklistItem }>(`/api/channels/${channelId}/checklist/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ done }),
    }),
  deleteChecklistItem: (channelId: string, itemId: string) =>
    request<void>(`/api/channels/${channelId}/checklist/${itemId}`, { method: "DELETE" }),
  getNotifications: () =>
    request<{ notifications: AppNotification[]; unreadCount: number }>("/api/notifications"),
  markNotificationRead: (notificationId: string) =>
    request<{ ok: boolean }>(`/api/notifications/${notificationId}/read`, { method: "POST" }),
  markAllNotificationsRead: () =>
    request<{ ok: boolean }>("/api/notifications/read-all", { method: "POST" }),

  listSpaces: () => request<{ spaces: Space[] }>("/api/spaces"),
  createSpace: (name: string, memberIds: string[]) =>
    request<{ space: Space }>("/api/spaces", { method: "POST", body: JSON.stringify({ name, memberIds }) }),
  addSpaceMembers: (spaceId: string, memberIds: string[]) =>
    request<{ space: Space }>(`/api/spaces/${spaceId}/members`, { method: "POST", body: JSON.stringify({ memberIds }) }),

  listProjects: (spaceId: string) => request<{ projects: Project[] }>(`/api/projects?spaceId=${spaceId}`),
  createProject: (data: { spaceId: string; name: string; color?: string; icon?: string; startDate?: string | null; endDate?: string | null; memberIds: string[] }) =>
    request<{ project: Project }>("/api/projects", { method: "POST", body: JSON.stringify(data) }),
  getProject: (projectId: string) =>
    request<{ project: Project; statuses: TaskStatus[]; tasks: Task[] }>(`/api/projects/${projectId}`),
  addProjectMembers: (projectId: string, memberIds: string[]) =>
    request<{ project: Project }>(`/api/projects/${projectId}/members`, { method: "POST", body: JSON.stringify({ memberIds }) }),
  createTaskStatus: (projectId: string, name: string) =>
    request<{ status: TaskStatus }>(`/api/projects/${projectId}/statuses`, { method: "POST", body: JSON.stringify({ name }) }),
  renameTaskStatus: (projectId: string, statusId: string, name: string) =>
    request<{ status: TaskStatus }>(`/api/projects/${projectId}/statuses/${statusId}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  deleteTaskStatus: (projectId: string, statusId: string) =>
    request<void>(`/api/projects/${projectId}/statuses/${statusId}`, { method: "DELETE" }),

  createTask: (data: {
    projectId: string; statusId: string; title: string; body?: string; priority?: TaskPriority;
    startDate?: string | null; dueDate?: string | null; assigneeIds?: string[];
  }) => request<{ task: Task }>("/api/tasks", { method: "POST", body: JSON.stringify(data) }),
  getTask: (taskId: string) =>
    request<{ task: Task; subtasks: Subtask[]; comments: TaskComment[] }>(`/api/tasks/${taskId}`),
  updateTask: (taskId: string, data: Partial<{ title: string; body: string | null; priority: TaskPriority; startDate: string | null; dueDate: string | null }>) =>
    request<{ task: Task }>(`/api/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(data) }),
  moveTask: (taskId: string, statusId: string) =>
    request<{ task: Task }>(`/api/tasks/${taskId}/move`, { method: "POST", body: JSON.stringify({ statusId }) }),
  deleteTask: (taskId: string) => request<void>(`/api/tasks/${taskId}`, { method: "DELETE" }),
  setTaskAssignees: (taskId: string, userIds: string[]) =>
    request<{ task: Task }>(`/api/tasks/${taskId}/assignees`, { method: "PUT", body: JSON.stringify({ userIds }) }),

  listSubtasks: (taskId: string) => request<{ subtasks: Subtask[] }>(`/api/tasks/${taskId}/subtasks`),
  addSubtask: (taskId: string, text: string) =>
    request<{ subtask: Subtask }>(`/api/tasks/${taskId}/subtasks`, { method: "POST", body: JSON.stringify({ text }) }),
  setSubtaskDone: (taskId: string, subtaskId: string, done: boolean) =>
    request<{ subtask: Subtask }>(`/api/tasks/${taskId}/subtasks/${subtaskId}`, { method: "PATCH", body: JSON.stringify({ done }) }),
  deleteSubtask: (taskId: string, subtaskId: string) =>
    request<void>(`/api/tasks/${taskId}/subtasks/${subtaskId}`, { method: "DELETE" }),

  listTaskComments: (taskId: string) => request<{ comments: TaskComment[] }>(`/api/tasks/${taskId}/comments`),
  addTaskComment: (taskId: string, data: { content?: string; attachment?: Attachment }) =>
    request<{ comment: TaskComment }>(`/api/tasks/${taskId}/comments`, { method: "POST", body: JSON.stringify(data) }),

  listWikiTemplates: () => request<{ templates: WikiTemplate[] }>("/api/wiki/templates"),
  listWikiPages: (spaceId: string) => request<{ pages: WikiPage[] }>(`/api/wiki/pages?spaceId=${spaceId}`),
  createWikiPage: (data: { spaceId: string; parentId?: string | null; title: string; template?: string }) =>
    request<{ page: WikiPage }>("/api/wiki/pages", { method: "POST", body: JSON.stringify(data) }),
  getWikiPage: (pageId: string) =>
    request<{ page: WikiPage; backlinks: WikiBacklink[] }>(`/api/wiki/pages/${pageId}`),
  updateWikiPage: (pageId: string, data: Partial<{ title: string; content: WikiBlock[] }>) =>
    request<{ page: WikiPage }>(`/api/wiki/pages/${pageId}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteWikiPage: (pageId: string) => request<void>(`/api/wiki/pages/${pageId}`, { method: "DELETE" }),
  listWikiVersions: (pageId: string) => request<{ versions: WikiPageVersion[] }>(`/api/wiki/pages/${pageId}/versions`),
  getWikiVersion: (pageId: string, versionId: string) =>
    request<{ version: WikiPageVersion }>(`/api/wiki/pages/${pageId}/versions/${versionId}`),
  restoreWikiVersion: (pageId: string, versionId: string) =>
    request<{ page: WikiPage }>(`/api/wiki/pages/${pageId}/versions/${versionId}/restore`, { method: "POST" }),

  listCrmFields: (spaceId: string) => request<{ fields: CrmCustomField[] }>(`/api/crm/fields?spaceId=${spaceId}`),
  createCrmField: (data: { spaceId: string; label: string; type?: CrmFieldType; options?: string[] }) =>
    request<{ field: CrmCustomField }>("/api/crm/fields", { method: "POST", body: JSON.stringify(data) }),
  deleteCrmField: (fieldId: string) => request<void>(`/api/crm/fields/${fieldId}`, { method: "DELETE" }),

  listCrmCustomers: (spaceId: string, opts?: { q?: string; sortBy?: string; order?: string }) => {
    const params = new URLSearchParams({ spaceId, ...(opts?.q ? { q: opts.q } : {}), ...(opts?.sortBy ? { sortBy: opts.sortBy } : {}), ...(opts?.order ? { order: opts.order } : {}) });
    return request<{ customers: CrmCustomer[] }>(`/api/crm/customers?${params.toString()}`);
  },
  createCrmCustomer: (data: { spaceId: string; name: string; email?: string; phone?: string }) =>
    request<{ customer: CrmCustomer }>("/api/crm/customers", { method: "POST", body: JSON.stringify(data) }),
  getCrmCustomer: (customerId: string) =>
    request<{ customer: CrmCustomer; activities: CrmActivity[] }>(`/api/crm/customers/${customerId}`),
  updateCrmCustomer: (customerId: string, data: Partial<{ name: string; email: string; phone: string }>) =>
    request<{ customer: CrmCustomer }>(`/api/crm/customers/${customerId}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteCrmCustomer: (customerId: string) => request<void>(`/api/crm/customers/${customerId}`, { method: "DELETE" }),
  setCrmCustomValue: (customerId: string, fieldId: string, value: string) =>
    request<{ customer: CrmCustomer }>(`/api/crm/customers/${customerId}/fields/${fieldId}`, { method: "PUT", body: JSON.stringify({ value }) }),

  listCrmActivities: (customerId: string) => request<{ activities: CrmActivity[] }>(`/api/crm/customers/${customerId}/activities`),
  addCrmActivity: (customerId: string, data: { type?: CrmActivityType; content: string }) =>
    request<{ activity: CrmActivity }>(`/api/crm/customers/${customerId}/activities`, { method: "POST", body: JSON.stringify(data) }),

  listCrmLeads: (spaceId: string) => request<{ leads: CrmLead[]; stages: CrmLeadStage[] }>(`/api/crm/leads?spaceId=${spaceId}`),
  createCrmLead: (data: { spaceId: string; customerId: string; title: string; stage?: CrmLeadStage }) =>
    request<{ lead: CrmLead }>("/api/crm/leads", { method: "POST", body: JSON.stringify(data) }),
  moveCrmLead: (leadId: string, stage: CrmLeadStage) =>
    request<{ lead: CrmLead }>(`/api/crm/leads/${leadId}/move`, { method: "POST", body: JSON.stringify({ stage }) }),
  deleteCrmLead: (leadId: string) => request<void>(`/api/crm/leads/${leadId}`, { method: "DELETE" }),

  listFinanceTransactions: (spaceId: string, month?: string) =>
    request<{ transactions: FinanceTransaction[] }>(`/api/finance/transactions?${new URLSearchParams({ spaceId, ...(month ? { month } : {}) })}`),
  createFinanceTransaction: (data: {
    spaceId: string; date: string; kind: FinanceKind; category: string; amount: number;
    customerId?: string | null; memo?: string; receipt?: Attachment;
  }) => request<{ transaction: FinanceTransaction }>("/api/finance/transactions", { method: "POST", body: JSON.stringify(data) }),
  deleteFinanceTransaction: (txId: string) => request<void>(`/api/finance/transactions/${txId}`, { method: "DELETE" }),

  getFinanceSummary: (spaceId: string, months = 6) =>
    request<FinanceSummary>(`/api/finance/summary?spaceId=${spaceId}&months=${months}`),

  listFinanceSubscriptions: (spaceId: string) =>
    request<{ subscriptions: FinanceSubscription[] }>(`/api/finance/subscriptions?spaceId=${spaceId}`),
  createFinanceSubscription: (data: {
    spaceId: string; name: string; kind: FinanceKind; category: string; amount: number; dayOfMonth: number; customerId?: string | null;
  }) => request<{ subscription: FinanceSubscription }>("/api/finance/subscriptions", { method: "POST", body: JSON.stringify(data) }),
  setFinanceSubscriptionActive: (subId: string, active: boolean) =>
    request<{ subscription: FinanceSubscription }>(`/api/finance/subscriptions/${subId}`, { method: "PATCH", body: JSON.stringify({ active }) }),
  deleteFinanceSubscription: (subId: string) => request<void>(`/api/finance/subscriptions/${subId}`, { method: "DELETE" }),

  listFinanceInvoices: (spaceId: string) => request<{ invoices: FinanceInvoice[] }>(`/api/finance/invoices?spaceId=${spaceId}`),
  createFinanceInvoice: (data: { spaceId: string; customerId: string; items: FinanceInvoiceItem[]; issueDate?: string; dueDate?: string }) =>
    request<{ invoice: FinanceInvoice }>("/api/finance/invoices", { method: "POST", body: JSON.stringify(data) }),
  getFinanceInvoice: (invoiceId: string) =>
    request<{ invoice: FinanceInvoice; customer: CrmCustomer }>(`/api/finance/invoices/${invoiceId}`),
  setFinanceInvoiceStatus: (invoiceId: string, status: FinanceInvoiceStatus) =>
    request<{ invoice: FinanceInvoice }>(`/api/finance/invoices/${invoiceId}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  deleteFinanceInvoice: (invoiceId: string) => request<void>(`/api/finance/invoices/${invoiceId}`, { method: "DELETE" }),

  listDashboardWidgets: () => request<{ widgets: DashboardWidget[] }>("/api/dashboard/widgets"),
  createDashboardWidget: (data: { type: WidgetType; size?: WidgetSize; config: WidgetConfig }) =>
    request<{ widget: DashboardWidget }>("/api/dashboard/widgets", { method: "POST", body: JSON.stringify(data) }),
  updateDashboardWidget: (widgetId: string, data: Partial<{ size: WidgetSize; config: WidgetConfig }>) =>
    request<{ widget: DashboardWidget }>(`/api/dashboard/widgets/${widgetId}`, { method: "PATCH", body: JSON.stringify(data) }),
  reorderDashboardWidgets: (orderedIds: string[]) =>
    request<{ widgets: DashboardWidget[] }>("/api/dashboard/widgets/reorder", { method: "POST", body: JSON.stringify({ orderedIds }) }),
  deleteDashboardWidget: (widgetId: string) => request<void>(`/api/dashboard/widgets/${widgetId}`, { method: "DELETE" }),
  getWidgetData: (widgetId: string) =>
    request<MyTasksWidgetData & RecentWikiWidgetData & FinanceProgressWidgetData & NewLeadsWidgetData>(`/api/dashboard/widgets/${widgetId}/data`),

  listAdminUsers: () => request<{ users: User[] }>("/api/admin/users"),
  updateUserRole: (userId: string, role: Role) =>
    request<{ user: User }>(`/api/admin/users/${userId}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
  listRolePermissions: () =>
    request<{ roles: Role[]; modules: PermissionModule[]; permissions: RolePermission[] }>("/api/admin/permissions"),
  setRolePermission: (role: Role, module: PermissionModule, flags: Partial<Omit<RolePermission, "role" | "module">>) =>
    request<{ permission: RolePermission }>(`/api/admin/permissions/${role}/${module}`, {
      method: "PUT",
      body: JSON.stringify(flags),
    }),

  listMail: (box: MailBox) => request<{ mails: Mail[]; unreadCount: number }>(`/api/mail?box=${box}`),
  createMail: (data: { subject: string; body: string; toIds: string[]; ccIds?: string[]; draft?: boolean }) =>
    request<{ mail: Mail }>("/api/mail", { method: "POST", body: JSON.stringify(data) }),
  getMail: (mailId: string) => request<{ mail: Mail }>(`/api/mail/${mailId}`),
  updateMailDraft: (mailId: string, data: Partial<{ subject: string; body: string; toIds: string[]; ccIds: string[] }>) =>
    request<{ mail: Mail }>(`/api/mail/${mailId}`, { method: "PATCH", body: JSON.stringify(data) }),
  sendMailDraft: (mailId: string) => request<{ mail: Mail }>(`/api/mail/${mailId}/send`, { method: "POST" }),
  starMail: (mailId: string) => request<{ mail: Mail }>(`/api/mail/${mailId}/star`, { method: "POST" }),
  deleteMail: (mailId: string) => request<void>(`/api/mail/${mailId}`, { method: "DELETE" }),

  listCalendarEvents: (spaceId: string, month?: string) =>
    request<{ events: CalendarEvent[] }>(`/api/calendar/events?${new URLSearchParams({ spaceId, ...(month ? { month } : {}) })}`),
  createCalendarEvent: (data: {
    spaceId: string; title: string; description?: string; startAt: string; endAt: string;
    allDay?: boolean; location?: string; attendeeIds?: string[]; withMeeting?: boolean;
  }) => request<{ event: CalendarEvent }>("/api/calendar/events", { method: "POST", body: JSON.stringify(data) }),
  getCalendarEvent: (eventId: string) => request<{ event: CalendarEvent }>(`/api/calendar/events/${eventId}`),
  updateCalendarEvent: (eventId: string, data: Partial<{
    title: string; description: string; startAt: string; endAt: string; allDay: boolean; location: string; attendeeIds: string[];
  }>) => request<{ event: CalendarEvent }>(`/api/calendar/events/${eventId}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteCalendarEvent: (eventId: string) => request<void>(`/api/calendar/events/${eventId}`, { method: "DELETE" }),

  listDriveFolders: (spaceId: string) => request<{ folders: DriveFolder[] }>(`/api/drive/folders?spaceId=${spaceId}`),
  createDriveFolder: (data: { spaceId: string; parentId?: string | null; name: string }) =>
    request<{ folder: DriveFolder }>("/api/drive/folders", { method: "POST", body: JSON.stringify(data) }),
  deleteDriveFolder: (folderId: string) => request<void>(`/api/drive/folders/${folderId}`, { method: "DELETE" }),
  listDriveFiles: (spaceId: string, folderId?: string | null) =>
    request<{ files: DriveFile[] }>(`/api/drive/files?${new URLSearchParams({ spaceId, ...(folderId ? { folderId } : {}) })}`),
  createDriveFile: (data: { spaceId: string; folderId?: string | null; name: string; url: string; mime?: string; size?: number }) =>
    request<{ file: DriveFile }>("/api/drive/files", { method: "POST", body: JSON.stringify(data) }),
  deleteDriveFile: (fileId: string) => request<void>(`/api/drive/files/${fileId}`, { method: "DELETE" }),
};

export { ApiError, API_BASE };
