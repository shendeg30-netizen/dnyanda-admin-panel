import React, { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "./firebase";
import Login from "./components/Login";
import StudentManager from "./components/StudentManager";
import FeeManager from "./components/FeeManager";
import AttendanceView from "./components/AttendanceView";
import NotificationManager from "./components/NotificationManager";
import StaffManager from "./components/StaffManager";
import ReportsView from "./components/ReportsView";
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
  CircleAlert,
  FileText,
  Utensils,
  Sun,
  BookOpen
} from "lucide-react";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    sessionStorage.getItem("warden_authenticated") === "true"
  );
  const [activeTab, setActiveTab] = useState("dashboard");
  const [preselectedCategory, setPreselectedCategory] = useState("MORNING_MESS");

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

  const handleDashboardSlotClick = (categoryKey) => {
    setPreselectedCategory(categoryKey);
    setActiveTab("attendance");
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  // Dashboard Stats Calculations
  const totalStudents = students.length;
  const totalFeesExpected = students.reduce((acc, s) => acc + (s.totalFees || 0), 0);
  const totalFeesCollected = students.reduce((acc, s) => acc + (s.paidFees || 0), 0);
  const totalFeesPending = totalFeesExpected - totalFeesCollected;

  // Today's slot-specific stats calculations
  const todayStr = new Date().toISOString().split("T")[0];
  const todayAttendance = attendance.filter(r => r.date === todayStr);

  const getSlotStats = (categoryName) => {
    const logs = todayAttendance.filter(r => r.type === categoryName);
    const present = logs.filter(r => r.status === "PRESENT").length;
    const absent = logs.filter(r => r.status === "ABSENT").length;
    const tiffin = logs.filter(r => r.status === "TIFFIN").length;
    const home = logs.filter(r => r.status === "HOME").length;
    const unmarked = totalStudents - logs.length;
    return { present, absent, tiffin, home, unmarked };
  };

  const morningStats = getSlotStats("MORNING_MESS");
  const eveningStats = getSlotStats("EVENING_MESS");
  const prayerStats = getSlotStats("PRAYER");
  const studyStats = getSlotStats("STUDY_HALL");

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-brand">
            <h1 className="brand-logo-text">
              <img src="/dnyanda_logo.png" alt="Dnyanda Logo" style={{ width: "38px", height: "38px", borderRadius: "8px", objectFit: "contain" }} />
              Dnyanda
            </h1>
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
                  className={`nav-link ${activeTab === "reports" ? "active" : ""}`}
                  onClick={() => setActiveTab("reports")}
                >
                  <FileText size={20} />
                  <span className="nav-link-text">Reports</span>
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
                    <div className="stat-icon-wrapper" style={{ background: "rgba(99, 102, 241, 0.12)", color: "#4f46e5" }}>
                      <Users size={24} />
                    </div>
                    <div className="stat-info">
                      <span className="stat-card-label">Total Students</span>
                      <span className="stat-card-value">{totalStudents}</span>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon-wrapper" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#059669" }}>
                      <TrendingUp size={24} />
                    </div>
                    <div className="stat-info">
                      <span className="stat-card-label">Fees Collected</span>
                      <span className="stat-card-value">INR {totalFeesCollected.toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon-wrapper" style={{ background: "rgba(239, 68, 68, 0.12)", color: "#dc2626" }}>
                      <CircleAlert size={24} />
                    </div>
                    <div className="stat-info">
                      <span className="stat-card-label">Fees Outstanding</span>
                      <span className="stat-card-value">INR {totalFeesPending.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  <h2 className="page-title" style={{ fontSize: "1.4rem", fontWeight: "700" }}>Daily Attendance Slots</h2>
                  
                  {/* Detailed Attendance Category Grid (Parity with Mobile App StatDetailCard) */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
                    {/* Morning Mess */}
                    <div 
                      className="card" 
                      onClick={() => handleDashboardSlotClick("MORNING_MESS")}
                      style={{ cursor: "pointer", padding: "1.5rem", marginBottom: "0" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <h3 style={{ fontSize: "1.1rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem", color: "#ea580c" }}>
                          <Utensils size={18} /> Morning Mess
                        </h3>
                        <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>Click to open</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                        <div style={{ background: "#f8fafc", padding: "0.5rem", borderRadius: "8px", textAlign: "center" }}>
                          <div style={{ fontSize: "0.7rem", color: "#10b981", fontWeight: "700" }}>PRESENT</div>
                          <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0f172a" }}>{morningStats.present}</div>
                        </div>
                        <div style={{ background: "#f8fafc", padding: "0.5rem", borderRadius: "8px", textAlign: "center" }}>
                          <div style={{ fontSize: "0.7rem", color: "#ef4444", fontWeight: "700" }}>ABSENT</div>
                          <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0f172a" }}>{morningStats.absent}</div>
                        </div>
                        <div style={{ background: "#f8fafc", padding: "0.5rem", borderRadius: "8px", textAlign: "center" }}>
                          <div style={{ fontSize: "0.7rem", color: "#f59e0b", fontWeight: "700" }}>TIFFIN</div>
                          <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0f172a" }}>{morningStats.tiffin}</div>
                        </div>
                        <div style={{ background: "#f8fafc", padding: "0.5rem", borderRadius: "8px", textAlign: "center" }}>
                          <div style={{ fontSize: "0.7rem", color: "#3b82f6", fontWeight: "700" }}>HOME</div>
                          <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0f172a" }}>{morningStats.home}</div>
                        </div>
                      </div>
                    </div>

                    {/* Evening Mess */}
                    <div 
                      className="card" 
                      onClick={() => handleDashboardSlotClick("EVENING_MESS")}
                      style={{ cursor: "pointer", padding: "1.5rem", marginBottom: "0" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <h3 style={{ fontSize: "1.1rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem", color: "#2563eb" }}>
                          <Utensils size={18} /> Evening Mess
                        </h3>
                        <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>Click to open</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                        <div style={{ background: "#f8fafc", padding: "0.5rem", borderRadius: "8px", textAlign: "center" }}>
                          <div style={{ fontSize: "0.7rem", color: "#10b981", fontWeight: "700" }}>PRESENT</div>
                          <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0f172a" }}>{eveningStats.present}</div>
                        </div>
                        <div style={{ background: "#f8fafc", padding: "0.5rem", borderRadius: "8px", textAlign: "center" }}>
                          <div style={{ fontSize: "0.7rem", color: "#ef4444", fontWeight: "700" }}>ABSENT</div>
                          <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0f172a" }}>{eveningStats.absent}</div>
                        </div>
                        <div style={{ background: "#f8fafc", padding: "0.5rem", borderRadius: "8px", textAlign: "center" }}>
                          <div style={{ fontSize: "0.7rem", color: "#f59e0b", fontWeight: "700" }}>TIFFIN</div>
                          <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0f172a" }}>{eveningStats.tiffin}</div>
                        </div>
                        <div style={{ background: "#f8fafc", padding: "0.5rem", borderRadius: "8px", textAlign: "center" }}>
                          <div style={{ fontSize: "0.7rem", color: "#3b82f6", fontWeight: "700" }}>HOME</div>
                          <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0f172a" }}>{eveningStats.home}</div>
                        </div>
                      </div>
                    </div>

                    {/* Prayer */}
                    <div 
                      className="card" 
                      onClick={() => handleDashboardSlotClick("PRAYER")}
                      style={{ cursor: "pointer", padding: "1.5rem", marginBottom: "0" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <h3 style={{ fontSize: "1.1rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem", color: "#16a34a" }}>
                          <Sun size={18} /> Prayer
                        </h3>
                        <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>Click to open</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                        <div style={{ background: "#f8fafc", padding: "0.5rem", borderRadius: "8px", textAlign: "center" }}>
                          <div style={{ fontSize: "0.7rem", color: "#10b981", fontWeight: "700" }}>PRESENT</div>
                          <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0f172a" }}>{prayerStats.present}</div>
                        </div>
                        <div style={{ background: "#f8fafc", padding: "0.5rem", borderRadius: "8px", textAlign: "center" }}>
                          <div style={{ fontSize: "0.7rem", color: "#ef4444", fontWeight: "700" }}>ABSENT</div>
                          <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0f172a" }}>{prayerStats.absent}</div>
                        </div>
                        <div style={{ background: "#f8fafc", padding: "0.5rem", borderRadius: "8px", textAlign: "center" }}>
                          <div style={{ fontSize: "0.7rem", color: "#f59e0b", fontWeight: "700" }}>TIFFIN</div>
                          <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0f172a" }}>{prayerStats.tiffin}</div>
                        </div>
                        <div style={{ background: "#f8fafc", padding: "0.5rem", borderRadius: "8px", textAlign: "center" }}>
                          <div style={{ fontSize: "0.7rem", color: "#3b82f6", fontWeight: "700" }}>HOME</div>
                          <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0f172a" }}>{prayerStats.home}</div>
                        </div>
                      </div>
                    </div>

                    {/* Study Hall */}
                    <div 
                      className="card" 
                      onClick={() => handleDashboardSlotClick("STUDY_HALL")}
                      style={{ cursor: "pointer", padding: "1.5rem", marginBottom: "0" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <h3 style={{ fontSize: "1.1rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem", color: "#7c3aed" }}>
                          <BookOpen size={18} /> Study Hall
                        </h3>
                        <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>Click to open</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                        <div style={{ background: "#f8fafc", padding: "0.5rem", borderRadius: "8px", textAlign: "center" }}>
                          <div style={{ fontSize: "0.7rem", color: "#10b981", fontWeight: "700" }}>PRESENT</div>
                          <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0f172a" }}>{studyStats.present}</div>
                        </div>
                        <div style={{ background: "#f8fafc", padding: "0.5rem", borderRadius: "8px", textAlign: "center" }}>
                          <div style={{ fontSize: "0.7rem", color: "#ef4444", fontWeight: "700" }}>ABSENT</div>
                          <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0f172a" }}>{studyStats.absent}</div>
                        </div>
                        <div style={{ background: "#f8fafc", padding: "0.5rem", borderRadius: "8px", textAlign: "center" }}>
                          <div style={{ fontSize: "0.7rem", color: "#f59e0b", fontWeight: "700" }}>TIFFIN</div>
                          <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0f172a" }}>{studyStats.tiffin}</div>
                        </div>
                        <div style={{ background: "#f8fafc", padding: "0.5rem", borderRadius: "8px", textAlign: "center" }}>
                          <div style={{ fontSize: "0.7rem", color: "#3b82f6", fontWeight: "700" }}>HOME</div>
                          <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0f172a" }}>{studyStats.home}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "students" && <StudentManager />}
            {activeTab === "fees" && <FeeManager />}
            {activeTab === "attendance" && <AttendanceView initialCategory={preselectedCategory} />}
            {activeTab === "reports" && <ReportsView />}
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
