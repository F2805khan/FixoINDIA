import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  Activity,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Edit3,
  MapPin,
  Plus,
  RefreshCcw,
  Save,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Users,
  Wrench,
  XCircle
} from "lucide-react";
import { api } from "../api/client.js";
import { categories } from "../data/services.js";

const blankService = {
  title: "",
  category: "More Services",
  price: "",
  duration: "30 Min",
  image:
    "/images/site/home-care.jpg",
  description: "",
  region: "All Regions",
  enabled: true
};

const regions = ["All Regions", "Bengaluru", "Delhi NCR", "Mumbai", "Hyderabad", "Pune", "Chennai"];

const emptyOverview = {
  totals: {
    services: 0,
    users: 0,
    orders: 0,
    ordersToday: 0,
    activeOrders: 0,
    activeUsers: 0,
    revenueToday: 0
  },
  daily: [],
  statusCounts: {},
  recentBookings: [],
  recentUsers: []
};

const slugify = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const getStatusClass = (status = "Confirmed") => status.toLowerCase().replace(/\s+/g, "-");

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "Today";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

function AdminDashboard({ currentUser, services, onServiceAdded, onServiceUpdated, onServiceDeleted, onServicesSynced }) {
  const [form, setForm] = useState(blankService);
  const [showForm, setShowForm] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [regionFilter, setRegionFilter] = useState("All Regions");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [overview, setOverview] = useState(emptyOverview);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [updatingPaymentMethod, setUpdatingPaymentMethod] = useState(null);

  const daily = overview.daily?.length ? overview.daily : emptyOverview.daily;
  const totals = overview.totals || emptyOverview.totals;
  const managedServices = services.map((service) => ({
    enabled: service.enabled !== false,
    region: service.region || "All Regions",
    ...service
  }));
  const visibleServices = managedServices.filter((service) => regionFilter === "All Regions" || service.region === "All Regions" || service.region === regionFilter);
  const activeServiceCount = managedServices.filter((service) => service.enabled !== false).length;

  const maxChartValue = useMemo(() => {
    const values = daily.flatMap((day) => [day.orders || 0, day.activeUsers || 0]);
    return Math.max(1, ...values);
  }, [daily]);

  const stats = [
    {
      label: "Orders Today",
      value: totals.ordersToday,
      subValue: formatMoney(totals.revenueToday),
      icon: ClipboardList
    },
    {
      label: "Active Users",
      value: totals.activeUsers,
      subValue: `${totals.users} total users`,
      icon: Users
    },
    {
      label: "Active Orders",
      value: totals.activeOrders,
      subValue: `${totals.orders} total orders`,
      icon: Activity
    },
    {
      label: "Services",
      value: totals.services || managedServices.length,
      subValue: `${activeServiceCount} active`,
      icon: Wrench
    }
  ];

  const mlProgram = useMemo(() => {
    const recentOrderCount = overview.recentBookings?.length || 0;
    const demandScore = Math.min(99, Math.round((totals.activeUsers || 0) * 9 + recentOrderCount * 6 + activeServiceCount * 2));
    const topCategory = managedServices.reduce((acc, service) => {
      acc[service.category] = (acc[service.category] || 0) + 1;
      return acc;
    }, {});
    const recommendedCategory = Object.entries(topCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || "Cleaning";
    return {
      demandScore,
      recommendedCategory,
      regionFocus: regionFilter,
      action: demandScore > 70 ? "Add more professionals in high-demand regions." : "Promote active services and collect more booking signals."
    };
  }, [activeServiceCount, managedServices, overview.recentBookings, regionFilter, totals.activeUsers]);

  const loadOverview = async () => {
    const nextOverview = await api.getAdminOverview();
    setOverview({
      ...emptyOverview,
      ...nextOverview,
      totals: { ...emptyOverview.totals, ...(nextOverview.totals || {}) }
    });
  };

  const refreshServices = async () => {
    const backendServices = await api.getAdminServices();
    onServicesSynced?.(backendServices);
  };

  const loadPaymentMethods = async () => {
    setPaymentMethods(await api.getAdminPaymentMethods());
  };

  const refreshDashboard = async ({ quiet = false } = {}) => {
    if (!quiet) setRefreshing(true);
    try {
      await Promise.all([loadOverview(), refreshServices(), loadPaymentMethods()]);
      if (!quiet) toast.success("Backend dashboard refreshed.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      if (!quiet) setRefreshing(false);
    }
  };

  useEffect(() => {
    refreshDashboard({ quiet: true });
  }, []);

  const updateForm = (event) => {
    const { name, type, checked, value } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const resetForm = () => {
    setForm(blankService);
    setShowForm(false);
    setEditingServiceId(null);
  };

  const startEditService = (service) => {
    setForm({
      ...blankService,
      ...service,
      price: service.price ?? "",
      region: service.region || "All Regions",
      enabled: service.enabled !== false
    });
    setEditingServiceId(service._id || service.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitService = async (event) => {
    event.preventDefault();
    const price = Number(form.price);
    const payload = {
      ...form,
      title: form.title.trim(),
      id: slugify(form.title),
      price,
      description: form.description.trim(),
      region: form.region || "All Regions",
      enabled: form.enabled !== false
    };

    if (
      !payload.title ||
      !payload.category ||
      Number.isNaN(price) ||
      price < 0 ||
      !payload.description
    ) {
      toast.error("Service name, category, price, and description are required.");
      return;
    }

    setSaving(true);
    try {
      if (editingServiceId) {
        if (!form._id) {
          toast.error("This service is not in SQL yet. Add it first from the admin form.");
          return;
        }
        const savedService = await api.updateService(form._id, payload);
        await loadOverview();
        onServiceUpdated?.(savedService);
        toast.success("Service updated in SQL.");
      } else {
        const savedService = await api.createService(payload);
        onServiceAdded(savedService);
        await loadOverview();
        toast.success("Service added to SQL.");
      }
      resetForm();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleServiceStatus = async (service) => {
    const id = service._id || service.id;
    if (!service._id) {
      toast.error("This service is not in SQL yet. Add it first from the admin form.");
      return;
    }
    const enabled = service.enabled === false;
    setTogglingId(id);
    try {
      const savedService = await api.updateService(service._id, { enabled });
      onServiceUpdated?.(savedService);
      toast.success(`${service.title} ${enabled ? "enabled" : "disabled"} in SQL.`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setTogglingId(null);
    }
  };

  const deleteService = async (service) => {
    const id = service._id || service.id;
    if (!service._id) {
      toast.error("Only SQL services can be deleted from admin.");
      return;
    }
    setDeletingId(id);

    try {
      await api.deleteService(service._id);
      await loadOverview();

      onServiceDeleted(service);
      toast.success("Service deleted from SQL.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const togglePaymentMethod = async (paymentMethod) => {
    setUpdatingPaymentMethod(paymentMethod.method);
    try {
      const methods = await api.updateAdminPaymentMethods([
        { method: paymentMethod.method, enabled: !paymentMethod.enabled }
      ]);
      setPaymentMethods(methods);
      toast.success(`${paymentMethod.method} ${paymentMethod.enabled ? "disabled" : "enabled"}.`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUpdatingPaymentMethod(null);
    }
  };

  return (
    <section className="page-shell admin-page">
      <div className="container">
        <div className="page-head admin-head">
          <div>
            <span className="badge">
              <ShieldCheck size={15} /> Backend Panel
            </span>
            <h1>Platform Control</h1>
            <p>
              {currentUser?.name || currentUser?.userId || "Owner"} manages services, orders, and
              user activity.
            </p>
          </div>
          <div className="admin-head-actions">
            <button className="btn btn-soft" onClick={() => refreshDashboard()} disabled={refreshing}>
              <RefreshCcw size={17} /> {refreshing ? "Refreshing" : "Refresh"}
            </button>
            <button className="btn btn-primary" onClick={() => setShowForm((value) => !value)}>
              <Plus size={17} /> Add Service
            </button>
          </div>
        </div>

        <div className="admin-stats">
          {stats.map(({ label, value, subValue, icon: Icon }) => (
            <div className="admin-stat backend-stat" key={label}>
              <Icon size={20} />
              <span>{label}</span>
              <strong>{value || 0}</strong>
              <small>{subValue}</small>
            </div>
          ))}
        </div>

        <div className="admin-analytics-grid">
          <section className="admin-panel admin-chart-card">
            <div className="section-heading inline">
              <div>
                <h2>Daily Status</h2>
                <p>Orders getting and active users for the last 7 days.</p>
              </div>
              <BarChart3 size={22} />
            </div>

            <div className="chart-legend" aria-hidden="true">
              <span className="legend-orders">Orders</span>
              <span className="legend-users">Active users</span>
            </div>

            {daily.length ? (
              <div className="daily-chart">
                {daily.map((day) => {
                  const orderHeight = `${Math.max(8, ((day.orders || 0) / maxChartValue) * 100)}%`;
                  const userHeight = `${Math.max(
                    8,
                    ((day.activeUsers || 0) / maxChartValue) * 100
                  )}%`;

                  return (
                    <div
                      className="chart-day"
                      key={day.date}
                      style={{ "--orders-height": orderHeight, "--users-height": userHeight }}
                      aria-label={`${day.label}: ${day.orders} orders, ${day.activeUsers} active users`}
                    >
                      <div className="chart-bars">
                        <span className="chart-bar orders" title={`${day.orders} orders`} />
                        <span className="chart-bar users" title={`${day.activeUsers} active users`} />
                      </div>
                      <strong>{day.label}</strong>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state compact">
                <BarChart3 size={26} />
                <strong>No graph data</strong>
                <span>Orders will appear here after bookings start.</span>
              </div>
            )}
          </section>

          <section className="admin-panel">
            <div className="section-heading inline">
              <div>
                <h2>Order Status</h2>
                <p>Current booking pipeline.</p>
              </div>
              <CheckCircle2 size={22} />
            </div>

            <div className="status-strip">
              {Object.keys(overview.statusCounts || {}).length ? (
                Object.entries(overview.statusCounts).map(([status, count]) => (
                  <div className="status-chip" key={status}>
                    <span className={`status-badge ${getStatusClass(status)}`}>{status}</span>
                    <strong>{count}</strong>
                  </div>
                ))
              ) : (
                <div className="empty-state compact">
                  <ClipboardList size={24} />
                  <strong>No orders</strong>
                  <span>New orders will update this panel.</span>
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="admin-panel ml-program-panel">
          <div className="section-heading inline">
            <div>
              <h2>ML Program</h2>
              <p>Smart demand signals for region planning and service growth.</p>
            </div>
            <BrainCircuit size={22} />
          </div>
          <div className="ml-program-grid">
            <article>
              <span>Demand score</span>
              <strong>{mlProgram.demandScore}%</strong>
              <small>Based on active users, recent bookings, and live services.</small>
            </article>
            <article>
              <span>Recommended category</span>
              <strong>{mlProgram.recommendedCategory}</strong>
              <small>Use this signal before adding a new service.</small>
            </article>
            <article>
              <span>Region focus</span>
              <strong>{mlProgram.regionFocus}</strong>
              <small>{mlProgram.action}</small>
            </article>
          </div>
        </section>

        <section className="admin-panel payment-settings-panel">
          <div className="section-heading inline">
            <div>
              <h2>Payment Methods</h2>
              <p>Choose which payment options customers see during booking.</p>
            </div>
            <CreditCard size={22} />
          </div>
          <div className="payment-settings-grid">
            {paymentMethods.map((paymentMethod) => (
              <label className={`payment-setting ${paymentMethod.enabled ? "enabled" : ""}`} key={paymentMethod.method}>
                <div>
                  <strong>{paymentMethod.method}</strong>
                  <span>{paymentMethod.type === "cash" ? "Confirm booking, collect after service" : "Confirm only after payment is complete"}</span>
                </div>
                <input
                  type="checkbox"
                  checked={paymentMethod.enabled}
                  disabled={updatingPaymentMethod === paymentMethod.method}
                  onChange={() => togglePaymentMethod(paymentMethod)}
                />
              </label>
            ))}
          </div>
        </section>

        {showForm && (
          <form className="admin-form" onSubmit={submitService}>
            <div className="section-heading inline">
              <div>
                <h2>{editingServiceId ? "Edit Service" : "Add Service"}</h2>
                <p>{editingServiceId ? "Update catalog, region, and availability." : "Create a service for the customer app."}</p>
              </div>
              <button className="btn btn-soft compact" type="button" onClick={resetForm}>
                Cancel
              </button>
            </div>

            <div className="admin-form-grid">
              <label>
                Service Name
                <input
                  name="title"
                  value={form.title}
                  onChange={updateForm}
                  placeholder="Water purifier repair"
                  required
                />
              </label>
              <label>
                Category
                <select name="category" value={form.category} onChange={updateForm} required>
                  {categories.map((category) => (
                    <option value={category} key={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Starting Price
                <input
                  name="price"
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={updateForm}
                  placeholder="399"
                  required
                />
              </label>
              <label>
                Duration
                <input name="duration" value={form.duration} onChange={updateForm} required />
              </label>
              <label>
                Region
                <select name="region" value={form.region} onChange={updateForm} required>
                  {regions.map((region) => (
                    <option value={region} key={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-toggle-field">
                Service status
                <span>
                  <input name="enabled" type="checkbox" checked={form.enabled} onChange={updateForm} />
                  {form.enabled ? "On - visible to users" : "Off - hidden from users"}
                </span>
              </label>
            </div>

            <label>
              Image URL
              <input name="image" value={form.image} onChange={updateForm} required />
            </label>

            <label>
              Description
              <textarea
                name="description"
                value={form.description}
                onChange={updateForm}
                rows="3"
                placeholder="Repair, installation, and maintenance handled by verified professionals."
                required
              />
            </label>

            <button className="btn btn-primary" type="submit" disabled={saving}>
              <Save size={17} /> {saving ? "Saving" : editingServiceId ? "Update Service" : "Save Service"}
            </button>
          </form>
        )}

        <div className="admin-grid backend-grid">
          <section className="admin-panel">
            <div className="section-heading inline">
              <div>
                <h2>Services</h2>
                <p>{activeServiceCount} active of {managedServices.length} services.</p>
              </div>
              <Wrench size={22} />
            </div>

            <div className="service-admin-toolbar">
              <label>
                <MapPin size={15} /> Region
                <select value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)}>
                  {regions.map((region) => (
                    <option value={region} key={region}>{region}</option>
                  ))}
                </select>
              </label>
              <button className="btn btn-primary btn-small" type="button" onClick={() => { setForm(blankService); setEditingServiceId(null); setShowForm(true); }}>
                <Plus size={14} /> Add New Service
              </button>
            </div>

            <div className="admin-list">
              {visibleServices.map((service) => {
                const id = service._id || service.id;
                return (
                  <div className={`admin-service-row ${service.enabled === false ? "disabled" : ""}`} key={id}>
                    <img src={service.image} alt={service.title} />
                    <div>
                      <strong>{service.title}</strong>
                      <span>
                        {service.category} | {formatMoney(service.price)} | {service.duration}
                      </span>
                      <small><MapPin size={12} /> {service.region || "All Regions"} · {service.enabled === false ? "Off" : "On"}</small>
                    </div>
                    <button
                      className={`icon-button ${service.enabled === false ? "" : "success"}`}
                      onClick={() => toggleServiceStatus(service)}
                      disabled={togglingId === id}
                      aria-label={`${service.enabled === false ? "Enable" : "Disable"} ${service.title}`}
                      title={service.enabled === false ? "Turn service on" : "Turn service off"}
                    >
                      {service.enabled === false ? <ToggleLeft size={18} /> : <ToggleRight size={18} />}
                    </button>
                    <button
                      className="icon-button"
                      onClick={() => startEditService(service)}
                      aria-label={`Edit ${service.title}`}
                      title="Edit service"
                    >
                      <Edit3 size={17} />
                    </button>
                    <button
                      className="icon-button danger"
                      onClick={() => deleteService(service)}
                      disabled={deletingId === id}
                      aria-label={`Delete ${service.title}`}
                      title="Delete service"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                );
              })}
              {!visibleServices.length && (
                <div className="empty-state compact">
                  <Wrench size={24} />
                  <strong>No services in this region</strong>
                  <span>Add a service or switch the region filter.</span>
                </div>
              )}
            </div>
          </section>

          <div className="backend-side-stack">
            <section className="admin-panel">
              <div className="section-heading inline">
                <div>
                  <h2>Incoming Orders</h2>
                  <p>{overview.recentBookings?.length || 0} latest orders.</p>
                </div>
                <ClipboardList size={22} />
              </div>

              <div className="admin-list compact-list">
                {overview.recentBookings?.length ? (
                  overview.recentBookings.map((booking) => (
                    <div className="admin-order-row" key={booking._id || booking.bookingId}>
                      <div>
                        <span>{booking.bookingId}</span>
                        <strong>{booking.serviceName}</strong>
                        <small>
                          {booking.customerName} | {formatDate(booking.createdAt)}
                        </small>
                      </div>
                      <span className={`status-badge ${getStatusClass(booking.bookingStatus)}`}>
                        {booking.bookingStatus || "Confirmed"}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="empty-state compact">
                    <ClipboardList size={24} />
                    <strong>No recent orders</strong>
                    <span>Customer bookings will appear here.</span>
                  </div>
                )}
              </div>
            </section>

            <section className="admin-panel">
              <div className="section-heading inline">
                <div>
                  <h2>Active Users</h2>
                  <p>{totals.activeUsers} users with recent activity.</p>
                </div>
                <Users size={22} />
              </div>

              <div className="admin-list compact-list">
                {overview.recentUsers?.length ? (
                  overview.recentUsers.map((user) => (
                    <div className="admin-user-row" key={user._id}>
                      <span className="user-avatar">{(user.name || user.userId || "U").slice(0, 1)}</span>
                      <div>
                        <strong>{user.name || user.userId || "Customer"}</strong>
                        <small>{user.email || user.phone || "No contact saved"}</small>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state compact">
                    <Users size={24} />
                    <strong>No users yet</strong>
                    <span>Customer accounts will appear here.</span>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AdminDashboard;
