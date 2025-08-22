// import React from "react";
// import { createRoot } from "react-dom/client";
// import DataQualityDashboard from "./DataQualityDashboard";
// import "./index.css";

// const root = createRoot(document.getElementById("root"));
// root.render(<DataQualityDashboard />);

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import Login from './Login';
import DataQualityDashboard from './DataQualityDashboard';

const Main = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <>
      {isAuthenticated ? (
        <DataQualityDashboard onLogout={() => setIsAuthenticated(false)} />
      ) : (
        <Login onLogin={() => setIsAuthenticated(true)} />
      )}
    </>
  );
};

ReactDOM.render(<Main />, document.getElementById('root'));
