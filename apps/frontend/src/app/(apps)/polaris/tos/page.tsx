"use client";

import Link from "next/link";
import { Scale, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Page() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center bg-zinc-950 p-6 md:p-10 text-foreground">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col gap-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <Scale className="size-6 text-indigo-400" />
          <h1 className="text-2xl font-bold tracking-tight">
            {t("polaris.tos.title", "Terms of Service")}
          </h1>
        </div>

        <div className="flex flex-col gap-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            {t("polaris.tos.intro", "Welcome to Polaris. This application is a personal project intended for private use. By accessing or using this service, you agree to these Terms of Service:")}
          </p>

          <h2 className="text-base font-semibold text-foreground mt-2">
            {t("polaris.tos.section1Title", "1. Non-Commercial Use")}
          </h2>
          <p>
            {t("polaris.tos.section1Content", "This application is not intended for commercial use of any kind. It is provided solely as a personal project.")}
          </p>

          <h2 className="text-base font-semibold text-foreground mt-2">
            {t("polaris.tos.section2Title", "2. Data & Encryption")}
          </h2>
          <p>
            {t("polaris.tos.section2Content", "While usual credentials like passwords, emails, and private keys are encrypted, any other information or content you enter inside this application is not guaranteed to be encrypted and will be stored on remote servers.")}
          </p>

          <h2 className="text-base font-semibold text-foreground mt-2">
            {t("polaris.tos.section3Title", "3. Discretionary Data Deletion")}
          </h2>
          <p>
            {t("polaris.tos.section3Content", "This service is hosted for personal use. Your account and any stored data may be randomly deleted at any time without notice. Do not rely on this application to store any important information.")}
          </p>

          <h2 className="text-base font-semibold text-foreground mt-2">
            {t("polaris.tos.section4Title", "4. Limitation of Liability")}
          </h2>
          <p>
            {t("polaris.tos.section4Content", "As the developer and service provider, I am not responsible or liable for any damages, loss of data, privacy breaches, security incidents, or any other issues that may arise from using this application. You assume all responsibility.")}
          </p>
        </div>

        <div className="border-t border-border pt-4 mt-2">
          <Link
            href="/polaris/login"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="size-3.5" />
            {t("polaris.tos.backToLogin", "Back to Login")}
          </Link>
        </div>
      </div>
    </div>
  );
}
