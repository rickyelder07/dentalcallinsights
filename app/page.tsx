/**
 * Home page for DentalCallInsights
 * Landing page with feature overview and call-to-action
 */

import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Transform Dental Call Recordings into
            <span className="text-primary-600"> Actionable Insights</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Upload call recordings, get instant transcripts, summaries, sentiment analysis, 
            and searchable embeddings. Make data-driven decisions to improve your practice.
          </p>
          <div className="flex justify-center gap-4">
            <Link 
              href="/upload"
              className="bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
            >
              Upload Your First Call
            </Link>
            <Link 
              href="/library"
              className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold border-2 border-primary-600 hover:bg-primary-50 transition"
            >
              Browse Library
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-20 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            title="Transcription"
            description="Automatic speech-to-text conversion of all call recordings with high accuracy."
            icon="📝"
          />
          <FeatureCard
            title="Summaries"
            description="AI-generated summaries highlighting key points and action items from each call."
            icon="📋"
          />
          <FeatureCard
            title="Sentiment Analysis"
            description="Understand patient emotions and satisfaction levels during interactions."
            icon="😊"
          />
          <FeatureCard
            title="Smart Search"
            description="Vector embeddings enable semantic search across all your call history."
            icon="🔍"
          />
        </div>

        {/* Getting Started Section */}
        <div className="mt-20 bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Step
              number="1"
              title="Upload Calls"
              description="Drop MP3 files with optional metadata (patient ID, call type, date)"
            />
            <Step
              number="2"
              title="AI Processing"
              description="Automatic transcription, summarization, and sentiment analysis"
            />
            <Step
              number="3"
              title="Insights & Search"
              description="Browse, search, and analyze all processed calls in your library"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ 
  title, 
  description, 
  icon 
}: { 
  title: string
  description: string
  icon: string 
}) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}

function Step({ 
  number, 
  title, 
  description 
}: { 
  number: string
  title: string
  description: string 
}) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-600 text-white font-bold text-xl mb-4">
        {number}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}
