import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center bg-zinc-950 p-6 md:p-10 text-foreground">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col gap-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <Shield className="size-6 text-indigo-400" />
          <h1 className="text-2xl font-bold tracking-tight">Privacy Policy</h1>
        </div>

        <div className="flex flex-col gap-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            This Privacy Policy outlines how your information is handled within
            the Polaris application.
          </p>

          <h2 className="text-base font-semibold text-foreground mt-2">
            1. Encryption of Core Data
          </h2>
          <p>
            Only standard account credentials (such as passwords, email
            addresses, and private keys) are encrypted.
          </p>

          <h2 className="text-base font-semibold text-foreground mt-2">
            2. Unencrypted Data Storage
          </h2>
          <p>
            This app is not intended for commercial use. Any other data or
            content you enter inside this application is not encrypted and will
            be stored on remote servers.
          </p>

          <h2 className="text-base font-semibold text-foreground mt-2">
            3. Account &amp; Data Responsibility
          </h2>
          <p>
            You are entirely responsible for securing your own personal
            information. This project is intended solely for personal use. If
            you choose to use it, please note that your data may be randomly
            deleted without prior notice.
          </p>

          <h2 className="text-base font-semibold text-foreground mt-2">
            4. Disclaimer of Liability
          </h2>
          <p>
            I, as the developer and service provider, am not liable for any
            damages, loss of data, privacy breaches, security incidents, or any
            other issues that may arise from using this application.
          </p>
        </div>

        <div className="border-t border-border pt-4 mt-2">
          <Link
            href="/polaris/login"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="size-3.5" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
