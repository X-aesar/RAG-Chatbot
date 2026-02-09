// src/app/upload/page.tsx
"use client";

import { useState } from "react";
import { processPdfFile } from "./action";
import { processPdfFileWithProgress } from "./stream-action";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function PDFUpload() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [progress, setProgress] = useState<string>("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setMessage(null);
    setProgress("Starting PDF processing...");

    try {
      const formData = new FormData();
      formData.append("pdf", file);

      // Try streaming version first, fallback to regular version
      try {
        const response = await processPdfFileWithProgress(formData);
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value);
            const lines = text.split('\n').filter(line => line.startsWith('data: '));
            
              for (const line of lines) {
              try {
                const data = JSON.parse(line.substring(6));
                setProgress(data.message);
                
                if (data.status === 'complete') {
                  setMessage({
                    type: "success",
                    text: data.message,
                  });
                  e.target.value = "";
                } else if (data.status === 'error') {
                  setMessage({
                    type: "error",
                    text: data.message,
                  });
                }
              } catch {
                // Ignore parsing errors
              }
            }
          }
        }
      } catch (streamError) {
        // Fallback to regular version if streaming fails
        console.log("Streaming failed, using fallback:", streamError);
        const result = await processPdfFile(formData);

        if (result.success) {
          setMessage({
            type: "success",
            text: result.message || "PDF processed successfully",
          });
          e.target.value = "";
        } else {
          setMessage({
            type: "error",
            text: result.error || "Failed to process PDF",
          });
        }
      }
    } catch {
      setMessage({
        type: "error",
        text: "An error occurred while processing the PDF",
      });
    } finally {
      setIsLoading(false);
      setProgress("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          PDF Upload
        </h1>
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="pdf-upload">Upload PDF File</Label>
                <Input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  className="mt-2"
                />
              </div>

              {isLoading && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-muted-foreground">
                      Processing PDF...
                    </span>
                  </div>
                  {progress && (
                    <div className="text-sm text-muted-foreground pl-7">
                      {progress}
                    </div>
                  )}
                </div>
              )}

              {message && (
                <Alert
                  variant={message.type === "error" ? "destructive" : "default"}
                >
                  <AlertTitle>
                    {message.type === "error" ? "Error!" : "Success!"}
                  </AlertTitle>
                  <AlertDescription>{message.text}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}