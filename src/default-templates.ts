import { Template, TemplateItem } from "@/src/types";

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
