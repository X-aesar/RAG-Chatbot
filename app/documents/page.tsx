"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trash2, FileText, Upload } from "lucide-react";
import Link from "next/link";

interface Document {
  title: string;
  fileName: string;
  chunkCount: number;
  createdAt: string;
}

export default function DocumentManagement() {
  const { user } = useUser();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const fetchDocuments = async () => {
    try {
      const response = await fetch("/api/documents");
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      } else {
        throw new Error("Failed to fetch documents");
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to load documents",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (fileName: string) => {
    try {
      const response = await fetch("/api/documents", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileName }),
      });

      if (response.ok) {
        setMessage({
          type: "success",
          text: "Document deleted successfully",
        });
        setDocuments(documents.filter(doc => doc.fileName !== fileName));
      } else {
        throw new Error("Failed to delete document");
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to delete document",
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Document Management
          </h1>
          <Link href="/upload">
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload New
            </Button>
          </Link>
        </div>

        <SignedOut>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-gray-600 mb-4">Please sign in to manage your documents.</p>
            </CardContent>
          </Card>
        </SignedOut>

        <SignedIn>
          {message && (
            <Alert
              variant={message.type === "error" ? "destructive" : "default"}
              className="mb-6"
            >
              <AlertTitle>
                {message.type === "error" ? "Error!" : "Success!"}
              </AlertTitle>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-gray-600">Loading documents...</p>
              </CardContent>
            </Card>
          ) : documents.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">No documents uploaded yet.</p>
                <Link href="/upload">
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Your First Document
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <Card key={doc.fileName}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-5 w-5 text-gray-500" />
                          <h3 className="font-semibold text-gray-900">
                            {doc.title || doc.fileName}
                          </h3>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>{doc.fileName}</span>
                          <Badge variant="secondary">
                            {doc.chunkCount} chunks
                          </Badge>
                          <span>
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteDocument(doc.fileName)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </SignedIn>
      </div>
    </div>
  );
}