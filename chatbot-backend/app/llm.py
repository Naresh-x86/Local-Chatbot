import time
from app.chat_store import load_chat_messages

# Editable scripted responses
first_response = "This image shows a basic block diagram of a pulse radar system, which appears to be used for automotive or vehicular applications, given the mention of \"transmitter\" and \"amplifier.\" The diagram consists of several blocks connected by arrows, indicating the flow of data or signal processing. Here's a breakdown of what each block represents:\n\n1. **Amplifier**: This is typically used to increase the amplitude (or power level) of a signal, which in this case would be the pulse transmitted from the transmitter.\n\n2. **Video/RF Switch**: This device switches between the video and radio frequency (RF) outputs based on different operating modes of the radar system.\n\n3. **Duplexer**: A duplexer is used to control the flow of data or signal in both directions of the pulse radar system, ensuring that the transmitted signal is not mixed with the received signal and vice versa.\n\n4. **Transmitter**: This is where the radar pulses are generated. It sends out a signal at regular intervals (these intervals can vary based on the application).\n\n5. **Low Noise Amplifier (LNA)**: An LNA is used to amplify weak signals that arrive from the direction of interest. In this context, it would amplify the received pulse radar signal.\n\n6. **Video/RF Switch**: This switch directs the output signal to either the video output for processing or the RF output for further transmission.\n\n7. **IF Amplifier**: Intermediate Frequency (IF) refers to a specific frequency band used in radio communications. The IF amplifier likely increases the amplitude of the signal after it has been processed by the LNA but before it's ready for display or processing.\n\n8. **Video/RF Switch**: This switch is similar to the one above, but it may serve a different purpose in this part of the system. It could be directing the signal to the video output or to an additional amplifier or filter.\n\n9. **Local Oscillator (LO)**: In a pulse radar system, the LO provides a known signal to mix with the received signal, enabling the system to determine its frequency and time of arrival.\n\n10. **Mixer**: This device combines two signals for further processing or display. The local oscillator is mixed with the received signal to produce intermediate frequency signals.\n\nThe arrows indicate the direction of data flow from one block to another, starting from the transmitter, through the various stages of processing and amplification, and finally reaching the video output where the processed signal can be displayed or used for further analysis.\n\nThis kind of system is commonly found in applications like adaptive cruise control (ACC) systems in vehicles, which use radar technology to monitor the distance between the vehicle and other objects on the road."
second_response = "The <b>Low Noise Amplifier (LNA)</b> is a critical component in pulse radar systems, designed to <em>amplify very weak incoming signals</em> while introducing minimal additional noise. Positioned early in the receiver chain, it ensures that the system maintains a high <b>signal-to-noise ratio (SNR)</b>, which is essential for accurately detecting and interpreting reflected signals. By preserving the integrity of weak echoes, the LNA significantly enhances the radar system’s <b>range, sensitivity, and overall performance</b>, making it fundamental to reliable signal processing in a variety of radar applications. "
third_response = "Here is an image for 'Low Noise Amplifier diagram'."

# Customizable delays in seconds
first_delay = 1.0
second_delay = 2.0
third_delay = 1.5

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
            "image": "https://www.researchgate.net/publication/344389286/figure/fig1/AS:11431281176205410@1690064403004/Low-noise-amplifier-LNA-circuit-structure-with-significant-parts-separation.png"
        }
    else:
        # After three scripted responses, fallback to a default message
        return {"text": "No more scripted responses. Please contact support.", "image": None}
