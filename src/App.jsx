import React, { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "./firebase";
import Login from "./components/Login";
import StudentManager from "./components/StudentManager";
import FeeManager from "./components/FeeManager";
import AttendanceView from "./components/AttendanceView";
import NotificationManager from "./components/NotificationManager";
import StaffManager from "./components/StaffManager";
// App Updates components
import UploadForm from "./components/UploadForm";
import UpdateDashboard from "./components/Dashboard";

// Icons
import {
  LayoutDashboard,
  Users,
  CreditCard,
  CalendarDays,
  ShieldAlert,
  Megaphone,
  Upload,
  LogOut,
  TrendingUp,
  UserCheck,
  CircleAlert
} from "lucide-react";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    sessionStorage.getItem("warden_authenticated") === "true"
  );
  const [activeTab, setActiveTab] = useState("dashboard");

  // Global database metrics
  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;

    const studentsRef = ref(db, "students");
    const feesRef = ref(db, "fees");
    const attRef = ref(db, "attendance");

    const unsubStudents = onValue(studentsRef, (snapshot) => {
      if (snapshot.exists()) {
        setStudents(Object.values(snapshot.val()));
      } else {
        setStudents([]);
      }
      checkLoading();
    });

    const unsubFees = onValue(feesRef, (snapshot) => {
      if (snapshot.exists()) {
        setFees(Object.values(snapshot.val()));
      } else {
        setFees([]);
      }
      checkLoading();
    });

    const unsubAtt = onValue(attRef, (snapshot) => {
      if (snapshot.exists()) {
        setAttendance(Object.values(snapshot.val()));
      } else {
        setAttendance([]);
      }
      checkLoading();
    });

    function checkLoading() {
      setLoading(false);
    }

    return () => {
      unsubStudents();
      unsubFees();
      unsubAtt();
    };
  }, [isAuthenticated]);

  const handleLogout = () => {
    sessionStorage.removeItem("warden_authenticated");
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  // Dashboard Stats Calculations
  const totalStudents = students.length;
  const totalFeesExpected = students.reduce((acc, s) => acc + (s.totalFees || 0), 0);
  const totalFeesCollected = students.reduce((acc, s) => acc + (s.paidFees || 0), 0);
  const totalFeesPending = totalFeesExpected - totalFeesCollected;

  // Today's attendance quick snap
  const todayStr = new Date().toISOString().split("T")[0];
  const todayAttendance = attendance.filter(r => r.date === todayStr);
  const presentCount = todayAttendance.filter(r => r.status === "PRESENT").length;
  const absentCount = todayAttendance.filter(r => r.status === "ABSENT").length;
  const tiffinCount = todayAttendance.filter(r => r.status === "TIFFIN").length;
  const homeCount = todayAttendance.filter(r => r.status === "HOME").length;

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-brand">
            <h1 className="brand-logo-text">Dnyanda</h1>
            <div className="brand-subtitle">Warden Dashboard</div>
          </div>

          <nav>
            <ul className="nav-links">
              <li className="nav-item">
                <a
                  className={`nav-link ${activeTab === "dashboard" ? "active" : ""}`}
                  onClick={() => setActiveTab("dashboard")}
                >
                  <LayoutDashboard size={20} />
                  <span className="nav-link-text">Dashboard</span>
                </a>
              </li>
              <li className="nav-item">
                <a
                  className={`nav-link ${activeTab === "students" ? "active" : ""}`}
                  onClick={() => setActiveTab("students")}
                >
                  <Users size={20} />
                  <span className="nav-link-text">Students</span>
                </a>
              </li>
              <li className="nav-item">
                <a
                  className={`nav-link ${activeTab === "fees" ? "active" : ""}`}
                  onClick={() => setActiveTab("fees")}
                >
                  <CreditCard size={20} />
                  <span className="nav-link-text">Fees</span>
                </a>
              </li>
              <li className="nav-item">
                <a
                  className={`nav-link ${activeTab === "attendance" ? "active" : ""}`}
                  onClick={() => setActiveTab("attendance")}
                >
                  <CalendarDays size={20} />
                  <span className="nav-link-text">Attendance</span>
                </a>
              </li>
              <li className="nav-item">
                <a
                  className={`nav-link ${activeTab === "credentials" ? "active" : ""}`}
                  onClick={() => setActiveTab("credentials")}
                >
                  <ShieldAlert size={20} />
                  <span className="nav-link-text">Credentials</span>
                </a>
              </li>
              <li className="nav-item">
                <a
                  className={`nav-link ${activeTab === "notifications" ? "active" : ""}`}
                  onClick={() => setActiveTab("notifications")}
                >
                  <Megaphone size={20} />
                  <span className="nav-link-text">Notifications</span>
                </a>
              </li>
              <li className="nav-item">
                <a
                  className={`nav-link ${activeTab === "updates" ? "active" : ""}`}
                  onClick={() => setActiveTab("updates")}
                >
                  <Upload size={20} />
                  <span className="nav-link-text">App Updates</span>
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="sidebar-footer">
          <button className="logout-button" onClick={handleLogout}>
            <LogOut size={20} />
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="main-content">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
            <div className="spinner" style={{ width: "40px", height: "40px" }}></div>
          </div>
        ) : (
          <>
            {activeTab === "dashboard" && (
              <div>
                <div className="page-header">
                  <h1 className="page-title">Warden Overview Panel</h1>
                </div>

                {/* Metrics Cards Grid */}
                <div className="grid-3">
                  <div className="stat-card">
                    <div className="stat-icon-wrapper" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818cf8" }}>
                      <Users size={24} />
                    </div>
                    <div className="stat-info">
                      <span className="stat-card-label">Total Students</span>
                      <span className="stat-card-value">{totalStudents}</span>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon-wrapper" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
                      <TrendingUp size={24} />
                    </div>
                    <div className="stat-info">
                      <span className="stat-card-label">Fees Collected</span>
                      <span className="stat-card-value">INR {totalFeesCollected.toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon-wrapper" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#f87171" }}>
                      <CircleAlert size={24} />
                    </div>
                    <div className="stat-info">
                      <span className="stat-card-label">Fees Outstanding</span>
                      <span className="stat-card-value">INR {totalFeesPending.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>

                <div className="dashboard-grid">
                  {/* Attendance snapshot */}
                  <div className="card">
                    <h2 className="card-title">
                      <UserCheck size={20} style={{ color: "#34d399", marginRight: "0.25rem" }} /> Today's Attendance Snapshot
                    </h2>
                    <p style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
                      Date: {new Date().toLocaleDateString("en-GB")} (Across all slots logged today)
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", fontSize: "0.9rem" }}>
                          <span>Present (P)</span>
                          <span style={{ fontWeight: "700", color: "#10b981" }}>{presentCount} logs</span>
                        </div>
                        <div className="progress-bar-bg" style={{ height: "6px" }}>
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${totalStudents ? (presentCount / (totalStudents * 4)) * 100 : 0}%`,
                              background: "#10b981"
                            }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", fontSize: "0.9rem" }}>
                          <span>Absent (A)</span>
                          <span style={{ fontWeight: "700", color: "#ef4444" }}>{absentCount} logs</span>
                        </div>
                        <div className="progress-bar-bg" style={{ height: "6px" }}>
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${totalStudents ? (absentCount / (totalStudents * 4)) * 100 : 0}%`,
                              background: "#ef4444"
                            }}
                          ></div>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "0.5rem" }}>
                        <div style={{ background: "rgba(2, 6, 23, 0.3)", padding: "0.75rem", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.03)" }}>
                          <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>TIFFIN (T)</span>
                          <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#f59e0b", marginTop: "0.1rem" }}>{tiffinCount} logs</div>
                        </div>
                        <div style={{ background: "rgba(2, 6, 23, 0.3)", padding: "0.75rem", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.03)" }}>
                          <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>HOME (H)</span>
                          <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#3b82f6", marginTop: "0.1rem" }}>{homeCount} logs</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick actions panel */}
                  <div className="card">
                    <h2 className="card-title">Quick Tasks</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <button className="btn btn-primary" onClick={() => setActiveTab("students")}>
                        Register New Student
                      </button>
                      <button className="btn btn-secondary" onClick={() => setActiveTab("fees")}>
                        Record Fee Receipt
                      </button>
                      <button className="btn btn-secondary" onClick={() => setActiveTab("attendance")}>
                        View Attendance Sheets
                      </button>
                      <button className="btn btn-secondary" onClick={() => setActiveTab("updates")}>
                        Publish App Updates
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "students" && <StudentManager />}
            {activeTab === "fees" && <FeeManager />}
            {activeTab === "attendance" && <AttendanceView />}
            {activeTab === "credentials" && <StaffManager />}
            {activeTab === "notifications" && <NotificationManager />}
            
            {activeTab === "updates" && (
              <div>
                <div className="page-header">
                  <h1 className="page-title">App Update Center</h1>
                </div>
                <div className="dashboard-grid">
                  <UploadForm />
                  <UpdateDashboard />
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
