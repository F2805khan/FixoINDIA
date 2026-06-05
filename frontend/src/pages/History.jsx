import { useMemo, useState } from "react";
import { CalendarClock, Filter, Search, XCircle } from "lucide-react";
import { historyRows } from "../data/services.js";

const tabs = ["All", "Completed", "Cancelled"];

const getStatusClass = (status = "Completed") => status.toLowerCase().replace(/\s+/g, "-");

function History({ latestBooking, onViewBooking, onCancelBooking }) {
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const liveRow = latestBooking
      ? [
          {
            service: latestBooking.serviceName,
            bookingId: latestBooking.bookingId,
            dateTime: `${latestBooking.date || "Today"}, ${latestBooking.time || "Now"}`,
            amount: latestBooking.amount,
            status: latestBooking.bookingStatus || "Confirmed",
            live: true
          }
        ]
      : [];

    return [...liveRow, ...historyRows].filter((row) => {
      const tabMatch = activeTab === "All" || row.status === activeTab;
      const searchText = `${row.service} ${row.bookingId}`.toLowerCase();
      return tabMatch && searchText.includes(search.toLowerCase());
    });
  }, [activeTab, latestBooking, search]);

  const viewDetails = (row) => {
    if (row.live && latestBooking) {
      onViewBooking(latestBooking);
      return;
    }

    onViewBooking({
      bookingId: row.bookingId,
      serviceName: row.service,
      amount: row.amount,
      dateTime: row.dateTime,
      bookingStatus: row.status,
      professionalName: "Ramesh Kumar",
      estimatedArrival: row.status === "Completed" ? "Completed" : "12 minutes"
    });
  };

  const cancelRow = (row) => {
    if (!row.live || !latestBooking) return;
    onCancelBooking(latestBooking);
  };

  return (
    <section className="page-shell">
      <div className="container">
        <div className="page-head with-search">
          <div>
            <h1>My Booking History</h1>
            <p>Search previous bookings, track recent orders, and view details.</p>
          </div>
          <div className="history-tools">
            <button className="btn btn-soft compact" onClick={() => onViewBooking(latestBooking)}>
              <CalendarClock size={16} /> Booking Status
            </button>
            <label className="search-box">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by service or booking ID..."
              />
              <Search size={18} />
            </label>
            <button className="icon-button" aria-label="Filter history" title="Filter">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? "active" : ""}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Booking ID</th>
                <th>Date & Time</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.bookingId}>
                  <td>{row.service}</td>
                  <td>{row.bookingId}</td>
                  <td>{row.dateTime}</td>
                  <td>{row.amount}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="link-button" onClick={() => viewDetails(row)}>
                        View Details
                      </button>
                      {row.live && !["Cancelled", "Completed"].includes(row.status) && (
                        <button className="link-button danger" onClick={() => cancelRow(row)}>
                          <XCircle size={15} /> Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default History;
