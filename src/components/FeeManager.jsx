import React, { useState, useEffect } from "react";
import { ref, onValue, set, get, update } from "firebase/database";
import { db } from "../firebase";
import { Search, DollarSign, History, FileText, X } from "lucide-react";
import jsPDF from "jspdf";

export default function FeeManager() {
  const [students, setStudents] = useState([]);
  const [feeRecords, setFeeRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Monthly Report picker state
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  
  const currentMonthIndex = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthsArray = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const [reportMonthName, setReportMonthName] = useState(monthsArray[currentMonthIndex]);
  const [reportYear, setReportYear] = useState(currentYear.toString());

  // Add Payment form states
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [feeMonth, setFeeMonth] = useState("");
  const [note, setNote] = useState("");
  const [receiptNo, setReceiptNo] = useState("");
  const [paymentDate, setPaymentDate] = useState("");

  const monthsList = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ].flatMap(month => {
    const year = new Date().getFullYear();
    return [`${month} ${year - 1}`, `${month} ${year}`, `${month} ${year + 1}`];
  });

  useEffect(() => {
    const studentsRef = ref(db, "students");
    const feesRef = ref(db, "fees");

    const unsubStudents = onValue(studentsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setStudents(Object.keys(data).map(key => data[key]));
      } else {
        setStudents([]);
      }
      checkLoadingState();
    });

    const unsubFees = onValue(feesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setFeeRecords(Object.keys(data).map(key => data[key]));
      } else {
        setFeeRecords([]);
      }
      checkLoadingState();
    });

    function checkLoadingState() {
      setLoading(false);
    }

    return () => {
      unsubStudents();
      unsubFees();
    };
  }, []);

  const handleOpenPay = (student) => {
    setSelectedStudent(student);
    setAmount("");
    setPaymentMethod("Cash");
    setNote("");
    const currentMonthIndex = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    setFeeMonth(`${months[currentMonthIndex]} ${currentYear}`);
    setPaymentDate(new Date().toISOString().split("T")[0]);
    
    const now = new Date();
    const formattedDate = now.toISOString().slice(0,10).replace(/-/g,"");
    const formattedTime = now.toTimeString().slice(0,8).replace(/:/g,"");
    setReceiptNo(`R-${formattedDate}-${formattedTime}`);
    setIsPayOpen(true);
  };

  const handleOpenHistory = (student) => {
    setSelectedStudent(student);
    setIsHistoryOpen(true);
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0 || !selectedStudent) return;

    try {
      const recordId = crypto.randomUUID ? crypto.randomUUID() : `fee_${Date.now()}`;
      
      const newFeeRecord = {
        id: recordId,
        studentId: selectedStudent.id,
        amount: payAmount,
        date: paymentDate,
        timestamp: Date.now(),
        paymentMethod,
        note: note.trim(),
        feeMonth,
        receiptNo: receiptNo.trim()
      };

      await set(ref(db, `fees/${recordId}`), newFeeRecord);

      const updatedPaidFees = (selectedStudent.paidFees || 0.0) + payAmount;
      await update(ref(db, `students/${selectedStudent.id}`), {
        paidFees: updatedPaidFees
      });

      setIsPayOpen(false);
      generateReceiptPDF(selectedStudent, newFeeRecord);
    } catch (err) {
      console.error(err);
      alert("Failed to record payment: " + err.message);
    }
  };

  const generateReceiptPDF = (student, record) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a5"
    });

    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(1);
    doc.rect(5, 5, 138, 200);
    
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.rect(7, 7, 134, 196);

    doc.setFillColor(15, 23, 42);
    doc.rect(8, 8, 132, 25, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("DNYANDA HOSTEL", 74, 18, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text("Official Fee Payment Receipt", 74, 25, { align: "center" });

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Receipt No: ${record.receiptNo}`, 12, 45);
    
    const formattedDate = new Date(record.date).toLocaleDateString("en-GB");
    doc.text(`Date: ${formattedDate}`, 105, 45);

    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.rect(10, 52, 128, 36, "FD");

    doc.setFont("helvetica", "bold");
    doc.text("Student Information:", 14, 58);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${student.name}`, 14, 66);
    doc.text(`Registration ID: ${student.id}`, 14, 73);
    doc.text(`Room No: ${student.roomNo}`, 14, 80);
    doc.text(`Class: ${student.className}`, 75, 80);

    doc.setFillColor(79, 70, 229);
    doc.rect(10, 95, 128, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("Description / Fee Month", 14, 100);
    doc.text("Amount", 112, 100);

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.text(`Hostel Accommodation Fees - ${record.feeMonth}`, 14, 112);
    
    doc.setFont("helvetica", "bold");
    doc.text(`INR ${record.amount.toFixed(2)}`, 112, 112);

    doc.setDrawColor(226, 232, 240);
    doc.line(10, 120, 138, 120);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Payment Method: ${record.paymentMethod}`, 14, 128);
    if (record.note) {
      doc.text(`Notes: ${record.note}`, 14, 134);
    }

    doc.setFillColor(241, 245, 249);
    doc.rect(80, 145, 58, 20, "F");
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TOTAL PAID", 84, 151);
    doc.setFontSize(12);
    doc.setTextColor(79, 70, 229);
    doc.text(`INR ${record.amount.toFixed(2)}`, 84, 160);

    doc.setDrawColor(148, 163, 184);
    doc.line(15, 185, 55, 185);
    doc.line(93, 185, 133, 185);

    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Student Signature", 35, 190, { align: "center" });
    doc.text("Authorized Signature", 113, 190, { align: "center" });

    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text("Thank you for your payment!", 74, 200, { align: "center" });

    doc.save(`Receipt_${student.name.replace(/ /g,"_")}_${record.feeMonth.replace(/ /g,"_")}.pdf`);
  };

  const generateMonthlyFeeReport = (monthName, yearString) => {
    const fullMonthQuery = `${monthName} ${yearString}`;
    
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    doc.setFillColor(79, 70, 229);
    doc.rect(15, 15, 180, 20, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Dnyanda Hostel - Fee Report", 20, 28);

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Status Report for Period: ${fullMonthQuery}`, 15, 45);
    
    const dateGenerated = new Date().toLocaleDateString("en-GB");
    doc.text(`Generated on: ${dateGenerated}`, 150, 45);

    const col1X = 15;
    const col2X = 30;
    const col3X = 100;
    const col4X = 130;
    const col5X = 165;

    doc.setFillColor(241, 245, 249);
    doc.rect(15, 52, 180, 10, "F");
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("No.", col1X + 2, 58);
    doc.text("Student Name", col2X + 2, 58);
    doc.text("Room No", col3X + 2, 58);
    doc.text("Status", col4X + 2, 58);
    doc.text("Paid Amount", col5X + 2, 58);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, 62, 195, 62);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    
    let y = 68;
    const rowHeight = 10;
    const pageHeight = 280;

    students.forEach((student, index) => {
      if (y > pageHeight - 15) {
        doc.addPage();
        doc.setFillColor(79, 70, 229);
        doc.rect(15, 15, 180, 15, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(`Monthly Fee Report - ${fullMonthQuery} (Continued)`, 20, 25);
        
        doc.setFillColor(241, 245, 249);
        doc.rect(15, 35, 180, 10, "F");
        doc.setTextColor(71, 85, 105);
        doc.text("No.", col1X + 2, 41);
        doc.text("Student Name", col2X + 2, 41);
        doc.text("Room No", col3X + 2, 41);
        doc.text("Status", col4X + 2, 41);
        doc.text("Paid Amount", col5X + 2, 41);
        
        doc.setDrawColor(226, 232, 240);
        doc.line(15, 45, 195, 45);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        y = 51;
      }

      const record = feeRecords.find(r => r.studentId === student.id && r.feeMonth.toLowerCase().includes(fullMonthQuery.toLowerCase()));
      const isPaid = !!record;

      if (index % 2 !== 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y - 6, 180, rowHeight, "F");
      }

      doc.text((index + 1).toString(), col1X + 2, y);
      doc.text(student.name, col2X + 2, y);
      doc.text(`Room ${student.roomNo}`, col3X + 2, y);
      
      if (isPaid) {
        doc.setTextColor(16, 185, 129);
        doc.setFont("helvetica", "bold");
        doc.text("PAID", col4X + 2, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        doc.text(`INR ${record.amount.toFixed(2)}`, col5X + 2, y);
      } else {
        doc.setTextColor(239, 68, 68);
        doc.setFont("helvetica", "bold");
        doc.text("PENDING", col4X + 2, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        doc.text("-", col5X + 2, y);
      }

      y += rowHeight;
    });

    doc.save(`Fee_Report_${fullMonthQuery.replace(/ /g,"_")}.pdf`);
  };

  const filteredStudents = students.filter(s =>
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id?.includes(searchQuery)
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Fee Management</h1>
        <button className="btn btn-secondary" onClick={() => setShowMonthPicker(true)}>
          <FileText size={18} /> Monthly Report
        </button>
      </div>

      <div className="card" style={{ padding: "1.5rem" }}>
        <div className="table-controls">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search by student name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input search-input"
            />
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
            <div className="spinner" style={{ width: "32px", height: "32px" }}></div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <p style={{ textAlign: "center", color: "#64748b", padding: "2rem 0" }}>No students registered.</p>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Total Fees</th>
                  <th>Paid Fees</th>
                  <th>Pending Fees</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => {
                  const paid = student.paidFees || 0.0;
                  const total = student.totalFees || 0.0;
                  const pending = total - paid;
                  const isFullyPaid = pending <= 0;

                  return (
                    <tr key={student.id}>
                      <td style={{ fontWeight: "700", color: "#818cf8" }}>{student.id}</td>
                      <td style={{ fontWeight: "600", color: "white" }}>{student.name}</td>
                      <td>INR {total.toFixed(2)}</td>
                      <td style={{ color: "#10b981", fontWeight: "600" }}>INR {paid.toFixed(2)}</td>
                      <td style={{ color: isFullyPaid ? "#94a3b8" : "#ef4444", fontWeight: "600" }}>
                        INR {pending.toFixed(2)}
                      </td>
                      <td>
                        <span className={`badge ${isFullyPaid ? "badge-success" : "badge-danger"}`}>
                          {isFullyPaid ? "Fully Paid" : "Pending"}
                        </span>
                      </td>
                      <td>
                        <div className="action-icons-group">
                          <button
                            className="btn-icon success"
                            onClick={() => handleOpenPay(student)}
                            title="Collect Payment"
                          >
                            <DollarSign size={16} />
                          </button>
                          <button
                            className="btn-icon info"
                            onClick={() => handleOpenHistory(student)}
                            title="Payment History"
                          >
                            <History size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pay Fee Dialog */}
      {isPayOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Record Fee Payment</h3>
              <button className="btn-close" onClick={() => setIsPayOpen(false)}><X /></button>
            </div>
            <form onSubmit={handlePaySubmit}>
              <div className="modal-body">
                <p style={{ color: "#94a3b8", marginBottom: "1rem" }}>
                  Recording payment for: <strong style={{ color: "white" }}>{selectedStudent?.name}</strong> (ID: {selectedStudent?.id})
                </p>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Receipt Number</label>
                    <input type="text" className="form-input" value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Date</label>
                    <input type="date" className="form-input" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Amount Paid (INR)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      className="form-input"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      placeholder="5000"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Method</label>
                    <select className="form-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                      <option value="Cash">Cash</option>
                      <option value="Online">Online / UPI</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">For Month / Period</label>
                    <select className="form-select" value={feeMonth} onChange={(e) => setFeeMonth(e.target.value)} required>
                      {monthsList.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes / Remarks</label>
                    <input type="text" className="form-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Installment 2" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsPayOpen(false)}>CANCEL</button>
                <button type="submit" className="btn btn-primary">RECORD & DOWNLOAD RECEIPT</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment History Dialog */}
      {isHistoryOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Payment History - {selectedStudent?.name}</h3>
              <button className="btn-close" onClick={() => setIsHistoryOpen(false)}><X /></button>
            </div>
            <div className="modal-body" style={{ minHeight: "200px", maxHeight: "450px", overflowY: "auto" }}>
              {feeRecords.filter(r => r.studentId === selectedStudent?.id).length === 0 ? (
                <p style={{ textAlign: "center", color: "#64748b", marginTop: "2rem" }}>No fee records found for this student.</p>
              ) : (
                <div className="payment-history-list">
                  {feeRecords
                    .filter(r => r.studentId === selectedStudent?.id)
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .map(record => (
                      <div key={record.id} className="payment-history-item">
                        <div className="payment-details">
                          <div className="payment-title">Hostel Fees - {record.feeMonth}</div>
                          <div className="payment-meta">
                            Receipt: {record.receiptNo} • Date: {new Date(record.date).toLocaleDateString("en-GB")} • Method: {record.paymentMethod}
                          </div>
                          {record.note && <div className="payment-meta" style={{ fontStyle: "italic" }}>Note: {record.note}</div>}
                        </div>
                        <div className="payment-action">
                          <span className="payment-amount">INR {record.amount.toFixed(2)}</span>
                          <button
                            className="btn-icon info"
                            onClick={() => generateReceiptPDF(selectedStudent, record)}
                            title="Download PDF Receipt"
                          >
                            <FileText size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsHistoryOpen(false)}>CLOSE</button>
            </div>
          </div>
        </div>
      )}

      {/* Month Selection Dialog for Monthly Report */}
      {showMonthPicker && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "420px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Generate Monthly Fee Report</h3>
              <button className="btn-close" onClick={() => setShowMonthPicker(false)}><X /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
                Generate a PDF report of all registered students indicating their fee status (PAID or PENDING) for the selected month.
              </p>
              <div className="form-group">
                <label className="form-label">Select Month</label>
                <select 
                  className="form-select" 
                  value={reportMonthName} 
                  onChange={(e) => setReportMonthName(e.target.value)}
                >
                  {monthsArray.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Select Year</label>
                <select 
                  className="form-select" 
                  value={reportYear} 
                  onChange={(e) => setReportYear(e.target.value)}
                >
                  {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                    <option key={y} value={y.toString()}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowMonthPicker(false)}>CANCEL</button>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  generateMonthlyFeeReport(reportMonthName, reportYear);
                  setShowMonthPicker(false);
                }}
              >
                GENERATE REPORT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
