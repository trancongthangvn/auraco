import { AdminAuthProvider } from "@/components/admin/AdminAuthContext";
import { ImageZoomProvider } from "@/components/admin/ImageZoomProvider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <ImageZoomProvider>{children}</ImageZoomProvider>
    </AdminAuthProvider>
  );
}
