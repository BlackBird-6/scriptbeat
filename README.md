# ScriptBeat

**ScriptBeat** is an intelligent, visual narrative pacing engine designed for screenwriters, editors, and directors. By leveraging high-speed LLM analysis, ScriptBeat processes your screenplays scene-by-scene to generate an interactive map of your story's emotional arc and narrative tension.

## Features

- **Automated Scene Parsing**: Upload standard screenplay PDFs or TXTs, and ScriptBeat will automatically chunk and identify distinct scenes using advanced formatting recognition.
- **Narrative Tension Graph**: View a dynamically generated "Pulse Line" chart representing the rising and falling tension of your story.
- **Adjustable Smoothing**: Real-time tension smoothing slider lets you compute emotional carryover between scenes to view broader narrative arcs.
- **Emotion Heatmap**: A color-coded timeline strip that visualizes the dominant emotion (Suspense, Joy, Fear, Anger, etc.) of every scene.
- **Deep AI Analysis**: Powered by the Groq API (`llama-3.1-8b-instant`), each scene is analyzed to provide a narrative summary, primary emotion, and a specific justification for the assigned tension score using dialogue and action snippet citations.
- **Interactive UI**: Click anywhere on the pulse line or emotion heatmap to instantly inspect the detailed AI reasoning for that specific scene in the sidebar.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Components**: UI powered by [Lucide React](https://lucide.dev/)
- **Charts**: Interactive graphs via [Recharts](https://recharts.org/)
- **AI Integration**: Hardware-accelerated LLM inference via [Groq SDK](https://groq.com/)
- **PDF Extraction**: `pdf-parse` (with Edge/Serverless Server polyfills)

## Getting Started

### Prerequisites

You will need a [Groq API Key](https://console.groq.com/keys) to power the LLM analysis.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/scriptbeat.git
   cd scriptbeat
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables:
   Create a `.env.local` file in the root of your project and add your Groq API key:
   ```text
   GROQ_API_KEY=your_groq_api_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`.

## How to Use

1. Click **"Load Script"** to upload a PDF or TXT file, or use one of the built-in examples.
2. Click **"Generate Analysis"** to stream the scene-by-scene analysis.
3. Use the **Smoothness** slider to blend the tension curve.
4. Click on chart peaks, valleys, or heatmap segments to explore the AI feedback in the right-hand inspection panel.
5. Need a quick refresher? Just click the **`?` Help** icon at the top of the dashboard.

## License

This project is open-source and available under the MIT License.
