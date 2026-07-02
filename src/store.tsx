"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { type User as SupabaseUser } from "@supabase/supabase-js";
import { defaultTemplates, demoState, demoUser } from "@/src/demo-data";
import { getBearerAuthHeaders } from "@/src/supabase/browser-auth";
import { supabase } from "@/src/supabase/client";
import {
  ActivityLog,
  ChecklistItem,
  ChecklistItemStatus,
  ChecklistItemType,
  Project,
  ProjectPacketState,
  ProjectStatus,
  Session,
  Submission,
  Subscription,
  Template,
  TemplateItem,
  User as ProjectPacketUser
} from "@/src/types";

const STATE_KEY = "projectpacket_state_v2";
const SESSION_KEY = "projectpacket_session_v2";

interface ProjectStats {
  activeProjects: number;
  missingAssets: number;
  completedProjects: number;
  needsAttention: number;
}

interface ProjectPacketContextValue {
  state: ProjectPacketState;
  session: Session | null;
  isReady: boolean;
  isSampleWorkspace: boolean;
  currentUser: ProjectPacketUser | null;
  signUp: (input: { name: string; email: string; password: string; businessName: string }) => Promise<{ needsCodeVerification: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  verifyEmailCode: (email: string, code: string) => Promise<void>;
  resendSignupCode: (email: string) => Promise<void>;
  openDemo: () => void;
  signOut: () => Promise<void>;
  resetDemo: () => void;
  updateUser: (input: { businessName: string; brandColor: string }) => Promise<void>;
  getProject: (projectId: string) => Project | undefined;
  getProjectByToken: (token: string) => Project | undefined;
  getUserProjects: () => Project[];
  getProjectItems: (projectId: string) => ChecklistItem[];
  getProjectSubmissions: (projectId: string) => Submission[];
  getItemSubmission: (itemId: string) => Submission | undefined;
  getProjectLogs: (projectId: string) => ActivityLog[];
  getStats: () => ProjectStats;
  getProjectProgress: (projectId: string) => number;
  getMissingCount: (projectId: string) => number;
  createProject: (input: {
    name: string;
    clientName: string;
    clientEmail: string;
    dueDate: string;
    items: Array<{
      title: string;
      description: string;
      type: ChecklistItemType;
      required: boolean;
    }>;
  }) => Promise<Project>;
  submitItemByToken: (
    token: string,
    itemId: string,
    input: {
      fileName?: string;
      filePath?: string;
      fileDataUrl?: string;
      textValue?: string;
      linkValue?: string;
      approvedValue?: boolean;
      clientComment: string;
      acceptedCreativeAssetOnly?: boolean;
    }
  ) => Promise<void>;
  updateItemStatus: (
    projectId: string,
    itemId: string,
    status: ChecklistItemStatus,
    changeRequestNote?: string
  ) => Promise<void>;
  deleteSubmission: (submissionId: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  sendReminder: (projectId: string) => Promise<string>;
  refreshWorkspace: () => Promise<void>;
  addTemplate: (input: {
    name: string;
    description: string;
    items: Array<{
      title: string;
      description: string;
      type: ChecklistItemType;
      required: boolean;
    }>;
  }) => Promise<Template>;
  updateTemplate: (
    templateId: string,
    input: {
      name: string;
      description: string;
      items: Array<{
        title: string;
        description: string;
        type: ChecklistItemType;
        required: boolean;
      }>;
    }
  ) => Promise<Template>;
  deleteTemplate: (templateId: string) => Promise<void>;
}

const ProjectPacketContext = createContext<ProjectPacketContextValue | null>(null);

export function ProjectPacketProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProjectPacketState>(demoState);
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const storedState = window.localStorage.getItem(STATE_KEY);
    const storedSession = window.localStorage.getItem(SESSION_KEY);

    if (storedState) {
      setState(JSON.parse(storedState) as ProjectPacketState);
    }

    if (storedSession) {
      setSession(JSON.parse(storedSession) as Session);
    }

    setIsReady(true);

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted || !data.session?.user) {
        return;
      }

      const user = userFromSupabase(data.session.user);
      setState((previous) => withLocalUser(previous, user));
      setSession({ userId: user.id });
      void syncProfile(user);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, authSession) => {
      if (!mounted) {
        return;
      }

      if (!authSession?.user) {
        return;
      }

      const user = userFromSupabase(authSession.user);
      setState((previous) => withLocalUser(previous, user));
      setSession({ userId: user.id });
      void syncProfile(user);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }, [state, isReady]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (session) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(SESSION_KEY);
    }
  }, [session, isReady]);

  const sessionUserId = session?.userId ?? null;

  useEffect(() => {
    if (!isReady || !sessionUserId || sessionUserId === demoUser.id) {
      return;
    }

    let cancelled = false;

    void loadWorkspaceFromSupabase(sessionUserId)
      .then((workspace) => {
        if (cancelled) {
          return;
        }

        setState((previous) => mergeRemoteWorkspace(previous, sessionUserId, workspace));
      })
      .catch((error) => {
        console.warn("Could not load Supabase workspace:", error instanceof Error ? error.message : error);
      });

    return () => {
      cancelled = true;
    };
  }, [isReady, sessionUserId]);

  const currentUser = state.users.find((user) => user.id === sessionUserId) ?? null;
  const isSampleWorkspace = sessionUserId === demoUser.id;
  const refreshWorkspace = useCallback(async () => {
    if (!sessionUserId || sessionUserId === demoUser.id) {
      return;
    }

    const workspace = await loadWorkspaceFromSupabase(sessionUserId);
    setState((previous) => mergeRemoteWorkspace(previous, sessionUserId, workspace));
  }, [sessionUserId]);

  const value = useMemo<ProjectPacketContextValue>(
    () => ({
      state,
      session,
      isReady,
      isSampleWorkspace,
      currentUser,
      async signUp(input) {
        const email = input.email.trim().toLowerCase();

        if (input.password.length < 6) {
          throw new Error("Use at least 6 characters for your password.");
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password: input.password,
          options: {
            data: {
              name: input.name.trim() || "Freelancer",
              business_name: input.businessName.trim() || "My Studio"
            }
          }
        });

        if (error) {
          throw new Error(cleanAuthError(error.message));
        }

        if (!data.user) {
          throw new Error("Could not create the account. Try again.");
        }

        if (data.user.identities && data.user.identities.length === 0) {
          throw new Error("That email already has an account. Use Login instead, or delete the old test user in Supabase Auth.");
        }

        const user = userFromSupabase(data.user, input);
        setState((previous) => withLocalUser(previous, user));

        if (data.session) {
          setSession({ userId: user.id });
          await syncProfile(user);
        }

        return { needsCodeVerification: !data.session };
      },
      async signIn(email, password) {
        const cleanEmail = email.trim().toLowerCase();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });

        if (error) {
          throw new Error(cleanAuthError(error.message));
        }

        if (!data.user) {
          throw new Error("Could not log in. Try again.");
        }

        const user = userFromSupabase(data.user);
        setState((previous) => withLocalUser(previous, user));
        setSession({ userId: user.id });
        await syncProfile(user);
      },
      async verifyEmailCode(email, code) {
        const cleanEmail = email.trim().toLowerCase();
        const cleanCode = code.trim().replace(/\s/g, "");
        const { data, error } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanCode,
          type: "signup"
        });

        if (error) {
          throw new Error(cleanAuthError(error.message));
        }

        if (!data.user) {
          throw new Error("That code did not work. Try a fresh code.");
        }

        const user = userFromSupabase(data.user);
        setState((previous) => withLocalUser(previous, user));
        setSession({ userId: user.id });
        await syncProfile(user);
      },
      async resendSignupCode(email) {
        const cleanEmail = email.trim().toLowerCase();
        const { error } = await supabase.auth.resend({
          type: "signup",
          email: cleanEmail
        });

        if (error) {
          throw new Error(cleanAuthError(error.message));
        }
      },
      openDemo() {
        void supabase.auth.signOut();
        setState(demoState);
        setSession({ userId: demoUser.id });
      },
      async signOut() {
        await supabase.auth.signOut();
        setSession(null);
      },
      resetDemo() {
        setState(demoState);
        setSession({ userId: demoUser.id });
      },
      async updateUser(input) {
        const userId = requireSession(session);
        const existingUser = state.users.find((user) => user.id === userId);
        const nextUser = existingUser
          ? { ...existingUser, businessName: input.businessName, brandColor: input.brandColor }
          : null;

        if (nextUser && userId !== demoUser.id) {
          await syncProfile(nextUser);
        }

        setState((previous) => ({
          ...previous,
          users: previous.users.map((user) =>
            user.id === userId
              ? { ...user, businessName: input.businessName, brandColor: input.brandColor }
              : user
          )
        }));
      },
      getProject(projectId) {
        const project = state.projects.find((candidate) => candidate.id === projectId);
        return project ? withCalculatedStatus(project, state.checklistItems, state.submissions) : undefined;
      },
      getProjectByToken(token) {
        // Client link audit:
        // - Links resolve by `project.token`, not the readable project id.
        // - New packets use crypto.randomUUID when available, so the token is not realistically guessable.
        // - This version does not include passcodes, expirations, or per-client identity checks.
        // - For production, add optional expiry/passcode controls and server-side rate limiting/audit logs.
        const project = state.projects.find((candidate) => candidate.token === token);
        return project ? withCalculatedStatus(project, state.checklistItems, state.submissions) : undefined;
      },
      getUserProjects() {
        if (!session) {
          return [];
        }

        return state.projects
          .filter((project) => project.userId === session.userId)
          .map((project) => withCalculatedStatus(project, state.checklistItems, state.submissions))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      },
      getProjectItems(projectId) {
        return state.checklistItems
          .filter((item) => item.projectId === projectId)
          .sort((a, b) => a.sortOrder - b.sortOrder);
      },
      getProjectSubmissions(projectId) {
        return state.submissions
          .filter((submission) => submission.projectId === projectId)
          .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
      },
      getItemSubmission(itemId) {
        return state.submissions
          .filter((submission) => submission.checklistItemId === itemId)
          .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
      },
      getProjectLogs(projectId) {
        return state.activityLogs
          .filter((log) => log.projectId === projectId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      },
      getStats() {
        if (!session) {
          return {
            activeProjects: 0,
            missingAssets: 0,
            completedProjects: 0,
            needsAttention: 0
          };
        }

        const projects = state.projects
          .filter((project) => project.userId === session.userId)
          .map((project) => withCalculatedStatus(project, state.checklistItems, state.submissions));

        return {
          activeProjects: projects.filter((project) => project.status !== "completed").length,
          missingAssets: projects.reduce((total, project) => total + missingCount(project.id, state.checklistItems), 0),
          completedProjects: projects.filter((project) => project.status === "completed").length,
          needsAttention: state.checklistItems.filter(
            (item) =>
              projects.some((project) => project.id === item.projectId) &&
              ["submitted", "changes_requested"].includes(item.status)
          ).length
        };
      },
      getProjectProgress(projectId) {
        return projectProgress(projectId, state.checklistItems);
      },
      getMissingCount(projectId) {
        return missingCount(projectId, state.checklistItems);
      },
      async createProject(input) {
        const userId = requireSession(session);

        if (userId !== demoUser.id) {
          const response = await fetch("/api/projects", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(await getBearerAuthHeaders())
            },
            body: JSON.stringify(input)
          });

          if (!response.ok) {
            const body = await response.json().catch(() => null);
            throw new Error(body?.error ?? "Could not save this project.");
          }

          const body = (await response.json()) as {
            project: Project;
            items: ChecklistItem[];
            logs: ActivityLog[];
            subscription?: Subscription;
          };

          setState((previous) => ({
            ...previous,
            projects: [body.project, ...previous.projects],
            checklistItems: [...body.items, ...previous.checklistItems],
            activityLogs: [...body.logs, ...previous.activityLogs],
            subscriptions: body.subscription
              ? [body.subscription, ...previous.subscriptions.filter((subscription) => subscription.userId !== body.subscription?.userId)]
              : previous.subscriptions
          }));

          return body.project;
        }

        const projectId = generateUuid();
        const timestamp = new Date().toISOString();
        const project: Project = {
          id: projectId,
          userId,
          clientName: input.clientName.trim(),
          clientEmail: input.clientEmail.trim().toLowerCase(),
          name: input.name.trim(),
          dueDate: input.dueDate,
          status: "sent",
          token: generateToken(),
          createdAt: timestamp
        };
        const items: ChecklistItem[] = input.items.map((itemInput, index) => ({
          id: generateUuid(),
          projectId,
          title: itemInput.title.trim(),
          description: itemInput.description.trim(),
          type: itemInput.type,
          required: itemInput.required,
          status: "requested",
          sortOrder: index + 1,
          changeRequestNote: "",
          createdAt: timestamp
        }));
        const logs = [
          createLog(projectId, `Created ${project.name} for ${project.clientName}.`),
          createLog(projectId, "Client upload link is ready to send.")
        ];

        setState((previous) => ({
          ...previous,
          projects: [project, ...previous.projects],
          checklistItems: [...items, ...previous.checklistItems],
          activityLogs: [...logs, ...previous.activityLogs]
        }));

        return project;
      },
      async submitItemByToken(token, itemId, input) {
        const project = state.projects.find((candidate) => candidate.token === token);

        if (!project) {
          throw new Error("Upload link not found.");
        }

        const item = state.checklistItems.find((candidate) => candidate.id === itemId);

        if (!item) {
          throw new Error("Checklist item not found.");
        }

        const submission: Submission = {
          id: generateUuid(),
          projectId: project.id,
          checklistItemId: itemId,
          fileName: input.fileName,
          filePath: input.filePath,
          fileDataUrl: input.fileDataUrl,
          textValue: input.textValue,
          linkValue: input.linkValue,
          approvedValue: input.approvedValue,
          acceptedCreativeAssetOnly: input.acceptedCreativeAssetOnly,
          acceptedCreativeAssetOnlyAt: input.acceptedCreativeAssetOnly ? new Date().toISOString() : undefined,
          clientComment: input.clientComment,
          submittedAt: new Date().toISOString()
        };
        const log = createLog(project.id, `${project.clientName} submitted ${item.title}.`);
        let nextProjectStatus: ProjectStatus | null = null;

        if (isUuid(project.id)) {
          const response = await fetch(`/api/public/packet/${token}/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              itemId,
              ...input
            })
          });

          if (!response.ok) {
            const body = await response.json().catch(() => null);
            throw new Error(body?.error ?? "Could not save this submission.");
          }

          const body = (await response.json()) as { submission?: Submission; projectStatus?: ProjectStatus };

          if (body.submission) {
            submission.id = body.submission.id;
            submission.filePath = body.submission.filePath;
            submission.fileDataUrl = body.submission.fileDataUrl;
            submission.acceptedCreativeAssetOnly = body.submission.acceptedCreativeAssetOnly;
            submission.acceptedCreativeAssetOnlyAt = body.submission.acceptedCreativeAssetOnlyAt;
            submission.submittedAt = body.submission.submittedAt;
          }

          nextProjectStatus = body.projectStatus ?? null;
        }

        setState((previous) => ({
          ...previous,
          submissions: [
            submission,
            ...previous.submissions.filter((candidate) => candidate.checklistItemId !== itemId)
          ],
          checklistItems: previous.checklistItems.map((candidate) =>
            candidate.id === itemId
              ? { ...candidate, status: "submitted", changeRequestNote: "" }
              : candidate
          ),
          projects: nextProjectStatus
            ? previous.projects.map((candidate) =>
                candidate.id === project.id ? { ...candidate, status: nextProjectStatus } : candidate
              )
            : previous.projects,
          activityLogs: [
            log,
            ...previous.activityLogs
          ]
        }));
      },
      async updateItemStatus(projectId, itemId, status, changeRequestNote = "") {
        const item = state.checklistItems.find((candidate) => candidate.id === itemId);
        const note = status === "changes_requested" ? changeRequestNote : "";
        let nextItem: ChecklistItem | null = null;
        let nextProjectStatus: ProjectStatus | null = null;
        let log = createLog(projectId, activityForStatus(item?.title ?? "Asset", status));

        if (isUuid(projectId) && isUuid(itemId)) {
          const response = await fetch(`/api/checklist-items/${itemId}/status`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...(await getBearerAuthHeaders())
            },
            body: JSON.stringify({
              status,
              changeRequestNote
            })
          });

          if (!response.ok) {
            const body = await response.json().catch(() => null);
            throw new Error(body?.error ?? "Could not save item status.");
          }

          const body = (await response.json()) as {
            item?: ChecklistItem;
            projectStatus?: ProjectStatus;
            log?: ActivityLog | null;
          };

          nextItem = body.item ?? null;
          nextProjectStatus = body.projectStatus ?? null;

          if (body.log) {
            log = body.log;
          }
        }

        setState((previous) => ({
          ...previous,
          checklistItems: previous.checklistItems.map((candidate) =>
            candidate.id === itemId
              ? nextItem ?? {
                  ...candidate,
                  status,
                  changeRequestNote: note
                }
              : candidate
          ),
          projects: nextProjectStatus
            ? previous.projects.map((project) =>
                project.id === projectId ? { ...project, status: nextProjectStatus } : project
              )
            : previous.projects,
          activityLogs: [
            log,
            ...previous.activityLogs
          ]
        }));
      },
      async deleteSubmission(submissionId) {
        const submission = state.submissions.find((candidate) => candidate.id === submissionId);

        if (!submission) {
          throw new Error("Submission not found.");
        }

        const item = state.checklistItems.find((candidate) => candidate.id === submission.checklistItemId);
        const message = `Deleted submission for ${item?.title ?? "this item"}.`;
        const log = createLog(submission.projectId, message);
        let nextProjectStatus: ProjectStatus | null = null;

        if (isUuid(submission.id)) {
          const response = await fetch(`/api/submissions/${submission.id}`, {
            method: "DELETE",
            headers: await getBearerAuthHeaders()
          });

          if (!response.ok) {
            const body = await response.json().catch(() => null);
            throw new Error(body?.error ?? "Could not delete submission.");
          }

          const body = (await response.json()) as { projectStatus?: ProjectStatus };
          nextProjectStatus = body.projectStatus ?? null;
        }

        setState((previous) => ({
          ...previous,
          submissions: previous.submissions.filter((candidate) => candidate.id !== submission.id),
          checklistItems: previous.checklistItems.map((candidate) =>
            candidate.id === submission.checklistItemId
              ? {
                  ...candidate,
                  status: "requested",
                  changeRequestNote: ""
                }
              : candidate
          ),
          projects: nextProjectStatus
            ? previous.projects.map((project) =>
                project.id === submission.projectId ? { ...project, status: nextProjectStatus } : project
              )
            : previous.projects,
          activityLogs: [log, ...previous.activityLogs]
        }));
      },
      async deleteProject(projectId) {
        const project = state.projects.find((candidate) => candidate.id === projectId);

        if (!project) {
          throw new Error("Project not found.");
        }

        if (isUuid(project.id)) {
          const response = await fetch(`/api/projects/${project.id}`, {
            method: "DELETE",
            headers: await getBearerAuthHeaders()
          });

          if (!response.ok) {
            const body = await response.json().catch(() => null);
            throw new Error(body?.error ?? "Could not delete project.");
          }
        }

        setState((previous) => ({
          ...previous,
          projects: previous.projects.filter((candidate) => candidate.id !== project.id),
          checklistItems: previous.checklistItems.filter((item) => item.projectId !== project.id),
          submissions: previous.submissions.filter((submission) => submission.projectId !== project.id),
          activityLogs: previous.activityLogs.filter((log) => log.projectId !== project.id)
        }));
      },
      async sendReminder(projectId) {
        const project = state.projects.find((candidate) => candidate.id === projectId);

        if (!project) {
          return "";
        }

        const missing = missingCount(projectId, state.checklistItems);
        const message = `Reminder drafted for ${project.clientName}: ${missing} item${missing === 1 ? "" : "s"} still needed for ${project.name}.`;
        const log = createLog(projectId, message);

        if (isUuid(projectId)) {
          const { error } = await supabase.from("activity_logs").insert({
            id: log.id,
            project_id: log.projectId,
            message: log.message,
            created_at: log.createdAt
          });

          if (error) {
            throw new Error(`Could not save reminder log: ${error.message}`);
          }
        }

        setState((previous) => ({
          ...previous,
          activityLogs: [log, ...previous.activityLogs]
        }));

        return message;
      },
      refreshWorkspace,
      async addTemplate(input) {
        const userId = requireSession(session);
        const template: Template = {
          id: generateUuid(),
          userId,
          name: input.name.trim(),
          description: input.description.trim(),
          items: input.items.map((itemInput, index) => ({
            id: generateUuid(),
            title: itemInput.title.trim(),
            description: itemInput.description.trim(),
            type: itemInput.type,
            required: itemInput.required,
            sortOrder: index + 1
          }))
        };

        if (userId !== demoUser.id) {
          await saveTemplateToSupabase(template);
        }

        setState((previous) => ({
          ...previous,
          templates: [template, ...previous.templates]
        }));

        return template;
      },
      async updateTemplate(templateId, input) {
        const userId = requireSession(session);
        const existingTemplate = state.templates.find((template) => template.id === templateId);
        const template: Template = {
          id: isUuid(templateId) ? templateId : generateUuid(),
          userId,
          name: input.name.trim(),
          description: input.description.trim(),
          items: input.items.map((itemInput, index) => ({
            id: generateUuid(),
            title: itemInput.title.trim(),
            description: itemInput.description.trim(),
            type: itemInput.type,
            required: itemInput.required,
            sortOrder: index + 1
          }))
        };

        if (userId !== demoUser.id) {
          if (isUuid(templateId)) {
            await replaceTemplateInSupabase(template);
          } else {
            await saveTemplateToSupabase(template);
          }
        }

        setState((previous) => ({
          ...previous,
          templates: existingTemplate
            ? previous.templates.map((candidate) => (candidate.id === templateId ? template : candidate))
            : [template, ...previous.templates]
        }));

        return template;
      },
      async deleteTemplate(templateId) {
        if (isUuid(templateId)) {
          const { error } = await supabase.from("templates").delete().eq("id", templateId);

          if (error) {
            throw new Error(`Could not delete template: ${error.message}`);
          }
        }

        setState((previous) => ({
          ...previous,
          templates: previous.templates.filter((template) => template.id !== templateId)
        }));
      }
    }),
    [state, session, isReady, isSampleWorkspace, currentUser, refreshWorkspace]
  );

  return (
    <ProjectPacketContext.Provider value={value}>
      {children}
    </ProjectPacketContext.Provider>
  );
}

export function useProjectPacket() {
  const value = useContext(ProjectPacketContext);

  if (!value) {
    throw new Error("useProjectPacket must be used inside ProjectPacketProvider");
  }

  return value;
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(date));
}

export function statusLabel(status: ProjectStatus | ChecklistItemStatus) {
  const labels: Record<ProjectStatus | ChecklistItemStatus, string> = {
    draft: "Draft",
    sent: "Sent",
    in_progress: "In progress",
    completed: "Completed",
    overdue: "Overdue",
    requested: "Missing",
    submitted: "Submitted",
    approved: "Approved",
    changes_requested: "Needs changes",
    waived: "Waived"
  };

  return labels[status];
}

export function withCalculatedStatus(
  project: Project,
  items: ChecklistItem[],
  submissions: Submission[]
): Project {
  return {
    ...project,
    status: calculateProjectStatus(project, items, submissions)
  };
}

export function calculateProjectStatus(
  project: Project,
  items: ChecklistItem[],
  submissions: Submission[]
): ProjectStatus {
  const projectItems = items.filter((item) => item.projectId === project.id);
  const requiredItems = projectItems.filter((item) => item.required);

  if (requiredItems.length > 0 && requiredItems.every((item) => ["approved", "waived"].includes(item.status))) {
    return "completed";
  }

  if (new Date(project.dueDate) < startOfToday() && requiredItems.some((item) => ["requested", "changes_requested"].includes(item.status))) {
    return "overdue";
  }

  if (
    projectItems.some((item) => item.status !== "requested") ||
    submissions.some((submission) => submission.projectId === project.id)
  ) {
    return "in_progress";
  }

  return project.status === "draft" ? "draft" : "sent";
}

export function projectProgress(projectId: string, items: ChecklistItem[]) {
  const requiredItems = items.filter((item) => item.projectId === projectId && item.required);

  if (!requiredItems.length) {
    return 100;
  }

  const done = requiredItems.filter((item) =>
    ["submitted", "approved", "waived"].includes(item.status)
  ).length;

  return Math.round((done / requiredItems.length) * 100);
}

function missingCount(projectId: string, items: ChecklistItem[]) {
  return items.filter(
    (item) =>
      item.projectId === projectId &&
      item.required &&
      ["requested", "changes_requested"].includes(item.status)
  ).length;
}

function createLog(projectId: string, message: string): ActivityLog {
  return {
    id: generateUuid(),
    projectId,
    message,
    createdAt: new Date().toISOString()
  };
}

function activityForStatus(title: string, status: ChecklistItemStatus) {
  if (status === "approved") {
    return `Approved ${title}.`;
  }

  if (status === "changes_requested") {
    return `Requested changes for ${title}.`;
  }

  if (status === "waived") {
    return `Waived ${title}.`;
  }

  return `Updated ${title} to ${statusLabel(status)}.`;
}

function requireSession(session: Session | null) {
  if (!session) {
    throw new Error("Sign in first.");
  }

  return session.userId;
}

function userFromSupabase(
  authUser: SupabaseUser,
  fallback?: { name: string; email: string; businessName: string }
): ProjectPacketUser {
  const metadata = authUser.user_metadata ?? {};
  const email = authUser.email ?? fallback?.email.trim().toLowerCase() ?? "";
  const name =
    String(metadata.name ?? metadata.full_name ?? fallback?.name ?? "").trim() ||
    email.split("@")[0] ||
    "Freelancer";
  const businessName =
    String(metadata.business_name ?? metadata.businessName ?? fallback?.businessName ?? "").trim() ||
    "My Studio";

  return {
    id: authUser.id,
    name,
    email,
    businessName,
    brandColor: "#2563eb",
    createdAt: authUser.created_at ?? new Date().toISOString()
  };
}

function withLocalUser(
  previous: ProjectPacketState,
  user: ProjectPacketUser
): ProjectPacketState {
  const existingUser = previous.users.find((candidate) => candidate.id === user.id);
  const userTemplates = previous.templates.filter((template) => template.userId === user.id);
  const starterTemplates = defaultTemplates(user.id).filter(
    (starterTemplate) => !userTemplates.some((template) => template.id === starterTemplate.id)
  );
  const hasSubscription = previous.subscriptions.some((subscription) => subscription.userId === user.id);

  return {
    ...previous,
    users: existingUser
      ? previous.users.map((candidate) =>
          candidate.id === user.id
            ? {
                ...candidate,
                ...user,
                businessName: user.businessName || candidate.businessName,
                brandColor: candidate.brandColor ?? user.brandColor
              }
            : candidate
        )
      : [user, ...previous.users],
    templates: starterTemplates.length ? [...starterTemplates, ...previous.templates] : previous.templates,
    subscriptions: hasSubscription
      ? previous.subscriptions
      : [
          {
            id: generateId("sub"),
            userId: user.id,
            plan: "free",
            status: "trialing"
          },
          ...previous.subscriptions
        ]
  };
}

interface RemoteWorkspace {
  projects: Project[];
  checklistItems: ChecklistItem[];
  submissions: Submission[];
  subscriptions: Subscription[];
  templates: Template[];
  activityLogs: ActivityLog[];
}

interface ProjectRow {
  id: string;
  user_id: string;
  client_name: string;
  client_email: string;
  name: string;
  due_date: string;
  status: string;
  token: string;
  created_at: string;
}

interface ChecklistItemRow {
  id: string;
  project_id: string;
  title: string;
  description: string;
  type: string;
  required: boolean;
  status: string;
  sort_order: number;
  change_request_note: string;
  created_at: string;
}

interface SubmissionRow {
  id: string;
  project_id: string;
  checklist_item_id: string;
  file_name: string | null;
  file_path: string | null;
  text_value: string | null;
  link_value: string | null;
  approved_value: boolean | null;
  accepted_creative_asset_only?: boolean | null;
  accepted_creative_asset_only_at?: string | null;
  client_comment: string;
  submitted_at: string;
}

interface ActivityLogRow {
  id: string;
  project_id: string;
  message: string;
  created_at: string;
}

interface TemplateRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
}

interface TemplateItemRow {
  id: string;
  template_id: string;
  title: string;
  description: string;
  type: string;
  required: boolean;
  sort_order: number;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  plan: string;
  status: string;
}

async function loadWorkspaceFromSupabase(userId: string): Promise<RemoteWorkspace> {
  const [projectsResult, templatesResult, subscriptionsResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id,user_id,client_name,client_email,name,due_date,status,token,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("templates")
      .select("id,user_id,name,description")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("subscriptions")
      .select("id,user_id,plan,status")
      .eq("user_id", userId)
      .in("status", ["trialing", "active"])
      .order("created_at", { ascending: false })
  ]);

  if (projectsResult.error) {
    throw projectsResult.error;
  }

  if (templatesResult.error) {
    throw templatesResult.error;
  }

  const projects = ((projectsResult.data ?? []) as ProjectRow[]).map(projectFromRow);
  const templateRows = (templatesResult.data ?? []) as TemplateRow[];
  const templateIds = templateRows.map((template) => template.id);
  const templates = templateIds.length
    ? await loadTemplateItems(templateRows, templateIds)
    : [];
  const subscriptions = subscriptionsResult.error
    ? [freeSubscriptionForUser(userId)]
    : ((subscriptionsResult.data ?? []) as SubscriptionRow[]).map(subscriptionFromRow);
  const projectIds = projects.map((project) => project.id);

  if (subscriptionsResult.error) {
    console.warn("Could not load subscription. Defaulting to free:", subscriptionsResult.error.message);
  }

  if (!projectIds.length) {
    return {
      projects,
      checklistItems: [],
      submissions: [],
      subscriptions: subscriptions.length ? subscriptions : [freeSubscriptionForUser(userId)],
      templates,
      activityLogs: []
    };
  }

  const [itemsResult, submissionsResult, logsResult] = await Promise.all([
    supabase
      .from("checklist_items")
      .select("id,project_id,title,description,type,required,status,sort_order,change_request_note,created_at")
      .in("project_id", projectIds)
      .order("sort_order", { ascending: true }),
    loadSubmissionsForProjects(projectIds),
    supabase
      .from("activity_logs")
      .select("id,project_id,message,created_at")
      .in("project_id", projectIds)
      .order("created_at", { ascending: false })
  ]);

  if (itemsResult.error) {
    throw itemsResult.error;
  }

  if (submissionsResult.error) {
    throw submissionsResult.error;
  }

  if (logsResult.error) {
    throw logsResult.error;
  }

  return {
    projects,
    checklistItems: ((itemsResult.data ?? []) as ChecklistItemRow[]).map(checklistItemFromRow),
    submissions: ((submissionsResult.data ?? []) as SubmissionRow[]).map(submissionFromRow),
    subscriptions: subscriptions.length ? subscriptions : [freeSubscriptionForUser(userId)],
    templates,
    activityLogs: ((logsResult.data ?? []) as ActivityLogRow[]).map(activityLogFromRow)
  };
}

async function loadTemplateItems(templateRows: TemplateRow[], templateIds: string[]) {
  const { data, error } = await supabase
    .from("template_items")
    .select("id,template_id,title,description,type,required,sort_order")
    .in("template_id", templateIds)
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as TemplateItemRow[];

  return templateRows.map((template) => ({
    id: template.id,
    userId: template.user_id,
    name: template.name,
    description: template.description,
    items: rows
      .filter((row) => row.template_id === template.id)
      .map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        type: row.type as ChecklistItemType,
        required: row.required,
        sortOrder: row.sort_order
      }))
  }));
}

function mergeRemoteWorkspace(
  previous: ProjectPacketState,
  userId: string,
  workspace: RemoteWorkspace
): ProjectPacketState {
  const replacedProjectIds = new Set([
    ...previous.projects.filter((project) => project.userId === userId).map((project) => project.id),
    ...workspace.projects.map((project) => project.id)
  ]);

  return {
    ...previous,
    projects: [
      ...workspace.projects,
      ...previous.projects.filter((project) => project.userId !== userId)
    ],
    checklistItems: [
      ...workspace.checklistItems,
      ...previous.checklistItems.filter((item) => !replacedProjectIds.has(item.projectId))
    ],
    submissions: [
      ...workspace.submissions,
      ...previous.submissions.filter((submission) => !replacedProjectIds.has(submission.projectId))
    ],
    templates: [
      ...workspace.templates,
      ...previous.templates.filter((template) => template.userId !== userId || !isUuid(template.id))
    ],
    subscriptions: [
      ...workspace.subscriptions,
      ...previous.subscriptions.filter((subscription) => subscription.userId !== userId)
    ],
    activityLogs: [
      ...workspace.activityLogs,
      ...previous.activityLogs.filter((log) => !replacedProjectIds.has(log.projectId))
    ]
  };
}

function projectFromRow(row: ProjectRow): Project {
  return {
    id: row.id,
    userId: row.user_id,
    clientName: row.client_name,
    clientEmail: row.client_email,
    name: row.name,
    dueDate: row.due_date,
    status: row.status as ProjectStatus,
    token: row.token,
    createdAt: row.created_at
  };
}

function checklistItemFromRow(row: ChecklistItemRow): ChecklistItem {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    type: row.type as ChecklistItemType,
    required: row.required,
    status: row.status as ChecklistItemStatus,
    sortOrder: row.sort_order,
    changeRequestNote: row.change_request_note,
    createdAt: row.created_at
  };
}

function submissionFromRow(row: SubmissionRow): Submission {
  return {
    id: row.id,
    projectId: row.project_id,
    checklistItemId: row.checklist_item_id,
    fileName: row.file_name ?? undefined,
    filePath: row.file_path ?? undefined,
    textValue: row.text_value ?? undefined,
    linkValue: row.link_value ?? undefined,
    approvedValue: row.approved_value ?? undefined,
    acceptedCreativeAssetOnly: row.accepted_creative_asset_only ?? undefined,
    acceptedCreativeAssetOnlyAt: row.accepted_creative_asset_only_at ?? undefined,
    clientComment: row.client_comment,
    submittedAt: row.submitted_at
  };
}

async function loadSubmissionsForProjects(projectIds: string[]) {
  const result = await supabase
    .from("submissions")
    .select("id,project_id,checklist_item_id,file_name,file_path,text_value,link_value,approved_value,accepted_creative_asset_only,accepted_creative_asset_only_at,client_comment,submitted_at")
    .in("project_id", projectIds)
    .order("submitted_at", { ascending: false });

  if (!result.error || !result.error.message.includes("accepted_creative_asset_only")) {
    return result;
  }

  return supabase
    .from("submissions")
    .select("id,project_id,checklist_item_id,file_name,file_path,text_value,link_value,approved_value,client_comment,submitted_at")
    .in("project_id", projectIds)
    .order("submitted_at", { ascending: false });
}

function activityLogFromRow(row: ActivityLogRow): ActivityLog {
  return {
    id: row.id,
    projectId: row.project_id,
    message: row.message,
    createdAt: row.created_at
  };
}

function subscriptionFromRow(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    userId: row.user_id,
    plan: row.plan as Subscription["plan"],
    status: row.status as Subscription["status"]
  };
}

function freeSubscriptionForUser(userId: string): Subscription {
  return {
    id: `free-${userId}`,
    userId,
    plan: "free",
    status: "active"
  };
}

async function saveTemplateToSupabase(template: Template) {
  const { error: templateError } = await supabase.from("templates").insert({
    id: template.id,
    user_id: template.userId,
    name: template.name,
    description: template.description
  });

  if (templateError) {
    throw new Error(`Could not save template: ${templateError.message}`);
  }

  await insertTemplateItems(template);
}

async function replaceTemplateInSupabase(template: Template) {
  const { error: templateError } = await supabase
    .from("templates")
    .update({
      name: template.name,
      description: template.description
    })
    .eq("id", template.id);

  if (templateError) {
    throw new Error(`Could not update template: ${templateError.message}`);
  }

  const { error: deleteError } = await supabase
    .from("template_items")
    .delete()
    .eq("template_id", template.id);

  if (deleteError) {
    throw new Error(`Could not replace template items: ${deleteError.message}`);
  }

  await insertTemplateItems(template);
}

async function insertTemplateItems(template: Template) {
  if (!template.items.length) {
    return;
  }

  const { error } = await supabase.from("template_items").insert(
    template.items.map((item) => ({
      id: item.id,
      template_id: template.id,
      title: item.title,
      description: item.description,
      type: item.type,
      required: item.required,
      sort_order: item.sortOrder
    }))
  );

  if (error) {
    throw new Error(`Could not save template items: ${error.message}`);
  }
}

async function syncProfile(user: ProjectPacketUser) {
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    name: user.name,
    email: user.email,
    business_name: user.businessName,
    brand_color: user.brandColor ?? "#2563eb"
  });

  if (error) {
    console.warn("Could not sync Supabase profile:", error.message);
  }
}

function cleanAuthError(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return "That email or password is not right.";
  }

  if (lower.includes("email not confirmed")) {
    return "Verify your email with the signup code before logging in.";
  }

  if (lower.includes("already registered") || lower.includes("already exists")) {
    return "An account already exists with that email. Use login instead.";
  }

  if (lower.includes("password")) {
    return "Use a password with at least 6 characters.";
  }

  return message || "Auth failed. Try again.";
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function generateId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
  }

  return `${prefix}_${Math.random().toString(36).slice(2, 12)}`;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function generateUuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function generateToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `packet_${crypto.randomUUID().replaceAll("-", "")}`;
  }

  return `packet_${Math.random().toString(36).slice(2)}${Date.now()}`;
}
