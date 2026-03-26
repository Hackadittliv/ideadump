import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100dvh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "#07071a", color: "#ddd", padding: 32, textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💥</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 18, color: "#fff" }}>Något gick fel</h2>
          <p style={{ margin: "0 0 24px", fontSize: 14, color: "#555", maxWidth: 320, lineHeight: 1.6 }}>
            Appen kraschade oväntat. Dina idéer är säkra i localStorage.
          </p>
          <p style={{ margin: "0 0 24px", fontSize: 11, color: "#333", fontFamily: "monospace", maxWidth: 360, wordBreak: "break-word" }}>
            {this.state.error.message}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              background: "#00F0FF18", border: "1px solid #00F0FF44",
              borderRadius: 10, padding: "10px 24px", color: "#00F0FF",
              fontSize: 14, cursor: "pointer",
            }}
          >
            Försök igen
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
