import { mockOrders } from "@/data/admin";
import OrderDetailClient from "@/components/admin/OrderDetailClient";

export function generateStaticParams() {
  return mockOrders.map((o) => ({ id: o.id }));
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderDetailClient id={id} />;
}
