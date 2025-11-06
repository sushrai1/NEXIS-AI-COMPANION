import torch, torchaudio, subprocess, os, numpy as np, joblib, whisper
from PIL import Image
from moviepy import VideoFileClip      
from pathlib import Path
from pydub import AudioSegment
import traceback
from transformers import (
    AutoImageProcessor, AutoModelForImageClassification,
    Wav2Vec2Processor, Wav2Vec2Model,
    AutoTokenizer, AutoModelForSequenceClassification
)

device = "cuda" if torch.cuda.is_available() else "cpu"

# Load models once
face_p = AutoImageProcessor.from_pretrained("dima806/facial_emotions_image_detection")
face_m = AutoModelForImageClassification.from_pretrained("dima806/facial_emotions_image_detection").to(device)

audio_p = Wav2Vec2Processor.from_pretrained("facebook/wav2vec2-base")
audio_m = Wav2Vec2Model.from_pretrained("facebook/wav2vec2-base").to(device)

text_p = AutoTokenizer.from_pretrained("j-hartmann/emotion-english-distilroberta-base")
text_m = AutoModelForSequenceClassification.from_pretrained("j-hartmann/emotion-english-distilroberta-base").to(device)

model = joblib.load("metamodels/emotion_model.pkl")
le = joblib.load("metamodels/emotion_encoder.pkl")

UNIFIED_LABELS = ['happy', 'sad', 'angry', 'fearful', 'neutral', 'surprise', 'disgust']
text_map = {
    'joy': 'happy', 'sadness': 'sad', 'anger': 'angry', 'fear': 'fearful',
    'neutral': 'neutral', 'surprise': 'surprise', 'disgust': 'disgust'
}
video_map = {e: e for e in UNIFIED_LABELS}


def normalize_probs(raw_probs, label_map):
    out = {label: 0.0 for label in UNIFIED_LABELS}
    for k, v in raw_probs.items():
        mapped = label_map.get(k.lower())
        if mapped:
            out[mapped] += v
    return out


def renormalize(probs):
    total = sum(probs.values())
    return {k: v / total for k, v in probs.items()} if total > 0 else probs


def get_prediction_probabilities(model, processor, input_data, task_type):
    try:
        if task_type == "audio":
            inputs = processor(input_data, sampling_rate=16000, return_tensors="pt", padding=True)
            inputs = {k: v.to(device) for k, v in inputs.items()}
            with torch.no_grad():
                hidden = model(**inputs).last_hidden_state
            mean = hidden.mean(dim=1)
            std = hidden.std(dim=1)
            emb = torch.cat([mean, std], dim=1).squeeze().cpu().numpy()
            return {label: float(emb[i]) for i, label in enumerate(UNIFIED_LABELS[:len(emb)])}

        elif task_type == "text":
            inputs = processor(input_data, return_tensors="pt", truncation=True, padding=True).to(device)
            with torch.no_grad():
                logits = model(**inputs).logits
            probs = torch.nn.functional.softmax(logits, dim=-1).cpu().numpy()[0]
            labels = model.config.id2label
            return {labels[i]: float(probs[i]) for i in range(len(probs))}

        else:  # IMAGE
            inputs = processor(images=input_data, return_tensors="pt").to(device)
            with torch.no_grad():
                logits = model(**inputs).logits
            probs = torch.nn.functional.softmax(logits, dim=-1).cpu().numpy()[0]
            labels = model.config.id2label
            return {labels[i]: float(probs[i]) for i in range(len(probs))}

    except Exception as e:
        print(f"Error in {task_type} model: {e}")
        return {}


def confidence_based_override(text_probs):
    return text_probs.get("disgust", 0) >= 0.80


def extract_features(video_path, text_input):
    video_path = str(Path(video_path))           # ✅ Normalize safe string path
    temp_audio_path = "temp_audio.wav"

    # ✅ Windows-safe ffmpeg call (NO shell quoting problems)
    try:
        subprocess.run([
            "ffmpeg", "-i", video_path,
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            temp_audio_path,
            "-y", "-hide_banner", "-loglevel", "error"
        ], check=True)
    except Exception as e:
        print("\n❌ FFmpeg failed while extracting audio!\n")
        print("Video path:", video_path)
        traceback.print_exc()
        raise

    audio_seg = AudioSegment.from_wav(temp_audio_path)
    waveform = np.array(audio_seg.get_array_of_samples()).astype(np.float32)
    os.remove(temp_audio_path)

    audio_raw = get_prediction_probabilities(audio_m, audio_p, waveform, "audio")
    text_raw = get_prediction_probabilities(text_m, text_p, text_input, "text")

    with VideoFileClip(video_path) as clip:
        duration = clip.duration
        num_frames = min(10, max(5, int(duration)))
        timestamps = np.linspace(0.1, duration - 0.1, num=num_frames)

        frame_predictions = [
            get_prediction_probabilities(face_m, face_p, Image.fromarray(clip.get_frame(t)), "image")
            for t in timestamps
        ]

    valid_predictions = [p for p in frame_predictions if p]

    video_raw = {
        label: np.mean([normalize_probs(p, video_map)[label] for p in valid_predictions])
        for label in UNIFIED_LABELS
    }

    audio = renormalize(audio_raw)
    text = renormalize(normalize_probs(text_raw, text_map))
    video = renormalize(normalize_probs(video_raw, video_map))

    if confidence_based_override(text):
        for label in UNIFIED_LABELS:
            val = 1.0 if label == 'disgust' else 0.0
            audio[label] = val
            video[label] = val
            text[label] = val

    return (
        [video[label] for label in UNIFIED_LABELS] +
        [audio[label] for label in UNIFIED_LABELS] +
        [text[label] for label in UNIFIED_LABELS]
    )


def predict_emotion(video_path, text_input):
    features = extract_features(video_path, text_input)
    probs = model.predict_proba([features])[0]
    pred_index = np.argmax(probs)
    pred_label = le.inverse_transform([pred_index])[0]
    confidence = probs[pred_index] * 100

    return {
        "predicted_emotion": pred_label,
        "confidence": round(confidence, 2),
        "probabilities": {le.classes_[i]: float(probs[i]) for i in range(len(probs))}
    }
