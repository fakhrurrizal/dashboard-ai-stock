import ChartRenderer from "@/components/chart-renderer";
import axios from "axios";
import {
  AlertTriangle,
  BarChart3,
  CloudUpload,
  Database,
  FileText,
  Info,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  Trash2,
  X,
  Target,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

interface ChartDataPoint {
  name: string;
  value: number;
}

interface ChartConfig {
  title: string;
  type: "line" | "bar";
  data: ChartDataPoint[];
}

interface TableData {
  sku: string;
  produk?: string;
  nama_produk?: string;
  variasi?: string;
  total?: number;
  prediksi_7_hari?: number;
  urgensi?: string;
}

interface SummaryData {
  total_terjual: number;
  omzet: string;
  produk_unik: number;
}

interface ChatItem {
  userQuery: string;
  message?: string;
  charts?: ChartConfig[];
  data?: TableData[];
  summary?: SummaryData;
}

interface ChatResponse {
  message: string;
  charts?: ChartConfig[];
  data?: TableData[];
  summary?: SummaryData;
  type: string;
  status: string;
}

interface GlobalStatus {
  is_trained: boolean;
  total_sku: number;
  last_status: string;
  model_info: {
    selected_model: string | null;
    order: string;
    seasonal_order: string | null;
  };
  global_evaluation: {
    mae?: number;
    rmse?: number;
    mape?: string;
  };
  summary: {
    success: number;
    failed: number;
  };
}

export default function Dashboard() {
  const [openUpload, setOpenUpload] = useState(false);
  const [openChat, setOpenChat] = useState(false);
  const [openResetDialog, setOpenResetDialog] = useState(false);
  const [openModelInfo, setOpenModelInfo] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [trainingStatus, setTrainingStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isTrained, setTrained] = useState(false);
  const [modelType, setModelType] = useState("SARIMA");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [serverStatus, setServerStatus] = useState<GlobalStatus | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  const reconnectProgressStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`${API_BASE}/train-progress`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const result = JSON.parse(event.data);
      setUploadProgress(result.percent);
      setTrainingStatus(result.status);

      if (result.percent >= 100) {
        eventSource.close();
        setTrained(true);
        setIsUploading(false);
        checkServerStatus();
        toast.success("Training Selesai!");
        setTimeout(() => setOpenUpload(false), 1500);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };
  }, []);

  const checkServerStatus = useCallback(async () => {
    try {
      const res = await axios.get<GlobalStatus>(
        `${API_BASE}/check-status?t=${Date.now()}`
      );

      const statusData = res.data;
      setTrained(!!statusData.is_trained);
      setServerStatus(statusData);

      const isStillTraining =
        !statusData.is_trained &&
        statusData.last_status !== "Belum ada data" &&
        statusData.last_status !== "Selesai" &&
        statusData.last_status !== "";

      if (isStillTraining) {
        setOpenUpload(true);
        setIsUploading(true);
        setTrainingStatus(statusData.last_status);
        reconnectProgressStream();
      }
    } catch {
      console.log("Backend offline");
    }
  }, [reconnectProgressStream]);

  useEffect(() => {
    checkServerStatus();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [checkServerStatus]);

  const handleResetClick = () => {
    setOpenResetDialog(true);
  };

  const handleResetConfirm = async () => {
    setIsResetting(true);
    try {
      await axios.delete(`${API_BASE}/reset-data`);
      setTrained(false);
      setServerStatus(null);
      setChatHistory([]);
      toast.success("Data berhasil dihapus");
      setOpenResetDialog(false);
    } catch {
      toast.error("Gagal menghapus data");
    } finally {
      setIsResetting(false);
    }
  };

  const handleUploadAndTrain = async () => {
    if (!selectedFile) return toast.error("Pilih file CSV");
    setIsUploading(true);
    setUploadProgress(0);
    setTrainingStatus("Inisialisasi...");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      reconnectProgressStream();
      await axios.post(
        `${API_BASE}/upload-train?model_type=${modelType}`,
        formData
      );
    } catch {
      setIsUploading(false);
      if (eventSourceRef.current) eventSourceRef.current.close();
      toast.error("Gagal training");
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isSendingChat) return;

    const currentInput = chatInput;
    setChatInput("");
    setIsSendingChat(true);

    const formattedHistory = chatHistory.map((h) => ({
      user: h.userQuery,
      bot: h.message,
      data: h.data,
    }));

    try {
      const res = await axios.post<ChatResponse>(`${API_BASE}/chat`, {
        message: currentInput,
        history: formattedHistory,
      });

      setChatHistory((prev) => [
        ...prev,
        {
          userQuery: currentInput,
          message: res.data.message,
          charts: res.data.charts,
          data: res.data.data,
          summary: res.data.summary,
        },
      ]);
    } catch {
      toast.error("Gagal memproses permintaan");
      setChatInput(currentInput);
    } finally {
      setIsSendingChat(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6 flex flex-col font-sans relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-orange-200/30 to-pink-200/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center mt-16 mb-16 text-center">
        <h1 className="text-6xl font-black bg-gradient-to-r from-gray-900 via-blue-800 to-purple-900 bg-clip-text text-transparent mb-4 flex items-center gap-4">
          AI Stock Service
        </h1>

        <div className="flex items-center gap-4 mt-2">
          <p className="text-gray-600 font-semibold text-lg">
            Sistem prediksi stok otomatis berbasis AI untuk bisnis modern
          </p>
          {isTrained && (
            <button
              onClick={handleResetClick}
              disabled={isResetting}
              className="text-red-600 bg-red-50 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-red-600 hover:text-white transition-all duration-300 disabled:opacity-50 shadow-sm hover:shadow-lg border border-red-100"
            >
              {isResetting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
              Reset Data
            </button>
          )}
        </div>
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center">
        <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-10">
          <div
            onClick={() => !isUploading && setOpenUpload(true)}
            className={`group relative bg-white/80 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-white/50 text-center cursor-pointer transition-all duration-500 hover:scale-105 hover:shadow-orange-200/50 ${
              isUploading ? "opacity-50" : ""
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-400/10 to-pink-400/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <div className="relative">
              <div className="bg-gradient-to-br from-orange-100 to-orange-50 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-orange-200/50">
                <CloudUpload
                  className="text-orange-600"
                  size={48}
                  strokeWidth={2.5}
                />
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-black text-gray-900">
                  Upload & Train
                </h2>
                <p className="text-gray-500 font-medium text-base">
                  Upload dataset dan latih model AI
                </p>
              </div>

              {isTrained && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenModelInfo(true);
                  }}
                  className="mt-6 inline-flex items-center gap-2 text-green-600 text-sm font-bold border-2 border-green-300 bg-green-50 px-5 py-2 rounded-full shadow-sm hover:bg-green-100 transition-colors cursor-help"
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Model Terlatih
                  <Info size={14} className="ml-1 opacity-70" />
                </div>
              )}
            </div>
          </div>

          <div
            onClick={() => isTrained && setOpenChat(true)}
            className={`group relative bg-white/80 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-white/50 text-center transition-all duration-500 ${
              isTrained
                ? "cursor-pointer hover:scale-105 hover:shadow-blue-200/50"
                : "opacity-40 grayscale cursor-not-allowed"
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <div className="relative">
              <div className="bg-gradient-to-br from-blue-100 to-blue-50 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-blue-200/50">
                <MessageCircle
                  className="text-blue-600"
                  size={48}
                  strokeWidth={2.5}
                />
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-black text-gray-900">
                  Consultant Chat
                </h2>
                <p className="text-gray-500 font-medium text-base">
                  Analisis data dengan AI consultant
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {openResetDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-red-100 rounded-2xl">
                <AlertTriangle className="text-red-600" size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900">
                  Konfirmasi Reset
                </h3>
                <p className="text-sm text-gray-500 font-medium mt-1">
                  Tindakan ini tidak dapat dibatalkan
                </p>
              </div>
            </div>

            <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-5 mb-6">
              <p className="text-gray-700 font-semibold text-base leading-relaxed">
                Apakah Anda yakin ingin menghapus semua dataset dan model yang
                telah dilatih? Semua data dan progress akan hilang secara
                permanen.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setOpenResetDialog(false)}
                disabled={isResetting}
                className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all duration-300 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleResetConfirm}
                disabled={isResetting}
                className="flex-1 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl font-bold hover:from-red-600 hover:to-red-700 transition-all duration-300 disabled:opacity-50 shadow-lg shadow-red-200/50 flex items-center justify-center gap-2"
              >
                {isResetting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={20} />
                    <span>Ya, Hapus</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {openModelInfo && serverStatus && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] max-w-2xl w-full shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-gray-100">
            <div className="p-8 bg-gradient-to-r from-green-600 to-teal-600 flex justify-between items-center">
              <div className="flex items-center gap-4 text-white">
                <div className="p-3 bg-white/20 rounded-2xl">
                  <Zap size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black">Detail Model AI</h3>
                  <p className="text-green-50 opacity-80 text-sm font-medium">
                    Informasi performa dan arsitektur
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpenModelInfo(false)}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                    Arsitektur Terpilih
                  </p>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black text-slate-800">
                      {serverStatus.model_info.selected_model}
                    </span>
                    <span className="text-slate-400 font-bold mb-1">Model</span>
                  </div>
                  <div className="mt-4 flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 font-medium">Order:</span>
                      <span className="text-slate-800 font-bold">
                        {serverStatus.model_info.order}
                      </span>
                    </div>
                    {serverStatus.model_info.seasonal_order && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 font-medium">
                          Seasonal:
                        </span>
                        <span className="text-slate-800 font-bold">
                          {serverStatus.model_info.seasonal_order}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100">
                  <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4">
                    Cakupan Data
                  </p>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black text-blue-800">
                      {serverStatus.summary.success}
                    </span>
                    <span className="text-blue-400 font-bold mb-1">SKU</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{
                          width: `${
                            (serverStatus.summary.success /
                              serverStatus.total_sku) *
                            100
                          }%`,
                        }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-blue-500 font-bold text-right uppercase">
                      Training Success Rate
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Target size={14} /> Evaluasi Akurasi Global
                </p>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    {
                      label: "MAE",
                      value: serverStatus.global_evaluation.mae,
                      desc: "Mean Abs Error",
                    },
                    {
                      label: "RMSE",
                      value: serverStatus.global_evaluation.rmse,
                      desc: "Root Mean Sq Error",
                    },
                    {
                      label: "MAPE",
                      value: serverStatus.global_evaluation.mape,
                      desc: "Mean Abs % Error",
                    },
                  ].map((stat, i) => (
                    <div
                      key={i}
                      className="text-center p-5 bg-white border-2 border-slate-50 rounded-3xl shadow-sm"
                    >
                      <p className="text-[10px] font-black text-slate-400 mb-1">
                        {stat.label}
                      </p>
                      <p className="text-xl font-black text-slate-800">
                        {stat.value ?? "N/A"}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">
                        {stat.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-orange-50 p-5 rounded-2xl flex items-start gap-4 border border-orange-100">
                <div className="p-2 bg-orange-100 rounded-lg text-orange-600 mt-1">
                  <Sparkles size={18} />
                </div>
                <p className="text-xs text-orange-800 font-medium leading-relaxed">
                  Model ini dilatih secara individual untuk setiap SKU guna
                  menangkap pola musiman dan tren unik setiap produk. Akurasi
                  dihitung berdasarkan <b>validation set</b> terakhir.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {openUpload && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl max-w-lg w-full p-10 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl">
                  <Database className="text-white" size={24} />
                </div>
                <h3 className="text-2xl font-black text-gray-900">
                  Konfigurasi AI
                </h3>
              </div>
              {!isUploading && (
                <button
                  onClick={() => setOpenUpload(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="text-gray-400" size={24} />
                </button>
              )}
            </div>

            {isUploading ? (
              <div className="text-center py-12">
                <div className="relative w-32 h-32 mx-auto mb-6">
                  <div className="absolute inset-0 border-8 border-orange-100 rounded-full"></div>
                  <div className="absolute inset-0 border-8 border-transparent border-t-orange-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-black text-orange-600">
                      {uploadProgress}%
                    </span>
                  </div>
                </div>
                <p className="font-bold text-orange-600 text-lg">
                  {trainingStatus}
                </p>
                <p className="text-xs text-gray-400 mt-4 animate-pulse italic">
                  Sedang melanjutkan proses di server...
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Model Type
                  </label>
                  <div className="flex gap-3">
                    {["SARIMA", "ARIMA"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setModelType(t)}
                        className={`flex-1 py-4 rounded-2xl font-bold transition-all duration-300 ${
                          modelType === t
                            ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-200/50 scale-105"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Dataset
                  </label>
                  <label className="block p-12 border-2 border-dashed border-gray-300 rounded-2xl text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 transition-all duration-300 group">
                    <FileText
                      className="mx-auto text-gray-400 mb-3 group-hover:text-orange-500 group-hover:scale-110 transition-all"
                      size={40}
                    />
                    <span className="text-sm font-semibold text-gray-600 group-hover:text-orange-600">
                      {selectedFile
                        ? selectedFile.name
                        : "Klik untuk pilih CSV"}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".csv"
                      onChange={(e) =>
                        setSelectedFile(e.target.files?.[0] || null)
                      }
                    />
                  </label>
                </div>

                <button
                  onClick={handleUploadAndTrain}
                  className="w-full py-5 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-orange-200/50 hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                  MULAI TRAINING
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {openChat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-lg flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl max-w-6xl w-full h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-blue-600 to-purple-600">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                  <BarChart3 className="text-white" size={28} />
                </div>
                <div>
                  <h3 className="font-black text-2xl text-white">AI ENGINE</h3>
                  <p className="text-blue-100 text-sm font-medium">
                    Intelligent Stock Analytics
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpenChat(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="text-white" size={28} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-br from-slate-50 to-blue-50 space-y-8">
              {chatHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <div className="relative mb-6">
                    <MessageCircle size={80} className="opacity-20" />
                    <Sparkles
                      className="absolute -top-2 -right-2 text-blue-400 animate-pulse"
                      size={24}
                    />
                  </div>
                  <p className="font-bold text-lg">Belum ada percakapan</p>
                  <p className="text-sm mt-2">
                    Mulai dengan menanyakan analisis stok Anda
                  </p>
                </div>
              ) : (
                chatHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="space-y-6 animate-in slide-in-from-bottom duration-500"
                  >
                    <div className="flex justify-end">
                      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-7 py-4 rounded-3xl rounded-tr-md font-semibold shadow-lg shadow-blue-200/50 max-w-2xl">
                        {item.userQuery}
                      </div>
                    </div>

                    {item.message && (
                      <div className="flex justify-start">
                        <div className="bg-white border-2 border-gray-100 p-7 rounded-3xl rounded-tl-md text-gray-700 font-medium max-w-3xl shadow-xl">
                          {item.message}

                          {item.summary && (
                            <div className="mt-6 grid grid-cols-3 gap-4 border-t-2 border-gray-100 pt-6">
                              <div className="text-center bg-gradient-to-br from-orange-50 to-pink-50 p-4 rounded-2xl">
                                <p className="text-xs text-gray-500 uppercase font-bold mb-2">
                                  Terjual
                                </p>
                                <p className="text-orange-600 font-black text-2xl">
                                  {item.summary.total_terjual}
                                </p>
                              </div>
                              <div className="text-center bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-2xl">
                                <p className="text-xs text-gray-500 uppercase font-bold mb-2">
                                  Omzet
                                </p>
                                <p className="text-blue-600 font-black text-2xl">
                                  {item.summary.omzet}
                                </p>
                              </div>
                              <div className="text-center bg-gradient-to-br from-green-50 to-teal-50 p-4 rounded-2xl">
                                <p className="text-xs text-gray-500 uppercase font-bold mb-2">
                                  SKU
                                </p>
                                <p className="text-green-600 font-black text-2xl">
                                  {item.summary.produk_unik}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {item.charts?.map((c, i) => (
                      <ChartRenderer key={i} {...c} />
                    ))}

                    {item.data && (
                      <div className="bg-white rounded-3xl border-2 border-gray-100 overflow-hidden shadow-xl">
                        <table className="w-full text-left">
                          <thead className="bg-gradient-to-r from-gray-50 to-blue-50 text-xs uppercase font-black text-gray-600">
                            <tr>
                              <th className="px-8 py-5">SKU Identifier</th>
                              <th className="px-8 py-5">Product Name</th>
                              <th className="px-8 py-5 text-center">
                                Quantity
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {item.data.map((row: TableData, i: number) => (
                              <tr
                                key={i}
                                className="hover:bg-blue-50/50 transition-colors duration-200"
                              >
                                <td className="px-8 py-6 font-mono text-sm text-gray-500 font-semibold">
                                  {row.sku}
                                </td>
                                <td className="px-8 py-6 font-bold text-gray-900 text-base leading-tight">
                                  {row.produk || row.nama_produk}
                                  {row.variasi && row.variasi !== "-" && (
                                    <span className="block text-xs text-gray-500 font-medium mt-1">
                                      VAR: {row.variasi}
                                    </span>
                                  )}
                                </td>
                                <td className="px-8 py-6 text-center">
                                  <div className="inline-flex items-center justify-center bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-full px-6 py-2 shadow-lg shadow-orange-200/50 min-w-[120px]">
                                    <span className="text-sm font-black whitespace-nowrap">
                                      {row.total || row.prediksi_7_hari} UNITS
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-6 bg-white border-t-2 border-gray-100">
              <div className="flex gap-4 max-w-4xl mx-auto">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                  placeholder="Tanyakan tren stok produk..."
                  disabled={isSendingChat}
                  className="flex-1 bg-gray-50 border-2 border-gray-200 rounded-2xl px-7 py-5 focus:ring-4 focus:ring-blue-200 focus:border-blue-500 outline-none font-semibold disabled:opacity-50 transition-all"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || isSendingChat}
                  className="bg-gradient-to-r from-orange-500 to-pink-500 text-white p-5 rounded-2xl shadow-xl shadow-orange-200/50 hover:scale-110 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center min-w-[70px]"
                >
                  {isSendingChat ? (
                    <Loader2 className="animate-spin" size={28} />
                  ) : (
                    <Send size={28} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
