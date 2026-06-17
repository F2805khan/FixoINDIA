import { Resend } from "resend";

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const cleanSubjectPart = (value) => String(value ?? "").replace(/[\r\n]+/g, " ").trim();
const DEFAULT_REVIEW_TO = "anything@moreumelaa.resend.app";

const formatDateTime = (value = new Date()) => {
  const date = new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata"
  }).format(safeDate);
};

const renderRows = (rows) =>
  rows
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim())
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:7px 10px; border:1px solid #e7ecf2; color:#5f6b7a;">${escapeHtml(label)}</td>
          <td style="padding:7px 10px; border:1px solid #e7ecf2;">${escapeHtml(value)}</td>
        </tr>
      `
    )
    .join("");

const renderTextRows = (rows) =>
  rows
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim())
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");

const renderEmail = ({ preheader, heading, bodyHtml, bodyText }) => ({
  html: `
    <div style="display:none; max-height:0; overflow:hidden;">${escapeHtml(preheader)}</div>
    <div style="background:#f6f8fb; padding:32px 16px; font-family:Arial, sans-serif; color:#172033;">
      <div style="max-width:560px; margin:0 auto; background:#ffffff; border:1px solid #e7ecf2; border-radius:16px; padding:28px;">
        <p style="margin:0 0 20px; color:#2563eb; font-size:13px; font-weight:700; letter-spacing:1px;">FUNSERVICE</p>
        <h1 style="margin:0 0 18px; font-size:24px;">${escapeHtml(heading)}</h1>
        ${bodyHtml}
      </div>
    </div>
  `,
  text: `FUNSERVICE\n\n${heading}\n\n${bodyText}`
});

export const isEmailDeliveryConfigured = () => Boolean(process.env.RESEND_API_KEY?.trim());

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  return apiKey ? new Resend(apiKey) : null;
};

const sendEmail = async ({ to, subject, html, text, replyTo }) => {
  const resend = getResendClient();
  if (!resend) return false;

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL?.trim() || "FunService <onboarding@resend.dev>",
    to: [to],
    subject,
    html,
    text,
    ...(replyTo ? { replyTo } : {})
  });

  if (error) {
    throw new Error(error.message || "Resend rejected the email request");
  }

  return true;
};

export const sendOtpEmail = ({ to, otp }) => {
  const content = renderEmail({
    preheader: "Your FunService verification code",
    heading: "Verify your FunService account",
    bodyHtml: `
      <p style="margin:0 0 12px;">Use this verification code to continue:</p>
      <p style="margin:0 0 18px; font-size:28px; font-weight:700; letter-spacing:6px;">${escapeHtml(otp)}</p>
      <p style="margin:0; color:#5f6b7a; font-size:14px;">This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
    `,
    bodyText: `Use this verification code to continue: ${otp}\n\nThis code expires in 10 minutes. If you did not request it, you can ignore this email.`
  });

  return sendEmail({
    to,
    subject: "Your FunService verification code",
    ...content
  });
};

export const sendSignupEmail = ({ to, name, phone, userId, address }) => {
  const rows = [
    ["Name", name],
    ["Email", to],
    ["Phone", phone],
    ["User ID", userId],
    ["Address", address]
  ];
  const content = renderEmail({
    preheader: "Welcome to FunService",
    heading: "Your FunService account is ready",
    bodyHtml: `
      <p style="margin:0 0 14px;">Hi ${escapeHtml(name || "there")}, welcome to FunService. Your signup was successful.</p>
      <table style="width:100%; border-collapse:collapse; font-size:14px;">${renderRows(rows)}</table>
    `,
    bodyText: `Hi ${name || "there"}, welcome to FunService. Your signup was successful.\n\n${renderTextRows(rows)}`
  });

  return sendEmail({
    to,
    subject: "Welcome to FunService",
    ...content
  });
};

export const sendLoginEmail = ({ to, name, method = "password", signedInAt = new Date() }) => {
  const rows = [
    ["Account", to],
    ["Sign-in method", method],
    ["Signed in at", formatDateTime(signedInAt)]
  ];
  const content = renderEmail({
    preheader: "New login to your FunService account",
    heading: "New login detected",
    bodyHtml: `
      <p style="margin:0 0 14px;">Hi ${escapeHtml(name || "there")}, your FunService account was signed in successfully.</p>
      <table style="width:100%; border-collapse:collapse; font-size:14px;">${renderRows(rows)}</table>
      <p style="margin:16px 0 0; color:#5f6b7a; font-size:14px;">If this was not you, reset your password immediately.</p>
    `,
    bodyText: `Hi ${name || "there"}, your FunService account was signed in successfully.\n\n${renderTextRows(rows)}\n\nIf this was not you, reset your password immediately.`
  });

  return sendEmail({
    to,
    subject: "New login to your FunService account",
    ...content
  });
};

export const sendReviewConfirmationEmail = ({
  to,
  reviewId,
  name,
  city,
  service,
  rating,
  text,
  createdAt = new Date()
}) => {
  const rows = [
    ["Review ID", reviewId],
    ["Name", name],
    ["Email", to],
    ["City", city],
    ["Service", service],
    ["Rating", `${rating}/5`],
    ["Feedback", text],
    ["Submitted at", formatDateTime(createdAt)]
  ];
  const content = renderEmail({
    preheader: "Thank you for your feedback",
    heading: "Thank you for your feedback",
    bodyHtml: `
      <p style="margin:0 0 14px;">Hi ${escapeHtml(name || "there")}, thank you for sharing your experience with FunService. We received your review with the details below.</p>
      <table style="width:100%; border-collapse:collapse; font-size:14px;">${renderRows(rows)}</table>
    `,
    bodyText: `Hi ${name || "there"}, thank you for sharing your experience with FunService. We received your review with the details below.\n\n${renderTextRows(rows)}`
  });

  return sendEmail({
    to,
    subject: "Thank you for your FunService feedback",
    ...content
  });
};

export const sendReviewNotificationEmail = ({
  reviewId,
  name,
  email,
  city,
  service,
  rating,
  text,
  createdAt = new Date()
}) => {
  const reviewTo = process.env.RESEND_REVIEW_TO?.trim() || process.env.RESEND_SUPPORT_TO?.trim() || DEFAULT_REVIEW_TO;
  if (!reviewTo) return false;

  const rows = [
    ["Review ID", reviewId],
    ["Customer", name],
    ["Email", email],
    ["City", city],
    ["Service", service],
    ["Rating", `${rating}/5`],
    ["Feedback", text],
    ["Submitted at", formatDateTime(createdAt)]
  ];
  const content = renderEmail({
    preheader: `New ${rating}/5 review from ${name}`,
    heading: "New customer review received",
    bodyHtml: `
      <p style="margin:0 0 14px;">A customer submitted a new FunService review. The complete feedback is below.</p>
      <table style="width:100%; border-collapse:collapse; font-size:14px;">${renderRows(rows)}</table>
    `,
    bodyText: `A customer submitted a new FunService review.\n\n${renderTextRows(rows)}`
  });

  return sendEmail({
    to: reviewTo,
    replyTo: email,
    subject: `New FunService review: ${rating}/5 from ${cleanSubjectPart(name)}`,
    ...content
  });
};

export const sendSupportNotificationEmail = ({
  ticketId,
  name,
  email,
  message,
  userId,
  backendUserId,
  createdAt = new Date()
}) => {
  const supportTo = process.env.RESEND_SUPPORT_TO?.trim();
  if (!supportTo) return false;

  const rows = [
    ["Ticket ID", ticketId],
    ["User ID", userId],
    ["Backend User UUID", backendUserId],
    ["Customer", name],
    ["Email", email],
    ["Submitted at", formatDateTime(createdAt)]
  ];
  const content = renderEmail({
    preheader: `New support ticket ${ticketId || ""} from ${name}`,
    heading: "New support ticket",
    bodyHtml: `
      <table style="width:100%; border-collapse:collapse; font-size:14px; margin:0 0 16px;">${renderRows(rows)}</table>
      <p style="margin:0 0 8px;"><strong>Message:</strong></p>
      <p style="margin:0; line-height:1.6;">${escapeHtml(message).replaceAll("\n", "<br />")}</p>
    `,
    bodyText: `${renderTextRows(rows)}\n\nMessage:\n${message}`
  });

  return sendEmail({
    to: supportTo,
    replyTo: email,
    subject: `${ticketId ? `[${cleanSubjectPart(ticketId)}] ` : ""}New FunService support ticket from ${cleanSubjectPart(name)}`,
    ...content
  });
};

export const sendSupportReplyEmail = ({ to, name, reply }) => {
  const greeting = name?.trim() || "there";
  const content = renderEmail({
    preheader: "FunService support replied to your message",
    heading: "A reply from FunService Support",
    bodyHtml: `
      <p style="margin:0 0 12px;">Hi ${escapeHtml(greeting)},</p>
      <p style="margin:0 0 18px; line-height:1.6;">${escapeHtml(reply).replaceAll("\n", "<br />")}</p>
      <p style="margin:0; color:#5f6b7a;">FunService Support</p>
    `,
    bodyText: `Hi ${greeting},\n\n${reply}\n\nFunService Support`
  });

  return sendEmail({
    to,
    subject: "FunService support replied to your message",
    ...content
  });
};
