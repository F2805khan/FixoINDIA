import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Radio, Search, Snowflake, Sparkles, Wrench, Zap } from "lucide-react";
import { isActiveBookingStatus } from "../utils/bookingTracking.js";

const getServiceIcon = (serviceName = "") => {
  const name = serviceName.toLowerCase();
  if (name.includes("ac") || name.includes("cooling") || name.includes("refrigerator")) {
    return { Icon: Snowflake, class: "icon-ac" };
  }
  if (name.includes("elect") || name.includes("zap") || name.includes("wire")) {
    return { Icon: Zap, class: "icon-electrician" };
  }
  if (name.includes("clean") || name.includes("maid") || name.includes("pest")) {
    return { Icon: Sparkles, class: "icon-cleaning" };
  }
  if (name.includes("plumb") || name.includes("tap") || name.includes("leak") || name.includes("repair")) {
    return { Icon: Wrench, class: "icon-plumbing" };
  }
  return { Icon: Sparkles, class: "icon-cleaning" };
};

function ProfileHistorySection({ bookings = [], onSelectBooking }) {
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");

  const rows = useMemo(
    () =>
      bookings.map((booking) => ({
        ...booking,
        service: booking.serviceName,
        dateTime: `${booking.date || "Today"}, ${booking.time || "Now"}`,
        amount: typeof booking.amount === "number" ? `₹${booking.amount}` : booking.amount,
        status: booking.bookingStatus || "Confirmed"
      })),
    [bookings]
  );

  const filteredBookings = useMemo(
    () =>
      rows.filter((row) => {
        const tabMatch =
          activeTab === "All" ||
          (activeTab === "Active" && isActiveBookingStatus(row.status)) ||
          row.status.toLowerCase() === activeTab.toLowerCase();
        const searchMatch =
          row.service.toLowerCase().includes(search.toLowerCase()) ||
          row.bookingId.toLowerCase().includes(search.toLowerCase());
        return tabMatch && searchMatch;
      }),
    [rows, activeTab, search]
  );

  return (
    <section className="profile-history-section">
      <div className="dashboard-head profile-dashboard-head">
        <div>
          <span className="eyebrow">My bookings</span>
          <h1>Booking history.</h1>
          <p>All your services in one place. Track active visits from here.</p>
        </div>
        <Link className="btn btn-primary btn-small" to="/services">
          Book service <ArrowRight size={14} />
        </Link>
      </div>

      <div className="qf-card profile-history-card">
        <div className="profile-history-toolbar">
          <h2>All bookings</h2>
          <label className="search-box profile-history-search">
            <Search size={15} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by service or ID..."
            />
          </label>
        </div>

        <div className="qf-tabs">
          {["All", "Active", "Completed", "Cancelled"].map((tab) => (
            <button
              key={tab}
              type="button"
              className={`qf-tab-btn ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="qf-table-wrapper">
          <table className="qf-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Booking ID</th>
                <th>Date & time</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length ? (
                filteredBookings.map((row) => {
                  const { Icon, class: iconClass } = getServiceIcon(row.service);
                  const statusClass = row.status.toLowerCase();
                  const active = isActiveBookingStatus(row.status);

                  return (
                    <tr key={row.bookingId}>
                      <td>
                        <div className="service-cell">
                          <div className={`service-icon-wrapper ${iconClass}`}>
                            <Icon size={18} />
                          </div>
                          <span>{row.service}</span>
                        </div>
                      </td>
                      <td>
                        <span className="booking-id-cell">{row.bookingId}</span>
                      </td>
                      <td>
                        <div className="datetime-cell">
                          <span className="datetime-date">{row.dateTime.split(",")[0]}</span>
                          <span className="datetime-time">{row.dateTime.split(",")[1]}</span>
                        </div>
                      </td>
                      <td>
                        <span className="amount-cell">{row.amount}</span>
                      </td>
                      <td>
                        <span className={`qf-badge ${statusClass}`}>{row.status}</span>
                      </td>
                      <td>
                        <button
                          className={`action-link ${active ? "action-link-live" : ""}`}
                          type="button"
                          onClick={() => onSelectBooking(row, { live: active })}
                        >
                          {active ? (
                            <>
                              <Radio size={13} /> Live track
                            </>
                          ) : (
                            "View details"
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="profile-history-empty">
                    No bookings found yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default ProfileHistorySection;
