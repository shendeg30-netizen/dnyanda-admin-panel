import React, { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import { FileText, Download, Calendar, Filter } from "lucide-react";
import jsPDF from "jspdf";

export default function ReportsView() {
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [category, setCategory] = useState("All Categories");
  const [status, setStatus] = useState("All Statuses");
  const [fromDate, setFromDate] = useState(new Date().toISOString().split("T")[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);

  const categories = [
    { value: "All Categories", label: "All Categories" },
    { value: "MORNING_MESS", label: "Morning Mess" },
    { value: "EVENING_MESS", label: "Evening Mess" },
    { value: "PRAYER", label: "Prayer" },
    { value: "STUDY_HALL", label: "Study Hall" }
  ];

  const statuses = [
    { value: "All Statuses", label: "All Statuses" },
    { value: "PRESENT", label: "Present (P)" },
    { value: "ABSENT", label: "Absent (A)" },
    { value: "TIFFIN", label: "Tiffin (T)" },
    { value: "HOME", label: "Home (H)" }
  ];

  useEffect(() => {
    const studentsRef = ref(db, "students");
    const attRef = ref(db, "attendance");

    const unsubStudents = onValue(studentsRef, (snapshot) => {
      if (snapshot.exists()) {
        setStudents(Object.values(snapshot.val()));
      } else {
        setStudents([]);
      }
      checkLoading();
    });

    const unsubAtt = onValue(attRef, (snapshot) => {
      if (snapshot.exists()) {
        setAttendanceRecords(Object.values(snapshot.val()));
      } else {
        setAttendanceRecords([]);
      }
      checkLoading();
    });

    function checkLoading() {
      setLoading(false);
    }

    return () => {
      unsubStudents();
      unsubAtt();
    };
  }, []);

  // Helper: Get list of dates between From and To
  const getDatesInRange = (start, end) => {
    const dates = [];
    let current = new Date(start);
    const last = new Date(end);
    
    // Set hours to 0 to avoid offset bugs
    current.setHours(0,0,0,0);
    last.setHours(0,0,0,0);

    while (current <= last) {
      dates.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  // Process and filter attendance records based on inputs
  const processReportData = () => {
    const dateList = getDatesInRange(fromDate, toDate);
    const finalRecords = [];

    const categoriesToProcess = category === "All Categories" 
      ? ["MORNING_MESS", "EVENING_MESS", "PRAYER", "STUDY_HALL"] 
      : [category];

    const categoryLabels = {
      MORNING_MESS: "Morning Mess",
      EVENING_MESS: "Evening Mess",
      PRAYER: "Prayer",
      STUDY_HALL: "Study Hall"
    };

    dateList.forEach(date => {
      categoriesToProcess.forEach(cat => {
        students.forEach(student => {
          const record = attendanceRecords.find(r => 
            r.date === date && 
            r.studentId === student.id && 
            r.type === cat
          );
          
          const recordStatus = record ? record.status : "NOT MARKED";
          
          if (status === "All Statuses" || recordStatus === status) {
            finalRecords.push({
              date,
              category: categoryLabels[cat],
              studentId: student.id,
              studentName: student.name,
              roomNo: student.roomNo,
              status: recordStatus
            });
          }
        });
      });
    });

    return finalRecords;
  };

  const handleDownloadPDF = () => {
    const dataRecords = processReportData();
    if (dataRecords.length === 0) {
      alert("No attendance records match your filter criteria.");
      return;
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const reportPeriod = fromDate === toDate 
      ? new Date(fromDate).toLocaleDateString("en-GB") 
      : `${new Date(fromDate).toLocaleDateString("en-GB")} to ${new Date(toDate).toLocaleDateString("en-GB")}`;

    // Title Block
    doc.setFillColor(79, 70, 229);
    doc.rect(15, 15, 180, 20, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Dnyanda Hostel - Attendance Audit Report", 20, 27);

    // Filters summary subheader
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Category: ${category} | Status: ${status}`, 15, 43);
    doc.text(`Period: ${reportPeriod}`, 15, 48);
    
    const dateGenerated = new Date().toLocaleDateString("en-GB");
    doc.text(`Exported on: ${dateGenerated}`, 150, 43);

    const col1X = 15; // No
    const col2X = 27; // Date
    const col3X = 52; // Slot Category
    const col4X = 85; // Student Name
    const col5X = 145; // Room
    const col6X = 168; // Status

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(15, 54, 180, 9, "F");
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("No.", col1X + 1, 60);
    doc.text("Date", col2X + 1, 60);
    doc.text("Category", col3X + 1, 60);
    doc.text("Student Name", col4X + 1, 60);
    doc.text("Room", col5X + 1, 60);
    doc.text("Status", col6X + 1, 60);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, 63, 195, 63);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);

    let y = 69;
    const rowHeight = 9;
    const pageHeight = 280;

    dataRecords.forEach((record, index) => {
      if (y > pageHeight - 15) {
        doc.addPage();
        // Redraw page header
        doc.setFillColor(79, 70, 229);
        doc.rect(15, 15, 180, 15, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(`Attendance Audit Report (Continued)`, 20, 24);
        
        doc.setFillColor(241, 245, 249);
        doc.rect(15, 33, 180, 9, "F");
        doc.setTextColor(71, 85, 105);
        doc.text("No.", col1X + 1, 39);
        doc.text("Date", col2X + 1, 39);
        doc.text("Category", col3X + 1, 39);
        doc.text("Student Name", col4X + 1, 39);
        doc.text("Room", col5X + 1, 39);
        doc.text("Status", col6X + 1, 39);
        
        doc.setDrawColor(226, 232, 240);
        doc.line(15, 42, 195, 42);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(9);
        y = 48;
      }

      if (index % 2 !== 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y - 5, 180, rowHeight, "F");
      }

      const formattedDateCell = new Date(record.date).toLocaleDateString("en-GB");

      doc.text((index + 1).toString(), col1X + 1, y);
      doc.text(formattedDateCell, col2X + 1, y);
      doc.text(record.category, col3X + 1, y);
      doc.text(record.studentName, col4X + 1, y);
      doc.text(`Room ${record.roomNo}`, col5X + 1, y);
      
      const st = record.status;
      if (st === "PRESENT") {
        doc.setTextColor(16, 185, 129); // Green
        doc.setFont("helvetica", "bold");
        doc.text("PRESENT", col6X + 1, y);
      } else if (st === "ABSENT") {
        doc.setTextColor(239, 68, 68); // Red
        doc.setFont("helvetica", "bold");
        doc.text("ABSENT", col6X + 1, y);
      } else if (st === "TIFFIN") {
        doc.setTextColor(245, 158, 11); // Orange
        doc.setFont("helvetica", "bold");
        doc.text("TIFFIN", col6X + 1, y);
      } else if (st === "HOME") {
        doc.setTextColor(59, 130, 246); // Blue
        doc.setFont("helvetica", "bold");
        doc.text("HOME", col6X + 1, y);
      } else {
        doc.setTextColor(100, 116, 139); // Gray
        doc.text("UNMARKED", col6X + 1, y);
      }
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      y += rowHeight;
    });

    const formattedFrom = fromDate.replace(/-/g,"");
    const formattedTo = toDate.replace(/-/g,"");
    doc.save(`Attendance_Report_${category}_${status}_${formattedFrom}_to_${formattedTo}.pdf`);
  };

  const handleDownloadCSV = () => {
    const dataRecords = processReportData();
    if (dataRecords.length === 0) {
      alert("No attendance records match your filter criteria.");
      return;
    }

    const headers = ["Date", "Category", "Student ID", "Student Name", "Room No", "Status"];
    const rows = dataRecords.map(r => [
      r.date,
      r.category,
      r.studentId,
      r.studentName,
      `Room ${r.roomNo}`,
      r.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    
    const formattedFrom = fromDate.replace(/-/g,"");
    const formattedTo = toDate.replace(/-/g,"");
    const filename = `Attendance_Report_${category}_${status}_${formattedFrom}_to_${formattedTo}.csv`;

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
        <h1 className="page-title">Reports & Downloads</h1>
      </div>

      <div className="card" style={{ maxWidth: "700px" }}>
        <h2 className="card-title">
          <Filter size={20} style={{ color: "#4f46e5" }} /> Set Report Configuration
        </h2>
        <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "2rem" }}>
          Select custom categories, attendance statuses, and date ranges to compile full audit logs in PDF or Excel (CSV) formats.
        </p>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
            <div className="spinner" style={{ width: "24px", height: "24px" }}></div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {categories.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Attendance Status</label>
                <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {statuses.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">From Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={fromDate} 
                  onChange={(e) => setFromDate(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">To Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={toDate} 
                  onChange={(e) => setToDate(e.target.value)} 
                />
              </div>
            </div>

            <div className="form-row" style={{ marginTop: "1rem", gap: "1.5rem" }}>
              <button 
                className="btn btn-primary" 
                style={{ padding: "1rem", borderRadius: "16px", flexGrow: "1" }}
                onClick={handleDownloadPDF}
                disabled={students.length === 0}
              >
                <FileText size={20} /> Download PDF Report
              </button>
              
              <button 
                className="btn btn-secondary" 
                style={{ padding: "1rem", borderRadius: "16px", flexGrow: "1" }}
                onClick={handleDownloadCSV}
                disabled={students.length === 0}
              >
                <Download size={20} /> Download Excel (CSV)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
