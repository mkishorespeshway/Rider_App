import React, { useEffect, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

export default function History() {
  const [history, setHistory] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/rides/my").then((r) => setHistory(r.data)).catch(console.error);
  }, []);

  return (
    <div>
      <h2>Ride History</h2>
      {history.length === 0 && <div>No rides yet</div>}
      <ul>
        {history.map((r) => (
          <li key={r._id} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
            <div>{r.pickup} → {r.drop}</div>
            <div>Status: {r.status} • Fare: {r.fare || "-"}</div>
            <div>
              <button onClick={() => navigate(`/ride/${r._id}`)}>Track</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

