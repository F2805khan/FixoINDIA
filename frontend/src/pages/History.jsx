import { Navigate } from "react-router-dom";

function History() {
  return <Navigate to="/profile?tab=history" replace />;
}

export default History;
