import React, { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const [form, setForm] = useState(user || {});
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setForm(user || {});
  }, [user]);

  const save = async () => {
    try {
      const res = await api.put(`/users/${form._id}`, form);
      setUser({ ...res.data, token: user.token });
      setMsg("Saved");
    } catch (e) {
      setMsg("Save failed");
    }
  };

  return (
    <div style={{ maxWidth: 520 }}>
      <h2>Profile</h2>
      <div>
        <label>Name</label>
        <input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div>
        <label>Phone</label>
        <input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      <div>
        <label>Email</label>
        <input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div style={{ marginTop: 8 }}>
        <button onClick={save}>Save</button>
        <button onClick={logout} style={{ marginLeft: 8 }}>Logout</button>
      </div>
      {msg && <div style={{ marginTop: 8 }}>{msg}</div>}
    </div>
  );
}

