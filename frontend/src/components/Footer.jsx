import { AppWindow, Facebook, Instagram, Linkedin, Play, Twitter, Zap } from "lucide-react";
import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link to="/" className="brand">
            <span className="brand-icon">
              <Zap size={20} fill="currentColor" />
            </span>
            <span>
              <strong>FunService</strong>
              <small>All Services. One Click.</small>
            </span>
          </Link>
          <p>
            FunService is your one-stop solution for all home services. We connect you with trusted
            professionals and get things done quickly.
          </p>
        </div>

        <div>
          <h4>Quick Links</h4>
          <Link to="/">Home</Link>
          <Link to="/services">Services</Link>
          <Link to="/history">History</Link>
          <Link to="/support">Customer Support</Link>
        </div>

        <div>
          <h4>Company</h4>
          <a href="#about">About Us</a>
          <a href="#careers">Careers</a>
          <a href="#terms">Terms & Conditions</a>
          <a href="#privacy">Privacy Policy</a>
          <a href="#refund">Refund Policy</a>
        </div>

        <div>
          <h4>Follow Us</h4>
          <div className="social-row">
            <a href="#facebook" aria-label="Facebook">
              <Facebook size={18} />
            </a>
            <a href="#instagram" aria-label="Instagram">
              <Instagram size={18} />
            </a>
            <a href="#twitter" aria-label="Twitter">
              <Twitter size={18} />
            </a>
            <a href="#linkedin" aria-label="LinkedIn">
              <Linkedin size={18} />
            </a>
          </div>
          <h4 className="download-title">Download App</h4>
          <div className="store-badges">
            <span>
              <Play size={16} fill="currentColor" /> Google Play
            </span>
            <span>
              <AppWindow size={16} /> App Store
            </span>
          </div>
        </div>
      </div>
      <div className="footer-bottom">© 2026 FunService. All rights reserved.</div>
    </footer>
  );
}

export default Footer;
