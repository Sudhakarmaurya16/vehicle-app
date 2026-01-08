import React, { useState, useEffect } from "react";
import "./LiveFactoryDashboard.css"; // CSS file import
import Logo from "../assets/image.png";

const LiveFactoryDashboard = () => {
  // --- STATE MANAGEMENT ---
  const [currentTime, setCurrentTime] = useState(new Date());

  // Initial Data State
  const [data, setData] = useState({
    shift: { a: 8449.941, b: 9001.227, c: 8712.142 },
    total: { today: 26163.31, todate: 1158679.338 },
    vehicle: { tractor: 22949.047, truck: 1379.438, bcart: 903.036 },
    yard: { est: 15911, tractor: 753, truck: 43, tcart: 171, bcart: 1 },
  });

  // --- HOOKS ---

  // 1. Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Data Simulation (Real API se connect karne ke liye yahan fetch use karein)
  useEffect(() => {
    const simulator = setInterval(() => {
      setData((prev) => {
        const inc = Math.random() * 0.2; // Small increment
        return {
          ...prev,
          total: {
            ...prev.total,
            today: prev.total.today + inc,
            todate: prev.total.todate + inc,
          },
          shift: { ...prev.shift, a: prev.shift.a + inc / 2 }, // Simulating Shift A active
        };
      });
    }, 2000); // Update every 2 seconds
    return () => clearInterval(simulator);
  }, []);

  // Format Helper (3 decimal places)
  const fmt = (n) => n.toFixed(3);

  // Date Helpers
  const dateStr = currentTime.toLocaleDateString("en-GB");
  const timeStr = currentTime.toLocaleTimeString("en-GB");

  return (
    <div className="lfd-container">
      {/* --- HEADER SECTION --- */}
      <div className="lfd-header">
        {/* Left: Logo */}
        <div className="lfd-sidebar">
          <div className="lfd-logo-circle">
            <span>
                <img className="img" style={{width:"87px", borderRadius:"50%"}}
                src={Logo}
                />
            </span>
          </div>
          <h2 className="lfd-brand">MELLBRO SUGARS</h2>
          <h4 className="lfd-sub-brand">PRIVATE LIMITED, SHIRUR</h4>
        </div>

        {/* Center: Data Display */}
        <div className="lfd-main">
          {/* Top Bar: Date/Time */}
          <div className="lfd-top-bar">
            <div className="lfd-info-box">{dateStr}</div>
            <div className="lfd-info-box">SHIFT: 3</div>
            <div className="lfd-info-box">{timeStr}</div>
          </div>

          <div className="lfd-section-title">
            SHIFT WISE CANE CRUSHING INFORMATION FOR CURRENT DATE
          </div>

          {/* Shift Grid */}
          <div className="lfd-grid-3">
            <div className="lfd-box bg-green">
              <div className="lfd-label">SHIFT A</div>
              <div className="lfd-value">{fmt(data.shift.a)}</div>
            </div>
            <div className="lfd-box bg-green">
              <div className="lfd-label">SHIFT B</div>
              <div className="lfd-value">{fmt(data.shift.b)}</div>
            </div>
            <div className="lfd-box bg-green">
              <div className="lfd-label">SHIFT C</div>
              <div className="lfd-value">{fmt(data.shift.c)}</div>
            </div>
          </div>

          {/* Today/Todate */}
          <div className="lfd-grid-2 big-border">
            <div className="lfd-box">
              <div className="lfd-label">TODAY</div>
              <div className="lfd-value-lg">{fmt(data.total.today)}</div>
            </div>
            <div className="lfd-box">
              <div className="lfd-label">TODATE</div>
              <div className="lfd-value-lg">{fmt(data.total.todate)}</div>
            </div>
          </div>

          <div className="lfd-section-title">
            HOURLY CANE CRUSHING INFORMATION (CURRENT SHIFT)
          </div>

          {/* Hourly Grid */}
          <div className="lfd-grid-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="lfd-box bg-blue">
                <div className="lfd-header-small">
                  {i + 1}
                  {i === 0 ? "st" : i === 1 ? "nd" : i === 2 ? "rd" : "th"} Hour
                </div>
                <div className="lfd-value-sm">
                  {(1000 + i * 20 + Math.random()).toFixed(3)}
                </div>
              </div>
            ))}
          </div>

          <div className="lfd-section-title mt-2">
            VEHICLE WISE CANE CRUSHING INFORMATION
          </div>

          {/* Vehicle Grid */}
          <div className="lfd-vehicle-grid">
            <div className="lfd-box">
              <div className="lfd-label-blue">CROP DAY</div>
              <div className="lfd-value">55</div>
            </div>
            <div className="lfd-box">
              <div className="lfd-label-gray">TRACTOR</div>
              <div className="lfd-value">{fmt(data.vehicle.tractor)}</div>
            </div>
            <div className="lfd-box">
              <div className="lfd-label-gray">TRUCK</div>
              <div className="lfd-value">{fmt(data.vehicle.truck)}</div>
            </div>
            <div className="lfd-box">
              <div className="lfd-label-gray">P CART</div>
              <div className="lfd-value">{fmt(data.vehicle.bcart)}</div>
            </div>
            <div className="lfd-box">
              <div className="lfd-label-blue">CRUSH DAY</div>
              <div className="lfd-value">55</div>
            </div>
             <div className="lfd-box">
              <div className="lfd-label-blue">HRV-VH</div>
              <div className="lfd-value">30</div>
            </div>
          </div>
        </div>

        {/* Right: Photo */}
        <div className="lfd-sidebar">
          <div className="lfd-photo-rect">
            <span>MD PHOTO</span>
          </div>
          <h4 className="lfd-md-name">MR. SANTOSH SOMAPPA MELLIGERI</h4>
          <p className="lfd-md-title">Managing Director</p>
        </div>
      </div>

      {/* --- FOOTER SECTION --- */}
      <div className="lfd-footer">
        <div className="lfd-section-title full-width">
          VEHICLE WISE CANEYARD BALANCE INFORMATION
        </div>
        <div className="lfd-grid-5">
          <div className="lfd-box">
            <div className="lfd-label-gray">Est. Tons</div>
            <div className="lfd-value">{data.yard.est}</div>
          </div>
          <div className="lfd-box">
            <div className="lfd-label-gray">TRACTOR</div>
            <div className="lfd-value">{data.yard.tractor}</div>
          </div>
          <div className="lfd-box">
            <div className="lfd-label-gray">TRUCK</div>
            <div className="lfd-value">{data.yard.truck}</div>
          </div>
          <div className="lfd-box">
            <div className="lfd-label-gray">T CART</div>
            <div className="lfd-value">{data.yard.tcart}</div>
          </div>
          <div className="lfd-box">
            <div className="lfd-label-gray">P CART</div>
            <div className="lfd-value">{data.yard.bcart}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveFactoryDashboard;
