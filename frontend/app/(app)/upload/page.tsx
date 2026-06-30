"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { reports } from "@/lib/api";
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2, X } from "lucide-react";

const STEPS = [
  { key: "uploaded", label: "Uploaded", desc: "PDF received" },
  { key: "processing", label: "Processing", desc: "OCR + embedding" },
  { key: "extracted", label: "Extracted", desc: "Metrics parsed" },
  { key: "analyzed", label: "Analyzed", desc: "AI complete" },
];

const STEP_ORDER = ["uploaded", "processing", "extracted", "analyzed"];

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [companyYear, setCompanyYear] = useState(new Date().getFullYear().toString());
  const [sector, setSector] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") {
      setFile(dropped);
      // Auto-fill company name from filename (only if not already set)
      const name = dropped.name.replace(/\.pdf$/i, "").replace(/[_-]/g, " ");
      setCompanyName((prev) => prev || name);
    } else {
      setError("Please upload a PDF file");
    }
  }, []); // no dependency needed — uses functional setState updater

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !companyName) return;

    setUploading(true);
    setError("");

    const fd = new FormData();
    fd.append("file", file);
    fd.append("company_name", companyName);
    fd.append("year", companyYear);
    fd.append("company_sector", sector);

    try {
      const res = await reports.upload(fd);
      const rid = res.report_id;
      setReportId(rid);
      setCurrentStatus("uploaded");

      // Poll for status
      const poll = setInterval(async () => {
        try {
          const status = await reports.status(rid);
          setCurrentStatus(status.status);

          if (status.status === "analyzed") {
            clearInterval(poll);
            setTimeout(() => router.push(`/analysis/${rid}`), 1000);
          } else if (status.status === "failed") {
            clearInterval(poll);
            setError(status.error_message || "Analysis failed. Please try again.");
            setUploading(false);
          }
        } catch {
          clearInterval(poll);
          setError("Lost connection while checking status.");
          setUploading(false);
        }
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Upload failed");
      setUploading(false);
    }
  };

  const currentStepIndex = currentStatus ? STEP_ORDER.indexOf(currentStatus) : -1;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-fg-text mb-2">Upload Annual Report</h1>
        <p className="text-fg-muted text-sm">
          Upload a PDF and our 5-agent AI system will generate a complete financial intelligence report in ~60 seconds.
        </p>
      </div>

      {/* Processing pipeline */}
      {currentStatus && (
        <div className="glass-card p-5 mb-6">
          <h3 className="text-sm font-semibold text-fg-text mb-4 flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            Analysis Pipeline Running…
          </h3>
          <div className="flex flex-col gap-2">
            {STEPS.map((step, i) => {
              const isDone = i < currentStepIndex;
              const isActive = i === currentStepIndex;
              const isPending = i > currentStepIndex;
              return (
                <div
                  key={step.key}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    isDone
                      ? "border-green-500/30 bg-green-500/5 pipeline-step-done"
                      : isActive
                      ? "border-blue-500/30 bg-blue-500/5 pipeline-step-active"
                      : "border-fg bg-fg-surface-2"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                  ) : isActive ? (
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-fg-muted shrink-0" />
                  )}
                  <div>
                    <div className={`text-sm font-medium ${isActive ? "text-blue-400" : isDone ? "text-green-400" : "text-fg-muted"}`}>
                      {step.label}
                    </div>
                    <div className="text-xs text-fg-muted">{step.desc}</div>
                  </div>
                  {isActive && (
                    <div className="ml-auto">
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse-dot" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {currentStatus === "analyzed" && (
            <p className="text-sm text-green-400 text-center mt-3">
              ✓ Analysis complete! Redirecting to dashboard…
            </p>
          )}
        </div>
      )}

      {!uploading && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onClick={() => document.getElementById("file-input")?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
              dragging
                ? "border-blue-400 bg-blue-500/10"
                : file
                ? "border-green-500/50 bg-green-500/5"
                : "border-fg hover:border-blue-500/50 hover:bg-blue-500/5"
            }`}
          >
            <input
              id="file-input"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFile(f);
                  if (!companyName) setCompanyName(f.name.replace(/\.pdf$/i, "").replace(/[_-]/g, " "));
                }
              }}
            />

            {file ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle className="w-10 h-10 text-green-400" />
                <p className="font-medium text-fg-text">{file.name}</p>
                <p className="text-sm text-fg-muted">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mt-1"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-fg-text">Drop your annual report here</p>
                  <p className="text-sm text-fg-muted mt-1">or click to browse · PDF only · Max 50MB</p>
                </div>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-medium text-fg-text mb-1.5 block">Company Name *</label>
              <input
                id="company-name"
                className="fg-input"
                placeholder="e.g. Tata Consultancy Services"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-fg-text mb-1.5 block">Fiscal Year *</label>
              <input
                id="fiscal-year"
                className="fg-input"
                type="number"
                min={2000}
                max={2030}
                value={companyYear}
                onChange={(e) => setCompanyYear(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-fg-text mb-1.5 block">Sector</label>
              <select id="sector" className="fg-input" value={sector} onChange={(e) => setSector(e.target.value)}>
                <option value="">Auto-detect</option>
                <option value="IT">IT / Technology</option>
                <option value="Banking">Banking / NBFC</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="FMCG">FMCG / Consumer</option>
                <option value="Energy">Energy / Oil & Gas</option>
                <option value="Pharma">Pharma / Healthcare</option>
                <option value="SaaS">SaaS / Software</option>
                <option value="Infrastructure">Infrastructure</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <button
            id="upload-submit"
            type="submit"
            disabled={!file || !companyName}
            className="btn-primary flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" />
            Start AI Analysis
          </button>

          <p className="text-xs text-center text-fg-muted">
            Analysis runs in the background. You&apos;ll be redirected automatically when complete (~60s for 300-page reports).
          </p>
        </form>
      )}
    </div>
  );
}
