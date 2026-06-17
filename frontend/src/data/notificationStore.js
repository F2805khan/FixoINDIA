const listeners = new Set();
let notifications = [];
let idCounter = 0;

const emit = () => listeners.forEach((listener) => listener([...notifications]));

export const pushNotification = ({ type = "info", message, title }) => {
  const entry = {
    id: `${Date.now()}-${++idCounter}`,
    type,
    title: title || (type === "success" ? "Success" : type === "error" ? "Alert" : "Update"),
    message: String(message || ""),
    read: false,
    createdAt: Date.now()
  };

  notifications = [entry, ...notifications].slice(0, 20);
  emit();
  return entry.id;
};

export const onNotificationsChanged = (callback) => {
  callback([...notifications]);
  listeners.add(callback);
  return () => listeners.delete(callback);
};

export const markAllRead = () => {
  if (!notifications.some((item) => !item.read)) return;
  notifications = notifications.map((item) => ({ ...item, read: true }));
  emit();
};

export const clearNotifications = () => {
  if (!notifications.length) return;
  notifications = [];
  emit();
};

export const getUnreadCount = () => notifications.filter((item) => !item.read).length;
