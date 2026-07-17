export type ProjectStatus = "draft" | "sent" | "in_progress" | "completed" | "overdue";
export type ChecklistItemType = "file" | "text" | "link" | "approval";
export type ChecklistItemStatus =
  | "requested"
  | "submitted"
  | "approved"
  | "changes_requested"
  | "waived";
export type Plan = "free" | "starter" | "pro" | "agency";

export interface User {
  id: string;
  name: string;
  email: string;
  businessName: string;
  createdAt: string;
  password?: string;
  brandColor?: string;
}

export interface Project {
  id: string;
  userId: string;
  clientName: string;
  clientEmail: string;
  name: string;
  dueDate: string;
  status: ProjectStatus;
  token: string;
  accessPasscodeHash?: string;
  hasPasscode?: boolean;
  expiresAt?: string | null;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  projectId: string;
  title: string;
  description: string;
  type: ChecklistItemType;
  required: boolean;
  status: ChecklistItemStatus;
  sortOrder: number;
  changeRequestNote: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  projectId: string;
  checklistItemId: string;
  fileName?: string;
  filePath?: string;
  fileDataUrl?: string;
  textValue?: string;
  linkValue?: string;
  approvedValue?: boolean;
  acceptedCreativeAssetOnly?: boolean;
  acceptedCreativeAssetOnlyAt?: string;
  clientComment: string;
  submittedAt: string;
}

export interface TemplateItem {
  id: string;
  title: string;
  description: string;
  type: ChecklistItemType;
  required: boolean;
  sortOrder: number;
}

export interface Template {
  id: string;
  userId: string;
  name: string;
  description: string;
  items: TemplateItem[];
}

export interface ActivityLog {
  id: string;
  projectId: string;
  message: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: Plan;
  status: "trialing" | "active" | "canceled";
}

export interface ProjectPacketState {
  users: User[];
  projects: Project[];
  checklistItems: ChecklistItem[];
  submissions: Submission[];
  templates: Template[];
  activityLogs: ActivityLog[];
  subscriptions: Subscription[];
}

export interface Session {
  userId: string;
}
