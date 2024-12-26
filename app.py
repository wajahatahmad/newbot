from flask import Flask, request, jsonify
import os

app = Flask(__name__)

@app.route("/whatsapp", methods=['POST'])
def whatsapp_reply():
    data = request.json
    if 'message' in data:
        message = data['message']
        # Assuming the Node.js script is running and listening for messages
        os.system(f"echo '{message}' | node send_message.js")
    return jsonify({"status": "OK"})

if __name__ == '__main__':
    app.run(debug=True)