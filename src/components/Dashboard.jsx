import React, { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";

export default function Dashboard() {
  const [currentUpdate, setCurrentUpdate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const updateRef = ref(db, "app_update");
    const unsubscribe = onValue(
      updateRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setCurrentUpdate(snapshot.val());
        } else {
          setCurrentUpdate(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("Failed to fetch current version data. Verify your Firebase permissions.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <div className="spinner" style={{ width: "32px", height: "32px" }}></div>
          <p style={{ color: "#94a3b8", fontSize: "0.95rem" }}>Loading active version info...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ borderColor: "rgba(239, 68, 68, 0.2)" }}>
        <h3 style={{ color: "#ef4444", marginBottom: "0.5rem" }}>Database Connection Error</h3>
        <p style={{ color: "#cbd5e1", fontSize: "0.9rem" }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: "1.5rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "1.4rem" }}>📱</span> Active Release Info
      </h2>

      {currentUpdate ? (
        <div className="stats-container">
          <div className="stat-item">
            <span className="stat-label">Version Code</span>
            <span className="stat-value version">{currentUpdate.versionCode}</span>
          </div>

          <div className="stat-item">
            <span className="stat-label">Version Name</span>
            <span className="stat-value">{currentUpdate.versionName}</span>
          </div>

          <div className="stat-item">
            <span className="stat-label">Download URL</span>
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "0.25rem" }}>
              <a
                href={currentUpdate.apkUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#34d399",
                  textDecoration: "none",
                  fontSize: "0.9rem",
                  fontWeight: "500",
                  borderBottom: "1px dashed rgba(52, 211, 153, 0.4)",
                  paddingBottom: "1px"
                }}
              >
                Download active APK
              </a>
            </div>
          </div>

          <div className="stat-item">
            <span className="stat-label">Release Notes</span>
            <div className="release-notes-box">
              {currentUpdate.releaseNotes || "No release notes specified."}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "2rem 0", color: "#64748b" }}>
          <p style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>⚠️</p>
          <p style={{ fontSize: "0.95rem" }}>No update published yet.</p>
          <p style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>Use the upload panel to publish the first version.</p>
        </div>
      )}
    </div>
  );
}
