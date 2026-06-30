import React, { useState, useEffect } from "react";
import { ref, onValue, set, update } from "firebase/database";
import { db } from "../firebase";
import { Calendar, Download, RefreshCw, Edit2, Save, CheckSquare } from "lucide-react";

export default function AttendanceView({ initialCategory }) {
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || "MORNING_MESS");

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  const categories = [
    { value: "MORNING_MESS", label: "Morning Mess" },
    { value: "EVENING_MESS", label: "Evening Mess" },
    { value: "PRAYER", label: "Prayer" },
    { value: "STUDY_HALL", label: "Study Hall" }
  ];

  useEffect(() => {
    const studentsRef = ref(db, "students");
    const attRef = ref(db, "attendance");

    const unsubStudents = onValue(studentsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setStudents(Object.keys(data).map(key => data[key]));
      } else {
        setStudents([]);
      }
      checkLoadingState();
    });

    const unsubAtt = onValue(attRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setAttendanceRecords(Object.keys(data).map(key => data[key]));
      } else {
        setAttendanceRecords([]);
      }
      checkLoadingState();
    });

    function checkLoadingState() {
      setLoading(false);
    }

    return () => {
      unsubStudents();
      unsubAtt();
    };
  }, []);

  // Map students to their attendance status for the selected date and category
  const mappedRecords = students.map(student => {
    const record = attendanceRecords.find(r => 
      r.date === selectedDate && 
      r.studentId === student.id && 
      r.type === selectedCategory
    );

    return {
      student,
      status: record ? record.status : null // PRESENT, ABSENT, TIFFIN, HOME, or null
    };
  });

  const CLASS_ORDER = [
    "8th", "9th", "10th", "11th", "12th", 
    "B. Sc.", "B. Com.", "M. Sc.", "M. Com.", 
    "B. Sc. Agri", "D. Pharm.", "B. Pharm.", "Competative Exam"
  ];

  const sortedRecords = [...mappedRecords].sort((a, b) => {
    const classA = (a.student.className || "").trim();
    const classB = (b.student.className || "").trim();
    
    const indexA = CLASS_ORDER.indexOf(classA);
    const indexB = CLASS_ORDER.indexOf(classB);
    
    const finalIdxA = indexA !== -1 ? indexA : CLASS_ORDER.length;
    const finalIdxB = indexB !== -1 ? indexB : CLASS_ORDER.length;
    
    if (finalIdxA !== finalIdxB) {
      return finalIdxA - finalIdxB;
    }
    
    return (a.student.name || "").localeCompare(b.student.name || "");
  });

  // Aggregate stats
  const stats = mappedRecords.reduce((acc, curr) => {
    if (!curr.status) acc.unmarked++;
    else if (curr.status === "PRESENT") acc.present++;
    else if (curr.status === "ABSENT") acc.absent++;
    else if (curr.status === "TIFFIN") acc.tiffin++;
    else if (curr.status === "HOME") acc.home++;
    return acc;
  }, { present: 0, absent: 0, tiffin: 0, home: 0, unmarked: 0 });

  const getStatusBadge = (status) => {
    if (!status) return <span className="badge" style={{ background: "rgba(100, 116, 139, 0.1)", color: "#94a3b8" }}>Not Marked</span>;
    switch (status) {
      case "PRESENT": return <span className="badge badge-success">Present (P)</span>;
      case "ABSENT": return <span className="badge badge-danger">Absent (A)</span>;
      case "TIFFIN": return <span className="badge badge-warning">Tiffin (T)</span>;
      case "HOME": return <span className="badge badge-info">Home (H)</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  const handleMarkStatus = async (studentId, statusValue) => {
    try {
      const recordId = `${selectedDate}_${studentId}_${selectedCategory}`;
      await set(ref(db, `attendance/${recordId}`), {
        date: selectedDate,
        studentId,
        type: selectedCategory,
        status: statusValue
      });
    } catch (err) {
      console.error(err);
      alert("Failed to log attendance: " + err.message);
    }
  };

  const handleMarkAllPresent = async () => {
    if (students.length === 0) return;
    try {
      const updates = {};
      students.forEach(student => {
        const recordId = `${selectedDate}_${student.id}_${selectedCategory}`;
        updates[`attendance/${recordId}`] = {
          date: selectedDate,
          studentId: student.id,
          type: selectedCategory,
          status: "PRESENT"
        };
      });
      await update(ref(db), updates);
    } catch (err) {
      console.error(err);
      alert("Failed to mark bulk attendance: " + err.message);
    }
  };

  const handleExportCSV = () => {
    if (students.length === 0) return;

    const categoryLabel = categories.find(c => c.value === selectedCategory)?.label || selectedCategory;
    const filename = `Attendance_${categoryLabel.replace(/ /g,"_")}_${selectedDate}.csv`;

    const headers = ["Student ID", "Name", "Room No", "Class", "Status"];
    const rows = sortedRecords.map(item => [
      item.student.id,
      item.student.name,
      `Room ${item.student.roomNo}`,
      item.student.className,
      item.status ? item.status : "NOT MARKED"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Attendance Tracker</h1>
        <div className="page-actions">
          {isEditMode ? (
            <>
              <button className="btn btn-secondary" onClick={handleMarkAllPresent} disabled={students.length === 0}>
                <CheckSquare size={18} /> Mark All Present
              </button>
              <button className="btn btn-primary" onClick={() => setIsEditMode(false)}>
                <Save size={18} /> Save & Lock
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={handleExportCSV} disabled={students.length === 0}>
                <Download size={18} /> Export CSV
              </button>
              <button className="btn btn-primary" onClick={() => setIsEditMode(true)}>
                <Edit2 size={18} /> Log Attendance
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Select Date</label>
            <input 
              type="date" 
              className="form-input" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Select Category</label>
            <select 
              className="form-select" 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="stat-card" style={{ padding: "1.25rem" }}>
          <div className="stat-icon-wrapper" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", width: "40px", height: "40px", borderRadius: "10px" }}>🟢</div>
          <div className="stat-info">
            <span className="stat-card-label" style={{ fontSize: "0.75rem" }}>Present</span>
            <span className="stat-card-value" style={{ fontSize: "1.25rem" }}>{stats.present}</span>
          </div>
        </div>
        <div className="stat-card" style={{ padding: "1.25rem" }}>
          <div className="stat-icon-wrapper" style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", width: "40px", height: "40px", borderRadius: "10px" }}>🔴</div>
          <div className="stat-info">
            <span className="stat-card-label" style={{ fontSize: "0.75rem" }}>Absent</span>
            <span className="stat-card-value" style={{ fontSize: "1.25rem" }}>{stats.absent}</span>
          </div>
        </div>
        <div className="stat-card" style={{ padding: "1.25rem" }}>
          <div className="stat-icon-wrapper" style={{ background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", width: "40px", height: "40px", borderRadius: "10px" }}>🟡</div>
          <div className="stat-info">
            <span className="stat-card-label" style={{ fontSize: "0.75rem" }}>Tiffin</span>
            <span className="stat-card-value" style={{ fontSize: "1.25rem" }}>{stats.tiffin}</span>
          </div>
        </div>
        <div className="stat-card" style={{ padding: "1.25rem" }}>
          <div className="stat-icon-wrapper" style={{ background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", width: "40px", height: "40px", borderRadius: "10px" }}>🔵</div>
          <div className="stat-info">
            <span className="stat-card-label" style={{ fontSize: "0.75rem" }}>Home</span>
            <span className="stat-card-value" style={{ fontSize: "1.25rem" }}>{stats.home}</span>
          </div>
        </div>
        <div className="stat-card" style={{ padding: "1.25rem" }}>
          <div className="stat-icon-wrapper" style={{ background: "rgba(100, 116, 139, 0.1)", color: "#64748b", width: "40px", height: "40px", borderRadius: "10px" }}>⚪</div>
          <div className="stat-info">
            <span className="stat-card-label" style={{ fontSize: "0.75rem" }}>Unmarked</span>
            <span className="stat-card-value" style={{ fontSize: "1.25rem" }}>{stats.unmarked}</span>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="card" style={{ padding: "1.5rem" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
            <div className="spinner" style={{ width: "32px", height: "32px" }}></div>
          </div>
        ) : mappedRecords.length === 0 ? (
          <p style={{ textAlign: "center", color: "#64748b", padding: "2rem 0" }}>No students registered.</p>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Room No</th>
                  <th>Class</th>
                  <th>Attendance Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedRecords.map(item => (
                  <tr key={item.student.id}>
                    <td style={{ fontWeight: "700", color: "#818cf8" }}>{item.student.id}</td>
                    <td style={{ fontWeight: "600", color: "white" }}>{item.student.name}</td>
                    <td>Room {item.student.roomNo}</td>
                    <td>{item.student.className}</td>
                    <td>
                      {isEditMode ? (
                        <div style={{ display: "flex", gap: "0.35rem" }}>
                          <button 
                            type="button" 
                            onClick={() => handleMarkStatus(item.student.id, "PRESENT")}
                            className="btn"
                            style={{
                              padding: "0.2rem 0.5rem",
                              fontSize: "0.75rem",
                              fontWeight: "700",
                              borderRadius: "8px",
                              background: item.status === "PRESENT" ? "#34d399" : "transparent",
                              color: item.status === "PRESENT" ? "white" : "#64748b",
                              border: "1px solid " + (item.status === "PRESENT" ? "#34d399" : "rgba(0, 0, 0, 0.08)"),
                              cursor: "pointer"
                            }}
                          >
                            P
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleMarkStatus(item.student.id, "ABSENT")}
                            className="btn"
                            style={{
                              padding: "0.2rem 0.5rem",
                              fontSize: "0.75rem",
                              fontWeight: "700",
                              borderRadius: "8px",
                              background: item.status === "ABSENT" ? "#f87171" : "transparent",
                              color: item.status === "ABSENT" ? "white" : "#64748b",
                              border: "1px solid " + (item.status === "ABSENT" ? "#f87171" : "rgba(0, 0, 0, 0.08)"),
                              cursor: "pointer"
                            }}
                          >
                            A
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleMarkStatus(item.student.id, "TIFFIN")}
                            className="btn"
                            style={{
                              padding: "0.2rem 0.5rem",
                              fontSize: "0.75rem",
                              fontWeight: "700",
                              borderRadius: "8px",
                              background: item.status === "TIFFIN" ? "#fbbf24" : "transparent",
                              color: item.status === "TIFFIN" ? "white" : "#64748b",
                              border: "1px solid " + (item.status === "TIFFIN" ? "#fbbf24" : "rgba(0, 0, 0, 0.08)"),
                              cursor: "pointer"
                            }}
                          >
                            T
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleMarkStatus(item.student.id, "HOME")}
                            className="btn"
                            style={{
                              padding: "0.2rem 0.5rem",
                              fontSize: "0.75rem",
                              fontWeight: "700",
                              borderRadius: "8px",
                              background: item.status === "HOME" ? "#60a5fa" : "transparent",
                              color: item.status === "HOME" ? "white" : "#64748b",
                              border: "1px solid " + (item.status === "HOME" ? "#60a5fa" : "rgba(0, 0, 0, 0.08)"),
                              cursor: "pointer"
                            }}
                          >
                            H
                          </button>
                        </div>
                      ) : (
                        getStatusBadge(item.status)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
