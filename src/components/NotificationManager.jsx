import React, { useState, useEffect } from "react";
import { ref, onValue, set, remove } from "firebase/database";
import { db } from "../firebase";
import { Megaphone, Trash2, Send } from "lucide-react";

export default function NotificationManager() {
  const [notifications, setNotifications] = useState([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    const notifRef = ref(db, "notifications");
    const unsubscribe = onValue(notifRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.keys(data).map(key => data[key]);
        setNotifications(list);
      } else {
        setNotifications([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setPublishing(true);

    try {
      const notifId = crypto.randomUUID ? crypto.randomUUID() : `notif_${Date.now()}`;
      
      // Format current date as DD/MM/YYYY
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;

      const newNotif = {
        id: notifId,
        title: title.trim(),
        message: message.trim(),
        date: formattedDate,
        timestamp: Date.now(),
        targetType: "ALL",
        targetValue: "",
        readBy: []
      };

      await set(ref(db, `notifications/${notifId}`), newNotif);

      setTitle("");
      setMessage("");
    } catch (err) {
      console.error(err);
      alert("Failed to send notification: " + err.message);
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this notification?")) return;

    try {
      await remove(ref(db, `notifications/${id}`));
    } catch (err) {
      console.error(err);
      alert("Failed to delete notification: " + err.message);
    }
  };

  const sortedNotifications = [...notifications].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Notifications Board</h1>
      </div>

      <div className="dashboard-grid">
        {/* Form panel */}
        <div className="card">
          <h2 className="card-title">
            <Megaphone size={20} style={{ color: "#6366f1" }} /> Send New Announcement
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Announcement Title</label>
              <input
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Mess timings changed for tomorrow"
                disabled={publishing}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Announcement Message</label>
              <textarea
                className="form-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows="4"
                placeholder="Write the details of the announcement here..."
                disabled={publishing}
              />
            </div>
            <div style={{ marginTop: "1.5rem" }}>
              <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={publishing}>
                {publishing ? (
                  <>
                    <div className="spinner"></div> Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Broadcast Notice
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* History panel */}
        <div className="card">
          <h2 className="card-title">Past Announcements</h2>
          
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
              <div className="spinner" style={{ width: "24px", height: "24px" }}></div>
            </div>
          ) : sortedNotifications.length === 0 ? (
            <p style={{ textAlign: "center", color: "#64748b", padding: "2rem 0" }}>No announcements broadcasted yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "400px", overflowY: "auto" }}>
              {sortedNotifications.map(notif => (
                <div key={notif.id} className="notif-item">
                  <div className="notif-header">
                    <span className="notif-title">{notif.title}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span className="notif-date">{notif.date}</span>
                      <button 
                        className="btn-icon danger" 
                        onClick={() => handleDelete(notif.id)}
                        title="Delete Announcement"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="notif-message">{notif.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
