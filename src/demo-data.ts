import {
  ActivityLog,
  ChecklistItem,
  Project,
  ProjectPacketState,
  Submission,
  Subscription,
  Template,
  TemplateItem,
  User
} from "@/src/types";

const now = new Date();
const today = now.toISOString();
const demoTokens = {
  greenline: "packet_4f8c9a12d7e24b58b6c3910a85f3d2e7",
  bloom: "packet_b72e6380ac9241c7a6915f4d8b0e37aa",
  atlas: "packet_91d3f72e0f6a48ad9012c4f587bb0c62",
  harbor: "packet_c08a4f739e8d4ef39a7b205e81d93fd1"
};

export const demoUser: User = {
  id: "user_maya",
  name: "Maya Chen",
  email: "maya@northstar.studio",
  businessName: "Northstar Studio",
  brandColor: "#2563eb",
  createdAt: today,
  password: "projectpacket"
};

export const demoTemplates = defaultTemplates(demoUser.id);

const demoProjects: Project[] = [
  project("project_greenline", "Greenline Coffee Website Launch", "Sam Rivera", "sam@greenline.test", 7, demoTokens.greenline, -5),
  project("project_bloom", "Bloom & Co Brand Refresh", "Avery Morgan", "avery@bloom.test", 4, demoTokens.bloom, -9),
  project("project_atlas", "Atlas Fitness Social Media Setup", "Jordan Lee", "jordan@atlas.test", 10, demoTokens.atlas, -2),
  project("project_harbor", "Harbor Homes Video Project", "Nina Patel", "nina@harbor.test", 14, demoTokens.harbor, -4)
];

const demoItems: ChecklistItem[] = [
  item("item_green_logo", "project_greenline", "Logo files", "Upload SVG or PNG logo files.", "file", 1, "requested"),
  item("item_green_colors", "project_greenline", "Brand colors", "Share hex codes or brand guidelines.", "text", 2, "submitted"),
  item("item_green_home", "project_greenline", "Homepage copy", "Paste hero copy, offer copy, and CTA notes.", "text", 3, "requested"),
  item("item_green_photos", "project_greenline", "Team photos", "Upload cafe, product, and team photos.", "file", 4, "requested"),
  item("item_green_testimonials", "project_greenline", "Testimonials", "Paste approved customer quotes.", "text", 5, "requested"),
  item("item_bloom_logo", "project_bloom", "Current logo", "Upload the latest logo package.", "file", 1, "approved"),
  item("item_bloom_inspo", "project_bloom", "Brand inspiration links", "Share visual references or Pinterest boards.", "link", 2, "submitted"),
  item("item_bloom_words", "project_bloom", "Brand words", "Describe how the brand should feel.", "text", 3, "changes_requested", "Please add 3-5 words instead of a full paragraph."),
  item("item_bloom_approval", "project_bloom", "Final logo approval", "Approve the final direction.", "approval", 4, "requested"),
  item("item_atlas_profile", "project_atlas", "Profile photo/logo", "Upload a square profile image.", "file", 1, "requested"),
  item("item_atlas_bio", "project_atlas", "Bio copy", "Paste the profile bio.", "text", 2, "requested"),
  item("item_atlas_link", "project_atlas", "Website link", "Add the landing page URL.", "link", 3, "requested"),
  item("item_atlas_approval", "project_atlas", "Content approval", "Approve the first post batch.", "approval", 4, "requested"),
  item("item_harbor_footage", "project_harbor", "Raw footage", "Upload raw clips or a zipped folder.", "file", 1, "requested"),
  item("item_harbor_assets", "project_harbor", "Brand assets", "Upload logo and brand elements.", "file", 2, "submitted"),
  item("item_harbor_script", "project_harbor", "Script notes", "Add must-say lines or pronunciation notes.", "text", 3, "requested"),
  item("item_harbor_music", "project_harbor", "Music reference", "Share a reference track link.", "link", 4, "requested")
];

const demoSubmissions: Submission[] = [
  submission("sub_green_colors", "project_greenline", "item_green_colors", {
    textValue: "Forest #214d3f, cream #f6efe2, clay #c56a49",
    clientComment: "These are from the old menu design.",
    submittedAt: atOffset(0, 14, 14)
  }),
  submission("sub_bloom_logo", "project_bloom", "item_bloom_logo", {
    fileName: "bloom-logo-pack.zip",
    fileDataUrl: "data:text/plain;base64,Qmxvb20gJiBDbyBsb2dvIHBhY2sgZGVtbyBmaWxlLg==",
    clientComment: "Includes SVG, PNG, and favicon.",
    submittedAt: atOffset(-1, 9, 42)
  }),
  submission("sub_bloom_inspo", "project_bloom", "item_bloom_inspo", {
    linkValue: "https://example.com/bloom-inspiration",
    clientComment: "We like the spacing and color mood here.",
    submittedAt: atOffset(-1, 10, 8)
  }),
  submission("sub_bloom_words", "project_bloom", "item_bloom_words", {
    textValue: "A long paragraph about the brand direction that needs to be shortened.",
    clientComment: "I can simplify this if needed.",
    submittedAt: atOffset(-3, 11, 18)
  }),
  submission("sub_harbor_assets", "project_harbor", "item_harbor_assets", {
    fileName: "harbor-brand-assets.zip",
    fileDataUrl: "data:text/plain;base64,SGFyYm9yIEhvbWVzIGJyYW5kIGFzc2V0cyBkZW1vIGZpbGUu",
    clientComment: "Logo and color guide included.",
    submittedAt: atOffset(-2, 16, 5)
  })
];

const demoLogs: ActivityLog[] = [
  log("project_greenline", "Project created and upload link copied.", atOffset(-5, 10, 25)),
  log("project_greenline", "Sam submitted brand colors.", atOffset(0, 14, 14)),
  log("project_bloom", "Avery uploaded current logo.", atOffset(-1, 9, 42)),
  log("project_bloom", "Brand words need changes.", atOffset(-3, 11, 18)),
  log("project_harbor", "Nina uploaded brand assets.", atOffset(-2, 16, 5))
];

const demoSubscriptions: Subscription[] = [
  {
    id: "sub_maya",
    userId: demoUser.id,
    plan: "pro",
    status: "trialing"
  }
];

export const demoState: ProjectPacketState = {
  users: [demoUser],
  projects: demoProjects,
  checklistItems: demoItems,
  submissions: demoSubmissions,
  templates: demoTemplates,
  activityLogs: demoLogs,
  subscriptions: demoSubscriptions
};

export function defaultTemplates(userId: string): Template[] {
  return [
    template(userId, "template_website", "Website Launch", "Assets needed before a site can move fast.", [
      templateItem("Logo files", "Upload SVG, PNG, or a zipped logo package.", "file", 1),
      templateItem("Brand colors", "Paste hex codes or notes from brand guidelines.", "text", 2),
      templateItem("Homepage copy", "Paste headline, section copy, and calls to action.", "text", 3),
      templateItem("About page copy", "Paste the approved about copy.", "text", 4),
      templateItem("Team photos", "Upload portraits or brand photography.", "file", 5),
      templateItem("Testimonials", "Paste approved customer quotes.", "text", 6),
      templateItem("Social media links", "Add the main social/profile link.", "link", 7),
      templateItem("Final website approval", "Confirm the final launch direction.", "approval", 8)
    ]),
    template(userId, "template_brand", "Brand Design", "Reference and approval packet for a brand project.", [
      templateItem("Current logo", "Upload any existing logo files.", "file", 1),
      templateItem("Brand inspiration links", "Share Pinterest, websites, or mood boards.", "link", 2),
      templateItem("Competitor links", "Share competitor sites or profiles.", "link", 3),
      templateItem("Brand words", "List 3-5 words the brand should feel like.", "text", 4),
      templateItem("Final logo approval", "Approve the final logo direction.", "approval", 5)
    ]),
    template(userId, "template_social", "Social Media Setup", "Everything needed to prep profiles and posts.", [
      templateItem("Profile photo/logo", "Upload a square profile image.", "file", 1),
      templateItem("Bio copy", "Paste profile bio copy.", "text", 2),
      templateItem("Website link", "Add the link to use in profile bios.", "link", 3),
      templateItem("Brand photos", "Upload brand or product photos.", "file", 4),
      templateItem("Content approval", "Approve the content direction.", "approval", 5)
    ]),
    template(userId, "template_video", "Video Project", "Client materials for video editing work.", [
      templateItem("Raw footage", "Upload raw clips or a zipped folder.", "file", 1),
      templateItem("Brand assets", "Upload logo and visual assets.", "file", 2),
      templateItem("Script notes", "Add any must-say lines or pronunciation notes.", "text", 3),
      templateItem("Music reference", "Share a reference track link.", "link", 4),
      templateItem("Final edit approval", "Approve the edit for delivery.", "approval", 5)
    ])
  ];
}

function project(id: string, name: string, clientName: string, clientEmail: string, dueInDays: number, token: string, createdOffsetDays: number): Project {
  const due = new Date();
  due.setDate(now.getDate() + dueInDays);
  return {
    id,
    userId: demoUser.id,
    clientName,
    clientEmail,
    name,
    dueDate: due.toISOString().slice(0, 10),
    status: "sent",
    token,
    createdAt: atOffset(createdOffsetDays, 9, 30)
  };
}

function item(
  id: string,
  projectId: string,
  title: string,
  description: string,
  type: TemplateItem["type"],
  sortOrder: number,
  status: ChecklistItem["status"],
  changeRequestNote = ""
): ChecklistItem {
  return {
    id,
    projectId,
    title,
    description,
    type,
    required: true,
    status,
    sortOrder,
    changeRequestNote,
    createdAt: today
  };
}

function submission(
  id: string,
  projectId: string,
  checklistItemId: string,
  values: Partial<Submission>
): Submission {
  return {
    id,
    projectId,
    checklistItemId,
    clientComment: "",
    submittedAt: today,
    ...values
  };
}

function log(projectId: string, message: string, createdAt = today): ActivityLog {
  return {
    id: `log_${projectId}_${message.slice(0, 8).replaceAll(" ", "_")}`,
    projectId,
    message,
    createdAt
  };
}

function atOffset(days: number, hours: number, minutes: number) {
  const date = new Date(now);
  date.setDate(now.getDate() + days);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

function template(userId: string, id: string, name: string, description: string, items: TemplateItem[]): Template {
  return {
    id,
    userId,
    name,
    description,
    items
  };
}

function templateItem(
  title: string,
  description: string,
  type: TemplateItem["type"],
  sortOrder: number,
  required = true
): TemplateItem {
  return {
    id: `template_item_${title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    title,
    description,
    type,
    required,
    sortOrder
  };
}
