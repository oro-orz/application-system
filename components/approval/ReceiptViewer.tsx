"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLink, faMagnifyingGlassPlus, faPrint, faXmark } from "@fortawesome/free-solid-svg-icons";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface ApplicationInfoForPrint {
  applicationDate: string;
  employeeName: string;
  location: string;
  tool: string;
  amount: number;
}

interface ReceiptViewerProps {
  receiptUrl: string;
  creditUrl?: string;
  applicationInfo?: ApplicationInfoForPrint | null;
}

type ModalContent = {
  title: string;
  src: string;
  isPdf: boolean;
  fallbackUrl?: string;
} | null;

/** Google Drive URL から fileId を取得（/file/d/ID または ?id=ID 形式に対応） */
function getDriveFileId(url: string): string | null {
  if (!url || typeof url !== "string") return null;
  const u = url.trim();
  // https://drive.google.com/file/d/FILE_ID/view...
  const m1 = u.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
  if (m1) return m1[1];
  // https://drive.google.com/open?id=FILE_ID
  const m2 = u.match(/[?&]id=([a-zA-Z0-9_-]{25,})/);
  if (m2) return m2[1];
  return null;
}

function getImageSrc(url: string): string {
  const fileId = getDriveFileId(url);
  if (fileId) return `/api/image?fileId=${encodeURIComponent(fileId)}`;
  return url;
}

type LoadErrorType = "pdf" | "error";

export function ReceiptViewer({ receiptUrl, creditUrl, applicationInfo }: ReceiptViewerProps) {
  const [modalContent, setModalContent] = useState<ModalContent>(null);
  const [receiptError, setReceiptError] = useState<LoadErrorType | null>(null);
  const [creditError, setCreditError] = useState<LoadErrorType | null>(null);
  const [receiptPdfUrl, setReceiptPdfUrl] = useState<string | null>(null);
  const [creditPdfUrl, setCreditPdfUrl] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // 申請切り替え時に領収書・クレカ明細の状態をリセット（別申請のPDF等が残らないようにする）
  useEffect(() => {
    setModalContent(null);
    setReceiptError(null);
    setCreditError(null);
    setReceiptPdfUrl(null);
    setCreditPdfUrl(null);
  }, [receiptUrl, creditUrl]);

  const handlePrint = () => {
    if (modalContent?.isPdf && modalContent?.src) {
      const printWin = window.open(modalContent.src, "_blank", "noopener");
      if (printWin) {
        printWin.onload = () => {
          printWin.print();
        };
      } else {
        alert("ポップアップがブロックされました。PDFを新しいタブで開いてから印刷してください。");
      }
    } else {
      window.print();
    }
  };

  // モーダル表示中はbodyにクラスを付与（印刷時はモーダル内容のみ表示するため）
  useEffect(() => {
    if (modalContent) {
      document.body.classList.add("receipt-modal-open");
      return () => document.body.classList.remove("receipt-modal-open");
    }
  }, [modalContent]);

  const hasReceiptUrl = !!receiptUrl?.trim();
  const receiptSrc = hasReceiptUrl ? getImageSrc(receiptUrl) : "";
  const creditSrc = creditUrl?.trim() ? getImageSrc(creditUrl) : undefined;
  const hasReceiptProxy = !!getDriveFileId(receiptUrl);

  async function handleLoadError(
    src: string,
    setError: (t: LoadErrorType | null) => void,
    setPdfUrl: (url: string | null) => void
  ) {
    try {
      const res = await fetch(src);
      const ct = res.headers.get("Content-Type") || "";
      if (ct.includes("application/pdf")) {
        setPdfUrl(src);
        setError("pdf");
      } else {
        setError("error");
      }
    } catch {
      setError("error");
    }
  }

  return (
    <Card className="p-4 rounded-xl border-0 shadow-none">
      <h3 className="text-body font-semibold text-foreground mb-3">領収書・明細</h3>
      <Tabs defaultValue="receipt" className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-xl">
          <TabsTrigger value="receipt" className="rounded-lg">領収書</TabsTrigger>
          <TabsTrigger value="credit" disabled={!creditUrl} className="rounded-lg">
            クレカ明細
          </TabsTrigger>
        </TabsList>

        <TabsContent value="receipt" className="mt-3">
          <div className="relative bg-muted rounded-xl overflow-hidden min-h-[360px]">
            {!hasReceiptUrl ? (
              <div className="flex items-center justify-center min-h-[360px] text-body text-muted-foreground">
                領収書はありません
              </div>
            ) : receiptError === "pdf" && receiptPdfUrl ? (
              <div className="relative min-h-[360px] rounded-xl overflow-hidden bg-muted">
                <iframe
                  src={receiptPdfUrl}
                  title="領収書"
                  className="w-full h-[360px] min-h-[360px] border-0 rounded-xl"
                />
                <div className="absolute top-3 right-3 flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-xl"
                    onClick={() =>
                      setModalContent({
                        title: "領収書",
                        src: receiptPdfUrl,
                        isPdf: true,
                        fallbackUrl: receiptUrl,
                      })
                    }
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlassPlus} className="h-4 w-4 mr-2" />
                    拡大
                  </Button>
                  <Button asChild variant="outline" size="sm" className="rounded-xl">
                    <a
                      href={receiptPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FontAwesomeIcon icon={faExternalLink} className="h-4 w-4 mr-2" />
                      PDFを開く
                    </a>
                  </Button>
                </div>
              </div>
            ) : receiptError === "error" && hasReceiptProxy ? (
              <div className="p-6 text-center text-muted-foreground">
                <p className="mb-2 text-body">画像を読み込めませんでした</p>
                <Button variant="outline" size="sm" className="rounded-xl" asChild>
                  <a href={receiptUrl} target="_blank" rel="noopener noreferrer">
                    <FontAwesomeIcon icon={faExternalLink} className="h-4 w-4 mr-2" />
                    Driveで開く
                  </a>
                </Button>
              </div>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- proxy URL, next/image not used */}
                <img
                  src={receiptSrc}
                  alt="領収書"
                  className="w-full h-auto cursor-pointer"
                  onClick={() =>
                    setModalContent({
                      title: "領収書",
                      src: receiptSrc,
                      isPdf: false,
                      fallbackUrl: receiptUrl,
                    })
                  }
                  onError={() => {
                    handleLoadError(receiptSrc, setReceiptError, setReceiptPdfUrl);
                  }}
                />
                <div className="absolute top-3 right-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-xl"
                    onClick={() =>
                      setModalContent({
                        title: "領収書",
                        src: receiptSrc,
                        isPdf: false,
                        fallbackUrl: receiptUrl,
                      })
                    }
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlassPlus} className="h-4 w-4 mr-2" />
                    拡大
                  </Button>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {creditSrc && (
          <TabsContent value="credit" className="mt-3">
            <div className="relative bg-muted rounded-xl overflow-hidden min-h-[360px]">
              {creditError === "pdf" && creditPdfUrl ? (
                <div className="relative min-h-[360px] rounded-xl overflow-hidden bg-muted">
                  <iframe
                    src={creditPdfUrl}
                    title="クレカ明細"
                    className="w-full h-[360px] min-h-[360px] border-0 rounded-xl"
                  />
                  <div className="absolute top-3 right-3 flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-xl"
                      onClick={() =>
                        setModalContent({
                          title: "クレカ明細",
                          src: creditPdfUrl,
                          isPdf: true,
                          fallbackUrl: creditUrl,
                        })
                      }
                    >
                      <FontAwesomeIcon icon={faMagnifyingGlassPlus} className="h-4 w-4 mr-2" />
                      拡大
                    </Button>
                    <Button asChild variant="outline" size="sm" className="rounded-xl">
                      <a
                        href={creditPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FontAwesomeIcon icon={faExternalLink} className="h-4 w-4 mr-2" />
                        PDFを開く
                      </a>
                    </Button>
                  </div>
                </div>
              ) : creditError === "error" ? (
                <div className="p-6 text-center text-muted-foreground">
                  <p className="mb-2 text-body">画像を読み込めませんでした</p>
                  <Button variant="outline" size="sm" className="rounded-xl" asChild>
                    <a href={creditUrl} target="_blank" rel="noopener noreferrer">
                      <FontAwesomeIcon icon={faExternalLink} className="h-4 w-4 mr-2" />
                      Driveで開く
                    </a>
                  </Button>
                </div>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- proxy URL */}
                  <img
                    src={creditSrc}
                    alt="クレカ明細"
                    className="w-full h-auto cursor-pointer"
                    onClick={() =>
                      creditSrc &&
                      setModalContent({
                        title: "クレカ明細",
                        src: creditSrc,
                        isPdf: false,
                        fallbackUrl: creditUrl,
                      })
                    }
                    onError={() => {
                      if (creditSrc) handleLoadError(creditSrc, setCreditError, setCreditPdfUrl);
                    }}
                  />
                  <div className="absolute top-3 right-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-xl"
                      onClick={() =>
                        creditSrc &&
                        setModalContent({
                          title: "クレカ明細",
                          src: creditSrc,
                          isPdf: false,
                          fallbackUrl: creditUrl,
                        })
                      }
                    >
                      <FontAwesomeIcon icon={faMagnifyingGlassPlus} className="h-4 w-4 mr-2" />
                      拡大
                    </Button>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* 拡大モーダル（body直下に描画してオーバーフローを回避） */}
      {modalContent &&
        createPortal(
          <div
            className="image-modal-overlay fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setModalContent(null)}
            role="dialog"
            aria-modal="true"
            aria-label={modalContent.title}
          >
            <div
              className="image-modal-content relative max-h-[90vh] max-w-[95vw] overflow-auto rounded-xl bg-white p-4 shadow-xl print:block print:max-h-none print:max-w-none print:bg-white"
              onClick={(e) => e.stopPropagation()}
              ref={printRef}
            >
              {/* 印刷時のみ紙の左上に表示する申請情報 */}
              {applicationInfo && (
                <ul className="application-info-print hidden print:block print:absolute print:left-0 print:top-0 print:z-10 print:m-4 print:list-disc print:space-y-0.5 print:text-xs print:text-gray-800 print:[padding-left:1.2rem]">
                  <li>申請日: {formatDate(applicationInfo.applicationDate)}</li>
                  <li>スタッフ: {applicationInfo.employeeName}</li>
                  <li>拠点: {applicationInfo.location}</li>
                  <li>ツール: {applicationInfo.tool}</li>
                  <li>金額: {formatCurrency(applicationInfo.amount)}</li>
                </ul>
              )}
              <div className="mb-3 flex items-center justify-between gap-4 print:hidden">
                <h3 className="text-lg font-semibold text-gray-900">{modalContent.title}</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={handlePrint}
                  >
                    <FontAwesomeIcon icon={faPrint} className="h-4 w-4 mr-2" />
                    印刷
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => setModalContent(null)}
                    aria-label="閉じる"
                  >
                    <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <div className="image-modal-printable">
                {modalContent.isPdf ? (
                  <div className="min-h-[70vh]">
                    <iframe
                      src={modalContent.src}
                      title={modalContent.title}
                      className="h-[75vh] w-full min-w-[min(600px,95vw)] border-0 rounded"
                    />
                    <p className="mt-2 text-sm text-gray-500 print:hidden">
                      「印刷」ボタンでPDFのみが印刷されます。
                    </p>
                    <Button asChild variant="outline" size="sm" className="mt-2 print:hidden">
                      <a
                        href={modalContent.src}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FontAwesomeIcon icon={faExternalLink} className="h-4 w-4 mr-2" />
                        PDFを開く
                      </a>
                    </Button>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={modalContent.src}
                    alt={modalContent.title}
                    className="max-h-[80vh] w-auto max-w-full"
                  />
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </Card>
  );
}
