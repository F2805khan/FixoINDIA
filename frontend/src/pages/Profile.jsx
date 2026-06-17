import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  History,
  Home,
  LayoutDashboard,
  LocateFixed,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
  UserRound
} from "lucide-react";
import BookingStatusDrawer from "../components/BookingStatusDrawer.jsx";
import ProfileHistorySection from "../components/ProfileHistorySection.jsx";
import { toast } from "../utils/notifications.js";
import { Skeleton } from "boneyard-js/react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../api/client.js";
import { getCachedUserProfile, getUserProfile, profileDefaults, saveUserProfile } from "../data/profileStore.js";
import { getCachedUserBookings, getUserBookings } from "../data/bookingStore.js";
import { displayUserName, isPrivilegedUser, onSessionChanged } from "../data/sessionStore.js";
import { isActiveBookingStatus } from "../utils/bookingTracking.js";

const defaultMapCenter = { latitude: 12.9716, longitude: 77.5946 };

const getInitials = (value = "") => {
  const parts = String(value).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "FS";
  return parts.length === 1
    ? parts[0].slice(0, 2).toUpperCase()
    : `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const getMemberYear = (value) => {
  const date = value?.toDate?.() || new Date(value || Date.now());
  return Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
};

const formatSupportDate = (value) => {
  const date = new Date(value || Date.now());
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(safeDate);
};

const formatTicketStatus = (status = "Pending") => {
  if (status === "Complete" || status === "Closed") return "Complete";
  if (status === "Replied") return "Replied";
  if (status === "Open") return "Pending";
  return status || "Pending";
};

const getTicketStatusClass = (status = "Pending") => formatTicketStatus(status).toLowerCase();

const splitSupportMessage = (value = "") => {
  const message = String(value);
  const separator = message.indexOf(":");

  if (separator <= 0) {
    return { type: "Support query", text: message };
  }

  return {
    type: message.slice(0, separator).trim() || "Support query",
    text: message.slice(separator + 1).trim()
  };
};

function SupportTicketsSection({ messages, loading }) {
  return (
    <section className="profile-history-section profile-support-section">
      <div className="profile-simple-panel profile-history-card">
        <div className="profile-history-toolbar">
          <div>
            <span className="eyebrow">Support tickets</span>
            <h2>Your support queries</h2>
          </div>
          <Link className="btn btn-primary btn-small" to="/contact">New query <ArrowRight size={14} /></Link>
        </div>

        {loading ? (
          <div className="profile-empty">
            <MessageCircle size={24} />
            <strong>Loading support tickets...</strong>
            <p>Your recent queries will appear here.</p>
          </div>
        ) : messages.length ? (
          <div className="support-ticket-list">
            {messages.map((ticket) => {
              const { type, text } = splitSupportMessage(ticket.message);
              return (
                <article className="support-ticket-card" key={ticket._id || ticket.ticketId}>
                  <div className="support-ticket-main">
                    <span className="eyebrow">{ticket.ticketId || ticket._id}</span>
                    <h3>{type}</h3>
                    <p>{text || "No message text saved."}</p>
                    {ticket.reply?.trim() && (
                      <div className="support-ticket-reply">
                        <strong>Support reply</strong>
                        <p>{ticket.reply}</p>
                      </div>
                    )}
                  </div>
                  <div className="profile-booking-side support-ticket-side">
                    <span className={`visit-badge ticket-status-${getTicketStatusClass(ticket.status)}`}>
                      {formatTicketStatus(ticket.status)}
                    </span>
                    <small>{formatSupportDate(ticket.createdAt)}</small>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="profile-empty">
            <MessageCircle size={24} />
            <strong>No support query yet.</strong>
            <p>When you contact customer support, your ticket will show here.</p>
            <Link className="btn btn-primary btn-small" to="/contact">Contact support <ArrowRight size={14} /></Link>
          </div>
        )}
      </div>
    </section>
  );
}

function LocationMap({ latitude, longitude, interactive = false, onSelect }) {
  const mapNode = useRef(null);
  const mapInstance = useRef(null);
  const marker = useRef(null);
  const onSelectRef = useRef(onSelect);
  const lat = Number(latitude);
  const lng = Number(longitude);
  const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const center = hasCoordinates ? [lat, lng] : [defaultMapCenter.latitude, defaultMapCenter.longitude];
    const map = L.map(mapNode.current).setView(center, 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    if (hasCoordinates) {
      marker.current = L.circleMarker(center, {
        color: "#58710f",
        fillColor: "#92b81e",
        fillOpacity: 0.95,
        radius: 9,
        weight: 3
      }).addTo(map);
    }

    if (interactive) {
      map.on("click", ({ latlng }) => onSelectRef.current?.(latlng.lat, latlng.lng));
    }

    mapInstance.current = map;
    return () => {
      map.remove();
      mapInstance.current = null;
      marker.current = null;
    };
  }, []);

  useEffect(() => {
    if (!hasCoordinates || !mapInstance.current) return;

    const nextPosition = [lat, lng];
    mapInstance.current.setView(nextPosition, mapInstance.current.getZoom());
    if (marker.current) {
      marker.current.setLatLng(nextPosition);
    } else {
      marker.current = L.circleMarker(nextPosition, {
        color: "#58710f",
        fillColor: "#92b81e",
        fillOpacity: 0.95,
        radius: 9,
        weight: 3
      }).addTo(mapInstance.current);
    }
  }, [hasCoordinates, lat, lng]);

  return <div className="profile-map-leaflet" ref={mapNode} />;
}

export function ProfileLoadingShell() {
  return (
    <main className="profile-page shell" aria-busy="true" aria-label="Loading your profile">
      <section className="profile-intro">
        <span className="eyebrow">My account</span>
        <h1>Your profile.</h1>
        <p>Loading your contact, booking, and subscription details.</p>
      </section>
      <section className="profile-card">
        <div className="profile-card-head">
          <div>
            <span className="badge"><BadgeCheck size={15} /> Profile details</span>
            <h2>Loading your account.</h2>
          </div>
          <span className="profile-avatar">FS</span>
        </div>
        <div className="profile-section-layout">
          <aside className="profile-section-nav">
            {["Name", "Address", "Bookings", "Subscription", "History"].map((label) => (
              <button type="button" key={label}>{label}</button>
            ))}
          </aside>
          <div className="profile-details">
            <article><span>Full name</span><strong>FunService customer</strong></article>
            <article><span>Email</span><strong>customer@example.com</strong></article>
            <article><span>Phone</span><strong>+91 98765 43210</strong></article>
          </div>
        </div>
      </section>
    </main>
  );
}

export function ProfileSkeletonCapture() {
  return (
    <Skeleton name="profile-page" loading={false} fixture={<ProfileLoadingShell />}>
      <ProfileLoadingShell />
    </Skeleton>
  );
}

function Profile({ dashboardLayout = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTab = searchParams.get("tab");
  const profileSection = selectedTab === "history" || selectedTab === "support" ? selectedTab : "overview";
  const trackLive = searchParams.get("track") === "live";
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(profileDefaults());
  const [loading, setLoading] = useState(true);
  const [supportLoading, setSupportLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [supportMessages, setSupportMessages] = useState([]);
  const [locating, setLocating] = useState(false);
  const [resolvingCity, setResolvingCity] = useState(false);
  const [statusBooking, setStatusBooking] = useState(null);
  const formDirty = useRef(false);
  const editRequested = useRef(false);
  const reverseLookupTimer = useRef(null);
  const reverseLookupId = useRef(0);

  useEffect(() => {
    let active = true;

    const loadProfile = async (nextUser) => {
      if (!nextUser) {
        navigate("/auth", { replace: true });
        return;
      }

      const cachedProfile = getCachedUserProfile(nextUser.uid);
      setUser(nextUser);
      setProfile(cachedProfile);
      setForm(cachedProfile || profileDefaults(nextUser));
      formDirty.current = false;
      editRequested.current = false;
      setEditing(false);
      setBookings(getCachedUserBookings(nextUser.uid));
      setSupportMessages([]);
      setLoading(false);
      setSupportLoading(true);

      const supportUserId = nextUser.uid || nextUser._id;
      const [savedProfile, savedBookings, savedSupportMessages] = await Promise.all([
        getUserProfile(nextUser),
        getUserBookings(nextUser),
        api.hasToken() && supportUserId
          ? api.getSupportMessagesByUser(supportUserId).catch((error) => {
              console.warn("Support tickets unavailable.", error);
              return [];
            })
          : Promise.resolve([])
      ]);
      if (!active) return;

      setBookings(savedBookings);
      setSupportMessages(Array.isArray(savedSupportMessages) ? savedSupportMessages : []);
      setSupportLoading(false);
      if (savedProfile) {
        setProfile(savedProfile);
        if (!formDirty.current && !editRequested.current) {
          setForm(savedProfile);
        }
      }
    };

    const unsubscribe = onSessionChanged(loadProfile);

    return () => {
      active = false;
      unsubscribe();
    };
  }, [navigate]);

  useEffect(() => () => clearTimeout(reverseLookupTimer.current), []);

  useEffect(() => {
    const freshBooking = location.state?.freshBooking;
    if (freshBooking?.bookingId) {
      setBookings((current) => {
        if (current.some((item) => item.bookingId === freshBooking.bookingId)) return current;
        return [freshBooking, ...current];
      });
      setStatusBooking(freshBooking);
      navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
      return;
    }

    const bookingId = searchParams.get("booking");
    if (!bookingId) return;

    const normalizedId = bookingId.replace(/^#/, "");
    const match = bookings.find(
      (booking) =>
        booking.bookingId === bookingId ||
        booking.bookingId === `#${normalizedId}` ||
        booking.bookingId.replace(/^#/, "") === normalizedId
    );
    if (match) setStatusBooking(match);
  }, [bookings, location.pathname, location.search, location.state, navigate, searchParams]);

  const setProfileSection = (tab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "history" || tab === "support") next.set("tab", tab);
    else next.delete("tab");
    next.delete("booking");
    setSearchParams(next, { replace: true });
    setStatusBooking(null);
  };

  const openBookingStatus = (booking, { live = false } = {}) => {
    setStatusBooking(booking);
    const next = new URLSearchParams(searchParams);
    if (profileSection === "history") next.set("tab", "history");
    else next.delete("tab");
    next.set("booking", String(booking.bookingId).replace(/^#/, ""));
    if (live || isActiveBookingStatus(booking.bookingStatus)) next.set("track", "live");
    else next.delete("track");
    setSearchParams(next, { replace: true });
  };

  const closeBookingStatus = () => {
    setStatusBooking(null);
    const next = new URLSearchParams(searchParams);
    next.delete("booking");
    next.delete("track");
    setSearchParams(next, { replace: true });
  };

  const cancelBookingStatus = async (booking) => {
    if (!window.confirm("Are you sure you want to cancel this service request?")) return;

    try {
      if (api.hasToken()) {
        await api.cancelBooking(String(booking.bookingId).replace(/^#/, ""));
      }
      setBookings((current) =>
        current.map((item) =>
          item.bookingId === booking.bookingId ? { ...item, bookingStatus: "Cancelled" } : item
        )
      );
      setStatusBooking((current) =>
        current?.bookingId === booking.bookingId ? { ...current, bookingStatus: "Cancelled" } : current
      );
      toast.success("Booking cancelled successfully.");
    } catch (error) {
      toast.error(error.message || "Could not cancel this booking.");
    }
  };

  const update = (event) => {
    const { name, value } = event.target;
    formDirty.current = true;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const beginEditing = () => {
    editRequested.current = true;
    setForm(profile || profileDefaults(user));
    setEditing(true);
  };

  const save = async (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.phone.trim() || !form.address.trim() || !form.city.trim()) {
      toast.error("Name, phone, address, and city are required.");
      return;
    }

    setSaving(true);
    try {
      const savedProfile = await saveUserProfile(user, form, profile);
      setProfile(savedProfile);
      setForm(savedProfile);
      formDirty.current = false;
      editRequested.current = false;
      setEditing(false);
      toast.success(profile ? "Profile updated successfully." : "Profile created successfully.");
    } catch (error) {
      toast.error(error.message || "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const reverseFillCity = async (latitude, longitude) => {
    const lookupId = ++reverseLookupId.current;
    setResolvingCity(true);
    try {
      const location = await api.reverseGeocode(latitude, longitude);
      if (lookupId !== reverseLookupId.current) return;

      if (location.city) {
        setForm((current) => ({ ...current, city: location.city }));
        toast.success("Location selected. City filled automatically.");
      } else {
        toast.success("Location selected. Enter your city manually.");
      }
    } catch (error) {
      if (lookupId === reverseLookupId.current) {
        console.warn("Automatic city lookup unavailable.", error);
        toast.error("Location selected, but city could not be filled automatically.");
      }
    } finally {
      if (lookupId === reverseLookupId.current) setResolvingCity(false);
    }
  };

  const selectLocation = (latitude, longitude, immediate = false) => {
    formDirty.current = true;
    setForm((current) => ({
      ...current,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6)
    }));
    clearTimeout(reverseLookupTimer.current);
    if (immediate) {
      reverseFillCity(latitude, longitude);
    } else {
      reverseLookupTimer.current = setTimeout(() => reverseFillCity(latitude, longitude), 450);
    }
  };

  const locateAddress = () => {
    if (!navigator.geolocation) {
      toast.error("Location access is not supported by this browser.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        selectLocation(coords.latitude, coords.longitude, true);
        setLocating(false);
      },
      () => {
        toast.error("Could not get your location. Allow location access and try again.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const cancelSubscription = async () => {
    if (!window.confirm("Cancel your Standard care plan? Your remaining credits will stay available until the end of the billing period.")) {
      return;
    }

    setSaving(true);
    try {
      const savedProfile = await saveUserProfile(
        user,
        { ...profile, subscriptionStatus: "cancelled" },
        profile
      );
      setProfile(savedProfile);
      setForm(savedProfile);
      toast.success("Subscription cancelled.");
    } catch (error) {
      toast.error(error.message || "Could not cancel your subscription.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Skeleton
        name="profile-page"
        loading
        animate="shimmer"
        transition
        fixture={<ProfileLoadingShell />}
      >
        <ProfileLoadingShell />
      </Skeleton>
    );
  }

  const account = profile || profileDefaults(user);
  const details = [
    ["Full name", account.name || "Not added", UserRound],
    ["Email", account.email || "Not added", Mail],
    ["Phone", account.phone || "Not added", Phone]
  ];
  const canOpenBackend = isPrivilegedUser(user);
  const dashboardMode = dashboardLayout || !editing;
  const sidebarName = displayUserName(profile || user) || profile?.name || form.name || user?.email || "FunService customer";
  const sidebarYear = getMemberYear(profile?.createdAt || user?.createdAt);
  const greetingName = displayUserName(profile || user).split(" ")[0];
  const hasServiceAddress = Boolean(account.address?.trim() && account.city?.trim());
  const dashboardTitle = `Good morning, ${greetingName}.`;
  const dashboardCopy = hasServiceAddress
    ? "Your contact, address, bookings and plan in one simple place."
    : "Add your contact and service address so bookings are ready to go.";
  const currentBookings = bookings.filter((booking) => isActiveBookingStatus(booking.bookingStatus));
  const renderBookings = (rows, emptyMessage) => rows.length ? (
    <div className="profile-booking-list">
      {rows.map((booking) => (
        <button className="profile-booking profile-booking-action" type="button" key={booking.bookingId} onClick={() => openBookingStatus(booking, { live: true })}>
          <div>
            <span className="eyebrow">{booking.bookingId}</span>
            <h3>{booking.serviceName}</h3>
            <p>{booking.date} at {booking.time}</p>
          </div>
          <div className="profile-booking-side">
            <span className="visit-badge">{booking.bookingStatus}</span>
            <strong>₹{booking.amount}</strong>
            <small>{booking.paymentMethod} | {booking.paymentStatus}</small>
            <em>Live track</em>
          </div>
        </button>
      ))}
    </div>
  ) : (
    <div className="profile-empty">
      <CalendarDays size={24} />
      <strong>{emptyMessage}</strong>
      <p>Your confirmed services will appear here.</p>
      <Link className="btn btn-primary btn-small" to="/services">Book a service <ArrowRight size={14} /></Link>
    </div>
  );

  return (
    <main className={`${dashboardMode ? "dashboard-page profile-dashboard-page" : "profile-page"} shell ${!editing ? "profile-dashboard-simple" : ""}`}>
      {dashboardMode && (
        <aside className="account-sidebar profile-side-menu">
          <div className="user-pill"><span>{getInitials(sidebarName)}</span><div><strong>{sidebarName}</strong><small>Member since {sidebarYear}</small></div></div>
          <button className={profileSection === "overview" ? "active" : ""} type="button" onClick={() => setProfileSection("overview")}><UserRound size={17} /> Profile</button>
          <button className={profileSection === "history" ? "active" : ""} type="button" onClick={() => setProfileSection("history")}><History size={17} /> History</button>
          <button className={profileSection === "support" ? "active" : ""} type="button" onClick={() => setProfileSection("support")}><MessageCircle size={17} /> Support</button>
          {canOpenBackend && <Link to="/owner"><LayoutDashboard size={17} /> Admin Panel</Link>}
        </aside>
      )}

      {!dashboardMode && (!profile || editing) && (
        <section className="profile-intro">
          <span className="eyebrow">{profile ? "My account" : "One last step"}</span>
          <h1>{profile ? "Edit profile." : "Tell us where home is."}</h1>
          <p>
            {profile
              ? "Update only what changed. Keep it simple."
              : "Complete your profile before booking so every visit has the right details."}
          </p>
        </section>
      )}

      <section className={`profile-card ${dashboardMode ? "dashboard-profile-card" : ""}`}>
        {!editing ? (
          profileSection === "history" ? (
            <ProfileHistorySection bookings={bookings} onSelectBooking={openBookingStatus} />
          ) : profileSection === "support" ? (
            <SupportTicketsSection messages={supportMessages} loading={supportLoading} />
          ) : (
          <>
            <div className="dashboard-head profile-dashboard-head">
              <div>
                <span className="eyebrow">My account</span>
                <h1>{dashboardTitle}</h1>
                <p>{dashboardCopy}</p>
              </div>
              <button className="btn btn-primary btn-small" type="button" onClick={beginEditing}>Edit profile <ArrowRight size={14} /></button>
            </div>
            <div className="profile-simple-grid">
              <section className="profile-simple-panel">
                <div className="profile-mini-head">
                  <span className="eyebrow">Contact</span>
                  <button className="btn btn-ghost btn-small" type="button" onClick={beginEditing}>Edit</button>
                </div>
                <div className="profile-details">
                  {details.map(([label, value, Icon]) => (
                    <article key={label}>
                      <Icon size={17} />
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </article>
                  ))}
                </div>
              </section>

              <article className="profile-address-card simple-address-card">
                  <div className="profile-address-head">
                    <span><MapPin size={14} /> Default service address</span>
                    <button className="btn btn-ghost btn-small" type="button" onClick={beginEditing}>
                      Edit address
                    </button>
                  </div>
                  <h3>{account.address || "No service address added yet."}</h3>
                  <p>{account.city || "Add your city to speed up bookings."}</p>
              </article>

              <section className="profile-simple-panel">
                <div className="profile-mini-head">
                  <span className="eyebrow">Active bookings</span>
                  <Link to="/services">Book service <ArrowRight size={13} /></Link>
                </div>
                {renderBookings(currentBookings, "No active bookings yet.")}
              </section>

              <article className="profile-subscription-card">
                  <Sparkles size={21} />
                  <span className="eyebrow">{account.subscriptionStatus === "cancelled" ? "Subscription cancelled" : "Current subscription"}</span>
                  <h3>Standard care plan</h3>
                  <p>{account.subscriptionStatus === "cancelled" ? "Your plan will end after the current billing period." : "2 of 3 monthly service credits available."}</p>
                  <div className="progress"><span /></div>
                  <div className="subscription-actions">
                    <Link to="/pricing">Manage subscription <ArrowRight size={14} /></Link>
                    {profile && account.subscriptionStatus !== "cancelled" && <button className="btn btn-danger btn-small" type="button" onClick={cancelSubscription} disabled={saving}>Cancel subscription</button>}
                  </div>
              </article>
            </div>
          </>
          )
        ) : (
          <form className="profile-form" onSubmit={save}>
            {dashboardMode && (
              <div className="dashboard-head profile-dashboard-head profile-edit-dashboard-head">
                <div>
                  <span className="eyebrow">{profile ? "My account" : "One last step"}</span>
                  <h1>{profile ? "Edit profile." : "Complete profile."}</h1>
                  <p>{profile ? "Update only what changed. Keep it simple." : "Add the details needed for fast service bookings."}</p>
                </div>
                <Link className="btn btn-ghost btn-small" to="/services">Book service <ArrowRight size={14} /></Link>
              </div>
            )}
            <div className="profile-card-head">
              <div>
                <span className="badge"><Home size={15} /> {profile ? "Edit profile" : "Create profile"}</span>
                <h2>{profile ? "Update your details." : "Set up your profile."}</h2>
              </div>
            </div>
            <div className="profile-form-grid">
              <label>
                <span>Full name</span>
                <input required name="name" value={form.name} onChange={update} placeholder="Your full name" />
              </label>
              <label>
                <span>Email</span>
                <input name="email" type="email" value={form.email} onChange={update} placeholder="you@example.com" />
              </label>
              <label>
                <span>Phone number</span>
                <input required name="phone" value={form.phone} onChange={update} placeholder="+91 98765 43210" />
              </label>
              <label>
                <span>City</span>
                <input required name="city" value={form.city} onChange={update} placeholder="Bengaluru" />
              </label>
              <div className="profile-location-picker">
                <div className="profile-map">
                  <LocationMap
                    latitude={form.latitude}
                    longitude={form.longitude}
                    interactive
                    onSelect={selectLocation}
                  />
                </div>
                <div className="profile-location-tools">
                  <div>
                    <strong>Pinpoint your service location</strong>
                    <p>Tap the map or use your current location. Your city fills automatically.</p>
                    {form.latitude && <small className="profile-location-pin">Current pin: {form.latitude}, {form.longitude}</small>}
                  </div>
                  <button className="btn btn-ghost btn-small" type="button" onClick={locateAddress} disabled={locating || resolvingCity}>
                    <LocateFixed size={15} /> {locating ? "Locating..." : resolvingCity ? "Finding city..." : "Use current location"}
                  </button>
                </div>
              </div>
              <label className="profile-address">
                <span>Service address</span>
                <textarea required name="address" value={form.address} onChange={update} placeholder="House number, street, locality" />
              </label>
            </div>
            <div className="profile-actions">
              <button className="btn btn-ghost" type="button" onClick={() => { setForm(profile || profileDefaults(user)); formDirty.current = false; editRequested.current = false; setEditing(false); }}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={saving}>
                {saving ? "Saving..." : profile ? "Save changes" : "Create profile"} {!saving && <ArrowRight size={16} />}
              </button>
            </div>
          </form>
        )}
      </section>

      {statusBooking && (
        <BookingStatusDrawer
          booking={statusBooking}
          liveMode={trackLive || isActiveBookingStatus(statusBooking.bookingStatus)}
          onCancel={cancelBookingStatus}
          onClose={closeBookingStatus}
        />
      )}
    </main>
  );
}

export default Profile;
