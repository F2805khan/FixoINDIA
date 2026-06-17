import { Navigate, useParams } from "react-router-dom";

function BookingStatus() {
  const { bookingId } = useParams();
  const normalizedId = bookingId?.replace(/^#/, "") || "";

  return (
    <Navigate
      to={normalizedId ? `/profile?booking=${encodeURIComponent(normalizedId)}&track=live` : "/profile"}
      replace
    />
  );
}

export default BookingStatus;
