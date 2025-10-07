import React from "react";
import { useAuth } from "../contexts/AuthContext";
import HistoryUser from "./HistoryUser";
import HistoryRider from "./HistoryRider";
 
export default function History() {
  const { auth } = useAuth();
  const roles = auth?.roles || [];
 
  if (roles.includes("user")) return <HistoryUser />;
  if (roles.includes("rider")) return <HistoryRider />;
  return <div>History not available for this role.</div>;
}
 