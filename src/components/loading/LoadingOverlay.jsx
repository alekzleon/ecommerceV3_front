import "./loading-overlay.css";

function LoadingOverlay({ show = false }) {
  if (!show) return null;

  return (
    <div
      className="loading-overlay"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="loading-overlay-box">
        <img
          src="https://www.pidefacilraul.com/cms/wp-content/uploads/2020/09/CC-175-PIDEFaCIL-LOGO-HORIZONTAL-e1724443779289.png"
          alt="PideFacilRaul"
          className="loading-overlay-logo"
        />
        {/* <p className="loading-overlay-text">{text}</p> */}
      </div>
    </div>
  );
}

export default LoadingOverlay;
