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
  Square,
  Target,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
  stok_awal?: number;
  terjual?: number;
  stok_akhir?: number;
  qty?: number;
  total?: string | number;
  prediksi_7_hari?: number;
  rekomendasi_qty?: number;
  urgensi?: string;
  periode?: string;
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
  is_active: boolean;
  total_sku: number;
  last_status: string;
  total_rows?: number;
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
  const [isStopping, setIsStopping] = useState(false);
  const [isTrained, setTrained] = useState(false);
  const [modelType, setModelType] = useState("SARIMA");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [serverStatus, setServerStatus] = useState<GlobalStatus | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cleanupConnections = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const checkServerStatus = useCallback(async () => {
    if (isStopping) return;
    try {
      const res = await axios.get<GlobalStatus>(
        `${API_BASE}/check-status?t=${Date.now()}`
      );
      const statusData = res.data;
      setTrained(!!statusData.is_trained);
      setServerStatus(statusData);
      if (statusData.is_active) {
        setOpenUpload(true);
        setIsUploading(true);
        setTrainingStatus(statusData.last_status);
        if (!eventSourceRef.current) reconnectProgressStream();
      } else {
        if (isUploading && !isStopping) {
          setIsUploading(false);
          setOpenUpload(false);
          setUploadProgress(0);
          cleanupConnections();
        }
      }
    } catch {
      console.log("Backend offline");
    }
  }, [isUploading, isStopping, cleanupConnections]);

  const reconnectProgressStream = useCallback(() => {
    if (isStopping) return;
    cleanupConnections();
    const eventSource = new EventSource(`${API_BASE}/train-progress`);
    eventSourceRef.current = eventSource;
    eventSource.onmessage = (event) => {
      try {
        const result = JSON.parse(event.data);
        const statusLower = (result.status || "").toLowerCase();
        if (
          statusLower === "ready" ||
          statusLower.includes("berhenti") ||
          statusLower.includes("stopped") ||
          statusLower.includes("error")
        ) {
          cleanupConnections();
          if (!isStopping) {
            setIsUploading(false);
            setOpenUpload(false);
            setUploadProgress(0);
            setTrainingStatus("");
            checkServerStatus();
          }
          return;
        }
        setUploadProgress(result.percent);
        setTrainingStatus(result.status);
        if (result.percent >= 100) {
          cleanupConnections();
          setTrained(true);
          setIsUploading(false);
          checkServerStatus();
          toast.success("Training Selesai!");
          setTimeout(() => setOpenUpload(false), 1500);
        }
      } catch (e) {
        console.error(e);
      }
    };
    eventSource.onerror = () => {
      cleanupConnections();
      if (isUploading && !isStopping) {
        reconnectTimeoutRef.current = setTimeout(
          () => reconnectProgressStream(),
          3000
        );
      }
    };
  }, [isUploading, isStopping, checkServerStatus, cleanupConnections]);

  useEffect(() => {
    checkServerStatus();
    return () => cleanupConnections();
  }, []);

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

  const handleStopTraining = async () => {
    if (isStopping) return;
    setIsStopping(true);
    cleanupConnections();
    setTrainingStatus("Menghentikan proses...");
    try {
      await axios.post(`${API_BASE}/stop-training`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsUploading(false);
      setOpenUpload(false);
      setUploadProgress(0);
      setTrainingStatus("");
      toast.success("Training dihentikan");
      const res = await axios.get<GlobalStatus>(
        `${API_BASE}/check-status?t=${Date.now()}`
      );
      setServerStatus(res.data);
      setTrained(!!res.data.is_trained);
    } catch {
      toast.error("Gagal menghentikan training");
    } finally {
      setIsStopping(false);
    }
  };

  const handleUploadAndTrain = async () => {
    if (!selectedFile) return toast.error("Pilih file CSV");
    setIsUploading(true);
    setOpenUpload(true);
    setUploadProgress(1);
    setTrainingStatus("Mengunggah data...");
    const formData = new FormData();
    formData.append("file", selectedFile);
    try {
      await axios.post(
        `${API_BASE}/upload-train?model_type=${modelType}`,
        formData
      );
      reconnectProgressStream();
    } catch {
      setIsUploading(false);
      setOpenUpload(false);
      cleanupConnections();
      toast.error("Gagal memulai training");
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
              onClick={() => setOpenResetDialog(true)}
              disabled={isResetting}
              className="text-red-600 bg-red-50 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-red-600 hover:text-white transition-all duration-300 disabled:opacity-50 shadow-sm border border-red-100"
            >
              {isResetting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}{" "}
              Reset Data
            </button>
          )}
        </div>
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center">
        <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-10">
          <div
            onClick={() => !isUploading && setOpenUpload(true)}
            className={`group relative bg-white/80 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-white/50 text-center cursor-pointer transition-all duration-500 hover:scale-105 ${
              isUploading ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <div className="bg-gradient-to-br from-orange-100 to-orange-50 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-orange-200/50">
              <CloudUpload
                className="text-orange-600"
                size={48}
                strokeWidth={2.5}
              />
            </div>
            <h2 className="text-3xl font-black text-gray-900">
              Upload & Train
            </h2>
            <p className="text-gray-500 font-medium text-base">
              Upload dataset dan latih model AI
            </p>
            {isTrained && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenModelInfo(true);
                }}
                className="mt-6 inline-flex items-center gap-2 text-green-600 text-sm font-bold border-2 border-green-300 bg-green-50 px-5 py-2 rounded-full cursor-help"
              >
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>{" "}
                Model Terlatih <Info size={14} className="ml-1 opacity-70" />
              </div>
            )}
          </div>
          <div
            onClick={() => isTrained && setOpenChat(true)}
            className={`group relative bg-white/80 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-white/50 text-center transition-all duration-500 ${
              isTrained
                ? "cursor-pointer hover:scale-105 hover:shadow-blue-200/50"
                : "opacity-40 grayscale cursor-not-allowed"
            }`}
          >
            <div className="bg-gradient-to-br from-blue-100 to-blue-50 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-blue-200/50">
              <MessageCircle
                className="text-blue-600"
                size={48}
                strokeWidth={2.5}
              />
            </div>
            <h2 className="text-3xl font-black text-gray-900">
              Consultant Chat
            </h2>
            <p className="text-gray-500 font-medium text-base">
              Analisis data dengan AI consultant
            </p>
          </div>
        </div>
      </div>

      {openResetDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl animate-in zoom-in">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-red-100 rounded-2xl">
                <AlertTriangle className="text-red-600" size={32} />
              </div>
              <h3 className="text-2xl font-black text-gray-900">
                Konfirmasi Reset
              </h3>
            </div>
            <p className="text-gray-700 font-semibold mb-6">
              Apakah Anda yakin ingin menghapus semua dataset dan model yang
              telah dilatih?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setOpenResetDialog(false)}
                disabled={isResetting}
                className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold"
              >
                Batal
              </button>
              <button
                onClick={handleResetConfirm}
                disabled={isResetting}
                className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
              >
                {isResetting ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Trash2 size={20} />
                )}{" "}
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {openModelInfo && serverStatus && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[2.5rem] max-w-2xl w-full shadow-2xl overflow-hidden border border-gray-100">
            <div className="p-8 bg-gradient-to-r from-green-600 to-teal-600 flex justify-between items-center text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl">
                  <Zap size={28} />
                </div>
                <h3 className="text-2xl font-black">Detail Model AI</h3>
              </div>
              <button
                onClick={() => setOpenModelInfo(false)}
                className="p-2 bg-white/10 rounded-xl"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                    Arsitektur
                  </p>
                  <span className="text-4xl font-black text-slate-800">
                    {serverStatus.model_info.selected_model || "SARIMA"}
                  </span>
                </div>
                <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100">
                  <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4">
                    Cakupan Data
                  </p>
                  <span className="text-4xl font-black text-blue-800">
                    {serverStatus.summary.success}{" "}
                    <span className="text-sm font-bold text-blue-400">SKU</span>
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Target size={14} /> Evaluasi Akurasi Global
                </p>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { l: "MAE", v: serverStatus.global_evaluation.mae },
                    { l: "RMSE", v: serverStatus.global_evaluation.rmse },
                    { l: "MAPE", v: serverStatus.global_evaluation.mape },
                  ].map((stat, i) => (
                    <div
                      key={i}
                      className="text-center p-5 bg-white border-2 border-slate-50 rounded-3xl shadow-sm"
                    >
                      <p className="text-[10px] font-black text-slate-400 mb-1">
                        {stat.l}
                      </p>
                      <p className="text-xl font-black text-slate-800">
                        {stat.v ?? "N/A"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {openUpload && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-10 shadow-2xl animate-in zoom-in">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500 rounded-xl">
                  <Database className="text-white" size={24} />
                </div>
                <h3 className="text-2xl font-black text-gray-900">
                  Konfigurasi AI
                </h3>
              </div>
              {!isUploading && (
                <button
                  onClick={() => setOpenUpload(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl"
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
                  <div className="absolute inset-0 flex items-center justify-center font-black text-orange-600 text-2xl">
                    {uploadProgress}%
                  </div>
                </div>
                <p className="font-bold text-orange-600 text-lg mb-8">
                  {trainingStatus || "Memproses..."}
                </p>
                <button
                  onClick={handleStopTraining}
                  disabled={isStopping}
                  className="flex items-center gap-2 mx-auto px-6 py-3 bg-red-50 text-red-600 rounded-2xl font-bold border border-red-100"
                >
                  {isStopping ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Square size={18} fill="currentColor" />
                  )}{" "}
                  {isStopping ? "MENGHENTIKAN..." : "STOP TRAINING"}
                </button>
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
                        className={`flex-1 py-4 rounded-2xl font-bold transition-all ${
                          modelType === t
                            ? "bg-orange-500 text-white shadow-lg"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="block p-12 border-2 border-dashed border-gray-300 rounded-2xl text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 group transition-all">
                  <FileText
                    className="mx-auto text-gray-400 mb-3 group-hover:text-orange-500"
                    size={40}
                  />
                  <span className="text-sm font-semibold text-gray-600">
                    {selectedFile ? selectedFile.name : "Klik untuk pilih CSV"}
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
                <button
                  onClick={handleUploadAndTrain}
                  className="w-full py-5 bg-orange-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-orange-100"
                >
                  MULAI TRAINING
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {openChat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-lg flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-6xl w-full h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in">
            <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                  <BarChart3 size={28} />
                </div>
                <div>
                  <h3 className="font-black text-2xl">AI ENGINE</h3>
                  <p className="text-blue-100 text-sm">
                    Intelligent Stock Analytics
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpenChat(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X size={28} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 space-y-8">
              {chatHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <MessageCircle size={80} className="opacity-20 mb-4" />
                  <p className="font-bold text-lg">Belum ada percakapan</p>
                </div>
              ) : (
                chatHistory.map((item, idx) => (
                  <div key={idx} className="space-y-6">
                    <div className="flex justify-end">
                      <div className="bg-blue-600 text-white px-7 py-4 rounded-3xl rounded-tr-md font-semibold max-w-2xl shadow-lg shadow-blue-100">
                        {item.userQuery}
                      </div>
                    </div>
                    {item.message && (
                      <div className="flex justify-start">
                        <div className="bg-white border-2 border-gray-100 p-7 rounded-3xl rounded-tl-md text-gray-700 font-medium max-w-3xl shadow-sm">
                          {item.message}
                        </div>
                      </div>
                    )}
                    {item.summary && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          {
                            l: "Total Terjual",
                            v: item.summary.total_terjual,
                            c: "text-blue-600",
                          },
                          {
                            l: "Omzet",
                            v: item.summary.omzet,
                            c: "text-green-600",
                          },
                          {
                            l: "Produk Unik",
                            v: item.summary.produk_unik,
                            c: "text-purple-600",
                          },
                        ].map((s, si) => (
                          <div
                            key={si}
                            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col"
                          >
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                              {s.l}
                            </span>
                            <span className={`text-xl font-black ${s.c}`}>
                              {s.v.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {item.charts?.map((c, i) => (
                      <div
                        key={i}
                        className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100"
                      >
                        <ChartRenderer {...c} />
                      </div>
                    ))}
                    {item.data && item.data.length > 0 && (
                      <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-gray-100">
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                  Produk
                                </th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                  SKU
                                </th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                  Detail/Hasil
                                </th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                  Urgensi
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {item.data.map((row, ridx) => (
                                <tr
                                  key={ridx}
                                  className="hover:bg-blue-50/20 transition-colors"
                                >
                                  <td className="px-6 py-4 text-xs font-bold text-gray-800 leading-snug max-w-[280px]">
                                    {row.produk || row.nama_produk}
                                  </td>
                                  <td className="px-6 py-4 text-[10px] font-mono text-gray-400 uppercase">
                                    {row.sku}
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                      {row.stok_awal !== undefined && (
                                        <div className="flex items-center gap-3 text-[10px] font-bold">
                                          <span className="text-gray-400">
                                            Awal: {row.stok_awal}
                                          </span>{" "}
                                          <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                            Sisa: {row.stok_akhir}
                                          </span>
                                        </div>
                                      )}
                                      {row.prediksi_7_hari !== undefined && (
                                        <span className="text-orange-600 text-xs font-black italic">
                                          Forecast: {row.prediksi_7_hari} Unit
                                        </span>
                                      )}
                                      {row.qty !== undefined && (
                                        <span className="text-green-600 text-xs font-black">
                                          {row.qty} Terjual ({row.total})
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    {row.urgensi ? (
                                      <span
                                        className={`inline-block px-3 py-1 rounded-full text-[9px] font-black tracking-tight ${
                                          row.urgensi === "KRITIS"
                                            ? "bg-red-100 text-red-600"
                                            : "bg-green-100 text-green-600"
                                        }`}
                                      >
                                        {row.urgensi}
                                      </span>
                                    ) : (
                                      <span className="text-gray-200">—</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
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
                  className="flex-1 bg-gray-50 border-2 border-gray-200 rounded-2xl px-7 py-5 focus:border-blue-500 outline-none font-semibold disabled:opacity-50"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || isSendingChat}
                  className="bg-orange-500 text-white p-5 rounded-2xl shadow-xl shadow-orange-100 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
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
