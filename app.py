from flask import Flask, render_template, request, flash, redirect, url_for, jsonify
import os
import ssl
import smtplib
import logging
from email.message import EmailMessage

app = Flask(__name__)
app.secret_key = "replace_with_a_super_secret_key"

# Basic logging setup
logging.basicConfig(level=logging.INFO)

def send_contact_email(name: str, email: str, message: str) -> None:
    """Send a contact form email via GoDaddy SMTP.

    Requirements:
    - SMTP host/port/user/pass from environment variables
    - From header: "TurboLab Support <support@turbolab.com.au>"
    - Envelope sender: EMAIL_USER (for deliverability)
    - To: hello@turbolab.com.au
    - Reply-To: customer's email
    """

    host = os.environ.get("EMAIL_HOST", "smtpout.secureserver.net")
    port = int(os.environ.get("EMAIL_PORT", "465"))
    user = os.environ.get("EMAIL_USER")
    password = os.environ.get("EMAIL_PASS")
    timeout = float(os.environ.get("EMAIL_TIMEOUT", "10"))
 

    if not user or not password:
        logging.error("Email credentials are missing (EMAIL_USER/EMAIL_PASS).")
        raise RuntimeError("Email credentials are not configured.")

    to_addr = "hello@turbolab.com.au"

    # Build email
    msg = EmailMessage()
    msg["Subject"] = "New Contact Form Submission"
    msg["From"] = "TurboLab Support <support@turbolab.com.au>"
    msg["To"] = to_addr
    if email:
        msg["Reply-To"] = email

    body = (
        "New contact form submission:\n\n"
        f"Name: {name}\n"
        f"Email: {email}\n\n"
        "Message:\n\n"
        f"{message}\n"
    )
    msg.set_content(body)

    # Send via SSL SMTP
    context = ssl.create_default_context()
    try:
        with smtplib.SMTP_SSL(host, port, context=context, timeout=timeout) as server:
            server.login(user, password)
            server.send_message(msg, from_addr=user, to_addrs=[to_addr])
    except Exception as e:
        logging.exception("SMTP ERROR")
        raise

 

@app.route("/api/contact", methods=["POST"]) 
def api_contact():
    """Accept contact form via AJAX without page refresh.

    Returns quickly and sends the email in a background thread to avoid latency.
    """
    data = request.get_json(silent=True) or request.form
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    message = (data.get("message") or "").strip()

    if not name or not email or not message:
        return jsonify({"ok": False, "error": "Please fill in all fields."}), 400

    # Send synchronously so response reflects actual outcome
    try:
        send_contact_email(name, email, message)
    except Exception:
        return jsonify({
            "ok": False,
            "error": "We couldn't send your message right now. Please try again later."
        }), 500
    return jsonify({
        "ok": True,
        "message": "Thanks! Your message has been received."
    }), 200

@app.route("/", methods=["GET", "POST"])
def home():
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip()
        message = request.form.get("message", "").strip()

        if not name or not email or not message:
            flash("Please fill in all fields.", "error")
            return redirect(url_for("home"))

        # Attempt to send email via SMTP
        try:
            send_contact_email(name, email, message)
            flash("Thanks! Your message has been received. We’ll get back to you shortly.", "success")
        except Exception:
            flash("Sorry, we couldn't send your message right now. Please try again later.", "error")
        return redirect(url_for("home"))

    return render_template("index.html")

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
