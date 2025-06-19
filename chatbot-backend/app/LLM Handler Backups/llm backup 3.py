import time
from app.chat_store import load_chat_messages

# Editable scripted responses
first_response = (
    'If an error appears on the display about <b>video playback</b>, <b>video selection</b>, or <b>display settings</b>, '
    'refer to <b>Part 6B(2), Section 9, Chapter 1</b> for troubleshooting steps and technical guidance. '
    'This section has step-by-step instructions for issues like <i>signal loss</i>, <i>synchronization errors</i>, '
    '<i>improper configuration</i>, or <i>hardware connection faults</i>. It also explains <b>error codes</b>, '
    'suggests diagnostic checks, and lists corrective actions to restore video function. Using this section helps address '
    'underlying video problems systematically and per manufacturer standards.'
)
second_response = (
    'The flowchart shows to check <b>Part 6B(2), Section 9, Chapter 1</b> if:'
    '<br>'
    '<ul>'
    '<li>- The <b>antenna does not rotate normally</b> or is unstable. This may mean issues with the drive, stabilization, or signal processing.</li>'
    '<br>'
    '<li>- A <b>rotating sweep</b> appears on the display, suggesting video sync, timing, or input signal errors are present.</li>'
    '</ul>'
    '<br>'
    'This section gives diagnostic steps and actions for video issues and proper sync between antenna and display.'
)
third_response = (
    'Per <b>safety instructions in Chapter 2</b>, follow these when handling <b>vacuum tubes</b> to avoid injury:'
    '<ul>'
    '<li>- <b>Store safely:</b> Keep tubes in original packaging to prevent damage and implosion.</li>'
    '<br>'
    '<li>- <b>Wear gear:</b> Use leather gloves, face mask, and apron for protection.</li>'
    '<br>'
    '<li>- <b>Handle gently:</b> Don\'t lift tubes by the neck or fragile parts.</li>'
    '<br>'
    '<li>- <b>Discharge first:</b> If used in high-voltage, discharge several times before touching.</li>'
    '<br>'
    '<li>- <b>Soft surface:</b> Place tubes on cushioned surfaces to avoid cracks.</li>'
    '<br>'
    '<li>- <b>Position CRTs:</b> If possible, keep CRT screens facing down to reduce risk.</li>'
    '<br>'
    '<li>- <b>Transport securely:</b> Use empty original packaging to move used tubes for disposal.</li>'
    '</ul>'
)
fourth_response = (
    'The System Parameter Test checks if key system parameters—like <b>frequencies</b>, <b>timing signals</b>, and controls—are within limits. '
    'It confirms system operation after maintenance or during troubleshooting. '
    'This test helps find faults and ensures all parts work, as described in <b>Section 3.2, Chapter 4, Paragraph 3.17</b>.'
)

# Customizable delays in seconds
first_delay = 8.0
second_delay = 5.0
third_delay = 15.0
fourth_delay = 5.0

def generate_llm_response(prompt: str, model_id: str, username: str, chat_id: str, attachment_meta=None) -> dict:
    """
    Scripted LLM: Returns pre-written responses in order, with custom delays.
    """
    # Load chat history to determine which scripted response to send
    all_messages = load_chat_messages(username, chat_id)
    # Count previous bot responses in this chat
    bot_turns = [m for m in all_messages if m.get("sender") == "bot"]
    turn = len(bot_turns)

    if turn == 0:
        time.sleep(first_delay)
        return {"text": str(first_response), "image": None}
    elif turn == 1:
        time.sleep(second_delay)
        return {"text": str(second_response), "image": None}
    elif turn == 2:
        time.sleep(third_delay)
        return {
            "text": str(third_response),
            "image": None
        }
    elif turn == 3:
        time.sleep(fourth_delay)
        return {
            "text": str(fourth_response),
            "image": None
        }
    else:
        # After four scripted responses, fallback to a default message
        return {"text": "No more scripted responses. Please contact support.", "image": None}
