import React, { useState, useRef } from "react";
import { ref as dbRef, get, set } from "firebase/database";
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../firebase";

export default function UploadForm() {
  const [versionCode, setVersionCode] = useState("");
  const [versionName, setVersionName] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState("idle"); // idle, processing, success, error
  const [statusMessage, setStatusMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    if (!file.name.endsWith(".apk")) {
      setStatus("error");
      setStatusMessage("Only Android APK (.apk) files are accepted.");
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setStatus("idle");
    setStatusMessage("");
  };

  const removeFile = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
    if (!releaseNotes.trim()) {
      setStatus("error");
      setStatusMessage("Please describe the release notes.");
      return;
    }
    if (!selectedFile) {
      setStatus("error");
      setStatusMessage("Please select an APK file to upload.");
      return;
    }

    setStatus("processing");
    setUploadProgress(0);

    try {
      // Step 1: Retrieve current active version metadata to check for old APKs
      setStatusMessage("Checking database for older version info...");
      const activeUpdateRef = dbRef(db, "app_update");
      const activeSnapshot = await get(activeUpdateRef);

      if (activeSnapshot.exists()) {
        const oldData = activeSnapshot.val();
        const oldCode = oldData.versionCode;

        if (oldCode && oldCode !== vCode) {
          setStatusMessage(`Deleting old build (update_${oldCode}.apk) from storage...`);
          const oldStorageRef = storageRef(storage, `app_updates/update_${oldCode}.apk`);
          try {
            await deleteObject(oldStorageRef);
          } catch (deleteError) {
            // If the old file does not exist in storage (e.g. deleted manually), we skip and proceed
            console.warn("Could not delete old file, it may not exist:", deleteError.message);
          }
        }
      }

      // Step 2: Upload new APK file to Storage
      setStatusMessage("Uploading APK to storage...");
      const newStorageRef = storageRef(storage, `app_updates/update_${vCode}.apk`);
      const uploadTask = uploadBytesResumable(newStorageRef, selectedFile);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
          setStatusMessage(`Uploading: ${Math.round(progress)}%`);
        },
        (error) => {
          console.error("Upload failed:", error);
          setStatus("error");
          setStatusMessage(`Upload failed: ${error.message}`);
        },
        async () => {
          try {
            // Step 3: Get the download URL of the uploaded APK
            setStatusMessage("Generating download URL...");
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

            // Step 4: Write new update metadata to the database
            setStatusMessage("Publishing details to database...");
            const updateData = {
              versionCode: vCode,
              versionName: versionName.trim(),
              apkUrl: downloadUrl,
              releaseNotes: releaseNotes.trim()
            };
            await set(activeUpdateRef, updateData);

            // Step 5: Send announcement notification to all users
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
            setReleaseNotes("");
            setSelectedFile(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
          } catch (err) {
            console.error("Failed to complete publication:", err);
            setStatus("error");
            setStatusMessage(`Publication failed: ${err.message}`);
          }
        }
      );
    } catch (err) {
      console.error("Preparation failed:", err);
      setStatus("error");
      setStatusMessage(`Failed to verify current version: ${err.message}`);
    }
  };

  return (
    <div className="card">
      <h2 style={{ marginBottom: "1.5rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "1.4rem" }}>📤</span> Publish New Update
      </h2>

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

        <div className="form-group">
          <label className="form-label">APK Package File</label>
          <div
            className={`upload-zone ${isDragging ? "dragging" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => status !== "processing" && fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".apk"
              style={{ display: "none" }}
              disabled={status === "processing"}
            />
            
            <div className="upload-icon">📦</div>
            <div className="upload-text">
              {isDragging ? "Drop file here" : "Click to select or drag APK here"}
            </div>
            <div className="upload-hint">Only Android package installer files (.apk)</div>

            {selectedFile && (
              <div className="file-card">
                <span className="file-icon">📄</span>
                <div className="file-details">
                  <div className="file-name">{selectedFile.name}</div>
                  <div className="file-size">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</div>
                </div>
                {status !== "processing" && (
                  <button type="button" className="btn-remove-file" onClick={removeFile}>
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {status === "processing" && (
          <div className="progress-container">
            <div className="progress-header">
              <span>{statusMessage}</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }}></div>
            </div>
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
            disabled={status === "processing" || !selectedFile}
          >
            {status === "processing" ? (
              <>
                <div className="spinner"></div> Publishing...
              </>
            ) : (
              "Publish Update"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
