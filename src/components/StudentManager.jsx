import React, { useState, useEffect } from "react";
import { ref, onValue, set, update, remove, get } from "firebase/database";
import { db } from "../firebase";
import { Search, UserPlus, Edit2, Trash2, X, Eye, EyeOff, Settings, Camera } from "lucide-react";

const uploadImageToCloudinary = async (file, cloudName, uploadPreset) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error?.message || "Failed to upload image to Cloudinary");
  }

  const data = await res.json();
  return data.secure_url;
};

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "";

export default function StudentManager() {
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Form states
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [name, setName] = useState("");
  const [roomNo, setRoomNo] = useState("");
  const [className, setClassName] = useState("");
  const [personalMobile, setPersonalMobile] = useState("");
  const [parentMobile, setParentMobile] = useState("");
  const [dob, setDob] = useState("");
  const [admissionDate, setAdmissionDate] = useState("");
  const [address, setAddress] = useState("");
  const [aadharNo, setAadharNo] = useState("");
  const [otherInfo, setOtherInfo] = useState("");
  const [totalFees, setTotalFees] = useState("");
  
  // Photo states
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Auto-generated fields for Add dialog
  const [genId, setGenId] = useState("");
  const [genPassword, setGenPassword] = useState("");
  
  // Edit password and visibility state
  const [editPassword, setEditPassword] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState({});
  
  const togglePasswordVisibility = (studentId) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  useEffect(() => {
    const studentsRef = ref(db, "students");
    const unsubscribe = onValue(studentsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.keys(data).map(key => data[key]);
        setStudents(list);
      } else {
        setStudents([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Generate unique registration ID and password when opening Add dialog
  const handleOpenAdd = async () => {
    setLoading(true);
    try {
      // 1. Get last assigned ID from Firebase metadata
      const metaRef = ref(db, "metadata/last_registration_id");
      const metaSnapshot = await get(metaRef);
      let lastId = 20260000;
      
      if (metaSnapshot.exists()) {
        lastId = parseInt(metaSnapshot.val(), 10) || 20260000;
      }
      
      // 2. Cross reference with current students max ID just in case
      let maxStudentId = 20260000;
      if (students.length > 0) {
        maxStudentId = Math.max(...students.map(s => parseInt(s.id, 10) || 20260000));
      }
      
      const nextId = Math.max(lastId, maxStudentId) + 1;
      setGenId(nextId.toString());

      // 3. Generate random password
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const pass = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      setGenPassword(pass);

      // Reset other form fields
      setName("");
      setRoomNo("");
      setClassName("");
      setPersonalMobile("");
      setParentMobile("");
      setDob("");
      setAdmissionDate(new Date().toISOString().split("T")[0]);
      setAddress("");
      setAadharNo("");
      setOtherInfo("");
      setTotalFees("");
      
      setIsAddOpen(true);
    } catch (err) {
      console.error(err);
      alert("Failed to initialize registration ID: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (student) => {
    setSelectedStudent(student);
    setName(student.name || "");
    setRoomNo(student.roomNo || "");
    setClassName(student.className || "");
    setPersonalMobile(student.personalMobile || "");
    setParentMobile(student.parentMobile || "");
    setDob(student.dob || "");
    setAdmissionDate(student.admissionDate || "");
    setAddress(student.address || "");
    setAadharNo(student.aadharNo || "");
    setOtherInfo(student.otherInfo || "");
    setTotalFees(student.totalFees?.toString() || "");
    setEditPassword(student.password || "123456");
    setProfileFile(null);
    setProfilePreview(student.profilePhoto || "");
    setIsEditOpen(true);
  };

  const handleOpenDelete = (student) => {
    setSelectedStudent(student);
    setIsDeleteOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      let photoUrl = "";
      if (profileFile) {
        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
          alert("Please configure Cloudinary environment variables (VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET) first!");
          return;
        }
        setUploadingPhoto(true);
        photoUrl = await uploadImageToCloudinary(profileFile, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET);
      }

      const studentData = {
        id: genId,
        name: name.trim(),
        roomNo: roomNo.trim(),
        className: className.trim(),
        personalMobile: personalMobile.trim(),
        parentMobile: parentMobile.trim(),
        dob,
        admissionDate,
        address: address.trim(),
        aadharNo: aadharNo.trim(),
        otherInfo: otherInfo.trim(),
        password: genPassword,
        totalFees: parseFloat(totalFees) || 0.0,
        paidFees: 0.0,
        profilePhoto: photoUrl
      };

      // Save Student
      await set(ref(db, `students/${genId}`), studentData);

      // Update last_registration_id counter
      await set(ref(db, "metadata/last_registration_id"), genId);

      setProfileFile(null);
      setProfilePreview("");
      setIsAddOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to add student: " + err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !selectedStudent) return;

    try {
      let photoUrl = selectedStudent.profilePhoto || "";
      if (profileFile) {
        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
          alert("Please configure Cloudinary environment variables (VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET) first!");
          return;
        }
        setUploadingPhoto(true);
        photoUrl = await uploadImageToCloudinary(profileFile, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET);
      }

      const updatedData = {
        ...selectedStudent,
        name: name.trim(),
        roomNo: roomNo.trim(),
        className: className.trim(),
        personalMobile: personalMobile.trim(),
        parentMobile: parentMobile.trim(),
        dob,
        admissionDate,
        address: address.trim(),
        aadharNo: aadharNo.trim(),
        otherInfo: otherInfo.trim(),
        password: editPassword.trim(),
        totalFees: parseFloat(totalFees) || 0.0,
        profilePhoto: photoUrl
      };

      await set(ref(db, `students/${selectedStudent.id}`), updatedData);
      setProfileFile(null);
      setProfilePreview("");
      setIsEditOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to update student: " + err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedStudent) return;
    const studentId = selectedStudent.id;

    try {
      // 1. Delete student
      await remove(ref(db, `students/${studentId}`));

      // 2. Cascade delete fee records from Firebase
      const feesRef = ref(db, "fees");
      const feesSnapshot = await get(feesRef);
      if (feesSnapshot.exists()) {
        const updates = {};
        feesSnapshot.forEach((child) => {
          const fee = child.val();
          if (fee.studentId === studentId) {
            updates[`fees/${child.key}`] = null;
          }
        });
        if (Object.keys(updates).length > 0) {
          await update(ref(db), updates);
        }
      }

      // 3. Cascade delete attendance records from Firebase
      const attRef = ref(db, "attendance");
      const attSnapshot = await get(attRef);
      if (attSnapshot.exists()) {
        const updates = {};
        attSnapshot.forEach((child) => {
          const key = child.key;
          if (key.includes(`_${studentId}_`)) {
            updates[`attendance/${key}`] = null;
          }
        });
        if (Object.keys(updates).length > 0) {
          await update(ref(db), updates);
        }
      }

      setIsDeleteOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to delete student and their records: " + err.message);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.roomNo?.includes(searchQuery) ||
    s.id?.includes(searchQuery)
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Student Management</h1>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <UserPlus size={18} /> Register Student
        </button>
      </div>

      <div className="card" style={{ padding: "1.5rem" }}>
        <div className="table-controls">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search by name, room or ID..."
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
                  <th>Room No</th>
                  <th>Class</th>
                  <th>Mobile</th>
                  <th>Password</th>
                  <th>Aadhar No</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => (
                  <tr key={student.id}>
                    <td style={{ fontWeight: "700", color: "#818cf8" }}>{student.id}</td>
                    <td style={{ fontWeight: "600", color: "white" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        {student.profilePhoto ? (
                          <img 
                            src={student.profilePhoto} 
                            alt={student.name} 
                            style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", border: "1.5px solid rgba(255,255,255,0.15)" }} 
                          />
                        ) : (
                          <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "rgba(129, 140, 248, 0.15)", color: "#818cf8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "0.85rem" }}>
                            {student.name ? student.name.charAt(0).toUpperCase() : "?"}
                          </div>
                        )}
                        <span>{student.name}</span>
                      </div>
                    </td>
                    <td>Room {student.roomNo}</td>
                    <td>{student.className}</td>
                    <td>{student.personalMobile || student.parentMobile || "-"}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <span style={{ fontFamily: visiblePasswords[student.id] ? "inherit" : "monospace" }}>
                          {visiblePasswords[student.id] ? student.password : "••••••"}
                        </span>
                        <button 
                          className="btn-icon" 
                          onClick={() => togglePasswordVisibility(student.id)}
                          style={{ padding: "0.2rem" }}
                          title={visiblePasswords[student.id] ? "Hide Password" : "Show Password"}
                        >
                          {visiblePasswords[student.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </td>
                    <td>{student.aadharNo || "-"}</td>
                    <td>
                      <div className="action-icons-group">
                        <button className="btn-icon info" onClick={() => handleOpenEdit(student)}>
                          <Edit2 size={16} />
                        </button>
                        <button className="btn-icon danger" onClick={() => handleOpenDelete(student)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Dialog */}
      {isAddOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Register New Student</h3>
              <button className="btn-close" onClick={() => setIsAddOpen(false)}><X /></button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div style={{ background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.2)", borderRadius: "12px", padding: "1rem", marginBottom: "1.5rem" }}>
                  <p style={{ fontSize: "0.8rem", color: "#a5b4fc", fontWeight: "600" }}>AUTO-GENERATED CREDENTIALS</p>
                  <p style={{ color: "white", fontWeight: "700", fontSize: "0.95rem", marginTop: "0.25rem" }}>Registration ID: {genId}</p>
                  <p style={{ color: "white", fontWeight: "700", fontSize: "0.95rem" }}>Login Password: {genPassword}</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="John Doe" />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Room No</label>
                    <input type="text" className="form-input" value={roomNo} onChange={(e) => setRoomNo(e.target.value)} required placeholder="101" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Class</label>
                    <input type="text" className="form-input" value={className} onChange={(e) => setClassName(e.target.value)} required placeholder="B.Sc CS" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Personal Mobile</label>
                    <input type="text" className="form-input" value={personalMobile} onChange={(e) => setPersonalMobile(e.target.value)} placeholder="9876543210" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Parent Mobile</label>
                    <input type="text" className="form-input" value={parentMobile} onChange={(e) => setParentMobile(e.target.value)} placeholder="9876543210" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input type="date" className="form-input" value={dob} onChange={(e) => setDob(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Admission Date</label>
                    <input type="date" className="form-input" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Aadhar Card No</label>
                  <input type="text" className="form-input" value={aadharNo} onChange={(e) => setAadharNo(e.target.value)} placeholder="12-digit Aadhar" />
                </div>

                <div className="form-group">
                  <label className="form-label">Home Address</label>
                  <input type="text" className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Permanent home address..." />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Total Yearly Fees (INR)</label>
                    <input type="number" className="form-input" value={totalFees} onChange={(e) => setTotalFees(e.target.value)} required placeholder="45000" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Other Information</label>
                    <input type="text" className="form-input" value={otherInfo} onChange={(e) => setOtherInfo(e.target.value)} placeholder="Allergies, emergency info..." />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Camera size={16} /> Profile Photo (Cloudinary)
                  </label>
                  {profilePreview && (
                    <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "center" }}>
                      <div style={{ position: "relative" }}>
                        <img 
                          src={profilePreview} 
                          alt="Preview" 
                          style={{ width: "90px", height: "90px", borderRadius: "50%", objectFit: "cover", border: "2px solid #818cf8" }} 
                        />
                        <button 
                          type="button" 
                          onClick={() => { setProfileFile(null); setProfilePreview(""); }} 
                          style={{ position: "absolute", top: 0, right: 0, background: "#f87171", border: "none", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", cursor: "pointer", fontSize: "10px" }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="form-input" 
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setProfileFile(file);
                        setProfilePreview(URL.createObjectURL(file));
                      }
                    }} 
                    disabled={uploadingPhoto}
                  />
                  {!CLOUDINARY_CLOUD_NAME && (
                    <p style={{ fontSize: "0.75rem", color: "#f87171", marginTop: "0.25rem" }}>
                      ⚠️ Cloudinary is not configured. Please add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your .env file.
                    </p>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)} disabled={uploadingPhoto}>CANCEL</button>
                <button type="submit" className="btn btn-primary" disabled={uploadingPhoto}>
                  {uploadingPhoto ? "UPLOADING PHOTO..." : "REGISTER"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {isEditOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Edit Student Details</h3>
              <button className="btn-close" onClick={() => setIsEditOpen(false)}><X /></button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Login Password</label>
                  <input type="text" className="form-input" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} required />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Room No</label>
                    <input type="text" className="form-input" value={roomNo} onChange={(e) => setRoomNo(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Class</label>
                    <input type="text" className="form-input" value={className} onChange={(e) => setClassName(e.target.value)} required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Personal Mobile</label>
                    <input type="text" className="form-input" value={personalMobile} onChange={(e) => setPersonalMobile(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Parent Mobile</label>
                    <input type="text" className="form-input" value={parentMobile} onChange={(e) => setParentMobile(e.target.value)} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input type="date" className="form-input" value={dob} onChange={(e) => setDob(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Admission Date</label>
                    <input type="date" className="form-input" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Aadhar Card No</label>
                  <input type="text" className="form-input" value={aadharNo} onChange={(e) => setAadharNo(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">Home Address</label>
                  <input type="text" className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Total Yearly Fees (INR)</label>
                    <input type="number" className="form-input" value={totalFees} onChange={(e) => setTotalFees(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Other Information</label>
                    <input type="text" className="form-input" value={otherInfo} onChange={(e) => setOtherInfo(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Camera size={16} /> Profile Photo (Cloudinary)
                  </label>
                  {profilePreview && (
                    <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "center" }}>
                      <div style={{ position: "relative" }}>
                        <img 
                          src={profilePreview} 
                          alt="Preview" 
                          style={{ width: "90px", height: "90px", borderRadius: "50%", objectFit: "cover", border: "2px solid #818cf8" }} 
                        />
                        <button 
                          type="button" 
                          onClick={() => { setProfileFile(null); setProfilePreview(""); }} 
                          style={{ position: "absolute", top: 0, right: 0, background: "#f87171", border: "none", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", cursor: "pointer", fontSize: "10px" }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="form-input" 
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setProfileFile(file);
                        setProfilePreview(URL.createObjectURL(file));
                      }
                    }} 
                    disabled={uploadingPhoto}
                  />
                  {!CLOUDINARY_CLOUD_NAME && (
                    <p style={{ fontSize: "0.75rem", color: "#f87171", marginTop: "0.25rem" }}>
                      ⚠️ Cloudinary is not configured. Please add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your .env file.
                    </p>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditOpen(false)} disabled={uploadingPhoto}>CANCEL</button>
                <button type="submit" className="btn btn-primary" disabled={uploadingPhoto}>
                  {uploadingPhoto ? "UPLOADING PHOTO..." : "UPDATE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "440px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Delete Student?</h3>
              <button className="btn-close" onClick={() => setIsDeleteOpen(false)}><X /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: "#cbd5e1" }}>
                Are you sure you want to permanently delete <strong>{selectedStudent?.name}</strong> (ID: {selectedStudent?.id})?
              </p>
              <p style={{ color: "#ef4444", fontSize: "0.85rem", marginTop: "1rem", fontWeight: "600" }}>
                ⚠️ Warning: This will delete all fee payment history and attendance records associated with this student.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsDeleteOpen(false)}>CANCEL</button>
              <button className="btn btn-danger" onClick={handleDeleteConfirm}>DELETE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
