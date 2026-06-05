import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Home,
  LayoutDashboard,
  LocateFixed,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  UserRound
} from "lucide-react";
import { toast } from "react-hot-toast";
import { Skeleton } from "boneyard-js/react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../api/client.js";
import { getCachedUserProfile, getUserProfile, profileDefaults, saveUserProfile } from "../data/profileStore.js";
import { getCachedUserBookings, getUserBookings } from "../data/bookingStore.js";
import { onSessionChanged } from "../data/sessionStore.js";

const defaultMapCenter = { latitude: 12.9716, longitude: 77.5946 };

const isProfileComplete = (profile) =>
  Boolean(profile?.name?.trim() && profile?.phone?.trim() && profile?.address?.trim() && profile?.city?.trim());

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

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(profileDefaults());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [locating, setLocating] = useState(false);
  const [resolvingCity, setResolvingCity] = useState(false);
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
      setEditing(!isProfileComplete(cachedProfile));
      setBookings(getCachedUserBookings(nextUser.uid));
      setLoading(false);

      const [savedProfile, savedBookings] = await Promise.all([
        getUserProfile(nextUser),
        getUserBookings(nextUser)
      ]);
      if (!active) return;

      setBookings(savedBookings);
      if (savedProfile) {
        setProfile(savedProfile);
        if (!formDirty.current && !editRequested.current) {
          setForm(savedProfile);
          setEditing(!isProfileComplete(savedProfile));
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

  const details = [
    ["Full name", profile?.name, UserRound],
    ["Email", profile?.email || "Not added", Mail],
    ["Phone", profile?.phone, Phone]
  ];
  const canOpenBackend = user?.role === "admin" || user?.role === "owner";
  const currentBookings = bookings.filter(
    (booking) => !["Completed", "Cancelled"].includes(booking.bookingStatus)
  );
  const renderBookings = (rows, emptyMessage) => rows.length ? (
    <div className="profile-booking-list">
      {rows.map((booking) => (
        <article className="profile-booking" key={booking.bookingId}>
          <div>
            <span className="eyebrow">{booking.bookingId}</span>
            <h3>{booking.serviceName}</h3>
            <p>{booking.date} at {booking.time}</p>
          </div>
          <div className="profile-booking-side">
            <span className="visit-badge">{booking.bookingStatus}</span>
            <strong>₹{booking.amount}</strong>
            <small>{booking.paymentMethod} | {booking.paymentStatus}</small>
          </div>
        </article>
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
    <main className="profile-page shell">
      <section className="profile-intro">
        <span className="eyebrow">{profile ? "My account" : "One last step"}</span>
        <h1>{profile ? "Your profile." : "Tell us where home is."}</h1>
        <p>
          {profile
            ? "Keep your contact and service details up to date."
            : "Complete your profile before booking so every visit has the right details."}
        </p>
      </section>

      <section className="profile-card">
        {profile && !editing ? (
          <>
            <div className="profile-card-head">
              <div>
                <span className="badge"><BadgeCheck size={15} /> Profile complete</span>
                <h2>{profile.name}</h2>
              </div>
              <span className="profile-avatar">{profile.name.slice(0, 2).toUpperCase()}</span>
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

              <article className="profile-address-card">
                  <div className="profile-map">
                    <LocationMap latitude={profile.latitude} longitude={profile.longitude} />
                  </div>
                  <div className="profile-address-head">
                    <span><MapPin size={14} /> Default service address</span>
                    <button className="btn btn-ghost btn-small" type="button" onClick={beginEditing}>
                      Edit address
                    </button>
                  </div>
                  <h3>{profile.address}</h3>
                  <p>{profile.city}</p>
                  {profile.latitude && <small>Pin: {profile.latitude}, {profile.longitude}</small>}
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
                  <span className="eyebrow">{profile.subscriptionStatus === "cancelled" ? "Subscription cancelled" : "Current subscription"}</span>
                  <h3>Standard care plan</h3>
                  <p>{profile.subscriptionStatus === "cancelled" ? "Your plan will end after the current billing period." : "2 of 3 monthly service credits available."}</p>
                  <div className="progress"><span /></div>
                  <div className="subscription-actions">
                    <Link to="/pricing">Manage subscription <ArrowRight size={14} /></Link>
                    {profile.subscriptionStatus !== "cancelled" && <button className="btn btn-danger btn-small" type="button" onClick={cancelSubscription} disabled={saving}>Cancel subscription</button>}
                  </div>
              </article>
            </div>
            <div className="profile-actions">
              {canOpenBackend && (
                <Link className="btn btn-primary" to="/backend">
                  <LayoutDashboard size={16} /> Backend Panel
                </Link>
              )}
              <button className="btn btn-ghost" type="button" onClick={beginEditing}>
                Edit profile
              </button>
              <Link className="btn btn-primary" to="/dashboard">
                Go to dashboard <ArrowRight size={16} />
              </Link>
            </div>
          </>
        ) : (
          <form className="profile-form" onSubmit={save}>
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
              {profile && (
                <button className="btn btn-ghost" type="button" onClick={() => { setForm(profile); formDirty.current = false; editRequested.current = false; setEditing(false); }}>
                  Cancel
                </button>
              )}
              <button className="btn btn-primary" disabled={saving}>
                {saving ? "Saving..." : profile ? "Save changes" : "Create profile"} {!saving && <ArrowRight size={16} />}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}

export default Profile;
