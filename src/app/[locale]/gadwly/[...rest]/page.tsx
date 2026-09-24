import { NotFoundView } from "@/components/not-found-view";

// Rendered inside gadwly/layout.tsx, so the sidebar and topbar stay in place.
export default function GadwlyNotFound() {
  return <NotFoundView fullScreen={false} gadwlyPages />;
}
