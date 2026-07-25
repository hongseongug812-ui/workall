export type Role = "super_admin" | "dept_admin" | "member" | "guest";

export interface User {
  id: string;
  email: string;
  name: string;
  department: string;
  role: Role;
  avatarUrl: string | null;
  createdAt: string;
}

export type PermissionModule = "messenger" | "project" | "wiki" | "crm" | "finance" | "dashboard" | "admin";

export interface RolePermission {
  role: Role;
  module: PermissionModule;
  canRead: boolean;
  canWrite: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface Attachment {
  url: string;
  name: string;
  mime: string;
  size: number;
}

export interface Reaction {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface ForwardedFrom {
  messageId: string;
  senderId: string;
  channelId: string;
}

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  parentMessageId: string | null;
  content: string | null;
  attachment: Attachment | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  pinnedAt: string | null;
  forwardedFrom: ForwardedFrom | null;
  replyCount: number;
  reactions: Reaction[];
}

export interface ReadReceipt {
  userId: string;
  lastReadAt: string;
}

export interface Channel {
  id: string;
  type: "dm" | "group";
  name: string;
  members: User[];
  createdAt: string;
  lastMessage: { content: string; senderId: string; createdAt: string } | null;
  unreadCount: number;
  muted: boolean;
  favorite: boolean;
  readReceipts: ReadReceipt[];
}

export type PresenceStatus = "online" | "away" | "dnd";

export interface UserStatus {
  status: PresenceStatus;
  statusMessage: string | null;
}

export interface Attendance {
  id: string;
  userId: string;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
}

export interface TeamAttendanceEntry {
  userId: string;
  name: string;
  department: string;
  checkInAt: string | null;
  checkOutAt: string | null;
}

export interface ChannelNote {
  channelId: string;
  content: string;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface ChecklistItem {
  id: string;
  channelId: string;
  text: string;
  done: boolean;
  createdAt: string;
}

export interface Space {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  members: string[];
}

export interface Project {
  id: string;
  spaceId: string;
  name: string;
  color: string;
  icon: string;
  startDate: string | null;
  endDate: string | null;
  createdBy: string;
  createdAt: string;
  members: string[];
}

export interface TaskStatus {
  id: string;
  projectId: string;
  name: string;
  position: number;
  createdAt: string;
}

export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  projectId: string;
  statusId: string;
  title: string;
  body: string | null;
  priority: TaskPriority;
  startDate: string | null;
  dueDate: string | null;
  position: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  assigneeIds: string[];
  subtaskProgress: number | null;
  subtaskTotal: number;
  subtaskDone: number;
  commentCount: number;
}

export interface Subtask {
  id: string;
  taskId: string;
  text: string;
  done: boolean;
  position: number;
  createdAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string | null;
  attachment: Attachment | null;
  createdAt: string;
}

export type WikiBlockType = "heading" | "paragraph" | "quote" | "divider" | "image" | "table" | "code";

export interface WikiBlock {
  id: string;
  type: WikiBlockType;
  text?: string;
  url?: string;
  rows?: string[][];
}

export interface WikiPage {
  id: string;
  spaceId: string;
  parentId: string | null;
  title: string;
  content: string;
  position: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WikiTemplate {
  key: string;
  label: string;
}

export interface WikiBacklink {
  id: string;
  title: string;
}

export interface WikiPageVersion {
  id: string;
  pageId: string;
  title: string;
  content?: string;
  editedBy: string;
  createdAt: string;
}

export type CrmFieldType = "text" | "number" | "date" | "select";

export interface CrmCustomField {
  id: string;
  spaceId: string;
  label: string;
  type: CrmFieldType;
  options: string[] | null;
  position: number;
  createdAt: string;
}

export interface CrmCustomer {
  id: string;
  spaceId: string;
  name: string;
  email: string | null;
  phone: string | null;
  customFields: Record<string, string>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type CrmLeadStage = "prospecting" | "meeting" | "proposal" | "won";

export interface CrmLead {
  id: string;
  spaceId: string;
  customerId: string;
  title: string;
  stage: CrmLeadStage;
  position: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type CrmActivityType = "meeting" | "call" | "email" | "note";

export interface CrmActivity {
  id: string;
  customerId: string;
  type: CrmActivityType;
  content: string;
  createdBy: string;
  createdAt: string;
}

export type FinanceKind = "income" | "expense";

export interface FinanceTransaction {
  id: string;
  spaceId: string;
  date: string;
  kind: FinanceKind;
  category: string;
  amount: number;
  customerId: string | null;
  memo: string | null;
  receipt: Attachment | null;
  createdBy: string;
  createdAt: string;
}

export interface FinanceSubscription {
  id: string;
  spaceId: string;
  name: string;
  kind: FinanceKind;
  category: string;
  amount: number;
  dayOfMonth: number;
  customerId: string | null;
  active: boolean;
  lastRunYm: string | null;
  createdBy: string;
  createdAt: string;
}

export interface FinanceInvoiceItem {
  description: string;
  qty: number;
  unitPrice: number;
}

export type FinanceInvoiceStatus = "draft" | "sent" | "paid";

export interface FinanceInvoice {
  id: string;
  spaceId: string;
  customerId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  items: FinanceInvoiceItem[];
  status: FinanceInvoiceStatus;
  createdBy: string;
  createdAt: string;
}

export interface CashflowMonth {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface CategoryBreakdownEntry {
  category: string;
  amount: number;
}

export interface FinanceSummary {
  cashflow: CashflowMonth[];
  categoryBreakdown: CategoryBreakdownEntry[];
  currentMonth: string;
}

export interface CalendarEvent {
  id: string;
  spaceId: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  location: string | null;
  meetingUrl: string | null;
  createdBy: string;
  createdAt: string;
  attendeeIds: string[];
}

export type MailBox = "inbox" | "sent" | "draft" | "trash";

export interface MailRecipient {
  userId: string;
  kind: "to" | "cc";
}

export interface Mail {
  id: string;
  fromUserId: string;
  subject: string;
  body: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  recipients: MailRecipient[];
  box?: MailBox;
  readAt: string | null;
  starred: boolean;
}

export type WidgetType = "my_tasks" | "recent_wiki" | "finance_progress" | "new_leads";
export type WidgetSize = "small" | "medium" | "large";

export interface WidgetConfig {
  spaceId?: string;
  monthlyGoal?: number;
}

export interface DashboardWidget {
  id: string;
  userId: string;
  type: WidgetType;
  size: WidgetSize;
  config: WidgetConfig;
  position: number;
  createdAt: string;
}

export interface MyTasksWidgetData {
  configured: boolean;
  tasks?: Task[];
}

export interface RecentWikiWidgetData {
  configured: boolean;
  pages?: WikiPage[];
}

export interface FinanceProgressWidgetData {
  configured: boolean;
  currentIncome?: number;
  goal?: number;
  month?: string;
}

export interface NewLeadsWidgetData {
  configured: boolean;
  count?: number;
}
