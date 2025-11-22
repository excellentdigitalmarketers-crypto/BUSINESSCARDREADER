import React, { useState, useCallback } from 'react';
import { AppView, BusinessCardData, ScanHistoryItem } from './types';
import { analyzeBusinessCard } from './services/geminiService';
import CameraCapture from './components/CameraCapture';
import DataEditor from './components/DataEditor';
import ProcessingView from './components/ProcessingView';
import { 
  Camera, 
  Upload, 
  Send, 
  Download, 
  PlusCircle, 
  History, 
  ArrowLeft, 
  CheckCircle2,
  Smartphone,
  AlertCircle
} from 'lucide-react';

// Default empty state
const initialData: BusinessCardData = {
  fullName: '',
  jobTitle: '',
  company: '',
  phone: '',
  email: '',
  website: '',
  address: '',
  notes: ''
};

function App() {
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [scannedData, setScannedData] = useState<BusinessCardData>(initialData);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [whatsappRecipient, setWhatsappRecipient] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // --- Handlers ---

  const handleImageCapture = async (base64Image: string) => {
    setView(AppView.PROCESSING);
    setErrorMsg('');
    try {
      const data = await analyzeBusinessCard(base64Image);
      setScannedData(data);
      setView(AppView.RESULT);
      // Also save to history automatically
      const historyItem: ScanHistoryItem = {
        ...data,
        id: Date.now().toString(),
        timestamp: Date.now()
      };
      setScanHistory(prev => [historyItem, ...prev]);
    } catch (err: any) {
      console.error("Scan failed:", err);
      let userMessage = "Failed to read the card. Please try again with better lighting.";

      // Map service errors to user-friendly messages
      switch (err.message) {
        case "API_KEY_ERROR":
          userMessage = "System Configuration Error: Invalid API Key. Please check your setup.";
          break;
        case "NETWORK_ERROR":
          userMessage = "Network Error: Please check your internet connection and try again.";
          break;
        case "SERVER_BUSY":
          userMessage = "Service Busy: The AI service is currently experiencing high traffic. Please try again in a moment.";
          break;
        case "SAFETY_BLOCK":
          userMessage = "Content Blocked: The image could not be processed due to safety filters. Please try a different angle.";
          break;
        case "EMPTY_RESPONSE":
          userMessage = "No Data Found: The AI could not detect a business card. Please ensure the image is clear and centered.";
          break;
        case "PARSE_ERROR":
          userMessage = "Extraction Failed: Could not interpret the text on the card. Please try taking a sharper photo.";
          break;
        case "UNKNOWN_ERROR":
        default:
          userMessage = "Something went wrong. Please ensure the card is well-lit and the text is legible.";
          break;
      }

      setErrorMsg(userMessage);
      setView(AppView.HOME);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        handleImageCapture(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDataChange = (field: keyof BusinessCardData, value: string) => {
    setScannedData(prev => ({ ...prev, [field]: value }));
    
    // Update the history item if it exists (most recent)
    setScanHistory(prev => {
      if (prev.length === 0) return prev;
      const newHistory = [...prev];
      newHistory[0] = { ...newHistory[0], [field]: value };
      return newHistory;
    });
  };

  const sendToWhatsApp = () => {
    // Format message
    const text = `*New Business Card Contact*\n\n` +
      `*Name:* ${scannedData.fullName}\n` +
      `*Role:* ${scannedData.jobTitle}\n` +
      `*Company:* ${scannedData.company}\n` +
      `*Phone:* ${scannedData.phone}\n` +
      `*Email:* ${scannedData.email}\n` +
      `*Web:* ${scannedData.website}\n` +
      `*Address:* ${scannedData.address}\n\n` +
      `_Scanned with BizCard AI_`;

    const encodedText = encodeURIComponent(text);
    
    const targetNumber = whatsappRecipient.replace(/[^0-9]/g, '');
    
    if (!targetNumber) {
      alert("Please enter a recipient WhatsApp number below.");
      return;
    }

    window.open(`https://wa.me/${targetNumber}?text=${encodedText}`, '_blank');
  };

  const exportToCSV = () => {
    if (scanHistory.length === 0) return;

    // Helper to escape CSV values correctly (handles commas and quotes)
    const escapeCsv = (str: string) => {
      if (!str) return '';
      // If the string contains comma, quote or newline, wrap in quotes and double internal quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = ['Full Name', 'Title', 'Company', 'Phone', 'Email', 'Website', 'Address', 'Notes', 'Timestamp'];
    const csvContent = [
      headers.join(','),
      ...scanHistory.map(item => [
        escapeCsv(item.fullName),
        escapeCsv(item.jobTitle),
        escapeCsv(item.company),
        escapeCsv(item.phone),
        escapeCsv(item.email),
        escapeCsv(item.website),
        escapeCsv(item.address),
        escapeCsv(item.notes),
        escapeCsv(new Date(item.timestamp).toLocaleString())
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `business_cards_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Views ---

  if (view === AppView.CAMERA) {
    return <CameraCapture onCapture={handleImageCapture} onClose={() => setView(AppView.HOME)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          {view === AppView.RESULT ? (
            <button onClick={() => setView(AppView.HOME)} className="flex items-center text-slate-600 hover:text-blue-600">
              <ArrowLeft className="w-5 h-5 mr-1" /> Back
            </button>
          ) : (
            <div className="flex items-center gap-2 text-blue-600">
              <Smartphone className="w-6 h-6" />
              <h1 className="text-xl font-bold tracking-tight text-slate-900">BizCard AI</h1>
            </div>
          )}
          
          {view === AppView.HOME && scanHistory.length > 0 && (
             <button onClick={exportToCSV} className="text-sm font-medium text-green-600 flex items-center bg-green-50 px-3 py-1.5 rounded-full hover:bg-green-100 transition">
               <Download className="w-4 h-4 mr-1.5" /> Export CSV
             </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        
        {errorMsg && (
          <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl mb-6 text-sm flex items-start shadow-sm animate-fade-in">
             <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
             <div>
               <p className="font-semibold mb-1">Scanning Issue</p>
               <p>{errorMsg}</p>
             </div>
          </div>
        )}

        {view === AppView.PROCESSING && <ProcessingView />}

        {view === AppView.HOME && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg text-center">
              <h2 className="text-2xl font-bold mb-2">Scan Business Card</h2>
              <p className="text-blue-100 mb-8 text-sm sm:text-base">
                Use AI to extract details, add to your Google Sheet list, and share on WhatsApp.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
                {/* Option 1: Take Picture */}
                <button 
                  onClick={() => setView(AppView.CAMERA)}
                  className="flex flex-col items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-xl p-6 transition active:scale-95 group"
                >
                  <div className="w-12 h-12 bg-white text-blue-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="font-semibold">Take Picture</span>
                </button>

                {/* Option 2: Upload File */}
                <label className="flex flex-col items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-xl p-6 transition active:scale-95 cursor-pointer group">
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  <div className="w-12 h-12 bg-white text-indigo-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="font-semibold">Scan File</span>
                </label>
              </div>
            </div>

            {/* History Preview */}
            {scanHistory.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                    <History className="w-5 h-5 mr-2 text-slate-400" /> Recent Scans
                  </h3>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                    {scanHistory.length} saved
                  </span>
                </div>
                
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {scanHistory.slice(0, 3).map((item) => (
                    <div key={item.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                      <div>
                        <div className="font-medium text-slate-900">{item.fullName || 'Unknown'}</div>
                        <div className="text-sm text-slate-500">{item.company}</div>
                      </div>
                      <div className="text-xs text-slate-400">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                  ))}
                  {scanHistory.length > 3 && (
                    <div className="p-3 text-center text-sm text-blue-600 cursor-pointer hover:underline" onClick={exportToCSV}>
                      View all in export
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {view === AppView.RESULT && (
          <div className="space-y-6 pb-20">
            <div className="bg-green-50 border border-green-100 p-4 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-medium text-green-900">Scan Complete</h4>
                <p className="text-sm text-green-700">Data has been extracted and added to your session list.</p>
              </div>
            </div>

            <DataEditor data={scannedData} onChange={handleDataChange} />

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
               <h3 className="text-lg font-semibold text-slate-800 mb-4">Actions</h3>
               
               <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Recipient WhatsApp Number</label>
                    <input 
                      type="tel" 
                      placeholder="e.g. 15551234567"
                      className="w-full p-3 border border-slate-300 rounded-lg text-sm"
                      value={whatsappRecipient}
                      onChange={(e) => setWhatsappRecipient(e.target.value)}
                    />
                    <p className="text-xs text-slate-400 mt-1">Enter number with country code (no + sign)</p>
                  </div>

                  <button 
                    onClick={sendToWhatsApp}
                    className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebc57] text-white font-semibold py-3 px-4 rounded-lg transition shadow-sm active:scale-[0.98]"
                  >
                    <Send className="w-5 h-5" />
                    Send to WhatsApp
                  </button>
               </div>
            </div>

            <button 
              onClick={() => {
                setScannedData(initialData);
                setView(AppView.HOME);
              }} 
              className="w-full flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 font-semibold py-3 px-4 rounded-lg hover:bg-slate-50 transition"
            >
              <PlusCircle className="w-5 h-5" />
              Scan Another Card
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;