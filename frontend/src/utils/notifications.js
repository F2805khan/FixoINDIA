import {
  clearNotifications,
  markAllRead,
  onNotificationsChanged,
  pushNotification
} from "../data/notificationStore.js";

export { clearNotifications, markAllRead, onNotificationsChanged };

export const toast = {
  success: (message, options) =>
    pushNotification({ type: "success", message, title: options?.title }),
  error: (message, options) =>
    pushNotification({ type: "error", message, title: options?.title }),
  info: (message, options) =>
    pushNotification({ type: "info", message, title: options?.title })
};
