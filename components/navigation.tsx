
import {
  SignInButton,
  SignOutButton,
  SignUpButton,
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText } from "lucide-react";

export const Navigation = () => {
  return (
    <nav className="border-b border-[var(--foreground)]/10">
      <div className="flex container h-16 items-center justify-between px-4  mx-auto">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-semibold">
            RAG Chatbot
          </Link>
          <SignedIn>
            <Link href="/documents" className="flex items-center gap-2 text-sm hover:text-blue-600 transition-colors">
              <FileText className="h-4 w-4" />
              Documents
            </Link>
          </SignedIn>
        </div>

        <div className="flex gap-2">
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="ghost">Sign In</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button>Sign Up</Button>
            </SignUpButton>
          </SignedOut>

          <SignedIn>
            <SignOutButton>
              <Button variant="outline">Sign Out</Button>
            </SignOutButton>
          </SignedIn>
        </div>
      </div>
    </nav>
  );
};
