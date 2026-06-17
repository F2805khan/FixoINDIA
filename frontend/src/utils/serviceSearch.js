export const normalizeServiceQuery = (value = "") => value.trim().toLowerCase();

export const matchServiceQuery = (service, query) => {
  const normalized = normalizeServiceQuery(query);
  if (!normalized) return true;

  const haystack = [
    service.title,
    service.description,
    service.category,
    service.salonName
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
};
