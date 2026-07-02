export const TEXT_ANSWER_MAX_LENGTH = 3000;
export const CLIENT_COMMENT_MAX_LENGTH = 800;
export const LINK_VALUE_MAX_LENGTH = 500;

export function validateSubmissionLengths(input: {
  textValue?: string;
  linkValue?: string;
  clientComment?: string;
}) {
  if ((input.textValue ?? "").length > TEXT_ANSWER_MAX_LENGTH) {
    return `Keep text answers under ${TEXT_ANSWER_MAX_LENGTH} characters.`;
  }

  if ((input.clientComment ?? "").length > CLIENT_COMMENT_MAX_LENGTH) {
    return `Keep comments under ${CLIENT_COMMENT_MAX_LENGTH} characters.`;
  }

  if ((input.linkValue ?? "").length > LINK_VALUE_MAX_LENGTH) {
    return `Keep links under ${LINK_VALUE_MAX_LENGTH} characters.`;
  }

  return "";
}
