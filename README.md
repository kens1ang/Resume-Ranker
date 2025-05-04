# Resume Ranker: AI-Powered Recruitment Automation System

Resume Ranker is an intelligent recruitment automation platform that leverages advanced NLP and deep learning techniques to streamline the candidate evaluation process. It matches job applicants to job descriptions with explainable and customizable scoring, helping recruiters make faster and more informed hiring decisions.

---

## 🚀 Key Features

### 🔧 Job Management
- **Create Jobs**: Define job title, work type, skills, education, and responsibilities
- **Upload Jobs**: Auto-extract key requirements from job descriptions using LLMs
- **Edit Jobs**: Modify job details at any time
- **Job Listings Database**: Centralized management of open positions

### 📄 Resume Processing
- **Batch Resume Upload**: Upload multiple PDF resumes at once
- **Text Extraction**: Convert PDFs to structured text via a custom pipeline
- **Named Entity Recognition (NER)**: Extract skills, job titles, degrees, institutions, and certifications
- **Work Experience Extraction**: Use LLMs (DeepSeek Chat via OpenRouter) to summarize professional responsibilities

### 🤖 AI-Powered Candidate Evaluation
- **Semantic Similarity Scoring**: Use sentence embeddings (MiniLM) to assess match quality across:
  - Skills
  - Education
  - Responsibilities
- **Categorical Fit Classification**: Classify candidates as:
  - `Good Fit`
  - `Potential Fit`
  - `No Fit`
- **Fusion Scoring System**:
  - Combines semantic and classification scores
  - Adjusts based on model agreement and confidence
- **Custom Weightings**: Set weight importance for each matching category

### 🧠 Explainable AI (XAI)
- **Score Attribution**: See which features influenced scores using SHAP-inspired visualizations
- **Decision Transparency**: View breakdown of all components contributing to each fit score
- **Edge Case Detection**: Highlight inconsistent model outputs for manual review
- **Candidate Comparison**: Compare scores between candidates and against role expectations

---

## 🧱 Technical Architecture

### ⚙️ Frontend
- **Framework**: [Next.js](https://nextjs.org/) (TypeScript)
- **UI**: [Shadcn UI](https://ui.shadcn.com/) + Tailwind CSS
- **State Management**: React Hooks
- **Database**: Firebase Firestore

### 🛠️ Backend
- **Server**: FastAPI (Python)
- **NLP Pipelines**:
  - Semantic Similarity: `all-MiniLM-L6-v2` via SentenceTransformers
  - Fit Classification: `ProsusAI/FinBERT` fine-tuned on resume–job pairs
  - Resume Summarization & Annotation: OpenRouter API using DeepSeek Chat
- **PDF Parsing**: PyPDF2 + custom text extraction and filtering

---

## 📦 Getting Started

### ✅ Prerequisites
- Node.js 16+
- Python 3.8+
- Firebase Project with Firestore enabled
- OpenRouter API key (https://openrouter.ai)

---

## 📚 License
This project is built for educational and research purposes.

---

## 🙌 Acknowledgements
- [OpenRouter](https://openrouter.ai) for free LLM API routing
- [Hugging Face](https://huggingface.co) for providing pretrained models and datasets
- [SentenceTransformers](https://www.sbert.net/)
- [spaCy](https://spacy.io)
- [ProsusAI/FinBERT](https://huggingface.co/ProsusAI/finbert)
