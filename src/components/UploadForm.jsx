import React, { useState } from "react";
import { ref as dbRef, get, set } from "firebase/database";
import { db } from "../firebase";

export default function UploadForm() {
  const [versionCode, setVersionCode] = useState("");
  const [versionName, setVersionName] = useState("");
  const [apkUrl, setApkUrl] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  
  const [status, setStatus] = useState("idle"); // idle, processing, success, error
  const [statusMessage, setStatusMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const vCode = parseInt(versionCode, 10);
    if (isNaN(vCode) || vCode <= 0) {
      setStatus("error");
      setStatusMessage("Please enter a valid positive integer for the Version Code.");
      return;
    }
    if (!versionName.trim()) {
      setStatus("error");
      setStatusMessage("Please enter a Version Name.");
      return;
    }
    if (!apkUrl.trim() || !apkUrl.startsWith("http")) {
      setStatus("error");
      setStatusMessage("Please enter a valid direct download URL starting with http:// or https://");
      return;
    }
    if (!releaseNotes.trim()) {
      setStatus("error");
      setStatusMessage("Please describe the release notes.");
      return;
    }

    setStatus("processing");
    setStatusMessage("Publishing update details to database...");

    try {
      const activeUpdateRef = dbRef(db, "app_update");
      
      // Step 1: Write new update metadata to the database
      const updateData = {
        versionCode: vCode,
        versionName: versionName.trim(),
        apkUrl: apkUrl.trim(),
        releaseNotes: releaseNotes.trim()
      };
      await set(activeUpdateRef, updateData);

      // Step 2: Send announcement notification to all users
      setStatusMessage("Sending system update notification...");
      const notificationId = crypto.randomUUID ? crypto.randomUUID() : `notif_${Date.now()}`;
      const notificationRef = dbRef(db, `notifications/${notificationId}`);
      
      // Format current date as DD/MM/YYYY
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;

      const notificationData = {
        id: notificationId,
        title: `🚀 App Update Available (v${versionName.trim()})`,
        message: `A mandatory app update (v${versionName.trim()}) is now available. Click here or check settings to download and install. Release notes: ${releaseNotes.trim()}`,
        date: formattedDate,
        timestamp: Date.now()
      };
      await set(notificationRef, notificationData);

      setStatus("success");
      setStatusMessage("Version successfully published! Users will receive the update instantly.");
      
      // Reset form
      setVersionCode("");
      setVersionName("");
      setApkUrl("");
      setReleaseNotes("");
    } catch (err) {
      console.error("Publication failed:", err);
      setStatus("error");
      setStatusMessage(`Publication failed: ${err.message}`);
    }
  };

  return (
    <div className="card">
      <h2 style={{ marginBottom: "1rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "1.4rem" }}>📤</span> Publish New Update
      </h2>
      <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "1.5rem", lineHeight: "1.4" }}>
        To keep updates <strong>100% free</strong> without requiring a paid Firebase billing plan, upload your APK file to <strong>GitHub Releases</strong>, <strong>Dropbox</strong>, or your repo, and paste the direct download link below.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Version Code (integer)</label>
            <input
              type="number"
              min="1"
              step="1"
              value={versionCode}
              onChange={(e) => setVersionCode(e.target.value)}
              className="form-input"
              placeholder="e.g., 2"
              disabled={status === "processing"}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Version Name</label>
            <input
              type="text"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              className="form-input"
              placeholder="e.g., 1.1"
              disabled={status === "processing"}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">APK Direct Download URL</label>
          <input
            type="url"
            value={apkUrl}
            onChange={(e) => setApkUrl(e.target.value)}
            className="form-input"
            placeholder="e.g., https://github.com/username/repo/raw/main/app-release.apk"
            disabled={status === "processing"}
            required
          />
          <span style={{ color: "#64748b", fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
            Note: Make sure this is a direct download link (when clicked, the file starts downloading automatically).
          </span>
        </div>

        <div className="form-group">
          <label className="form-label">Release Notes / What's New</label>
          <textarea
            value={releaseNotes}
            onChange={(e) => setReleaseNotes(e.target.value)}
            className="form-textarea"
            placeholder="Describe what has changed or fixed..."
            rows="3"
            disabled={status === "processing"}
            required
          />
        </div>

        {status === "processing" && (
          <div className="toast-msg info" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <div className="spinner" style={{ width: "16px", height: "16px", border: "2px solid #3b82f6", borderTopColor: "transparent" }}></div>
            <span>{statusMessage}</span>
          </div>
        )}

        {status === "success" && (
          <div className="toast-msg success">
            <span>✅</span>
            <span>{statusMessage}</span>
          </div>
        )}

        {status === "error" && (
          <div className="toast-msg error">
            <span>❌</span>
            <span>{statusMessage}</span>
          </div>
        )}

        <div style={{ marginTop: "1.5rem" }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={status === "processing" || !apkUrl}
          >
            {status === "processing" ? "Publishing..." : "Publish Update"}
          </button>
        </div>
      </form>
    </div>
  );
}
