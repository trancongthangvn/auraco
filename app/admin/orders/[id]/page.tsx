import OrderDetailClient from "@/components/admin/OrderDetailClient";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderDetailClient id={id} />;
}
