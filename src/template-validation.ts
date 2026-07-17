import type { ChecklistItemType } from "@/src/types";

export interface TemplatePayload {
  name?: string;
  description?: string;
  items?: Array<{
    title?: string;
    description?: string;
    type?: ChecklistItemType;
    required?: boolean;
  }>;
}

export function validateTemplateBody(body: TemplatePayload) {
  if (!body.name?.trim()) {
    return "Add a template name.";
  }

  if (!body.items?.length) {
    return "Add at least one template item.";
  }

  const validTypes: ChecklistItemType[] = ["file", "text", "link", "approval"];
  const invalidItem = body.items.find((item) => !item.title?.trim() || !item.type || !validTypes.includes(item.type));

  if (invalidItem) {
    return "Every template item needs a title and type.";
  }

  return "";
}
