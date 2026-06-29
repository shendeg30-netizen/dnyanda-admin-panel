import React, { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import { Calendar, Download, RefreshCw } from "lucide-react";

export default function AttendanceView() {
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedCategory, setSelectedCategory] = useState("MORNING_MESS");
  const [loading, setLoading] = useState(true);

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
    // Find attendance record matching: date = selectedDate, studentId = student.id, type = selectedCategory
    // Date formats are standard: YYYY-MM-DD
    const record = attendanceRecords.find(r => 
      r.date === selectedDate && 
      r.studentId === student.id && 
      r.type === selectedCategory
    );

    return {
      student,
      status: record ? record.status : null // PRESENT, ABSENT, TIFFIN, HOME, or null (Not Marked)
    };
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

  const handleExportCSV = () => {
    if (students.length === 0) return;

    const categoryLabel = categories.find(c => c.value === selectedCategory)?.label || selectedCategory;
    const filename = `Attendance_${categoryLabel.replace(/ /g,"_")}_${selectedDate}.csv`;

    const headers = ["Student ID", "Name", "Room No", "Class", "Status"];
    const rows = mappedRecords.map(item => [
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
        <button 
          className="btn btn-secondary" 
          onClick={handleExportCSV}
          disabled={students.length === 0}
        >
          <Download size={18} /> Export CSV
        </button>
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
                {mappedRecords.map(item => (
                  <tr key={item.student.id}>
                    <td style={{ fontWeight: "700", color: "#818cf8" }}>{item.student.id}</td>
                    <td style={{ fontWeight: "600", color: "white" }}>{item.student.name}</td>
                    <td>Room {item.student.roomNo}</td>
                    <td>{item.student.className}</td>
                    <td>{getStatusBadge(item.status)}</td>
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
