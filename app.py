from flask import Flask, render_template, request, flash, redirect, url_for, jsonify
import os
import logging
import requests

app = Flask(__name__)
app.secret_key = "replace_with_a_super_secret_key"

# Basic logging setup
logging.basicConfig(level=logging.INFO)

def send_contact_email(name: str, email: str, message: str) -> None:
    """Send a contact form email via MailerSend HTTP API.

    Env config:
    - MAILERSEND_API_TOKEN (required)
    - MAILERSEND_SENDER_EMAIL (default: support@turbolab.com.au)
    - MAILERSEND_SENDER_NAME (default: TurboLab Support)
    - CONTACT_TO_EMAIL (default: hello@turbolab.com.au)
    - EMAIL_TIMEOUT (default: 10s)
    """

    api_token = os.environ.get("API_TOKEN")
    if not api_token:
        logging.error("Missing MAILERSEND_API_TOKEN env var.")
        raise RuntimeError("MailerSend API token is not configured.")
    



    sender_email = "support@turbolab.com.au"
    sender_name = "TurboLab Support"
    to_email = "hello@turbolab.com.au"
    timeout = float("10")





    text_body = (
        "New contact form submission:\n\n"
        f"Name: {name}\n"
        f"Email: {email}\n\n"
        "Message:\n\n"
        f"{message}\n"
    )

    html_body = (
        "<p><strong>New contact form submission</strong></p>"
        f"<p><strong>Name:</strong> {name}<br>"
        f"<strong>Email:</strong> {email}</p>"
        f"<p>{message.replace('\n', '<br>')}</p>"
    )

    payload = {
        "from": {"email": sender_email, "name": sender_name},
        "to": [{"email": to_email, "name": "TurboLab"}],
        "reply_to": {"email": email, "name": name or "Website Visitor"},
        "subject": "New Contact Form Submission",
        "text": text_body,
        "html": html_body,
    }

    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json",
    }

    try:
        resp = requests.post(
            "https://api.mailersend.com/v1/email",
            headers=headers,
            json=payload,
            timeout=timeout,
        )
        resp.raise_for_status()
        
    except requests.RequestException as e:
        resp_text = getattr(e.response, "text", "") if hasattr(e, "response") else ""
        logging.exception("MailerSend API error. Status/Text: %s %s", getattr(e, "response", None), resp_text)
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
