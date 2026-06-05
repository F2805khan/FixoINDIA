import { useState } from "react";
import {
  ChevronDown,
  Clock,
  Mail,
  Send,
  UserRound
} from "lucide-react";

const faqs = [
  {
    question: "How quickly will I get a professional?",
    answer: "Most bookings are assigned within minutes, and the professional reaches in about 30 minutes."
  },
  {
    question: "How do I cancel my booking?",
    answer: "Open Booking Status or History, choose the booking, and select Cancel Booking before service starts."
  },
  {
    question: "What payment methods do you accept?",
    answer: "FunService supports UPI, debit/credit card, net banking, wallets, and cash on service."
  }
];

function CustomerSupport() {
  const [openFaq, setOpenFaq] = useState(0);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([
    { type: "bot", text: "Hi there! How can we help you today?" },
    { type: "user", text: "I need help with my booking." },
    { type: "bot", text: "Sure! Please share your Booking ID." }
  ]);

  const sendMessage = (event) => {
    event.preventDefault();
    if (!message.trim()) return;
    setChat((items) => [
      ...items,
      { type: "user", text: message },
      { type: "bot", text: "Thanks. A support agent will review this and reply shortly." }
    ]);
    setMessage("");
  };

  return (
    <section className="page-shell">
      <div className="container">
        <div className="page-head">
          <h1>How can we help you?</h1>
          <p>We're here to assist you 24/7.</p>
        </div>

        <div className="support-grid">
          <aside className="contact-card">
            <h3>Get in Touch</h3>
            <div>
              <Mail size={18} />
              <span>
                <strong>Email Us</strong>
                support@funservice.in
              </span>
            </div>
            <div>
              <Clock size={18} />
              <span>
                <strong>Working Hours</strong>
                24/7 (All Days)
              </span>
            </div>
          </aside>

          <section className="chat-card">
            <h3>Chat With Us</h3>
            <div className="chat-window">
              {chat.map((item, index) => (
                <div className={`chat-message ${item.type}`} key={`${item.text}-${index}`}>
                  {item.type === "bot" && <UserRound size={18} />}
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
            <form className="chat-input" onSubmit={sendMessage}>
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Type your message..."
              />
              <button className="btn btn-primary compact" type="submit" aria-label="Send message">
                <Send size={17} />
              </button>
            </form>
          </section>
        </div>

        <section className="faq-section">
          <h2>FAQs</h2>
          {faqs.map((faq, index) => (
            <div className="faq-item" key={faq.question}>
              <button onClick={() => setOpenFaq(openFaq === index ? -1 : index)}>
                <span>{faq.question}</span>
                <ChevronDown className={openFaq === index ? "rotated" : ""} size={18} />
              </button>
              {openFaq === index && <p>{faq.answer}</p>}
            </div>
          ))}
        </section>
      </div>
    </section>
  );
}

export default CustomerSupport;
