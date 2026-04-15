# NEXIS AI Companion — Technical Details

> A deep-dive reference into the multimodal emotion recognition pipeline: model architectures, preprocessing parameters, fusion logic, training configuration, and backend integration.

---

## Table of Contents

1. [Model Architectures](#1-model-architectures)
2. [Preprocessing Pipelines](#2-preprocessing-pipelines)
3. [Fusion Logic](#3-fusion-logic)
4. [Training Hyperparameters & Loss Functions](#4-training-hyperparameters--loss-functions)
5. [Backend Integration Flow](#5-backend-integration-flow)

---

## 1. Model Architectures

### 1.1 Modality-Specific Encoders (Pre-trained, Frozen)

The system uses three pre-trained HuggingFace models as feature extractors. All three models are loaded **once at startup** and shared across all inference calls.

| Modality | Model ID | Library | Output |
|---|---|---|---|
| **Facial Video** | `dima806/facial_emotions_image_detection` | `transformers` (ViT-based) | Per-class softmax probability vector |
| **Speech Audio** | `facebook/wav2vec2-base` | `transformers` (Wav2Vec2) | Raw hidden states (mean + std pooling) |
| **Text** | `j-hartmann/emotion-english-distilroberta-base` | `transformers` (DistilRoBERTa) | Per-class logits → softmax probabilities |
| **Transcription** | `openai/whisper-base` | `openai-whisper` | Raw transcript text from video audio |

```python
# Loaded at module level in predict_emotion.py
face_p = AutoImageProcessor.from_pretrained("dima806/facial_emotions_image_detection")
face_m = AutoModelForImageClassification.from_pretrained("dima806/facial_emotions_image_detection").to(device)

audio_p = Wav2Vec2Processor.from_pretrained("facebook/wav2vec2-base")
audio_m = Wav2Vec2Model.from_pretrained("facebook/wav2vec2-base").to(device)

text_p = AutoTokenizer.from_pretrained("j-hartmann/emotion-english-distilroberta-base")
text_m = AutoModelForSequenceClassification.from_pretrained("j-hartmann/emotion-english-distilroberta-base").to(device)

whisper_model = whisper.load_model("base")
device = "cuda" if torch.cuda.is_available() else "cpu"
```

---

### 1.2 MLP Meta-Classifier (The "Final" Classifier)

The meta-classifier is a **Multi-Layer Perceptron (MLP)** trained using `scikit-learn`, serialized as `metamodels/emotion_model.pkl` and its corresponding label encoder as `metamodels/emotion_encoder.pkl`.

#### Input: 21-Dimensional Feature Vector

The concatenated input vector is a **flat, ordered 21-element list** composed of three 7-element probability distributions over the **unified emotion label set**:

```
UNIFIED_LABELS = ['happy', 'sad', 'angry', 'fearful', 'neutral', 'surprise', 'disgust']
```

| Slice | Source | Dimensions |
|---|---|---|
| `[0:7]`   | Video (facial frame average, normalized) | 7 |
| `[7:14]`  | Audio (Wav2Vec2 hidden state, normalized) | 7 |
| `[14:21]` | Text (DistilRoBERTa softmax, normalized)  | 7 |

**Total: 7 + 7 + 7 = 21 dimensions.**

```python
# From extract_features() in predict_emotion.py — lines 171–175
return (
    [video[label] for label in UNIFIED_LABELS] +    # indices 0–6
    [audio[label] for label in UNIFIED_LABELS] +    # indices 7–13
    [text[label] for label in UNIFIED_LABELS]       # indices 14–20
)
```

#### Inference

```python
# From predict_emotion() — lines 182–190
probs = model.predict_proba([features])[0]
pred_index = np.argmax(probs)
pred_label = le.inverse_transform([pred_index])[0]
confidence = probs[pred_index] * 100
```

The output is the dominant emotion label, its confidence (%), and the full probability distribution across all 7 classes.

---

## 2. Preprocessing Pipelines

### 2.1 Audio Extraction (FFmpeg)

FFmpeg is called directly via `subprocess` (no `shell=True`) to avoid Windows path-quoting issues. Audio is extracted **twice** in the pipeline — once for Whisper transcription and once for Wav2Vec2 feature extraction — using **identical parameters** both times.

```python
# Used in both get_text_from_video() and extract_features() — lines 93–101, 121–129
cmd = [
    "ffmpeg", "-i", str(video_path),
    "-vn",              # Disable video stream
    "-acodec", "pcm_s16le",  # PCM 16-bit signed little-endian
    "-ar", "16000",     # Resample to exactly 16,000 Hz
    "-ac", "1",         # Downmix to mono (1 channel)
    temp_audio_path,
    "-y",               # Overwrite output without prompting
    "-hide_banner",     # Suppress FFmpeg banner
    "-loglevel", "error"  # Suppress all non-error output
]
subprocess.run(cmd, check=True)
```

| Parameter | Value | Reason |
|---|---|---|
| `-acodec` | `pcm_s16le` | Uncompressed PCM — required for `pydub` and Wav2Vec2 |
| `-ar` | `16000` (Hz) | Wav2Vec2 and Whisper are both trained at 16 kHz |
| `-ac` | `1` (mono) | Both models expect single-channel input |

After extraction, `pydub.AudioSegment` reads the `.wav` and converts it to a `numpy.float32` array:

```python
audio_seg = AudioSegment.from_wav(temp_audio_path)
waveform = np.array(audio_seg.get_array_of_samples()).astype(np.float32)
```

The temporary `temp_audio.wav` file is deleted immediately after loading.

---

### 2.2 Video Frame Sampling (MoviePy)

`moviepy.VideoFileClip` is used to extract individual frames from the video at **adaptive, evenly-spaced timestamps**.

```python
# From extract_features() — lines 143–151
with VideoFileClip(video_path) as clip:
    duration = clip.duration
    num_frames = min(10, max(5, int(duration)))
    timestamps = np.linspace(0.1, duration - 0.1, num=num_frames)

    frame_predictions = [
        get_prediction_probabilities(face_m, face_p, Image.fromarray(clip.get_frame(t)), "image")
        for t in timestamps
    ]
```

| Parameter | Value | Logic |
|---|---|---|
| `num_frames` | `max(5, min(10, int(duration)))` | At least 5 frames, at most 10. Scales with video length (e.g. a 3s clip yields 5 frames, a 9s clip yields 9, a 30s clip yields 10). |
| `timestamps` | `np.linspace(0.1, duration - 0.1, num_frames)` | Evenly distributed. Offsets of `0.1s` from both ends avoid blank or cut frames. |
| Frame format | `PIL.Image` from `clip.get_frame(t)` | The ViT image processor expects a PIL image. `get_frame(t)` returns an `np.uint8` RGB array which is then wrapped with `Image.fromarray`. |

The facial probability outputs across all valid frames are **averaged per emotion label** before being fed into the fusion vector:

```python
video_raw = {
    label: np.mean([normalize_probs(p, video_map)[label] for p in valid_predictions])
    for label in UNIFIED_LABELS
}
```

---

### 2.3 Audio Feature Extraction (Wav2Vec2 Pooling)

Wav2Vec2 does not natively output 7 class probabilities. Instead, the `last_hidden_state` from the transformer is **mean-pooled and std-pooled** and concatenated into a single embedding:

```python
# From get_prediction_probabilities() — task_type == "audio" — lines 55–62
inputs = processor(input_data, sampling_rate=16000, return_tensors="pt", padding=True)
with torch.no_grad():
    hidden = model(**inputs).last_hidden_state   # shape: [1, T, 768]

mean = hidden.mean(dim=1)   # shape: [1, 768]
std  = hidden.std(dim=1)    # shape: [1, 768]
emb  = torch.cat([mean, std], dim=1).squeeze().cpu().numpy()  # shape: [1536]

# Only the first 7 dims are extracted to match UNIFIED_LABELS
return {label: float(emb[i]) for i, label in enumerate(UNIFIED_LABELS[:len(emb)])}
```

> **Note**: This treats the first 7 dimensions of the Wav2Vec2 embedding as a proxy for emotion probabilities. These are not semantic emotion probabilities but raw latent activations that the MLP meta-classifier learns to interpret during training.

---

### 2.4 Label Normalization and Remapping

Each modality uses a **different internal label vocabulary**. A `normalize_probs()` function remaps each modality's raw output into the shared `UNIFIED_LABELS` space before renormalization:

```python
text_map = {
    'joy': 'happy', 'sadness': 'sad', 'anger': 'angry', 'fear': 'fearful',
    'neutral': 'neutral', 'surprise': 'surprise', 'disgust': 'disgust'
}
video_map = {e: e for e in UNIFIED_LABELS}  # Identity map (labels already match)
```

After remapping, each modality's distribution is L1-renormalized so the probabilities sum to 1:

```python
def renormalize(probs):
    total = sum(probs.values())
    return {k: v / total for k, v in probs.items()} if total > 0 else probs
```

---

## 3. Fusion Logic

### 3.1 Late Fusion via Concatenation

NEXIS uses **late fusion**: each modality is processed independently into a 7-dimensional probability vector, and these three vectors are **concatenated** to form the 21-dimensional joint feature vector passed to the MLP.

```
Feature Vector = [V₀, V₁, ..., V₆, A₀, A₁, ..., A₆, T₀, T₁, ..., T₆]
                  ─────────────────  ─────────────────  ─────────────────
                  Video (7)           Audio (7)           Text (7)
```

The exact line in `predict_emotion.py` that performs the fusion concatenation:

```python
# Lines 171–175 — the fusion concat
return (
    [video[label] for label in UNIFIED_LABELS] +   # 7 dims
    [audio[label] for label in UNIFIED_LABELS] +   # 7 dims
    [text[label] for label in UNIFIED_LABELS]      # 7 dims
)
```

### 3.2 Confidence-Based Override (Disgust Gate)

A hard override rule bypasses the MLP whenever the text modality detects **disgust with high confidence**:

```python
# Lines 85–86 and 164–169
def confidence_based_override(text_probs):
    return text_probs.get("disgust", 0) >= 0.80

if confidence_based_override(text):
    for label in UNIFIED_LABELS:
        val = 1.0 if label == 'disgust' else 0.0
        audio[label] = val
        video[label] = val
        text[label] = val
```

When this fires, all three modality vectors are replaced with a one-hot `[disgust=1.0]` vector before the MLP receives the feature vector. The MLP thus always outputs `disgust` with near-100% confidence in this case.

---

## 4. Training Hyperparameters & Loss Functions

The MLP meta-classifier was trained offline on the **RAVDESS** dataset (Ryerson Audio-Visual Database of Emotional Speech and Song) with the following configuration. The trained artifacts are stored as serialized scikit-learn objects.

### 4.1 Classifier: scikit-learn MLP

| Hyperparameter | Value / Details |
|---|---|
| **Model type** | `sklearn.neural_network.MLPClassifier` |
| **Input features** | 21 (3 modalities × 7 labels) |
| **Output classes** | 7 (`happy`, `sad`, `angry`, `fearful`, `neutral`, `surprise`, `disgust`) |
| **Loss function** | Cross-entropy (log-loss) — internal to `MLPClassifier` |
| **Activation** | `relu` (default) on hidden layers; `softmax` on output |
| **Serialization** | `joblib.dump()` → `emotion_model.pkl` (≈323 KB) |
| **Label encoding** | `sklearn.preprocessing.LabelEncoder` → `emotion_encoder.pkl` |
| **Reported accuracy** | **~89%** on held-out RAVDESS validation set |

### 4.2 Early Stopping

scikit-learn's `MLPClassifier` supports early stopping via `early_stopping=True`. When enabled:

- A fraction of the training data is held out as an **internal validation set** (default: 10%).
- Training halts when the validation score does not improve for `n_iter_no_change` consecutive iterations (default: 10).
- The best model weights (from the epoch with the highest validation score) are restored at end of training.

This prevents overfitting while minimizing the number of required epochs, which is especially important when training on RAVDESS (which has a relatively small number of actors × recordings).

### 4.3 RAVDESS Dataset Used for Training

| Property | Details |
|---|---|
| Dataset | RAVDESS (24 professional actors, 8 expressed emotions) |
| Mapped labels | 8 original → 7 unified (merged `calm` → `neutral`) |
| Feature generation | All 3 pre-trained encoders run on each RAVDESS clip → 21-dim vector |
| Training target | Ground-truth emotion label from RAVDESS filename convention |

---

## 5. Backend Integration Flow

### 5.1 End-to-End Request Flow

```
User Browser
  └─► POST /check-in/multimodal (multipart: video_file + text_input)
        │
        ▼
  checkin.py → create_multimodal_checkin()
        │  1. Save video to backend/uploads/<uuid>.<ext>
        │  2. Insert MoodEntry(status=uploaded) into PostgreSQL
        │  3. Return HTTP 202 Accepted immediately
        │  4. Schedule background task
        │
        ▼  (non-blocking, FastAPI BackgroundTask)
  _run_analysis_in_background(entry_id, file_path, text_input)
        │  Opens its own SQLAlchemy Session (thread-safe)
        │
        ▼
  predict_emotion(video_path, text_input)             ← utils/predict_emotion.py
        │
        ├─ [text_input empty?] → whisper_model.transcribe() via ffmpeg WAV
        │
        ├─ extract_features(video_path, text_input)
        │     ├─ ffmpeg: extract mono 16kHz PCM WAV → temp_audio.wav
        │     ├─ pydub: WAV → numpy float32 waveform
        │     ├─ Wav2Vec2: waveform → 7-dim audio vector
        │     ├─ DistilRoBERTa: text → 7-dim text vector
        │     ├─ MoviePy: sample 5–10 frames from video
        │     ├─ ViT: each frame → emotion probs → average → 7-dim video vector
        │     ├─ normalize + renormalize all three vectors
        │     ├─ disgust-gate override (if text disgust ≥ 0.80)
        │     └─ concatenate → 21-dim feature vector
        │
        └─ MLP.predict_proba([features]) → dominant emotion + confidence
              │
              ▼
  _run_analysis_in_background (continued)
        │  Update MoodEntry: emotion, confidence, probabilities, status=analyzed
        │  If emotion in {sad, angry, fearful, disgust}:
        │     Create Alert row (urgency=High for fearful/angry, else Medium)
        │
        ▼
  PostgreSQL (models.MoodEntry, models.Alert)
        │
        ▼
  GET /check-in/history    → returns all entries for the current user
  GET /dashboard/summary   → latest emotion, trend, alert count
  GET /dashboard/weekly-report → 14-day aggregate + PHQ-9 risk score
```

### 5.2 Non-Blocking Design

The endpoint returns `HTTP 202 Accepted` immediately after saving the file and creating the `MoodEntry` row with `status=uploaded`. The heavy ML inference workload runs in **its own thread** via `FastAPI.BackgroundTasks`, which prevents blocking the ASGI event loop. The background task opens its own `SQLAlchemy` session (via `SessionLocal()`) to remain thread-safe, independent of the request's session.

### 5.3 Status Machine

Each `MoodEntry` progresses through three states:

```
uploaded  →  analyzed
   └──────→  failed
```

If `predict_emotion()` raises an exception, the entry is set to `status=failed` and `analysis_error` stores the traceback message for debugging.

### 5.4 Alert Generation Logic

Alerts are created automatically when the dominant emotion falls in the **negative emotions set**:

```python
NEGATIVE_EMOTIONS = {"sad", "angry", "fearful", "disgust"}

urgency = (
    AlertUrgency.high    # fearful or angry
    if emotion.lower() in {"fearful", "angry"}
    else AlertUrgency.medium  # sad or disgust
)
```

### 5.5 14-Day Risk Scoring (Dashboard)

The `aggregate_last_14_days()` function computes a **mental-state distress score (0–100)** per check-in entry:

```python
# From aggregation.py — lines 24–27
daily_score = (
    0.7 * negative_prob +     # 70% weight: sum of all negative emotion probs
    0.3 * (1 - conf)          # 30% weight: uncertainty penalty (low confidence = higher risk)
)
```

The weekly risk composite (in `dashboard.py`) further blends the 14-day average with the PHQ-9 score if available:

```python
# With PHQ-9 available:
risk = 0.5 * avg_score + 0.3 * (neg_ratio * 100) + 0.2 * phq_norm

# Without PHQ-9:
risk = 0.6 * avg_score + 0.4 * (neg_ratio * 100)
```

---

## Key Files Reference

| File | Purpose |
|---|---|
| [`backend/utils/predict_emotion.py`](backend/utils/predict_emotion.py) | Full ML pipeline: encoders, extraction, fusion, MLP inference |
| [`backend/routes/checkin.py`](backend/routes/checkin.py) | API endpoints, background task scheduling, alert creation |
| [`backend/routes/dashboard.py`](backend/routes/dashboard.py) | Dashboard summary, weekly report, risk scoring |
| [`backend/utils/aggregation.py`](backend/utils/aggregation.py) | 14-day distress score and mood statistics |
| [`backend/models.py`](backend/models.py) | SQLAlchemy ORM: `MoodEntry`, `Alert`, `WeeklyReport`, etc. |
| [`backend/metamodels/emotion_model.pkl`](backend/metamodels/emotion_model.pkl) | Trained MLP meta-classifier (~323 KB) |
| [`backend/metamodels/emotion_encoder.pkl`](backend/metamodels/emotion_encoder.pkl) | Label encoder for MLP output classes |
| [`backend/requirements.txt`](backend/requirements.txt) | All Python dependencies with pinned versions |
