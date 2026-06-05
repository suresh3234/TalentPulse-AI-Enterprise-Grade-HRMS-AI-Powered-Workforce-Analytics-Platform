import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("token");
  const userJson = localStorage.getItem("user");

  // Validate JWT structure (must be a non-empty string, not "undefined"/"null", and split into exactly 3 parts)
  const isValidJwt = token && 
                     token !== "undefined" && 
                     token !== "null" && 
                     typeof token === "string" && 
                     token.split(".").length === 3;

  if (!isValidJwt) {
    // Clear any corrupted or stale authentication data
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && userJson) {
    try {
      const user = JSON.parse(userJson);
      if (!user || !user.role || !allowedRoles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />;
      }
    } catch (e) {
      // Clear data on JSON parsing errors
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      return <Navigate to="/login" replace />;
    }
  }

  return children;
}
