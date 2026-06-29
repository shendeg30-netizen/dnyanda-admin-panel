import React from "react";
import Dashboard from "./components/Dashboard";
import UploadForm from "./components/UploadForm";

function App() {
  return (
    <div className="app-container">
      <header className="header">
        <div className="brand-section">
          <h1 className="brand-logo">Dnyanda</h1>
          <span className="brand-badge">Update Publisher</span>
        </div>
        <div className="header-status">
          <span className="status-dot"></span>
          <span>Firebase connected</span>
        </div>
      </header>
      
      <main className="dashboard-grid">
        <UploadForm />
        <Dashboard />
      </main>
    </div>
  );
}

export default App;
