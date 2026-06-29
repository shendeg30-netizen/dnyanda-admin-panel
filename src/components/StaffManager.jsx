import React, { useState, useEffect } from "react";
import { ref, onValue, set } from "firebase/database";
import { db } from "../firebase";
import { Shield, Eye, EyeOff, Check, X, KeyRound } from "lucide-react";

export default function StaffManager() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState(null);
  const [editPassword, setEditPassword] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState({});

  const roleLabels = {
    WARDEN: "Warden",
    MORNING_MESS: "Morning Mess Attendance",
    EVENING_MESS: "Evening Mess Attendance",
    PRAYER: "Prayer Attendance",
    STUDY_HALL: "Study Hall Attendance"
  };

  useEffect(() => {
    const configRef = ref(db, "staff_config");
    const unsubscribe = onValue(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Ensure all default roles are present
        const defaultRoles = ["WARDEN", "MORNING_MESS", "EVENING_MESS", "PRAYER", "STUDY_HALL"];
        const list = defaultRoles.map(role => {
          return {
            role,
            password: data[role]?.password || "123456" // Default fallback if not defined
          };
        });
        setConfigs(list);
      } else {
        // Initialize default roles if nothing is in DB
        const defaultList = [
          { role: "WARDEN", password: "admin" },
          { role: "MORNING_MESS", password: "staff" },
          { role: "EVENING_MESS", password: "staff" },
          { role: "PRAYER", password: "staff" },
          { role: "STUDY_HALL", password: "staff" }
        ];
        setConfigs(defaultList);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const togglePasswordVisibility = (role) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [role]: !prev[role]
    }));
  };

  const startEdit = (config) => {
    setEditingRole(config.role);
    setEditPassword(config.password);
  };

  const cancelEdit = () => {
    setEditingRole(null);
    setEditPassword("");
  };

  const handleUpdate = async (role) => {
    if (!editPassword.trim()) return;

    try {
      await set(ref(db, `staff_config/${role}`), {
        role,
        password: editPassword.trim()
      });
      setEditingRole(null);
    } catch (err) {
      console.error(err);
      alert("Failed to update password: " + err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Staff Credentials Management</h1>
      </div>

      <div className="card" style={{ maxWidth: "700px" }}>
        <h2 className="card-title">
          <Shield size={20} style={{ color: "#6366f1" }} /> Manage Gateways & Gatekeeper Passwords
        </h2>
        <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "2rem" }}>
          Modify credentials for the Warden and all designated attendance logging staff. Changes apply instantly across all mobile devices.
        </p>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
            <div className="spinner" style={{ width: "24px", height: "24px" }}></div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {configs.map(config => {
              const isEditing = editingRole === config.role;
              const isVisible = visiblePasswords[config.role];

              return (
                <div 
                  key={config.role} 
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "rgba(2, 6, 23, 0.3)",
                    border: "1px solid rgba(255, 255, 255, 0.04)",
                    borderRadius: "16px",
                    padding: "1.25rem 1.5rem",
                    transition: "border-color 0.2s ease"
                  }}
                  className="config-item-row"
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontWeight: "700", color: config.role === "WARDEN" ? "#818cf8" : "white", fontSize: "1rem" }}>
                      {roleLabels[config.role]}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>
                      ROLE KEY: {config.role}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    {isEditing ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <input
                          type="text"
                          className="form-input"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          style={{ maxWidth: "160px", padding: "0.4rem 0.75rem", fontSize: "0.9rem" }}
                          autoFocus
                        />
                        <button className="btn-icon success" onClick={() => handleUpdate(config.role)} title="Save">
                          <Check size={16} />
                        </button>
                        <button className="btn-icon danger" onClick={cancelEdit} title="Cancel">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span 
                          style={{
                            fontFamily: isVisible ? "inherit" : "monospace",
                            fontSize: isVisible ? "0.95rem" : "1.25rem",
                            letterSpacing: isVisible ? "normal" : "0.15em",
                            color: "#cbd5e1",
                            fontWeight: "600",
                            minWidth: "100px",
                            textAlign: "right"
                          }}
                        >
                          {isVisible ? config.password : "••••••"}
                        </span>
                        
                        <button 
                          className="btn-icon" 
                          onClick={() => togglePasswordVisibility(config.role)}
                          title={isVisible ? "Hide Password" : "Show Password"}
                        >
                          {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>

                        <button 
                          className="btn btn-secondary" 
                          onClick={() => startEdit(config)}
                          style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                        >
                          <KeyRound size={14} /> Change
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
