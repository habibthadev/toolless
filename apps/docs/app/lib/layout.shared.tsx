import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { Logo } from "@/components/logo";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <div className="flex items-center gap-2">
          <Logo className="h-6 w-6" />
          <span>Toolless</span>
        </div>
      ),
    },
    links: [
      {
        text: "GitHub",
        url: "https://github.com/habibthadev/toolless",
        external: true,
      },
    ],
  };
}
